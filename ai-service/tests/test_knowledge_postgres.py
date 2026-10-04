"""Opt-in real PostgreSQL checks, isolated in a temporary schema."""

import asyncio
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import UUID, uuid4

import httpx
import psycopg
import pytest
from fastapi import HTTPException
from psycopg import sql
from psycopg.rows import dict_row

from app.agent.contracts import Principal
from app.core.config import Settings
from app.core.runtime import run_async
from app.ingestion import worker
from app.main import create_app
from app.retrieval import policies
from app.retrieval.index import index_client
from app.storage.knowledge import KnowledgeRepository


@pytest.fixture
def repository():
    url = os.getenv("AI_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set AI_TEST_DATABASE_URL for isolated real PostgreSQL checks")
    schema = "ai_test_" + uuid4().hex

    @asynccontextmanager
    async def connection():
        async with await psycopg.AsyncConnection.connect(
            url, connect_timeout=5, row_factory=dict_row
        ) as conn:
            await conn.execute(sql.SQL("SET search_path TO {}").format(sql.Identifier(schema)))
            yield conn

    async def setup():
        async with await psycopg.AsyncConnection.connect(url) as conn:
            await conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        async with connection() as conn:
            await conn.execute(Path("app/storage/knowledge_schema.sql").read_text(), prepare=False)

    async def teardown():
        async with await psycopg.AsyncConnection.connect(url) as conn:
            await conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))

    run_async(setup())
    repo = KnowledgeRepository(url)
    repo.connection = connection
    try:
        yield repo
    finally:
        run_async(teardown())


async def register(repo, *, key=None, identifier=None, title="Terms"):
    return await repo.register(
        {
            "title": title,
            "sha256": "a" * 64,
            "storage_key": str(uuid4()) + ".txt",
            "allowed_roles": ["store_manager"],
            "depot_ids": [1],
        },
        {"qdrant_collection": "synthetic"},
        "terms.txt",
        key or uuid4(),
        7,
        identifier,
    )


def test_catalog_lifecycle_and_immediate_permission_revocation(repository):
    async def scenario():
        receipt, created = await register(repository)
        identifier = UUID(receipt["document_id"])
        principal = Principal(id=1, role="store_manager", depotId=1)
        payload = [{"source_id": str(identifier), "version": 1}]
        assert created and not await repository.allowed(payload, principal, True)
        with pytest.raises(HTTPException) as error:
            await repository.approve(identifier, 1)
        assert error.value.status_code == 409
        job = await repository.claim(3)
        assert await repository.claim(3) is None  # Live lease cannot be claimed twice.
        assert await repository.heartbeat(job)
        assert await repository.finish(job, chunks=4)
        assert not await repository.allowed(payload, principal, True)  # Ready is still draft.
        await repository.approve(identifier, 1)
        assert await repository.allowed(payload, principal, True) == {(str(identifier), 1)}
        outsider = Principal(id=2, role="store_manager", depotId=2)
        assert not await repository.allowed(payload, outsider, True)
        assert await repository.allowed(payload, outsider, False)
        replacement, _ = await register(repository, identifier=identifier)
        assert replacement["version"] == 2
        assert not await repository.allowed(payload, principal, True)
        with pytest.raises(HTTPException):
            await repository.approve(identifier, 1)
        next_job = await repository.claim(3)
        await repository.finish(next_job)
        await repository.approve(identifier, 2)
        assert await repository.allowed(payload, principal, True) == {(str(identifier), 2)}
        deleted = await repository.delete(identifier)
        assert not await repository.allowed(payload, principal, True)
        assert (await repository.delete(identifier))["job_id"] == deleted["job_id"]
        with pytest.raises(HTTPException):
            await repository.detail(identifier)
        assert (await repository.list(1, 20))["total"] == 0

    run_async(scenario())


def test_idempotency_and_concurrent_replacements(repository):
    async def scenario():
        key = uuid4()
        first, replay = await asyncio.gather(
            register(repository, key=key), register(repository, key=key)
        )
        assert first[0] == replay[0] and sorted([first[1], replay[1]]) == [False, True]
        with pytest.raises(HTTPException) as error:
            await register(repository, key=key, title="Different")
        assert error.value.status_code == 409
        identifier = UUID(first[0]["document_id"])
        results = await asyncio.gather(
            register(repository, identifier=identifier), register(repository, identifier=identifier)
        )
        assert sorted(result[0]["version"] for result in results) == [2, 3]
        assert (await repository.detail(identifier))["active_version"] == 3

    run_async(scenario())


