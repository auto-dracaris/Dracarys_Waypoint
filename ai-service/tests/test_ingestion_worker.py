import asyncio
from uuid import uuid4

import pytest

from app.core.config import Settings
from app.ingestion import worker
from app.storage.files import DocumentFiles


class Repository:
    def __init__(self, context):
        self.row = context
        self.finished = []

    async def context(self, job):
        return self.row

    async def cleanup_versions(self, identifier):
        return [{"version": 1, "recipe": self.row["recipe"], "metadata": self.row["metadata"]}]

    async def finish(self, job, **kwargs):
        self.finished.append(kwargs)
        return not self.row["deleted"] and self.row["active_version"] == job["version"]


class Index:
    def __init__(self):
        self.points = []
        self.published = False
        self.deleted = []
        self.closed = False

    async def collection_exists(self, name):
        return True

    async def upsert(self, collection, points, wait):
        assert all(point.payload["indexed"] is False for point in points)
        self.points.extend(points)

    async def set_payload(self, collection, payload, points, wait):
        assert self.points and payload == {"indexed": True}
        self.published = True

    async def delete(self, collection, points_selector, wait):
        self.deleted.append(points_selector.filter)

    async def close(self):
        self.closed = True


@pytest.fixture
def setup(tmp_path, monkeypatch):
    content = b"Synthetic depot terms. " * 20
    key, digest = DocumentFiles(tmp_path).put(content, ".txt")
    settings = Settings(
        _env_file=None,
        auth_enabled=False,
        document_storage_path=tmp_path,
        embedding_model="synthetic",
        database_url=None,
    )
    context = {
        "deleted": False,
        "active_version": 2,
        "metadata": {
            "storage_key": key,
            "byte_count": len(content),
            "sha256": digest,
            "title": "Terms",
            "allowed_roles": ["driver"],
            "depot_ids": [1],
        },
        "recipe": {
            "qdrant_collection": "synthetic",
            "chunk_size": 1200,
            "chunk_overlap": 150,
            "embedding_model": "synthetic",
            "embedding_dimensions": 768,
        },
    }
    repository, index = Repository(context), Index()
    job = {
        "id": uuid4(),
        "document_id": uuid4(),
        "version": 2,
        "kind": "ingest",
        "attempts": 1,
        "lease_token": uuid4(),
    }
    monkeypatch.setattr(worker, "index_client", lambda settings: index)

    async def collection(*args):
        return None

    async def embeddings(settings, texts, query):
        return [[1.0] + [0.0] * 767 for _ in texts]

    monkeypatch.setattr(worker, "ensure_collection", collection)
    monkeypatch.setattr(worker, "embed", embeddings)
    return settings, repository, index, job


def test_worker_indexes_draft_and_removes_only_older_versions(setup):
    settings, repository, index, job = setup
    asyncio.run(worker.process(repository, job, settings))
    assert index.published and index.closed
    assert repository.finished == [{"chunks": 1}]
    assert "approved" not in index.points[0].payload  # Approval belongs to the catalog.
    assert index.points[0].payload["depot_id"] == [1]
    assert index.deleted[0].must[-1].range.lt == 2
    assert not index.deleted[0].must_not  # Never delete future versions by exclusion.


def test_failed_embedding_never_publishes_or_logs_provider_details(setup, monkeypatch, caplog):
    settings, repository, index, job = setup

    async def broken(*args, **kwargs):
        raise RuntimeError("secret provider error and document contents")

    monkeypatch.setattr(worker, "embed", broken)
    asyncio.run(worker.execute_job(repository, job, settings))
    assert not index.published and index.closed
    assert repository.finished == [{"error": "processing_failed", "max_attempts": 3}]
    assert "secret" not in caplog.text


def test_superseded_job_cannot_index_newer_version(setup):
    settings, repository, index, job = setup
    repository.row["active_version"] = 3
    asyncio.run(worker.process(repository, job, settings))
    assert not index.points and not index.published
    assert index.deleted[0].must[-1].match.value == 2


def test_replacement_during_processing_removes_own_stale_points(setup):
    settings, repository, index, job = setup
    original = index.set_payload

    async def publish(*args, **kwargs):
        await original(*args, **kwargs)
        repository.row["active_version"] = 3

    index.set_payload = publish
    asyncio.run(worker.process(repository, job, settings))
    assert index.deleted[-1].must[-1].match.value == 2


def test_delete_worker_removes_originals_and_vectors(setup):
    settings, repository, index, job = setup
    job["kind"] = "delete"
    repository.row["deleted"] = True
    asyncio.run(worker.process(repository, job, settings))
    assert not list(settings.document_storage_path.iterdir())
    assert index.deleted and index.closed


def test_integrity_mismatch_fails_before_embedding(setup):
    settings, repository, index, job = setup
    repository.row["metadata"]["sha256"] = "0" * 64
    asyncio.run(worker.execute_job(repository, job, settings))
    assert not index.points and not index.published
    assert repository.finished[0]["error"] == "processing_failed"
