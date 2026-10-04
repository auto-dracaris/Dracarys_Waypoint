import asyncio
from copy import deepcopy
from uuid import UUID

import pytest
from fastapi import HTTPException
from test_business_tools import client as client  # noqa: F401
from test_business_tools import order, send

from app.agent.business import run_business
from app.agent.contracts import ChatRequest, Conversation, Principal
from app.agent.router import select_profile
from app.clients.tool_planner import ToolCall
from app.tools.orders import ARGUMENTS, ROLES, declarations, execute, validate_call

TRIP = "12345678-1234-4234-8234-123456789abc"


def trip():
    return {
        "id": TRIP,
        "name": "Trip 1",
        "status": "loading",
        "departure": "2026-10-04T08:00:00Z",
        "planVersion": 2,
        "stopCount": 6,
        "completedStops": 0,
        "stops": [
            {
                "sequence": n,
                "name": f"Store {n}",
                "status": "pending",
                "deliveryWindow": "08:00-12:00",
                "contactPhone": "PRIVATE_PHONE",
                "orders": [
                    {"cases": 3, "temperature": "ambient"},
                    {"cases": 2, "temperature": "chilled"},
                ],
            }
            for n in range(1, 7)
        ],
        "driver": {"token": "PRIVATE_TOKEN"},
    }


def change():
    return {
        "tripId": TRIP,
        "planVersion": 3,
        "reason": "Reported road closure",
        "previous": [{"name": "Store 1", "completed": False, "movement": "none"}],
        "updated": [{"name": "Store 1", "completed": False, "movement": "up"}],
        "impactStopName": "Store 1",
        "impactArrivalWas": "2026-10-04T08:00:00Z",
        "impactArrivalNow": "2026-10-04T09:00:00Z",
        "tightWindow": None,
        "acknowledged": False,
    }


class Business:
    def __init__(self, data):
        self.data = data
        self.calls = []
        self.error = None

    async def get(self, path, token, params=None):
        self.calls.append((path, token, params))
        if self.error:
            raise HTTPException(self.error, "Denied by backend")
        return deepcopy(self.data)


class Planner:
    def __init__(self, calls):
        self.calls = calls
        self.context = []

    async def plan(self, message, order_id, profile, trip_id=None):
        self.context.append(trip_id)
        return self.calls


def principal(role):
    return Principal(id=1, role=role, depotId=1, outletId=10 if role == "store_manager" else None)


def invoke(name, args, data, role="dispatcher"):
    user = principal(role)
    call = ToolCall(name=name, arguments=args)
    parsed = validate_call(call, user, select_profile(user, "business_qa"))
    business = Business(data)
    source = asyncio.run(execute(call, parsed, user, "access-token", business))
    return source, business


@pytest.mark.parametrize("role", ["store_manager", "dispatcher", "driver", "loader"])
@pytest.mark.parametrize("name", list(ARGUMENTS))
def test_role_matrix_rejects_disallowed_tools_before_reads(role, name):
    user = principal(role)
    call = ToolCall(name=name, arguments={})
    if role not in ROLES[name]:
        with pytest.raises(HTTPException) as failure:
            validate_call(call, user, select_profile(user, "business_qa"))
        assert failure.value.status_code == 403
    else:
        assert name in select_profile(user).tools


def test_dispatcher_details_do_not_require_outlet_assignment():
    source, business = invoke("get_order_details", {"order_id": 42}, order(outlet=999))
    assert "Order 42" in source.text
    assert business.calls == [("orders/42", "access-token", None)]


def test_dispatcher_summary_uses_fixed_endpoint_and_exact_date_filters():
    data = {
        "total": 8,
        "awaiting": 4,
        "allocated": 2,
        "deferred": 3,
        "delivered": 2,
        "cancelled": 1,
        "weightKg": 12,
        "volumeM3": 3,
        "chilledVolumeM3": 1,
    }
    source, business = invoke("get_order_summary", {"date": "2026-10-04", "depot": "Kandy"}, data)
    assert business.calls[0] == (
        "orders/summary",
        "access-token",
        {"date": "2026-10-04", "depot": "Kandy"},
    )
    assert "Total excludes cancelled" in source.text and "do not sum" in source.text


