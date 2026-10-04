# WayPoint AI Service - Bruno collection

Open this directory with Bruno's **Open Collection**, then choose the **local**
environment. It targets FastAPI at http://localhost:8000, not the NestJS API at
http://localhost:5000/api. Start AI PostgreSQL/Qdrant, FastAPI and the ingestion
worker using [the service guide](../document-management.md).

## First document test

Send requests individually, in this order:
1. Health check.
2. Documents / Upload draft.
3. Documents / Processing job; repeat manually until state is **done**.
4. Documents / Metadata and history; verify the active version is ready.
5. Documents / Approve ready version.
6. Chat / Knowledge question; check sources cite the uploaded test document.
7. Chat / Follow-up in same conversation.

A successful chat HTTP status does not prove a grounded answer. Inspect status:
answered = generated answer; sources_only = cited excerpts; no_knowledge = no
permitted searchable content. Inspect citations and content yourself.

Uploads automatically capture document_id, document_version and job_id.
Chat captures conversation_id. These are runtime variables for this Bruno session,
not environment file edits. Running an upload again normally creates a new document;
change the existing sample document by using Replace version instead.

## Replacement, retry and cleanup

Replace version captures the new version and job. Poll its job until done, then
approve that version before asking questions. Previous versions stop being available
to chat as soon as replacement is accepted.

Retry failed ingestion is **only** for a failed current version; sending it for a
ready/processing version returns 409. It replaces job_id with the new retry job.
Delete source is an intentional destructive request: it revokes the captured source
and schedules cleanup of all its stored versions. Run it only after you finish.
Poll Processing job again to verify deletion cleanup.

Do not run the entire collection as an unattended batch: ingestion is asynchronous,
retry is conditional, and deletion deliberately removes the selected source.

## Files, metadata and idempotency

The bundled UTF-8 fixtures are synthetic test material, not official policy.
document_file and replacement_file are paths relative to this collection root.
You can select a PDF using the request's Body file picker, or set a local absolute
path with forward slashes, for example D:/Documents/terms.pdf.

Edit document_metadata as one JSON string: title, allowed_roles, depot_ids and optional
citation_url. Never send storage keys, credentials, or actor IDs as metadata.
All four roles and depot 1 are included in the sample. Set real role/depot scope
before using your own documents. The citation URL is metadata and is not crawled.
Document requests generate a UUID Idempotency-Key per send. To replay the exact
same upload, set idempotency_key to a fixed UUID before both sends. Clear it before
a different upload or replacement; changed content with the same key returns 409.
Use the original captured version for Download original version.

## Authentication

With AI_AUTH_ENABLED=false, document-only chat can leave its token empty. Document
management always requires a verified dispatcher token. Business tools always
require a real NestJS access token, including in local development.
For authenticated mode, set these **secret** environment variables in Bruno:
- admin_token: dispatcher NestJS access token for document management.
- chat_token: the role-specific NestJS access token for chat.

The collection attaches Authorization only when a token is present. Never put
tokens or Gemini keys into checked-in files. Bruno secret values stay in the
application; custom *.local.bru environment files are ignored.
The API's AI_DEVELOPMENT_ROLE selects the role when authentication is disabled;
client headers or chat text do not change it.

Optional business workflow / Deferred order explanation is separate from the
document test. Local bypass returns 503 by design. Enable backend integration and
the deferral adapter before using that request.

## Implemented store-manager tools

Use the **Store-manager tools** folder with a real store-manager access token in
the secret chat_token variable. Unlike local document Q&A, business_qa always
verifies the bearer token against NestJS, even with AI_AUTH_ENABLED=false.
Set order_id to an existing order belonging to the logged-in manager. These
requests capture conversation_id and return source-backed read-only API facts.
Their Auth tab explicitly selects Bearer Token with {{chat_token}}. Collection
scripts read environment settings using getEnvVar, with runtime-variable fallback.
They never create orders. See [business tool contracts](../business-tools.md).

## Dispatcher, driver and loader tools

Use the matching role folder with that user's access token in secret chat_token.
Dispatcher requests list orders, read summary/details, and draft deferral messages.
Driver requests list trips, read stop pages and pending route changes. Loader
requests list permitted depot trips and read planned ambient/chilled case totals.
Set trip_id to a real UUID from a permitted trip. The trip-detail response establishes
the conversation for the stop-page follow-up. Switch tokens when switching roles;
do not reuse a conversation owned by another user. Drafts are never sent and route
changes are never acknowledged by these requests. No UI or NestJS changes are needed.

## Shared tools

The **Shared tools** folder contains profile, Colombo date/time and permitted
knowledge search requests for any verified role. These use business_qa and always
require chat_token. Knowledge results can be synthesized with checked citations,
fall back to excerpts (sources_only), or return no_knowledge when nothing permitted
matches. Local document bypass does not widen the knowledge tool's role/depot access.

## Combined answers

Use the Combined answers folder with a manager token to find the latest order,
read its recorded deferral and search approved policy in one request. The known
order request also supports dispatchers. Set order_id for that request; a successful
detail read establishes the conversation for follow-up. Actual policy guidance needs
an approved, current, matching role/depot document. Missing records/reasons/policies
are not invented. Requests allow three planning rounds, six calls, and the configured
execution deadline. No order, trip, notification or loading record is changed.

## Optional CLI smoke check

If Bruno CLI is installed, from this directory run:

    bru run 01-health/01-health.bru --env local

This sends only the health request. Collection files have been checked with the
installed Bruno parser; provider-backed ingestion/chat is not run by validation.
