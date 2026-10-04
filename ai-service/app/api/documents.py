import asyncio
from pathlib import Path
from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import ValidationError
from pypdf.errors import PyPdfError

from app.clients.business import BusinessClient
from app.ingestion.documents import extract
from app.ingestion.management import DocumentMetadata, Receipt, VersionRequest
from app.storage.files import DocumentFiles
from app.storage.knowledge import KnowledgeRepository

router = APIRouter(prefix="/api/v1/documents", tags=["knowledge management"])
bearer = HTTPBearer(auto_error=False)


async def administrator(
    request: Request, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
):
    settings = request.app.state.settings
    if not credentials:
        raise HTTPException(401, "Bearer authentication required")
    business = getattr(request.app.state, "business", None) or BusinessClient(settings)
    principal = await business.authenticate(credentials.credentials)
    if principal.role != "dispatcher":
        raise HTTPException(403, "Document management requires dispatcher permission")
    return principal


def catalog(request: Request):
    repository = getattr(request.app.state, "knowledge", None)
    if repository is not None:
        return repository
    if not request.app.state.settings.database_url:
        raise HTTPException(503, "Configure AI_DATABASE_URL and initialize knowledge storage")
    return KnowledgeRepository(request.app.state.settings.database_url.get_secret_value())


async def upload(request, file, metadata, key, principal, repository, identifier=None):
    settings = request.app.state.settings
    if not settings.embedding_model or not settings.gemini_api_key:
        raise HTTPException(503, "Configure embedding settings before accepting ingestion jobs")
    filename = (file.filename or "").replace("\\", "/").split("/")[-1]
    suffix = Path(filename).suffix.lower()
    if suffix not in (".pdf", ".txt") or len(filename) > 255:
        raise HTTPException(422, "Upload a PDF or UTF-8 text file")
    content = await file.read(20 * 1024 * 1024 + 1)
    await file.close()
    if not content or len(content) > 20 * 1024 * 1024:
        raise HTTPException(413, "File must contain between 1 byte and 20 MiB")
    try:
        details = DocumentMetadata.model_validate_json(metadata)
        await asyncio.to_thread(extract, Path(filename), content)
    except (ValueError, ValidationError, PyPdfError) as exc:
        raise HTTPException(422, "Invalid document content or metadata") from exc
    files = DocumentFiles(settings.document_storage_path)
    storage_key, digest = await asyncio.to_thread(files.put, content, suffix)
    keep = False
    try:
        try:
            source = details.validate_source(
                storage_key,
                len(content),
                digest,
                "application/pdf" if suffix == ".pdf" else "text/plain",
            )
        except ValidationError as exc:
            raise HTTPException(422, "Invalid document access scope or source metadata") from exc
        recipe = {
            name: getattr(settings, name)
            for name in (
                "embedding_model",
                "embedding_dimensions",
                "chunk_size",
                "chunk_overlap",
                "qdrant_collection",
            )
        }
        receipt, keep = await repository.register(
            source, recipe, filename, key, principal.id if principal else None, identifier
        )
        return receipt
    finally:
        if not keep:
            await asyncio.to_thread(files.remove, storage_key)


@router.post("", status_code=202, response_model=Receipt)
async def create_document(
    request: Request,
    file: Annotated[UploadFile, File()],
    metadata: Annotated[str, Form()],
    key: Annotated[UUID, Header(alias="Idempotency-Key")],
    principal=Depends(administrator),
    repository=Depends(catalog),
):
    return await upload(request, file, metadata, key, principal, repository)


@router.post("/{identifier}/versions", status_code=202, response_model=Receipt)
async def replace_document(
    identifier: UUID,
    request: Request,
    file: Annotated[UploadFile, File()],
    metadata: Annotated[str, Form()],
    key: Annotated[UUID, Header(alias="Idempotency-Key")],
    principal=Depends(administrator),
    repository=Depends(catalog),
):
    return await upload(request, file, metadata, key, principal, repository, identifier)


@router.get("")
async def list_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    principal=Depends(administrator),
    repository=Depends(catalog),
):
    return await repository.list(page, limit)


@router.get("/{identifier}")
async def document_detail(
    identifier: UUID, principal=Depends(administrator), repository=Depends(catalog)
):
    return await repository.detail(identifier)


@router.get("/jobs/{identifier}")
async def processing_status(
    identifier: UUID, principal=Depends(administrator), repository=Depends(catalog)
):
    return await repository.job_status(identifier)


@router.get("/{identifier}/file")
async def original_document(
    identifier: UUID,
    request: Request,
    version: int | None = Query(None, gt=0),
    principal=Depends(administrator),
    repository=Depends(catalog),
):
    detail = await repository.detail(identifier)
    selected = next(
        (
            row
            for row in detail["versions"]
            if row["version"] == (version or detail["active_version"])
        ),
        None,
    )
    if not selected:
        raise HTTPException(404, "Document version not found")
    path = DocumentFiles(request.app.state.settings.document_storage_path).path(
        selected["metadata"]["storage_key"]
    )
    if not path.is_file():
        raise HTTPException(404, "Original file unavailable")
    return FileResponse(
        path,
        filename=selected["filename"],
        media_type=selected["metadata"]["media_type"],
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.post("/{identifier}/approve")
async def approve_document(
    identifier: UUID,
    body: VersionRequest,
    principal=Depends(administrator),
    repository=Depends(catalog),
):
    return await repository.approve(identifier, body.version)


@router.post("/{identifier}/retry", status_code=202, response_model=Receipt)
async def retry_document(
    identifier: UUID,
    body: VersionRequest,
    principal=Depends(administrator),
    repository=Depends(catalog),
):
    return await repository.retry(identifier, body.version)


@router.delete("/{identifier}", status_code=202, response_model=Receipt)
async def delete_document(
    identifier: UUID, principal=Depends(administrator), repository=Depends(catalog)
):
    return await repository.delete(identifier)
