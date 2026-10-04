from uuid import UUID

from pydantic import Field

from app.ingestion.contracts import ContractModel, SourceMetadata


class DocumentMetadata(ContractModel):
    title: str = Field(min_length=1, max_length=200)
    allowed_roles: list[str]
    depot_ids: list[int]
    citation_url: str | None = None

    def validate_source(self, key: str, size: int, digest: str, media_type: str) -> dict:
        source = SourceMetadata.model_validate(
            {
                **self.model_dump(),
                "storage_key": key,
                "byte_count": size,
                "sha256": digest,
                "media_type": media_type,
            }
        )
        return source.model_dump(mode="json")


class VersionRequest(ContractModel):
    version: int = Field(gt=0, strict=True)


class Receipt(ContractModel):
    document_id: UUID
    version: int
    job_id: UUID
    status: str