def test_crashed_worker_recovery_and_stale_lease_cannot_publish(repository):
    async def scenario():
        receipt, _ = await register(repository)
        job = await repository.claim(3)
        async with repository.connection() as conn:
            await conn.execute(
                "UPDATE ai_ingestion_jobs SET lease_until = now() - interval '1 second'"
            )
        reclaimed = await repository.claim(3)
        assert reclaimed["id"] == job["id"] and reclaimed["attempts"] == 2
        assert reclaimed["lease_token"] != job["lease_token"]
        assert not await repository.finish(job)
        await repository.finish(reclaimed, error="processing_failed", max_attempts=2)
        status = await repository.job_status(UUID(receipt["job_id"]))
        assert status["state"] == "failed" and "lease_token" not in status
        retried = await repository.retry(UUID(receipt["document_id"]), 1)
        assert retried["job_id"] != receipt["job_id"]
        third = await repository.claim(3)
        assert third["attempts"] == 1

    run_async(scenario())


def test_exhausted_crashed_jobs_and_retry_backoff(repository):
    async def scenario():
        receipt, _ = await register(repository)
        job = await repository.claim(3)
        await repository.finish(job, error="processing_failed")
        assert await repository.claim(3) is None  # Backoff is persisted.
        async with repository.connection() as conn:
            await conn.execute("UPDATE ai_ingestion_jobs SET available_at = now()")
        job = await repository.claim(3)
        async with repository.connection() as conn:
            await conn.execute(
                "UPDATE ai_ingestion_jobs SET lease_until = now() - interval '1 second'"
            )
        assert await repository.claim(2) is None
        detail = await repository.detail(UUID(receipt["document_id"]))
        assert detail["versions"][0]["error_code"] == "worker_interrupted"
        assert detail["versions"][0]["ingestion_status"] == "failed"

    run_async(scenario())


def test_real_http_worker_and_hybrid_index_lifecycle(repository, tmp_path, monkeypatch):
    url = os.getenv("AI_TEST_QDRANT_URL")
    if not url:
        pytest.skip("Set AI_TEST_QDRANT_URL for the isolated hybrid-index lifecycle check")
    settings = Settings(
        _env_file=None,
        environment="test",
        auth_enabled=False,
        database_url=None,
        document_storage_path=tmp_path,
        embedding_model="synthetic",
        gemini_api_key="synthetic",
        qdrant_url=url,
        qdrant_api_key=os.getenv("AI_TEST_QDRANT_API_KEY"),
        qdrant_collection="ai_test_" + uuid4().hex,
    )

    async def synthetic_embeddings(settings, texts, query):
        return [[1.0] + [0.0] * 767 for _ in texts]

    monkeypatch.setattr(worker, "embed", synthetic_embeddings)
    monkeypatch.setattr(policies, "embed", synthetic_embeddings)

    async def scenario():
        app = create_app(settings)
        app.state.knowledge = repository
        principal = Principal(id=1, role="store_manager", depotId=1)
        retrieval = policies.PolicyRetriever(settings, repository)
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:

            async def upload(path, text):
                response = await client.post(
                    path,
                    headers={"Idempotency-Key": str(uuid4())},
                    files={"file": ("terms.txt", text.encode())},
                    data={
                        "metadata": json.dumps(
                            {"title": "Terms", "allowed_roles": ["store_manager"], "depot_ids": [1]}
                        )
                    },
                )
                assert response.status_code == 202
                return response.json()

            created = await upload(
                "/api/v1/documents", "Store orders require complete load details."
            )
            identifier = created["document_id"]
            job = await repository.claim(3)
            await worker.process(repository, job, settings)
            assert not await retrieval.retrieve("Store orders", principal)
            response = await client.post(
                f"/api/v1/documents/{identifier}/approve", json={"version": 1}
            )
            assert response.status_code == 200
            result = await retrieval.retrieve("Store orders", principal)
            assert result and result[0].source_id == identifier and result[0].version == 1
            await upload(
                f"/api/v1/documents/{identifier}/versions",
                "Store orders need an accurate requested date.",
            )
            assert not await retrieval.retrieve("Store orders", principal)
            await worker.process(repository, await repository.claim(3), settings)
            response = await client.post(
                f"/api/v1/documents/{identifier}/approve", json={"version": 2}
            )
            assert response.status_code == 200
            result = await retrieval.retrieve("Store orders", principal)
            assert result and all(source.version == 2 for source in result)
            response = await client.delete(f"/api/v1/documents/{identifier}")
            assert response.status_code == 202
            assert not await retrieval.retrieve("Store orders", principal)
            await worker.process(repository, await repository.claim(3), settings)
            assert not list(tmp_path.iterdir())

    async def cleanup():
        client = index_client(settings)
        try:
            if await client.collection_exists(settings.qdrant_collection):
                await client.delete_collection(settings.qdrant_collection)
        finally:
            await client.close()

    try:
        run_async(scenario())
    finally:
        run_async(cleanup())
