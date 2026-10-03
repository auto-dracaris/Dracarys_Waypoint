from contextlib import asynccontextmanager
from uuid import UUID

import psycopg
from fastapi import HTTPException
from psycopg.types.json import Jsonb

from app.agent.contracts import Conversation


class PostgresConversations:
    def __init__(self, url: str):
        self.url = url

    @asynccontextmanager
    async def session(self, conversation_id: UUID, owner: str, new: bool):
        async with await psycopg.AsyncConnection.connect(self.url, connect_timeout=5) as connection:
            async with connection.transaction():
                # Serialize updates across workers; concurrent turns receive a retryable conflict.
                cursor = await connection.execute(
                    "SELECT pg_try_advisory_xact_lock(hashtextextended(%s, 0))",
                    (str(conversation_id),),
                )
                if not (await cursor.fetchone())[0]:
                    raise HTTPException(409, "Conversation busy; retry after the current turn")
                if new:
                    await connection.execute(
                        "INSERT INTO ai_conversations (id, owner_scope, state) VALUES (%s, %s, %s)",
                        (conversation_id, owner, Jsonb({})),
                    )
                cursor = await connection.execute(
                    "SELECT owner_scope, state FROM ai_conversations WHERE id = %s FOR UPDATE",
                    (conversation_id,),
                )
                row = await cursor.fetchone()
                if row is None or row[0] != owner:
                    raise HTTPException(404, "Conversation not found")
                state = Conversation.model_validate(row[1])
                yield state
                await connection.execute(
                    "UPDATE ai_conversations SET state = %s, updated_at = now() WHERE id = %s",
                    (Jsonb(state.model_dump()), conversation_id),
                )


async def initialize(url: str):
    async with await psycopg.AsyncConnection.connect(url, connect_timeout=5) as connection:
        await connection.execute("""
            CREATE TABLE IF NOT EXISTS ai_conversations (
                id uuid PRIMARY KEY,
                owner_scope text NOT NULL,
                state jsonb NOT NULL,
                updated_at timestamptz NOT NULL DEFAULT now()
            )
        """)


if __name__ == "__main__":
    import asyncio

    from app.core.config import Settings

    settings = Settings()
    if not settings.database_url:
        raise SystemExit("Set AI_DATABASE_URL before initializing conversation storage")
    asyncio.run(initialize(settings.database_url.get_secret_value()))
