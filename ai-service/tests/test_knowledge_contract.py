from uuid import uuid4

import pytest
from pydantic import TypeAdapter, ValidationError

from app.ingestion.contracts import KnowledgeEvent, SourceMetadata


def metadata(**changes):
    return {
        "title": "Delivery terms",
        "storage_key": "knowledge/source/version-1.pdf",
        "media_type": "application/pdf",
        "byte_count": 1000,
        "sha256": "a" * 64,
        "allowed_roles": ["driver", "loader"],
        "depot_ids": [1],
        **changes,
    }


@pytest.mark.parametrize(
    "changes",
    [
        {"allowed_roles": []},
        {"allowed_roles": ["admin"]},
        {"allowed_roles": ["driver", "driver"]},
        {"depot_ids": []},
        {"depot_ids": [0]},
        {"depot_ids": [1, 1]},
        {"byte_count": 21 * 1024 * 1024},
        {"media_type": "application/zip"},
        {"sha256": "bad"},
        {"title": "  "},
        {"storage_key": "../private/file.pdf"},
        {"storage_key": "C:/private/file.pdf"},
        {"storage_key": "https://example.com/file.pdf"},
        {"citation_url": "http://example.com"},
        {"citation_url": "https://user:password@example.com"},
    ],
)
def test_contract_rejects_invalid_content_and_scope(changes):
    with pytest.raises(ValidationError):
        SourceMetadata.model_validate(metadata(**changes))


def test_approval_and_delete_cannot_smuggle_scope_or_approval_flags():
    adapter = TypeAdapter(KnowledgeEvent)
    base = {"event_id": str(uuid4()), "source_id": str(uuid4()), "version": 1}
    for operation in ("approve", "delete"):
        event = adapter.validate_python({**base, "operation": operation})
        assert event.operation == operation
        with pytest.raises(ValidationError):
            adapter.validate_python({**base, "operation": operation, "metadata": metadata()})
    with pytest.raises(ValidationError):
        adapter.validate_python(
            {**base, "operation": "upsert", "metadata": metadata(), "approved": True}
        )


def test_upload_payload_has_explicit_version_source_and_retrieval_scope():
    event = TypeAdapter(KnowledgeEvent).validate_python(
        {
            "event_id": str(uuid4()),
            "source_id": str(uuid4()),
            "version": 2,
            "operation": "upsert",
            "metadata": metadata(),
        }
    )
    assert event.version == 2
    assert event.metadata.allowed_roles == ["driver", "loader"]
