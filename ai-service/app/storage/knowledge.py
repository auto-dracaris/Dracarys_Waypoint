import hashlib
import json
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import UUID, uuid4

import psycopg
from fastapi import HTTPException
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


def fingerprint(value: dict) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


class KnowledgeRepository:
    def __init__(self, url: str):
        self.url = url

    @asynccontextmanager
    async def connection(self):
        async with await psycopg.AsyncConnection.connect(
            self.url, connect_timeout=5, row_factory=dict_row
        ) as connection:
            yield connection

    async def register(self, metadata, recipe, filename, key, actor, document_id=None):
        public_metadata = {name: value for name, value in metadata.items() if name != "storage_key"}
        signature = fingerprint(
            {
                "metadata": public_metadata,
                "filename": filename,
                "document": str(document_id),
                "actor": actor,
            }
        )
        async with self.connection() as connection:
            await connection.execute(
                "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (str(key),)
            )
            cursor = await connection.execute(
                "SELECT * FROM ai_document_requests WHERE key = %s", (key,)
            )
            previous = await cursor.fetchone()
            if previous:
                if previous["fingerprint"] != signature:
                    raise HTTPException(409, "Idempotency key already used for a different upload")
                return previous["receipt"], False
            if document_id:
                document = await self._lock(connection, document_id)
                version = document["active_version"] + 1
                await connection.execute(
                    "UPDATE ai_documents SET active_version = %s, updated_at = now() WHERE id = %s",
                    (version, document_id),
                )
            else:
                document_id, version = uuid4(), 1
                await connection.execute(
                    "INSERT INTO ai_documents(id, active_version) VALUES (%s, 1)", (document_id,)
                )
            await connection.execute(
                "INSERT INTO ai_document_versions(document_id, version, metadata, recipe, "
                "filename) "
                "VALUES (%s, %s, %s, %s, %s)",
                (document_id, version, Jsonb(metadata), Jsonb(recipe), filename),
            )
            receipt = await self._enqueue(connection, document_id, version, "ingest")
            await connection.execute(
                "INSERT INTO ai_document_requests VALUES (%s, %s, %s)",
                (key, signature, Jsonb(receipt)),
            )
            return receipt, True

    async def _lock(self, connection, identifier, include_deleted=False):
        cursor = await connection.execute(
            "SELECT * FROM ai_documents WHERE id = %s FOR UPDATE", (identifier,)
        )
        document = await cursor.fetchone()
        if document is None or (document["deleted"] and not include_deleted):
            raise HTTPException(404, "Document not found")
        return document

    async def _enqueue(self, connection, identifier, version, kind):
        job_id = uuid4()
        await connection.execute(
            "INSERT INTO ai_ingestion_jobs(id, document_id, version, kind) VALUES (%s, %s, %s, %s)",
            (job_id, identifier, version, kind),
        )
        return {
            "document_id": str(identifier),
            "version": version,
            "job_id": str(job_id),
            "status": "queued",
        }

    async def list(self, page, limit):
        async with self.connection() as connection:
            cursor = await connection.execute(
                "SELECT d.id, d.active_version, d.created_at, v.metadata, v.ingestion_status, "
                "v.approved, v.error_code, v.chunks FROM ai_documents d JOIN "
                "ai_document_versions v "
                "ON v.document_id = d.id AND v.version = d.active_version WHERE NOT d.deleted "
                "ORDER BY d.created_at DESC, d.id LIMIT %s OFFSET %s",
                (limit, (page - 1) * limit),
            )
            rows = await cursor.fetchall()
            cursor = await connection.execute(
                "SELECT count(*) AS total FROM ai_documents WHERE NOT deleted"
            )
            return {
                "items": rows,
                "page": page,
                "limit": limit,
                "total": (await cursor.fetchone())["total"],
            }

    async def detail(self, identifier):
        async with self.connection() as connection:
            cursor = await connection.execute(
                "SELECT * FROM ai_documents WHERE id = %s AND NOT deleted", (identifier,)
            )
            document = await cursor.fetchone()
            if document is None:
                raise HTTPException(404, "Document not found")
            cursor = await connection.execute(
                "SELECT version, metadata, recipe, filename, approved, ingestion_status, "
                "error_code, "
                "chunks, created_at FROM ai_document_versions WHERE document_id = %s ORDER "
                "BY version DESC",
                (identifier,),
            )
            document["versions"] = await cursor.fetchall()
            return document

    async def job_status(self, identifier):
        async with self.connection() as connection:
            cursor = await connection.execute(
                "SELECT id, document_id, version, kind, state, attempts, error_code, "
                "created_at FROM ai_ingestion_jobs WHERE id = %s",
                (identifier,),
            )
            row = await cursor.fetchone()
            if row is None:
                raise HTTPException(404, "Job not found")
            return row

    async def cleanup_versions(self, identifier):
        async with self.connection() as connection:
            cursor = await connection.execute(
                "SELECT version, metadata, recipe FROM ai_document_versions WHERE document_id = %s",
                (identifier,),
            )
            return await cursor.fetchall()

    async def approve(self, identifier, version):
        async with self.connection() as connection:
            document = await self._lock(connection, identifier)
            if document["active_version"] != version:
                raise HTTPException(409, "Document version changed; review the current version")
            cursor = await connection.execute(
                "SELECT ingestion_status FROM ai_document_versions WHERE document_id = %s "
                "AND version = %s",
                (identifier, version),
            )
            if (await cursor.fetchone())["ingestion_status"] != "ready":
                raise HTTPException(409, "Document must finish processing before approval")
            await connection.execute(
                "UPDATE ai_document_versions SET approved = true WHERE document_id = %s AND "
                "version = %s",
                (identifier, version),
            )
            return {"document_id": str(identifier), "version": version, "approved": True}

    async def delete(self, identifier):
        async with self.connection() as connection:
            document = await self._lock(connection, identifier, include_deleted=True)
            if document["deleted"]:
                cursor = await connection.execute(
                    "SELECT id, state FROM ai_ingestion_jobs WHERE document_id = %s AND kind = "
                    "'delete' ORDER BY created_at DESC LIMIT 1",
                    (identifier,),
                )
                previous = await cursor.fetchone()
                if previous["state"] == "failed":
                    return await self._enqueue(
                        connection, identifier, document["active_version"], "delete"
                    )
                return {
                    "document_id": str(identifier),
                    "version": document["active_version"],
                    "job_id": str(previous["id"]),
                    "status": "deleted",
                }
            await connection.execute(
                "UPDATE ai_documents SET deleted = true, updated_at = now() WHERE id = %s",
                (identifier,),
            )
            return await self._enqueue(connection, identifier, document["active_version"], "delete")

    async def retry(self, identifier, version):
        async with self.connection() as connection:
            document = await self._lock(connection, identifier)
            if version != document["active_version"]:
                raise HTTPException(409, "Only the current version can be retried")
            cursor = await connection.execute(
                "SELECT ingestion_status FROM ai_document_versions WHERE document_id = %s "
                "AND version = %s FOR UPDATE",
                (identifier, version),
            )
            if (await cursor.fetchone())["ingestion_status"] != "failed":
                raise HTTPException(409, "Only failed processing can be retried")
            await connection.execute(
                "UPDATE ai_document_versions SET ingestion_status = 'queued', error_code = "
                "NULL WHERE document_id = %s AND version = %s",
                (identifier, version),
            )
            return await self._enqueue(connection, identifier, version, "ingest")

    async def claim(self, max_attempts):
        token = uuid4()
        async with self.connection() as connection:
            # Exhausted crashed jobs become visible failures rather than staying stuck forever.
            cursor = await connection.execute(
                "UPDATE ai_ingestion_jobs SET state = 'failed', error_code = 'worker_interrupted' "
                "WHERE state = 'running' AND lease_until < now() AND attempts >= %s "
                "RETURNING document_id, version, kind",
                (max_attempts,),
            )
            for row in await cursor.fetchall():
                if row["kind"] == "ingest":
                    await connection.execute(
                        "UPDATE ai_document_versions SET ingestion_status = 'failed', error_code = "
                        "'worker_interrupted' WHERE document_id = %s AND version = %s AND "
                        "ingestion_status <> 'ready'",
                        (row["document_id"], row["version"]),
                    )
            cursor = await connection.execute(
                "WITH candidate AS (SELECT id FROM ai_ingestion_jobs WHERE attempts < %s AND "
                "((state = 'queued' AND available_at <= now()) OR (state = 'running' AND "
                "lease_until < now())) "
                "ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) "
                "UPDATE ai_ingestion_jobs j SET state = 'running', attempts = attempts + 1, "
                "lease_token = %s, "
                "lease_until = now() + interval '120 seconds' FROM candidate c WHERE j.id = "
                "c.id RETURNING j.*",
                (max_attempts, token),
            )
            job = await cursor.fetchone()
            if job and job["kind"] == "ingest":
                await connection.execute(
                    "UPDATE ai_document_versions SET ingestion_status = 'processing', error_code "
                    "= NULL WHERE document_id = %s AND version = %s",
                    (job["document_id"], job["version"]),
                )
            return job

    async def heartbeat(self, job):
        async with self.connection() as connection:
            cursor = await connection.execute(
                "UPDATE ai_ingestion_jobs SET lease_until = now() + interval '120 seconds' "
                "WHERE id = %s AND lease_token = %s AND state = 'running' AND lease_until > "
                "now() RETURNING id",
                (job["id"], job["lease_token"]),
            )
            return await cursor.fetchone() is not None

    async def context(self, job):
        async with self.connection() as connection:
            cursor = await connection.execute(
                "SELECT d.deleted, d.active_version, v.* FROM ai_documents d JOIN "
                "ai_document_versions v ON v.document_id = d.id WHERE d.id = %s AND "
                "v.version = %s",
                (job["document_id"], job["version"]),
            )
            return await cursor.fetchone()

    async def finish(self, job, chunks=0, error=None, max_attempts=3):
        async with self.connection() as connection:
            document = await self._lock(connection, job["document_id"], include_deleted=True)
            cursor = await connection.execute(
                "SELECT *, lease_until > now() AS lease_valid FROM ai_ingestion_jobs WHERE "
                "id = %s FOR UPDATE",
                (job["id"],),
            )
            current = await cursor.fetchone()
            if (
                current["lease_token"] != job["lease_token"]
                or current["state"] != "running"
                or not current["lease_valid"]
            ):
                return False
            active = not document["deleted"] and document["active_version"] == job["version"]
            retrying = error and job["attempts"] < max_attempts
            state = "queued" if retrying else "failed" if error else "done"
            await connection.execute(
                "UPDATE ai_ingestion_jobs SET state = %s, error_code = %s, lease_until = "
                "NULL, available_at = now() + interval '10 seconds' WHERE id = %s",
                (state, error, job["id"]),
            )
            if active and job["kind"] == "ingest":
                status = "queued" if retrying else "failed" if error else "ready"
                await connection.execute(
                    "UPDATE ai_document_versions SET ingestion_status = %s, chunks = %s, "
                    "error_code = %s WHERE document_id = %s AND version = %s",
                    (status, chunks, error, job["document_id"], job["version"]),
                )
            elif job["kind"] == "ingest":
                await connection.execute(
                    "UPDATE ai_document_versions SET ingestion_status = 'failed', error_code = "
                    "'superseded' WHERE document_id = %s AND version = %s",
                    (job["document_id"], job["version"]),
                )
            return active

    async def allowed(self, payloads, principal, enforce_scope):
        identifiers = []
        for payload in payloads:
            try:
                identifiers.append(UUID(str(payload.get("source_id"))))
            except ValueError:
                pass
        if not identifiers:
            return set()
        async with self.connection() as connection:
            cursor = await connection.execute(
                "SELECT d.id, d.active_version, v.metadata FROM ai_documents d JOIN "
                "ai_document_versions v "
                "ON v.document_id = d.id AND v.version = d.active_version WHERE d.id = ANY(%s) "
                "AND NOT d.deleted AND v.approved AND v.ingestion_status = 'ready'",
                (identifiers,),
            )
            rows = await cursor.fetchall()
        return {
            (str(row["id"]), row["active_version"])
            for row in rows
            if not enforce_scope
            or (
                principal.role in row["metadata"]["allowed_roles"]
                and principal.depotId in row["metadata"]["depot_ids"]
            )
        }


async def initialize(url):
    schema = Path(__file__).with_name("knowledge_schema.sql").read_text(encoding="utf-8")
    async with await psycopg.AsyncConnection.connect(url, connect_timeout=5) as connection:
        await connection.execute(schema, prepare=False)


if __name__ == "__main__":
    from app.core.config import Settings
    from app.core.runtime import run_async

    settings = Settings()
    if not settings.database_url:
        raise SystemExit("Set AI_DATABASE_URL before initializing knowledge storage")
    run_async(initialize(settings.database_url.get_secret_value()))
