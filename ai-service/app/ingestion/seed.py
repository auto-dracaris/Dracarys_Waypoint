"""Manual local document seeding; not the future authenticated admin ingestion API."""

import argparse
import asyncio
import hashlib
from pathlib import Path
from uuid import NAMESPACE_URL, UUID, uuid5

from qdrant_client import models

from app.clients.embeddings import embed
from app.core.config import Settings
from app.ingestion.documents import chunk, extract
from app.retrieval.index import (
    BM25_MODEL,
    DENSE,
    PIPELINE_VERSION,
    SPARSE,
    ensure_collection,
    index_client,
)


async def seed(settings: Settings, path: Path, title: str):
    if settings.environment == "production" or settings.auth_enabled:
        raise ValueError(
            "Manual seeding is only available in unauthenticated document development mode"
        )
    title = title.strip()
    if not 1 <= len(title) <= 200:
        raise ValueError("Provide a title between 1 and 200 characters")
    # Parse completely before external writes. Do not upload original documents to Gemini.
    if path.stat().st_size > 20 * 1024 * 1024:
        raise ValueError("Document exceeds the 20 MiB development limit")
    content = path.read_bytes()
    chunks = await asyncio.to_thread(
        lambda: chunk(extract(path, content), settings.chunk_size, settings.chunk_overlap)
    )
    digest = hashlib.sha256(content).hexdigest()
    source_id = str(uuid5(NAMESPACE_URL, f"waypoint-development:{digest}"))
    filters = models.Filter(
        must=[models.FieldCondition(key="source_id", match=models.MatchValue(value=source_id))]
    )
    client = index_client(settings)
    started = False
    try:
        await ensure_collection(client, settings)
        count = await client.count(settings.qdrant_collection, count_filter=filters, exact=True)
        if count.count:
            raise ValueError(
                "This document is already indexed; use the delete command before reseeding"
            )
        started = True
        for offset in range(0, len(chunks), 16):
            batch = chunks[offset : offset + 16]
            vectors = await embed(settings, [item.text for item in batch], query=False)
            points = [
                models.PointStruct(
                    id=str(uuid5(UUID(source_id), str(item.number))),
                    vector={
                        DENSE: vector,
                        SPARSE: models.Document(text=item.text, model=BM25_MODEL),
                    },
                    payload={
                        "source_id": source_id,
                        "version": 1,
                        "chunk": item.number,
                        "page": item.page,
                        "title": title,
                        "text": item.text,
                        "filename": path.name,
                        "sha256": digest,
                        "approved": False,
                        "current": False,
                        "scope": "depot_policy",
                        "roles": ["store_manager", "dispatcher", "driver", "loader"],
                        "depot_id": 1,
                        "embedding_model": settings.embedding_model,
                        "pipeline_version": PIPELINE_VERSION,
                        "chunk_size": settings.chunk_size,
                        "chunk_overlap": settings.chunk_overlap,
                    },
                )
                for item, vector in zip(batch, vectors, strict=True)
            ]
            await client.upsert(settings.qdrant_collection, points=points, wait=True)
        # Publish only after all chunks exist. Manual seeding acts as development approval.
        await client.set_payload(
            settings.qdrant_collection,
            payload={"approved": True, "current": True},
            points=filters,
            wait=True,
        )
        return {"source_id": source_id, "chunks": len(chunks), "status": "ready"}
    except BaseException:
        if started:
            await client.delete(
                settings.qdrant_collection,
                points_selector=models.FilterSelector(filter=filters),
                wait=True,
            )
        raise
    finally:
        await client.close()


async def delete(settings: Settings, source_id: UUID):
    if settings.environment == "production" or settings.auth_enabled:
        raise ValueError("Manual deletion is only available in document development mode")
    client = index_client(settings)
    try:
        filters = models.Filter(
            must=[
                models.FieldCondition(
                    key="source_id", match=models.MatchValue(value=str(source_id))
                )
            ]
        )
        await client.delete(
            settings.qdrant_collection,
            points_selector=models.FilterSelector(filter=filters),
            wait=True,
        )
    finally:
        await client.close()


if __name__ == "__main__":
    import json

    parser = argparse.ArgumentParser(description="Local development knowledge seeding")
    commands = parser.add_subparsers(dest="command", required=True)
    upload = commands.add_parser("add")
    upload.add_argument("path", type=Path)
    upload.add_argument("--title", required=True)
    remove = commands.add_parser("delete")
    remove.add_argument("source_id", type=UUID)
    arguments = parser.parse_args()
    configuration = Settings()
    if arguments.command == "add":
        print(json.dumps(asyncio.run(seed(configuration, arguments.path, arguments.title))))
    else:
        asyncio.run(delete(configuration, arguments.source_id))
        print("Document removed from the development index")
