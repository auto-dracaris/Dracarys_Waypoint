import pytest
from test_business_tools import client as client  # noqa: F401

from app.agent.contracts import Deferral, Source
from app.agent.response_limits import MAX_REPLY_CHARACTERS, MAX_REPLY_WORDS, limit_reply


def test_short_answer_preserves_status_citation_and_sources():
    result = {
        "answer": "Your order is confirmed. [api:orders:42]",
        "status": "answered",
        "sources": [{"id": "api:orders:42"}],
    }
    assert limit_reply(result) is result


@pytest.mark.parametrize("answer", ["Long fact. " * 100, "x" * 901])
def test_oversized_answer_keeps_evidence_without_clipping_facts(answer):
    source = {"id": "policy:terms", "text": "Delivery is not guaranteed."}
    result = {
        "answer": answer,
        "status": "answered",
        "sources": [source],
        "planning_unavailable": True,
    }
    limited = limit_reply(result)
    assert len(limited["answer"].split()) <= MAX_REPLY_WORDS
    assert len(limited["answer"]) <= MAX_REPLY_CHARACTERS
    assert limited["status"] == "sources_only"
    assert limited["sources"] == [source]
    assert limited["planning_unavailable"] is True
    assert "full context" in limited["answer"]


@pytest.mark.parametrize("workflow", ["business_qa", "knowledge_qa", "deferral_qa"])
def test_limit_applies_to_all_workflows_before_answer_is_saved(client, workflow):
    client.app.state.settings.auth_enabled = True
    class LongModel:
        async def combine(self, *args, **kwargs):
            return "Long fact. " * 150

        async def explain(self, *args, **kwargs):
            return "Long policy. " * 150

    class Retrieval:
        async def retrieve(self, *args, **kwargs):
            return [Source(id="policy:terms", title="Terms", text="Recorded guidance.")]

    async def deferral(*args):
        return Deferral(order_id=42, depot_id=1, outlet_id=10, reason="capacity_limit")

    client.app.state.model = LongModel()
    client.app.state.retrieval = Retrieval()
    client.app.state.business.deferral = deferral
    response = client.post(
        "/api/v1/chat",
        headers={"Authorization": "Bearer manager"},
        json={"message": "Explain", "workflow": workflow, "order_id": 42},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["answer"]) <= MAX_REPLY_CHARACTERS
    assert len(body["answer"].split()) <= MAX_REPLY_WORDS
    assert body["status"] == "sources_only" and body["sources"]
    memory = next(iter(client.app.state.conversations.rows.values()))[1]
    assert memory.turns[-1]["assistant"] == body["answer"]
