"""Ephemeral local-only chat memory, never a production persistence substitute."""

from contextlib import asynccontextmanager
from copy import deepcopy

from fastapi import HTTPException

from app.agent.contracts import Conversation


class DevelopmentConversations:
    def __init__(self):
        self.rows = {}
        self.busy = set()

    @asynccontextmanager
    async def session(self, identifier, owner, new):
        if identifier in self.busy:
            raise HTTPException(409, "Conversation busy")
        self.busy.add(identifier)
        try:
            row = (owner, Conversation()) if new else self.rows.get(identifier)
            if row is None or row[0] != owner:
                raise HTTPException(404, "Conversation not found")
            state = deepcopy(row[1])
            yield state
            # Keep development memory bounded; oldest chats may expire.
            if new and len(self.rows) >= 100:
                self.rows.pop(next(iter(self.rows)))
            self.rows[identifier] = (owner, state)
        finally:
            self.busy.discard(identifier)
