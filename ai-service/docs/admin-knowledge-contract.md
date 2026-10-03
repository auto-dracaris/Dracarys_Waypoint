# Admin knowledge integration: proposed v1 contract

**Deferred pending actual backend API contracts.** Endpoint names and ownership
below are proposals. The initial build uses
[manual document development](document-development.md).

This defines the next integration boundary. It does **not** implement admin routes,
file storage, extraction, ingestion jobs or Qdrant writes. Validated Python payloads
live in `app/ingestion/contracts.py`. The current NestJS controllers have no knowledge
management API; endpoint names below are proposals for the backend owner.

## Ownership and authorization

NestJS owns the admin UI/API, authentication, authorization, original file storage,
source metadata, versions and approval decisions. The AI service owns extraction,
chunking, embeddings, index lifecycle and ingestion status once implemented.
Metadata need not be duplicated as two competing catalogs: AI PostgreSQL will store
only the processing state and necessary source/version references in the next phase.

The current backend has four roles. Dispatcher is its privileged operator; do not
invent an `admin` token role. Knowledge changes must be dispatcher-authorized and
restricted to depots the backend permits that operator to manage. Publishing a
document to a role is an explicit admin choice, not a permission the user can change
in chat. No document-management tools are registered with any user agent.

The internal AI routes must be authenticated before being exposed. Proposed scheme:
NestJS sends a dedicated service credential in Authorization and the user's access
token in X-User-Authorization. The AI service validates the service credential and
revalidates the user through /auth/me, checking dispatcher role and depot scope.
Do not trust actor IDs or role headers in an event. Service credentials must never
reach browsers, be persisted with jobs, or appear in logs. This authentication
scheme is a contract requirement, not an implemented capability yet.

## Proposed endpoints

| Owner | Method/path | Purpose |
| --- | --- | --- |
| NestJS | POST /api/knowledge/sources | Register an uploaded PDF or text source as a draft |
| NestJS | PUT /api/knowledge/sources/{id} | Create a new immutable version, including scope changes |
| NestJS | POST /api/knowledge/sources/{id}/approve | Approve the specific version |
| NestJS | DELETE /api/knowledge/sources/{id} | Revoke access and request removal of indexed chunks |
| NestJS | GET /api/knowledge/sources/{id} | Show version, approval and processing status |
| AI internal | POST /internal/v1/knowledge/events | Accept a validated upsert/approve/delete event |
| AI internal | GET /internal/v1/knowledge/sources/{id} | Read scoped ingestion status |

The NestJS registration/upload transport can follow its existing storage choice.
The AI contract references an object-storage key, never a local filesystem path or
arbitrary remote URL. For the first pipeline, source URLs are canonical citation
links attached to uploaded content; crawling or fetching those URLs is deferred.

Example internal registration event (illustrative values):

```json
{
  "schema_version": 1,
  "event_id": "589a99a1-e0e4-4d7e-a7b8-d4ccac3a9e11",
  "source_id": "d1c59f70-70bf-45a5-b1d3-b873749519a1",
  "version": 1,
  "operation": "upsert",
  "metadata": {
    "title": "Delivery terms",
    "storage_key": "knowledge/d1c59f70/version-1.pdf",
    "media_type": "application/pdf",
    "byte_count": 1000,
    "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "citation_url": "https://example.com/delivery-terms",
    "allowed_roles": ["driver", "loader"],
    "depot_ids": [1]
  }
}
```

`approve` and `delete` carry schema_version, event_id, source_id and version only.
They refer to a stored version; neither can introduce alternate scope or content.
All requests reject unknown fields. Metadata validates nonempty unique role/depot
lists, positive versions, PDF/text media types, 20 MiB declared size maximum,
SHA-256 shape, relative storage keys and HTTPS citation URLs without user credentials.
Runtime ingestion must additionally verify actual size, digest, file signature,
authorized storage location and extractability; metadata validation is not file validation.

## Version, approval and failure behavior

- Upsert creates a draft. Index visibility requires approval and successful ingestion.
- Scope/content changes create a new version and require new approval.
- Use event_id for persistent idempotency. Same ID with a changed body returns 409;
  identical retries return the prior receipt. Reject stale/out-of-order versions.
- Approval and readiness are separate. Proposed status: draft -> processing -> ready,
  or failed. Retry the same version with a new event only after verifying its state.
- Return 202 only after an event is durably accepted; include event_id, source_id,
  version and status. Do not acknowledge only in-memory background work.
- Before replacing a version or changing scope, revoke previous visibility. Publish
  the new chunks only when all writes succeed. Failed partial indexing stays hidden.
- Delete revokes visibility first, then removes chunks and marks deleted. Preserve
  a version tombstone so delayed events cannot republish deleted content.
- Track safe error codes rather than raw parser/provider exception messages.
- Retrieval must revalidate source/version approval and scope against active metadata
  before returning chunks. Qdrant's current/approved fields alone cannot guarantee
  immediate revocation while async index updates are pending.

The next implementation will add those lifecycle rules and durability; none are
claimed by the contract-only models in this phase.

## Qdrant and citation mapping

Map allowed_roles to roles. For the current single-depot retrieval filter, generate
separate points per permitted depot with depot_id. Use deterministic point IDs for
source/version/chunk/depot to make retries and deletes repeatable. Store source_id,
version, chunk/page reference, title and canonical citation link with each chunk.
Set scope=depot_policy only for depot-wide documents. The existing filter contract
also requires approved, current and embedding_model. Outlet-private content is deferred.

Choose and evaluate extraction/chunking/embedding settings in the ingestion phase.
Do not reuse vectors across changed model/dimensions/preprocessing configurations.
