import asyncio
import json
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from qdrant_client import AsyncQdrantClient, models

from app.agent.contracts import Principal, Source
from app.core.config import Settings
from app.ingestion.documents import chunk, extract
from app.ingestion.seed import seed
from app.main import create_app
from app.retrieval.policies import PolicyRetriever


def test_production_rejects_authentication_bypass():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, environment="production", auth_enabled=False)


def test_empty_template_credentials_do_not_enable_postgres_or_embeddings(tmp_path):
    configuration = tmp_path / ".env"
    configuration.write_text(
        "AI_AUTH_ENABLED=false\nAI_DATABASE_URL=\nAI_EMBEDDING_MODEL=\n", encoding="utf-8"
    )
    settings = Settings(_env_file=configuration)
    assert settings.database_url is None
    assert settings.embedding_model is None
    with TestClient(create_app(settings)) as client:
        assert client.post("/api/v1/chat", json={"message": "Any documents?"}).status_code == 200


@pytest.mark.parametrize("role", ["store_manager", "dispatcher", "driver", "loader"])
def test_document_chat_needs_no_business_auth_or_database_in_development(role):
    class Business:
        async def authenticate(self, token):
            pytest.fail("Development document chat must not call NestJS")

    class Retrieval:
        async def retrieve(self, query, principal):
            assert principal.role == role
            return [Source(id="doc:1", title="Synthetic policy", text="Test excerpt", page=2)]

    class Model:
        async def explain(self, message, sources, *, instructions):
            assert instructions
            return "Supported test explanation [doc:1]"

    app = create_app(
        Settings(
            _env_file=None,
            environment="test",
            auth_enabled=False,
            development_role=role,
            database_url=None,
        )
    )
    app.state.business, app.state.retrieval, app.state.model = Business(), Retrieval(), Model()
    with TestClient(app) as client:
        response = client.post("/api/v1/chat", json={"message": "Explain the document"})
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "answered"
        assert body["sources"][0]["page"] == 2
        assert (
            client.post(
                "/api/v1/chat",
                json={"message": "Follow up", "conversation_id": body["conversation_id"]},
            ).status_code
            == 200
        )
        assert (
            client.post(
                "/api/v1/chat",
                json={"message": "Why deferred?", "workflow": "deferral_qa", "order_id": 42},
            ).status_code
            == 503
        )


def test_no_indexed_knowledge_is_reported_without_inventing_answers():
    app = create_app(
        Settings(_env_file=None, environment="test", auth_enabled=False, embedding_model=None)
    )
    with TestClient(app) as client:
        response = client.post("/api/v1/chat", json={"message": "Make up our terms"})
        assert response.status_code == 200
        assert response.json()["status"] == "no_knowledge"
        assert response.json()["sources"] == []


def test_chunking_preserves_page_references_and_bounds():
    pages = [(1, " ".join(f"word{i}" for i in range(500))), (2, "second page")]
    result = chunk(pages, size=1200, overlap=150)
    assert all(0 < len(item.text) <= 1200 for item in result)
    assert result[-1].page == 2
    # Page-one chunks overlap and preserve the complete normalized text in order.
    combined = result[0].text
    for item in result[1:-1]:
        overlap = max(
            (
                n
                for n in range(min(len(combined), len(item.text)) + 1)
                if combined.endswith(item.text[:n])
            ),
            default=0,
        )
        combined += item.text[overlap:]
    assert combined == pages[0][1].strip()


def test_extraction_rejects_empty_or_disguised_files(tmp_path):
    empty = tmp_path / "empty.txt"
    empty.write_text("  ", encoding="utf-8")
    with pytest.raises(ValueError, match="No extractable text"):
        extract(empty)
    disguised = tmp_path / "fake.pdf"
    disguised.write_bytes(b"Not a PDF")
    with pytest.raises(ValueError, match="signature"):
        extract(disguised)


