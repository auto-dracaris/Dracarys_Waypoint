import asyncio
from contextlib import asynccontextmanager
from copy import deepcopy
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.agent.contracts import Conversation, Principal
from app.agent.router import select_profile
from app.clients.business import BusinessClient
from app.clients.tool_planner import ToolCall, ToolPlanner
from app.core.config import Settings
from app.main import create_app
from app.tools.orders import execute, validate_call


def order(identifier=42, outlet=10):
    return {
        "id": identifier,
        "outletId": outlet,
        "status": "deferred",
        "requestedDate": "2026-10-04",
        "tempRequirement": "ambient",
        "orderUnits": 3,
        "orderWeightKg": "20.5",
        "orderVolumeM3": "1.2",
        "deferral": {
            "reason": "capacity_limit",
            "reasonNote": "Review by dispatcher",
            "planDate": "2026-10-04",
            "deferredToDate": "2026-10-05",
        },
        "placedBy": {"private_token": "must-not-be-returned"},
    }


class Memory:
    def __init__(self):
        self.rows = {}

    @asynccontextmanager
    async def session(self, identifier, owner, new):
        if not new and (identifier not in self.rows or self.rows[identifier][0] != owner):
            raise HTTPException(404, "Conversation not found")
        state = Conversation() if new else deepcopy(self.rows[identifier][1])
        yield state
        self.rows[identifier] = (owner, state)


class Business:
    def __init__(self):
        self.calls = []
        self.role = "store_manager"
        self.outlet = 10
        self.record_outlet = 10
        self.error = None

    async def authenticate(self, token):
        if token not in ("manager", "other-manager"):
            raise HTTPException(401, "Invalid token")
        return Principal(
            id=1 if token == "manager" else 2, role=self.role, depotId=1, outletId=self.outlet
        )

    async def get(self, path, token, params=None):
        self.calls.append((path, token, params))
        if self.error:
            raise HTTPException(self.error, "Business API access denied or record missing")
        if path == "orders/my":
            return {
                "items": [order(outlet=self.record_outlet)],
                "meta": {
                    "page": params["page"],
                    "limit": params["limit"],
                    "total": 41,
                    "totalPages": 5,
                },
            }
        if path == "orders/placement-options":
            return {
                "outlet": {"id": self.record_outlet, "name": "Synthetic outlet"},
                "deliveryDays": [{"date": "2026-10-05", "cutoffAt": "2026-10-04T10:30:00Z"}],
                "tempRequirements": ["ambient"],
            }
        return order(outlet=self.record_outlet)


class Planner:
    def __init__(self):
        self.calls = [ToolCall(name="get_my_orders", arguments={})]
        self.seen = []

    async def plan(self, message, order_id, profile, trip_id=None):
        self.seen.append((message, order_id, profile.role))
        return self.calls


@pytest.fixture
def client():
    app = create_app(
        Settings(_env_file=None, environment="test", auth_enabled=False, database_url=None)
    )
    app.state.business = Business()
    app.state.planner = Planner()
    app.state.conversations = Memory()
    with TestClient(app) as client:
        yield client


def send(client, *, token="manager", **kwargs):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return client.post(
        "/api/v1/chat",
        headers=headers,
        json={"message": "Show my orders", "workflow": "business_qa", **kwargs},
    )


def test_business_workflow_requires_real_token_even_in_local_bypass(client):
    assert send(client, token=None).status_code == 401
    assert send(client, token="invalid").status_code == 401
    assert not client.app.state.business.calls and not client.app.state.planner.seen


@pytest.mark.parametrize("role", ["dispatcher", "driver", "loader"])
def test_other_roles_cannot_use_manager_tools(client, role):
    client.app.state.business.role = role
    assert send(client).status_code == 403
    assert not client.app.state.business.calls


def test_my_orders_reports_page_scope_and_never_leaks_unselected_fields(client):
    response = send(client)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "answered"
    assert "showing 1 of 41" in data["answer"]
    assert "do not cover other pages" in data["answer"]
    assert "must-not-be-returned" not in response.text
    assert "Bearer" not in response.text
    assert client.app.state.business.calls == [("orders/my", "manager", {"page": 1, "limit": 10})]
    assert data["sources"][0]["id"].startswith("api:orders:my")


def test_details_followup_refetches_and_keeps_only_safe_conversation_data(client):
    client.app.state.planner.calls = [
        ToolCall(name="get_order_details", arguments={"order_id": 42})
    ]
    first = send(client, order_id=42).json()
    assert "capacity_limit" in first["answer"] and "2026-10-05" in first["answer"]
    assert "not a delivery guarantee" in first["answer"]
    second = send(client, conversation_id=first["conversation_id"], message="And now?")
    assert second.status_code == 200
    assert client.app.state.planner.seen[-1][1] == 42
    assert len(client.app.state.business.calls) == 2
    state = next(iter(client.app.state.conversations.rows.values()))[1].model_dump()
    assert state["last_order_id"] == 42
    assert "token" not in str(state) and "manager" not in str(state)
    assert (
        send(client, token="other-manager", conversation_id=first["conversation_id"]).status_code
        == 404
    )


def test_placement_options_accept_nullable_backend_outlet_name(client):
    original_get = client.app.state.business.get

    async def nullable_name(path, token, params=None):
        data = await original_get(path, token, params)
        data["outlet"]["name"] = None
        return data

    client.app.state.business.get = nullable_name
    client.app.state.planner.calls = [ToolCall(name="get_order_placement_options", arguments={})]
    response = send(client)
    assert response.status_code == 200
    assert "Available ordering options for outlet 10" in response.json()["answer"]


