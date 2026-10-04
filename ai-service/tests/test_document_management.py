import json
from types import SimpleNamespace
from uuid import uuid4

import psycopg
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.agent.contracts import Principal
from app.core.config import Settings
from app.main import create_app
from app.storage.files import DocumentFiles


class Catalog:
    def __init__(self):
        self.calls = []
        self.receipt = {
            "document_id": str(uuid4()),
            "version": 1,
            "job_id": str(uuid4()),
            "status": "queued",
        }

    async def register(self, metadata, recipe, filename, key, actor, identifier):
        self.calls.append((metadata, recipe, filename, key, actor, identifier))
        return self.receipt, len(self.calls) == 1


def make_app(tmp_path, **kwargs):
    settings = Settings(
        _env_file=None,
        environment="test",
        document_storage_path=tmp_path,
        embedding_model="synthetic",
        gemini_api_key="synthetic",
        database_url=None,
        **kwargs,
    )
    app = create_app(settings)
    app.state.knowledge = Catalog()

    async def authenticate(token):
        assert token == "verified-token"
        return Principal(id=42, role="dispatcher", depotId=1)

    app.state.business = SimpleNamespace(authenticate=authenticate)
    return app


def upload(
    client,
    *,
    path="/api/v1/documents",
    metadata=None,
    filename="policy.txt",
    key=None,
    content=b"Synthetic terms and conditions for a depot.",
):
    return client.post(
        path,
        headers={"Idempotency-Key": str(key or uuid4()), "Authorization": "Bearer verified-token"},
        files={"file": (filename, content)},
        data={
            "metadata": json.dumps(
                metadata
                or {
                    "title": "Terms",
                    "allowed_roles": ["store_manager"],
                    "depot_ids": [1],
                }
            )
        },
    )


def test_upload_preserves_original_and_discards_replayed_temporary_file(tmp_path):
    app = make_app(tmp_path, auth_enabled=False)
    key = uuid4()
    with TestClient(app) as client:
        first = upload(client, key=key)
        second = upload(client, key=key)
    assert first.status_code == second.status_code == 202
    assert first.json() == second.json()
    files = list(tmp_path.iterdir())
    assert len(files) == 1
    metadata, recipe, filename, _, actor, identifier = app.state.knowledge.calls[0]
    assert filename == "policy.txt" and actor == 42 and identifier is None
    assert metadata["byte_count"] == files[0].stat().st_size
    assert recipe["embedding_dimensions"] == 768
    assert "gemini_api_key" not in recipe


@pytest.mark.parametrize(
    "metadata, filename, content",
    [
        ({"title": "T", "allowed_roles": [], "depot_ids": [1]}, "a.txt", b"Text"),
        ({"title": "T", "allowed_roles": ["admin"], "depot_ids": [1]}, "a.txt", b"Text"),
        ({"title": "T", "allowed_roles": ["driver"], "depot_ids": [0]}, "a.txt", b"Text"),
        (
            {
                "title": "T",
                "allowed_roles": ["driver"],
                "depot_ids": [1],
                "storage_key": "../../secret",
            },
            "a.txt",
            b"Text",
        ),
        (None, "a.exe", b"Text"),
        (None, "a.pdf", b"This is not a PDF"),
        (None, "a.txt", b"\xff\xfe"),
    ],
)
def test_invalid_uploads_never_leave_originals(tmp_path, metadata, filename, content):
    app = make_app(tmp_path, auth_enabled=False)
    with TestClient(app) as client:
        assert (
            upload(client, metadata=metadata, filename=filename, content=content).status_code == 422
        )
    assert not app.state.knowledge.calls
    assert not list(tmp_path.iterdir())


def test_failed_catalog_transaction_removes_file_and_hides_database_error(tmp_path):
    app = make_app(tmp_path, auth_enabled=False)

    async def broken(*args):
        raise psycopg.OperationalError("private database password")

    app.state.knowledge.register = broken
    with TestClient(app) as client:
        response = upload(client)
    assert response.status_code == 503
    assert "password" not in response.text
    assert not list(tmp_path.iterdir())


@pytest.mark.parametrize(
    "role, expected",
    [("driver", 403), ("loader", 403), ("store_manager", 403), ("dispatcher", 202)],
)
@pytest.mark.parametrize("auth_enabled", [False, True])
def test_document_management_uses_verified_dispatcher_role(tmp_path, role, expected, auth_enabled):
    app = make_app(tmp_path, auth_enabled=auth_enabled)

    async def authenticate(token):
        assert token == "verified-token"
        return Principal(id=42, role=role, depotId=1)

    app.state.business = SimpleNamespace(authenticate=authenticate)
    with TestClient(app, headers={"Authorization": "Bearer verified-token"}) as client:
        assert upload(client).status_code == expected
    if expected == 202:
        assert app.state.knowledge.calls[0][4] == 42


@pytest.mark.parametrize("auth_enabled", [False, True])
def test_no_token_is_rejected_before_catalog_access(tmp_path, auth_enabled):
    app = make_app(tmp_path, auth_enabled=auth_enabled)
    with TestClient(app) as client:
        assert client.get("/api/v1/documents").status_code == 401


def test_body_limit_includes_metadata_and_multipart_overhead(tmp_path):
    app = make_app(tmp_path, auth_enabled=False)
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/documents",
            content=b"a" * (21 * 1024 * 1024 + 1),
            headers={"Content-Type": "multipart/form-data; boundary=x"},
        )
    assert response.status_code == 413


def test_original_download_and_version_selection(tmp_path):
    app = make_app(tmp_path, auth_enabled=False)
    files = DocumentFiles(tmp_path)
    key, _ = files.put(b"Version two", ".txt")
    identifier = uuid4()

    async def detail(value):
        assert value == identifier
        return {
            "active_version": 2,
            "versions": [
                {
                    "version": 2,
                    "filename": "terms.txt",
                    "metadata": {"storage_key": key, "media_type": "text/plain"},
                }
            ],
        }

    app.state.knowledge.detail = detail
    with TestClient(app) as client:
        headers = {"Authorization": "Bearer verified-token"}
        response = client.get(f"/api/v1/documents/{identifier}/file", headers=headers)
        assert response.content == b"Version two"
        assert response.headers["x-content-type-options"] == "nosniff"
        assert (
            client.get(
                f"/api/v1/documents/{identifier}/file?version=1", headers=headers
            ).status_code
            == 404
        )


def test_private_storage_rejects_traversal(tmp_path):
    with pytest.raises(ValueError):
        DocumentFiles(tmp_path).path("../secret")


def test_catalog_configuration_is_required(tmp_path):
    app = make_app(tmp_path, auth_enabled=False)
    del app.state.knowledge
    with TestClient(app) as client:
        assert (
            client.get(
                "/api/v1/documents", headers={"Authorization": "Bearer verified-token"}
            ).status_code
            == 503
        )


def test_idempotency_conflict_removes_retry_file(tmp_path):
    app = make_app(tmp_path, auth_enabled=False)

    async def conflict(*args):
        raise HTTPException(409, "Different upload")

    app.state.knowledge.register = conflict
    with TestClient(app) as client:
        assert upload(client).status_code == 409
    assert not list(tmp_path.iterdir())
