import asyncio
import json

import pytest
from test_business_phase2 import fake_google
from test_business_tools import client as client  # noqa: F401

from app.clients.model import ModelClient
from app.core.config import Settings

FACTS = {
    "delivery_reference": "DEMO-099",
    "issue_type": "Damaged goods",
    "ordered_cases": 36,
    "accepted_cases": 34,
    "damaged_cases": 2,
    "notes": "",
}


def send(client, token="manager", **changes):
    return client.post(
        "/api/v1/issue-drafts",
        json={**FACTS, **changes},
        headers={"Authorization": f"Bearer {token}"} if token else {},
    )


def test_authenticated_draft_does_not_read_or_write_delivery_records(client):
    class Model:
        async def draft_issue(self, facts):
            assert facts == FACTS
            return "For delivery DEMO-099, I accepted 34 cases and recorded 2 damaged cases."

    client.app.state.model = Model()
    response = send(client)
    assert response.status_code == 200 and response.json()["origin"] == "ai"
    assert "34 cases" in response.json()["draft"]
    assert not client.app.state.business.calls and not client.app.state.conversations.rows


@pytest.mark.parametrize("role", ["dispatcher", "driver", "loader"])
def test_other_roles_cannot_draft_store_delivery_issues(client, role):
    client.app.state.business.role = role
    assert send(client).status_code == 403


def test_drafting_always_requires_identity_and_outlet(client):
    assert send(client, token=None).status_code == 401
    client.app.state.business.outlet = None
    assert send(client).status_code == 403


@pytest.mark.parametrize(
    "changes",
    [
        {"accepted_cases": 36, "damaged_cases": 0},
        {"accepted_cases": 36, "damaged_cases": 2},
        {"damaged_cases": -1},
        {"accepted_cases": 34.5},
        {"issue_type": "Missing goods", "accepted_cases": 34, "damaged_cases": 2},
        {"issue_type": "Wrong items", "notes": ""},
        {"role": "dispatcher"},
    ],
)
def test_invalid_or_conflicting_form_facts_are_rejected(client, changes):
    assert send(client, **changes).status_code == 422


def test_secret_notes_never_reach_model(client):
    class NoModel:
        async def draft_issue(self, facts):
            pytest.fail("Credentials reached draft model")

    client.app.state.model = NoModel()
    response = send(client, notes="password=PRIVATE_SECRET")
    assert response.status_code == 422 and "PRIVATE_SECRET" not in response.text


@pytest.mark.parametrize(
    "answer", [None, "password=PRIVATE_SECRET", "Bad [policy:invented]", "x" * 501]
)
def test_unsafe_or_unavailable_model_uses_form_facts(client, answer):
    class Model:
        async def draft_issue(self, facts):
            return answer

    client.app.state.model = Model()
    response = send(client)
    assert response.status_code == 200 and response.json()["origin"] == "form"
    assert "34" in response.json()["draft"] and "2 damaged" in response.json()["draft"]
    assert "PRIVATE_SECRET" not in response.text


def test_missing_goods_fallback_reports_only_entered_quantities(client):
    class Model:
        async def draft_issue(self, facts):
            raise RuntimeError("private upstream error")

    client.app.state.model = Model()
    response = send(client, issue_type="Missing goods", accepted_cases=34, damaged_cases=0)
    assert response.status_code == 200
    assert "2 cases were not received" in response.json()["draft"]
    assert "private upstream error" not in response.text


def test_issue_model_uses_form_facts_and_rejects_invented_numbers(monkeypatch):
    settings = Settings(_env_file=None, gemini_model="synthetic", gemini_api_key="synthetic")
    seen = fake_google(monkeypatch, {"draft": "I recorded 999 damaged cases."})
    assert asyncio.run(ModelClient(settings).draft_issue(FACTS)) is None
    assert json.loads(seen["contents"])["user_entered_form_facts"] == FACTS
    assert "not verified delivery records" in seen["config"].system_instruction
    assert "Never invent damage" in seen["config"].system_instruction
