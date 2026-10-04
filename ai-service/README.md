# WayPoint AI service

**Current scope: document RAG and read-only business tools for all four roles.**
Follow the [document management guide](docs/document-management.md) for setup,
upload APIs and worker operation. Dispatcher UI and NestJS changes are deferred.
See [business tools](docs/business-tools.md) for authenticated `business_qa` chat,
tool limits and existing backend contracts.
All verified roles share knowledge search, Colombo date/time and caller-profile
tools. The Shared tools Bruno folder tests this pack; search returns cited excerpts
or no_knowledge. Combined generated explanations remain the next phase.
The .env template disables local application authentication/authorization; production
rejects this bypass. All four profiles support knowledge Q&A. Older secured deferral
setup below remains available for later business integration.

Separate Python/FastAPI service for the WayPoint agentic RAG assistant.
Implemented: a read-only deferral Q&A graph, authenticated NestJS adapter,
scoped PostgreSQL memory, Qdrant retrieval adapter, optional Gemini policy
explanation, deadlines and step limits. Tests use synthetic fixtures.
Live demo authentication, order tools and chat for all four roles have been verified.
Trip details and actual deferral drafts still need representative records; model
answer quality is not established by smoke testing. No credentials are
needed for health or unit tests; database integration tests are opt-in.

Role profiles are now defined for store manager, dispatcher, driver and loader.
Authenticated role selects the profile; managers/dispatchers use the existing
deferral workflow; all four profiles also support document Q&A and authenticated
business tools. Dispatcher message drafts are review-only; trip tools do not change
routes or loading records. The [admin knowledge contract](docs/admin-knowledge-contract.md)
and validated payload models retain an earlier event integration proposal.
FastAPI now owns the document catalog and management routes; PostgreSQL owns durable
jobs and Qdrant stores searchable chunks. Manual seeding is a separate local-only mode.

## Run locally (PowerShell)

Install Python 3.11+ and [uv](https://docs.astral.sh/uv/getting-started/installation/).
Run from the service directory:

```powershell
cd D:\Git\Dracarys_Waypoint\ai-service
Copy-Item .env.example .env
uv sync --locked
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --loop app.core.runtime:event_loop --reload
```

Copy `.env` only on first setup; preserve it on subsequent runs. Secrets remain
backend-only and ignored by Git. The default `.python-version` selects Python 3.11.
On this workstation, uv is installed at
`C:\Users\TUF\AppData\Local\Programs\Python\Python311\Scripts\uv.exe`.
If it is not on PATH, invoke that path with PowerShell's `&` operator in place of `uv`.
After synchronization, you can also start using `.\.venv\Scripts\python.exe -m uvicorn
app.main:app --host 127.0.0.1 --port 8000 --reload`.

Open http://127.0.0.1:8000/docs for development API documentation.
For manual API testing, open [the Bruno collection](docs/bruno/README.md) and select
its `local` environment. It includes synthetic upload files and the document/chat flow.
Verify startup from a second PowerShell terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

The response reports **process liveness only**, not model/retrieval/API readiness.
NestJS uses port 5000 with the `/api` prefix. CORS defaults to no permitted browser origins;
configure `AI_CORS_ORIGINS` explicitly if direct browser access is later required.

## Checks

```powershell
uv run ruff check .
uv run ruff format --check .
uv run pytest -q
```

`uv.lock` pins resolved dependencies; commit it and use locked installs.

## Container

```powershell
docker build -t waypoint-ai-service .
docker run --rm --env-file .env -p 127.0.0.1:8000:8000 waypoint-ai-service
```

The image runs as an unprivileged user and includes a liveness health check.
Container `localhost` refers to the container itself: future integration URLs must
use the appropriate network service names (or `host.docker.internal` on Docker
Desktop for host services). Root Compose and existing services are unchanged.

See [architecture](docs/architecture.md) for module responsibilities and phase scope.
Model calls use Gemini directly;
LangSmith and OpenTelemetry integrations are deferred.
LangGraph's dependency tree includes LangSmith and may include OpenTelemetry API
packages; neither tracing integration nor exporter is enabled by this scaffold.

Supporting infrastructure is defined separately in [infra](../infra/README.md).
Its default Compose startup provides Qdrant and an AI-owned PostgreSQL database;
monitoring services have an optional profile. Start containers manually as planned.

## Enable the first workflow

1. Start infrastructure manually from infra with `docker compose up -d`.
2. Set AI_DATABASE_URL in the service's ignored .env using the AI PostgreSQL
   credentials from infra/.env. Use a plain postgresql:// DSN and percent-encode
   password characters when needed.
3. From ai-service run `uv run python -m app.storage.conversations` once to create
   the owned conversation table. No schema changes run at application startup.
4. Run NestJS and verify /api/auth/me with a real access token. Implement the
   [deferral contract](docs/business-api-contract.md), then set AI_DEFERRAL_ENDPOINT.
5. Optional RAG: ingest approved depot policies; configure the embedding model,
   dimensions and Qdrant key. Configure Gemini for policy explanation. Leaving
   model/embedding names blank gives recorded business-fact answers only.

POST /api/v1/chat requires `Authorization: Bearer <user-access-token>`:

```json
{"message":"Why was this order deferred?", "order_id":42}
```

Responses include conversation_id, answer, status and sources. Send the returned
conversation ID with follow-ups; use order_id to switch orders. IDs and permissions
are never inferred from free text. Missing auth returns 401; unavailable integrations
return 503; deadline/step exhaustion returns 504. The current endpoint is only for
deferral Q&A. PostgreSQL persistence and live NestJS/Gemini/Qdrant still need local
integration verification after infrastructure and the business route are available.
