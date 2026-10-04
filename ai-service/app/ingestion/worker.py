import argparse
import asyncio
import hashlib
import logging
from uuid import NAMESPACE_URL, uuid5

from qdrant_client import models

from app.clients.embeddings import embed
from app.core.config import Settings
from app.core.logging import configure_logging
from app.core.runtime import run_async
from app.ingestion.documents import chunk, extract
from app.retrieval.index import (
    BM25_MODEL,
    DENSE,
    PIPELINE_VERSION,
    SPARSE,
    ensure_collection,
    index_client,
)
from app.storage.files import DocumentFiles
from app.storage.knowledge import KnowledgeRepository

logger = logging.getLogger("waypoint_ai.ingestion")


def source_filter(identifier, version=None):
    fields = [
        models.FieldCondition(key="source_id", match=models.MatchValue(value=str(identifier)))
    ]
    if version is not None:
        fields.append(models.FieldCondition(key="version", match=models.MatchValue(value=version)))
    return models.Filter(must=fields)


async def remove_vectors(client, collection, filters):
    if await client.collection_exists(collection):
        await client.delete(
            collection, points_selector=models.FilterSelector(filter=filters), wait=True
        )


async def process(repository, job, settings):
    context = await repository.context(job)
    files = DocumentFiles(settings.document_storage_path)
    if job["kind"] == "delete":
        versions = await repository.cleanup_versions(job["document_id"])
        client = index_client(settings)
        try:
            for collection in {row["recipe"]["qdrant_collection"] for row in versions}:
                await remove_vectors(client, collection, source_filter(job["document_id"]))
            for row in versions:
                await asyncio.to_thread(files.remove, row["metadata"]["storage_key"])
        finally:
            await client.close()
        await repository.finish(job)
        return
    if context is None:
        raise ValueError("Missing document version")
    pinned = settings.model_copy(update=context["recipe"])
    client = index_client(pinned)
    try:
        if context["deleted"] or context["active_version"] != job["version"]:
            await remove_vectors(
                client, pinned.qdrant_collection, source_filter(job["document_id"], job["version"])
            )
            await repository.finish(job)
            return
        metadata = context["metadata"]
        path = files.path(metadata["storage_key"])
        content = await asyncio.to_thread(path.read_bytes)
        if (
            len(content) != metadata["byte_count"]
            or hashlib.sha256(content).hexdigest() != metadata["sha256"]
        ):
            raise ValueError("Stored document integrity mismatch")
        chunks = await asyncio.to_thread(
            lambda: chunk(extract(path, content), pinned.chunk_size, pinned.chunk_overlap)
        )
        await ensure_collection(client, pinned)
        for offset in range(0, len(chunks), 16):
            batch = chunks[offset : offset + 16]
            vectors = await embed(pinned, [item.text for item in batch], query=False)
            points = [
                models.PointStruct(
                    id=str(
                        uuid5(
                            NAMESPACE_URL,
                            f"managed:{job['document_id']}:{job['version']}:{item.number}",
                        )
                    ),
                    vector={
                        DENSE: vector,
                        SPARSE: models.Document(text=item.text, model=BM25_MODEL),
                    },
                    payload={
                        "source_id": str(job["document_id"]),
                        "version": job["version"],
                        "page": item.page,
                        "chunk": item.number,
                        "title": metadata["title"],
                        "text": item.text,
                        "roles": metadata["allowed_roles"],
                        "depot_id": metadata["depot_ids"],
                        "scope": "depot_policy",
                        "embedding_model": pinned.embedding_model,
                        "pipeline_version": PIPELINE_VERSION,
                        "catalog_managed": True,
                        "indexed": False,
                        "chunk_size": pinned.chunk_size,
                        "chunk_overlap": pinned.chunk_overlap,
                    },
                )
                for item, vector in zip(batch, vectors, strict=True)
            ]
            await client.upsert(pinned.qdrant_collection, points=points, wait=True)
        await client.set_payload(
            pinned.qdrant_collection,
            payload={"indexed": True},
            points=source_filter(job["document_id"], job["version"]),
            wait=True,
        )
        old_versions = source_filter(job["document_id"])
        old_versions.must.append(
            models.FieldCondition(key="version", range=models.Range(lt=job["version"]))
        )
        previous = await repository.cleanup_versions(job["document_id"])
        for collection in {
            row["recipe"]["qdrant_collection"]
            for row in previous
            if row["version"] < job["version"]
        }:
            await remove_vectors(client, collection, old_versions)
        active = await repository.finish(job, chunks=len(chunks))
        if not active:
            latest = await repository.context(job)
            if latest["deleted"] or latest["active_version"] != job["version"]:
                await remove_vectors(
                    client,
                    pinned.qdrant_collection,
                    source_filter(job["document_id"], job["version"]),
                )
    finally:
        await client.close()


async def execute_job(repository, job, settings):
    async def work():
        async with asyncio.timeout(settings.ingestion_timeout_seconds):
            await process(repository, job, settings)

    async def renew():
        while True:
            await asyncio.sleep(30)
            if not await repository.heartbeat(job):
                raise RuntimeError("Job lease lost")

    processing, heartbeat = asyncio.create_task(work()), asyncio.create_task(renew())
    try:
        done, _ = await asyncio.wait([processing, heartbeat], return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            await task
    except Exception as exc:
        # Never persist provider exception text or file contents in job errors/logs.
        await repository.finish(
            job, error="processing_failed", max_attempts=settings.worker_max_attempts
        )
        logger.warning(
            "ingestion_job_failed",
            extra={"job_id": str(job["id"]), "error_type": type(exc).__name__},
        )
    finally:
        for task in (processing, heartbeat):
            task.cancel()
        await asyncio.gather(processing, heartbeat, return_exceptions=True)


async def run(settings, once=False):
    if not settings.database_url:
        raise ValueError("Set AI_DATABASE_URL and initialize knowledge storage first")
    repository = KnowledgeRepository(settings.database_url.get_secret_value())
    while True:
        job = None
        try:
            job = await repository.claim(settings.worker_max_attempts)
            if job:
                await execute_job(repository, job, settings)
        except Exception:
            logger.warning("ingestion_worker_dependency_unavailable")
            if once:
                raise
            await asyncio.sleep(settings.worker_poll_seconds)
        if once:
            return
        if not job:
            await asyncio.sleep(settings.worker_poll_seconds)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PostgreSQL-backed document ingestion worker")
    parser.add_argument("--once", action="store_true", help="Process at most one available job")
    arguments = parser.parse_args()
    configuration = Settings()
    configure_logging(configuration.log_level)
    run_async(run(configuration, arguments.once))
