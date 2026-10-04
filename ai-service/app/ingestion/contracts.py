"""Shared source validation and optional future backend event contracts."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, field_validator

from app.agent.contracts import UserRole


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class SourceMetadata(ContractModel):
    title: str = Field(min_length=1, max_length=200)
    # Server-generated relative storage reference; never accept arbitrary local paths.
    storage_key: str = Field(min_length=1, max_length=512, pattern=r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")
    media_type: Literal["application/pdf", "text/plain"]
    byte_count: int = Field(gt=0, le=20 * 1024 * 1024, strict=True)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    citation_url: AnyHttpUrl | None = None
    allowed_roles: list[UserRole] = Field(min_length=1, max_length=4)
    depot_ids: list[Annotated[int, Field(gt=0, strict=True)]] = Field(min_length=1, max_length=100)

    @field_validator("storage_key")
    @classmethod
    def reject_local_paths(cls, value: str) -> str:
        if any(part in ("", ".", "..") for part in value.split("/")):
            raise ValueError("Use a relative object-storage key without traversal")
        return value

    @field_validator("citation_url")
    @classmethod
    def canonical_citation(cls, value: AnyHttpUrl | None) -> AnyHttpUrl | None:
        if value and (
            value.scheme != "https" or value.username or value.password or value.fragment
        ):
            raise ValueError("Citation URLs must use HTTPS without credentials or fragments")
        return value

    @field_validator("allowed_roles", "depot_ids")
    @classmethod
    def distinct_scope(cls, value: list) -> list:
        if len(value) != len(set(value)):
            raise ValueError("Scope entries must be unique")
        return value


class SourceEvent(ContractModel):
    schema_version: Literal[1] = 1
    event_id: UUID
    source_id: UUID
    version: int = Field(gt=0, strict=True)


class UpsertSource(SourceEvent):
    operation: Literal["upsert"]
    metadata: SourceMetadata


class ApproveSource(SourceEvent):
    operation: Literal["approve"]


class DeleteSource(SourceEvent):
    operation: Literal["delete"]


KnowledgeEvent = Annotated[
    UpsertSource | ApproveSource | DeleteSource, Field(discriminator="operation")
]


class SourceStatus(ContractModel):
    source_id: UUID
    version: int = Field(gt=0)
    status: Literal["draft", "processing", "ready", "failed", "revoked", "deleted"]
    error_code: Literal["unsupported_file", "extraction_failed", "index_failed"] | None = None
