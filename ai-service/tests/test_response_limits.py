import pytest
from test_business_tools import client as client  # noqa: F401

from app.agent.contracts import Deferral, Source
from app.guardrails.output import guarded_reply


def test_short_answer_preserves_status_citation_and_sources():
    result = {
        "answer": "Your order is confirmed. [api:orders:42]",
        "status": "answered",
        "sources": [Source(id="api:orders:42", title="Order", text="Your order is confirmed.")],
    }
    assert guarded_reply(result) == result


@pytest.mark.parametrize("answer", ["Long fact. " * 100, "x" * 901])
def test_long_supported_answer_is_not_replaced_by_a_length_warning(answer):
    source = Source(id="policy:terms", title="Terms", text="Delivery is not guaranteed.")
    result = {
        "answer": answer,
        "status": "answered",
        "sources": [source],
        "planning_unavailable": True,
    }
    guarded = guarded_reply(result)
    assert guarded["answer"] == answer
    assert guarded["status"] == "answered"
    assert guarded["sources"] == [source]
    assert guarded["planning_unavailable"] is True


@pytest.mark.parametrize("workflow", ["business_qa", "knowledge_qa", "deferral_qa"])
def test_full_answer_is_returned_and_saved_across_workflows(client, workflow):
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
    expected = "Long fact. " * 150 if workflow == "business_qa" else "Long policy. " * 150
    assert expected.strip() in body["answer"]
    assert body["status"] == "answered" and body["sources"]
    memory = next(iter(client.app.state.conversations.rows.values()))[1]
    assert memory.turns[-1]["assistant"] == body["answer"]
