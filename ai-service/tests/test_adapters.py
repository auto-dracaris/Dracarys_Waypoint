import asyncio
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException

from app.agent.contracts import Principal, Source
from app.clients.business import BusinessClient
from app.clients.model import ModelClient
from app.core.config import Settings
from app.retrieval.policies import PolicyRetriever


def test_business_auth_uses_real_envelope_and_forwards_bearer(monkeypatch):
    seen = []

    def handler(request):
        seen.append(request)
        return httpx.Response(
            200,
            json={
                "data": {
                    "id": 1,
                    "status": "active",
                    "role": "store_manager",
                    "depotId": 2,
                    "outletId": 3,
                }
            },
        )

    original = httpx.AsyncClient
    monkeypatch.setattr(
        "app.clients.business.httpx.AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs),
    )
    principal = asyncio.run(BusinessClient(Settings(_env_file=None)).authenticate("opaque-token"))
    assert principal.outletId == 3
    assert seen[0].url.path == "/api/auth/me"
    assert seen[0].headers["authorization"] == "Bearer opaque-token"


def test_unimplemented_deferral_endpoint_fails_closed():
    client = BusinessClient(Settings(_env_file=None, deferral_endpoint=None))
    with pytest.raises(HTTPException) as failure:
        asyncio.run(client.deferral(42, Principal(id=1, role="dispatcher", depotId=2), "token"))
    assert failure.value.status_code == 503


class GoogleFake:
    response = '{"answer":"A policy claim", "source_ids":["invented"]}'

    def __init__(self, **kwargs):
        self.aio = self
        self.models = self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass

    async def generate_content(self, **kwargs):
        return SimpleNamespace(text=self.response)

    async def embed_content(self, **kwargs):
        return SimpleNamespace(embeddings=[SimpleNamespace(values=[0.1, 0.2])])


def test_unknown_model_citations_are_discarded(monkeypatch):
    monkeypatch.setattr("app.clients.model.genai.Client", GoogleFake)
    model = ModelClient(Settings(_env_file=None, gemini_api_key="test", gemini_model="test"))
    assert (
        asyncio.run(model.explain("Explain", [Source(id="known", title="Test", text="text")]))
        is None
    )


def test_retrieval_enforces_approved_current_role_depot_and_model(monkeypatch):
    seen = {}

    class QdrantFake:
        def __init__(self, **kwargs):
            pass

        async def query_points(self, **kwargs):
            seen.update(kwargs)
            return SimpleNamespace(points=[])

        async def close(self):
            seen["closed"] = True

    monkeypatch.setattr("app.clients.embeddings.genai.Client", GoogleFake)
    monkeypatch.setattr("app.retrieval.policies.index_client", lambda settings: QdrantFake())
    retrieval = PolicyRetriever(
        Settings(
            _env_file=None,
            gemini_api_key="test",
            embedding_model="test-embedding",
            embedding_dimensions=2,
        )
    )
    asyncio.run(retrieval.retrieve("deferral", Principal(id=1, role="store_manager", depotId=2)))
    conditions = {item.key: item.match.value for item in seen["query_filter"].must}
    assert conditions == {
        "approved": True,
        "current": True,
        "scope": "depot_policy",
        "roles": "store_manager",
        "depot_id": 2,
        "embedding_model": "test-embedding",
        "pipeline_version": "hybrid-v1",
    }
    assert seen["limit"] == 3
    assert seen["closed"]
    assert [query.using for query in seen["prefetch"]] == ["dense", "bm25"]
    assert seen["query"].fusion.value == "rrf"