def test_historic_deferred_stage_can_contain_delivered_orders():
    item = order()
    item["status"] = "delivered"
    data = {"items": [item], "meta": {"page": 1, "limit": 10, "total": 1, "totalPages": 1}}
    source, business = invoke("get_dispatcher_orders", {"stage": "deferred"}, data)
    assert "delivered" in source.text and "historical deferrals" in source.text
    assert business.calls[0][0] == "orders"


def test_draft_is_grounded_and_performs_only_one_read():
    source, business = invoke("draft_deferral_message", {"order_id": 42}, order())
    assert "not sent" in source.text and "capacity_limit" in source.text
    assert "not a delivery guarantee" in source.text
    assert "must-not-be-returned" not in source.text
    assert business.calls == [("orders/42", "access-token", None)]


def test_missing_reason_does_not_invent_draft():
    data = order()
    data["deferral"] = None
    source, _ = invoke("draft_deferral_message", {"order_id": 42}, data)
    assert "cannot be produced" in source.text


@pytest.mark.parametrize("role", ["driver", "loader"])
def test_trip_lists_preserve_backend_scope_token_and_pagination(role):
    data = {"items": [trip()], "meta": {"page": 2, "limit": 10, "total": 11, "totalPages": 2}}
    source, business = invoke("get_my_trips", {"page": 2, "date": "2026-10-04"}, data, role)
    assert business.calls[0] == (
        "trips",
        "access-token",
        {"date": "2026-10-04", "page": 2, "limit": 10},
    )
    assert "other pages are excluded" in source.text and "PRIVATE" not in source.text


@pytest.mark.parametrize("role", ["driver", "loader", "dispatcher"])
def test_trip_details_bound_stops_and_report_planned_case_totals(role):
    source, _ = invoke("get_trip_details", {"trip_id": TRIP}, trip(), role)
    assert "showing 5 of 6" in source.text and "Store 6" not in source.text
    assert "ambient 3, chilled 2" in source.text and "PRIVATE" not in source.text
    assert "not loading confirmation" in source.text
    source, _ = invoke("get_trip_details", {"trip_id": TRIP, "stop_page": 2}, trip(), role)
    assert "Store 6" in source.text and "showing 1 of 6" in source.text


def test_no_pending_change_does_not_claim_no_route_change_history():
    source, business = invoke("get_route_change", {"trip_id": TRIP}, None, "driver")
    assert "does not cover acknowledged" in source.text
    assert business.calls[0][0] == f"trips/{TRIP}/route-change"


def test_route_change_is_not_acknowledged_and_long_reason_is_bounded():
    data = change()
    data["reason"] = "x" * 2000
    data["previous"] = data["previous"] * 30
    source, business = invoke("get_route_change", {"trip_id": TRIP}, data, "driver")
    assert "remains unacknowledged" in source.text and "showing 3/30" in source.text
    assert len(source.text) < 4000 and len(business.calls) == 1


@pytest.mark.parametrize(
    "name,data", [("get_trip_details", trip()), ("get_route_change", change())]
)
def test_mismatched_trip_response_fails_closed(name, data):
    data["id" if name == "get_trip_details" else "tripId"] = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    with pytest.raises(HTTPException) as failure:
        invoke(name, {"trip_id": TRIP}, data, "driver")
    assert failure.value.status_code == 502


@pytest.mark.parametrize("status", [401, 403, 404, 503])
def test_backend_scope_errors_are_preserved(status):
    business = Business(None)
    business.error = status
    call = ToolCall(name="get_trip_details", arguments={"trip_id": TRIP})
    user = principal("driver")
    args = validate_call(call, user, select_profile(user))
    with pytest.raises(HTTPException) as failure:
        asyncio.run(execute(call, args, user, "access-token", business))
    assert failure.value.status_code == status


