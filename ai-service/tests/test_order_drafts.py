import asyncio
import json

import pytest
from test_business_phase2 import fake_google
from test_business_tools import client as client  # noqa: F401

from app.clients.model import ModelClient
from app.core.config import Settings

FACTS = {
    "requested_date": "2026-10-06",
    "temperature_requirement": "ambient",
    "quantity": 12,
    "weight_kg": 24.5,
    "volume_m3": 1.2,
    "notes": "",
}


def send(client, token="manager", **changes):
    return client.post(
        "/api/v1/order-drafts",
        json={**FACTS, **changes},
        headers={"Authorization": f"Bearer {token}"} if token else {},
    )


def test_order_draft_only_fills_a_note_and_does_not_place_or_store_an_order(client):
    class Model:
        async def draft_order(self, facts):
            assert facts == FACTS
            return "Requested delivery: 6 October 2026, with 12 ambient cases."

    client.app.state.model = Model()
    response = send(client)
    assert response.status_code == 200 and response.json()["origin"] == "ai"
    assert not client.app.state.business.calls and not client.app.state.conversations.rows


@pytest.mark.parametrize(
    "changes",
    [
        {"quantity": 0},
        {"quantity": 1.5},
        {"weight_kg": 0},
        {"volume_m3": -1},
        {"weight_kg": True},
        {"requested_date": "invalid"},
        {"temperature_requirement": "frozen"},
        {"notes": "x" * 501},
        {"outlet_id": 999},
    ],
)
def test_invalid_order_facts_are_rejected(client, changes):
    assert send(client, **changes).status_code == 422


@pytest.mark.parametrize("role", ["dispatcher", "driver", "loader"])
def test_order_drafting_is_store_manager_only(client, role):
    client.app.state.business.role = role
    assert send(client).status_code == 403


def test_order_drafting_requires_identity_and_assigned_outlet(client):
    assert send(client, token=None).status_code == 401
    client.app.state.business.outlet = None
    assert send(client).status_code == 403


def test_credentials_in_order_notes_do_not_reach_model(client):
    class Model:
        async def draft_order(self, facts):
            pytest.fail("Credential reached provider")

    client.app.state.model = Model()
    assert send(client, notes="api_key=PRIVATE_SECRET").status_code == 422


@pytest.mark.parametrize(
    "draft", [None, "password=PRIVATE_SECRET", "Made up [policy:no]", "x" * 501]
)
def test_order_fallback_preserves_requested_date_and_form_facts(client, draft):
    class Model:
        async def draft_order(self, facts):
            return draft

    client.app.state.model = Model()
    response = send(client)
    assert response.status_code == 200 and response.json()["origin"] == "form"
    assert "06 October 2026" in response.json()["draft"]
    assert "12 ambient cases" in response.json()["draft"]
    assert "24.5 kg" in response.json()["draft"]
    assert "PRIVATE_SECRET" not in response.text


def test_order_model_accepts_readable_date_and_exact_decimals_but_not_new_numbers(monkeypatch):
    settings = Settings(_env_file=None, gemini_model="synthetic", gemini_api_key="synthetic")
    seen = fake_google(
        monkeypatch,
        {"draft": "Requested for 6 October 2026: 12 ambient cases, 24.5 kg and 1.2 m³."},
    )
    assert asyncio.run(ModelClient(settings).draft_order(FACTS))
    assert json.loads(seen["contents"])["unsubmitted_order_form"] == FACTS
    assert "never confirmed or guaranteed" in seen["config"].system_instruction
    fake_google(monkeypatch, {"draft": "Please arrive at 9:30 with 999 cases."})
    assert asyncio.run(ModelClient(settings).draft_order(FACTS)) is None