def test_placement_options_are_available_dates_not_a_prediction(client):
    client.app.state.planner.calls = [ToolCall(name="get_order_placement_options", arguments={})]
    response = send(client).json()
    assert "ordering cutoff" in response["answer"]
    assert "no best-day prediction" in response["answer"]
    assert client.app.state.business.calls[0][0] == "orders/placement-options"


@pytest.mark.parametrize(
    "name,arguments,status",
    [
        ("create_order", {}, 403),
        ("get_my_orders", {"outlet_id": 99}, 502),
        ("get_my_orders", {"limit": 200}, 502),
        ("get_my_orders", {"status": "invented"}, 502),
        ("get_order_details", {"order_id": "../../auth/me"}, 502),
        ("get_order_details", {"order_id": True}, 502),
        ("get_order_details", {}, 502),
        ("get_order_placement_options", {"url": "https://evil.test"}, 502),
    ],
)
def test_unsafe_or_invalid_calls_are_rejected_before_any_api_read(client, name, arguments, status):
    client.app.state.planner.calls = [
        ToolCall(name="get_my_orders", arguments={}),
        ToolCall(name=name, arguments=arguments),
    ]
    assert send(client).status_code == status
    assert not client.app.state.business.calls
    assert not client.app.state.conversations.rows


@pytest.mark.parametrize(
    "name,args",
    [
        ("get_my_orders", {}),
        ("get_order_details", {"order_id": 42}),
        ("get_order_placement_options", {}),
    ],
)
def test_all_tools_reject_cross_outlet_records(client, name, args):
    client.app.state.business.record_outlet = 999
    client.app.state.planner.calls = [ToolCall(name=name, arguments=args)]
    assert send(client, order_id=42).status_code == 403
    assert not client.app.state.conversations.rows


def test_missing_outlet_or_too_many_calls_fail_closed(client):
    client.app.state.business.outlet = None
    assert send(client).status_code == 403
    client.app.state.business.outlet = 10
    client.app.state.planner.calls *= 4
    assert send(client).status_code == 502
    assert not client.app.state.business.calls


def test_no_function_calls_cannot_return_unsourced_model_claims(client):
    client.app.state.planner.calls = []
    assert send(client).json()["status"] == "needs_input"
    assert not client.app.state.business.calls


def test_planner_cannot_invent_an_order_id(client):
    client.app.state.planner.calls = [
        ToolCall(name="get_order_details", arguments={"order_id": 42})
    ]
    assert send(client).status_code == 502
    assert not client.app.state.business.calls


@pytest.mark.parametrize("message", ["Show order 42", "Explain ORD0000042", "Details for #42"])
def test_explicit_order_references_allow_the_known_record(client, message):
    client.app.state.planner.calls = [
        ToolCall(name="get_order_details", arguments={"order_id": 42})
    ]
    assert send(client, message=message).status_code == 200


@pytest.mark.parametrize("status", [401, 403, 404])
def test_backend_denials_are_preserved_without_committing_memory(client, status):
    client.app.state.business.error = status
    assert send(client).status_code == status
    assert not client.app.state.conversations.rows


def test_tools_forward_access_token_and_encode_query_parameters(monkeypatch):
    seen = []

    def handle(request):
        seen.append(request)
        return httpx.Response(
            200,
            json={
                "data": {
                    "items": [order()],
                    "meta": {"total": 1, "page": 1, "limit": 10, "totalPages": 1},
                }
            },
        )

    original = httpx.AsyncClient
    monkeypatch.setattr(
        "app.clients.business.httpx.AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(handle), **kwargs),
    )
    principal = Principal(id=1, role="store_manager", depotId=1, outletId=10)
    call = ToolCall(name="get_my_orders", arguments={"search": "42&outletId=999"})
    args = validate_call(call, principal, select_profile(principal))
    asyncio.run(
        execute(
            call, args, principal, "opaque-access-token", BusinessClient(Settings(_env_file=None))
        )
    )
    assert seen[0].url.path == "/api/orders/my"
    assert seen[0].url.params["search"] == "42&outletId=999"
    assert "outletId" not in seen[0].url.params
    assert seen[0].headers["authorization"] == "Bearer opaque-access-token"


def test_real_gemini_planner_declarations_disable_automatic_execution(monkeypatch):
    seen = {}

    class Google:
        def __init__(self, **kwargs):
            self.aio = self
            self.models = self

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def generate_content(self, **kwargs):
            seen.update(kwargs)
            return SimpleNamespace(
                function_calls=[SimpleNamespace(name="get_order_details", args={"order_id": 42})]
            )

    monkeypatch.setattr("app.clients.tool_planner.genai.Client", Google)
    principal = Principal(id=1, role="store_manager", depotId=1, outletId=10)
    profile = select_profile(principal)
    settings = Settings(_env_file=None, gemini_model="synthetic", gemini_api_key="synthetic")
    calls = asyncio.run(ToolPlanner(settings).plan("Show the order", 42, profile))
    assert calls[0].arguments == {"order_id": 42}
    config = seen["config"]
    assert config.automatic_function_calling.disable
    assert {d.name for d in config.tools[0].function_declarations} == set(profile.tools)
    assert "token" not in seen["contents"] and "Bearer" not in seen["contents"]