def test_unknown_trip_id_prevents_all_reads_and_memory_changes():
    business = Business(trip())
    planner = Planner(
        [
            ToolCall(name="get_my_trips"),
            ToolCall(name="get_trip_details", arguments={"trip_id": TRIP}),
        ]
    )
    memory = Conversation()
    user = principal("driver")
    with pytest.raises(HTTPException) as failure:
        asyncio.run(
            run_business(
                ChatRequest(message="Show my trips"),
                memory,
                user,
                "access-token",
                business,
                planner,
                select_profile(user),
                8,
            )
        )
    assert failure.value.status_code == 502 and not business.calls
    assert memory.last_trip_id is None and not memory.turns


def test_trip_followup_remembers_id_and_refetches_authorized_record():
    business = Business(trip())
    planner = Planner([ToolCall(name="get_trip_details", arguments={"trip_id": TRIP})])
    user = principal("driver")
    memory = Conversation()
    for request in (
        ChatRequest(message="Show this trip", trip_id=UUID(TRIP)),
        ChatRequest(message="Show its next stops"),
    ):
        result = asyncio.run(
            run_business(
                request, memory, user, "access-token", business, planner, select_profile(user), 8
            )
        )
        assert result["status"] == "answered"
    assert memory.last_trip_id == TRIP and planner.context == [TRIP, TRIP]
    assert len(business.calls) == 2 and "access-token" not in memory.model_dump_json()


@pytest.mark.parametrize(
    "name,args",
    [
        ("get_my_trips", {"limit": 26}),
        ("get_trip_details", {"trip_id": "../../auth/me"}),
        ("get_trip_details", {"trip_id": TRIP, "stop_limit": 6}),
        ("get_order_summary", {"depot": "unknown"}),
        ("get_dispatcher_orders", {"stage": "planned"}),
    ],
)
def test_invalid_arguments_never_become_backend_paths_or_filters(name, args):
    user = principal("driver" if "trip" in name else "dispatcher")
    with pytest.raises(HTTPException) as failure:
        validate_call(ToolCall(name=name, arguments=args), user, select_profile(user))
    assert failure.value.status_code == 502


def test_provider_declarations_match_every_profile_allowlist():
    for role in ("store_manager", "dispatcher", "driver", "loader"):
        profile = select_profile(principal(role))
        assert [declaration.name for declaration in declarations(profile.tools)] == list(
            profile.tools
        )


@pytest.mark.parametrize(
    "role,name,data,args",
    [
        (
            "driver",
            "get_my_trips",
            {"items": [trip()], "meta": {"page": 1, "limit": 10, "total": 1, "totalPages": 1}},
            {},
        ),
        ("loader", "get_trip_details", trip(), {"trip_id": TRIP}),
        ("driver", "get_route_change", None, {"trip_id": TRIP}),
        ("dispatcher", "draft_deferral_message", order(), {"order_id": 42}),
    ],
)
def test_chat_endpoint_selects_verified_role_and_executes_only_permitted_reads(
    client, role, name, data, args
):
    client.app.state.business.role = role
    client.app.state.business.outlet = None
    business = Business(data)
    client.app.state.business.get = business.get
    client.app.state.planner = Planner([ToolCall(name=name, arguments=args)])
    response = send(client, **args)
    assert response.status_code == 200 and response.json()["status"] == "answered"
    assert len(business.calls) == 1 and business.calls[0][1] == "manager"


@pytest.mark.parametrize("role", ["dispatcher", "driver", "loader"])
def test_new_role_business_chat_always_requires_bearer(client, role):
    client.app.state.business.role = role
    assert send(client, token=None).status_code == 401
    assert not client.app.state.business.calls


def test_trip_request_body_rejects_invalid_uuid_before_planning(client):
    assert send(client, trip_id="../../auth/me").status_code == 422
    assert not client.app.state.planner.seen