def test_local_hybrid_query_omits_role_depot_authorization_only(monkeypatch):
    seen = {}

    async def embeddings(*args, **kwargs):
        return [[1.0, 0.0]]

    class Index:
        async def query_points(self, **kwargs):
            seen.update(kwargs)
            return SimpleNamespace(points=[])

        async def close(self):
            pass

    monkeypatch.setattr("app.retrieval.policies.embed", embeddings)
    monkeypatch.setattr("app.retrieval.policies.index_client", lambda settings: Index())
    settings = Settings(_env_file=None, auth_enabled=False, embedding_model="test")
    asyncio.run(
        PolicyRetriever(settings).retrieve("test", Principal(id=0, role="driver", depotId=1))
    )
    fields = {item.key for item in seen["query_filter"].must}
    assert "roles" not in fields and "depot_id" not in fields
    assert {"approved", "current", "pipeline_version", "embedding_model"} <= fields
    assert all(query.filter == seen["query_filter"] for query in seen["prefetch"])
    assert seen["query"].fusion == models.Fusion.RRF


@pytest.mark.parametrize("fail", [False, True])
def test_seed_publishes_after_indexing_and_cleans_up_failed_batches(tmp_path, monkeypatch, fail):
    document = tmp_path / "synthetic.txt"
    document.write_text("Synthetic delivery policy. " * 20, encoding="utf-8")
    events = []

    async def embeddings(settings, texts, *, query):
        assert query is False
        return [[1.0, 0.0] for _ in texts]

    class Index:
        async def collection_exists(self, name):
            return True

        async def get_collection(self, name):
            return SimpleNamespace(
                config=SimpleNamespace(
                    params=SimpleNamespace(
                        vectors={
                            "dense": models.VectorParams(size=2, distance=models.Distance.COSINE)
                        },
                        sparse_vectors={
                            "bm25": models.SparseVectorParams(modifier=models.Modifier.IDF)
                        },
                    )
                )
            )

        async def count(self, *args, **kwargs):
            return SimpleNamespace(count=0)

        async def upsert(self, *args, points, **kwargs):
            events.append("upsert")
            assert all(point.payload["current"] is False for point in points)
            assert all(len(point.payload["text"]) <= 200 for point in points)
            assert all(point.payload["chunk_size"] == 200 for point in points)
            assert all(point.payload["chunk_overlap"] == 20 for point in points)
            assert points[0].vector["bm25"].model == "qdrant/bm25"
            if fail:
                raise RuntimeError("Simulated index failure")

        async def set_payload(self, *args, **kwargs):
            events.append("publish")

        async def delete(self, *args, **kwargs):
            events.append("delete")

        async def close(self):
            events.append("close")

    monkeypatch.setattr("app.ingestion.seed.embed", embeddings)
    monkeypatch.setattr("app.ingestion.seed.index_client", lambda settings: Index())
    settings = Settings(
        _env_file=None, auth_enabled=False, embedding_dimensions=2, chunk_size=200, chunk_overlap=20
    )
    if fail:
        with pytest.raises(RuntimeError):
            asyncio.run(seed(settings, document, "Synthetic policy"))
        assert events == ["upsert", "delete", "close"]
    else:
        result = asyncio.run(seed(settings, document, "Synthetic policy"))
        assert result["status"] == "ready"
        assert events == ["upsert", "publish", "close"]


def test_manual_seed_is_not_a_production_ingestion_api():
    with pytest.raises(ValueError):
        asyncio.run(
            seed(Settings(_env_file=None, environment="production"), Path("unused.txt"), "test")
        )


def test_sdk_forwards_bm25_to_configured_server_without_local_model_download():
    seen = []

    def respond(request):
        seen.append(request)
        return httpx.Response(200, json={"result": {"points": []}, "status": "ok", "time": 0.0})

    async def run():
        client = AsyncQdrantClient(
            url="http://localhost:6333",
            cloud_inference=True,
            check_compatibility=False,
            transport=httpx.MockTransport(respond),
        )
        try:
            await client.query_points(
                "test",
                prefetch=[
                    models.Prefetch(query=[1.0, 0.0], using="dense", limit=20),
                    models.Prefetch(
                        query=models.Document(text="exact-code", model="qdrant/bm25"),
                        using="bm25",
                        limit=20,
                    ),
                ],
                query=models.FusionQuery(fusion=models.Fusion.RRF),
                limit=3,
            )
        finally:
            await client.close()

    asyncio.run(run())
    assert seen[0].url.host == "localhost"
    body = json.loads(seen[0].content)
    assert body["prefetch"][1]["query"] == {"text": "exact-code", "model": "qdrant/bm25"}
    assert body["query"] == {"fusion": "rrf"}
