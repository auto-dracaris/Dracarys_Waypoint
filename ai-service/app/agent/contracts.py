from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

UserRole = Literal["store_manager", "dispatcher", "driver", "loader"]


class Principal(BaseModel):
    id: int
    role: UserRole
    depotId: int
    outletId: int | None = None

    @property
    def scope(self) -> str:
        return f"{self.id}:{self.role}:{self.depotId}:{self.outletId}"


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: UUID | None = None
    order_id: int | None = Field(default=None, gt=0)
    workflow: Literal["knowledge_qa", "deferral_qa"] = "knowledge_qa"


class Source(BaseModel):
    id: str
    title: str
    text: str = Field(max_length=4000)
    page: int | None = None
    source_id: str | None = None


class Deferral(BaseModel):
    order_id: int
    outlet_id: int
    depot_id: int
    reason: str | None = Field(default=None, max_length=200)
    reason_note: str | None = Field(default=None, max_length=2000)
    deferred_to_date: str | None = Field(default=None, max_length=30)


class ChatResponse(BaseModel):
    conversation_id: UUID
    answer: str
    sources: list[Source] = Field(default_factory=list)
    status: Literal["answered", "needs_order", "reason_missing", "no_knowledge", "sources_only"]


class Conversation(BaseModel):
    last_order_id: int | None = None
    # Only bounded conversation data is stored; credentials never enter graph state.
    turns: list[dict[str, str]] = Field(default_factory=list)
