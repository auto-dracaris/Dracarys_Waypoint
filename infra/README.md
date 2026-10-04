# WayPoint AI infrastructure (local development)

This independent Compose project contains the AI service's supporting infrastructure.
The existing root `docker-compose.yml` still owns the business PostgreSQL and RabbitMQ
services. Its containers, credentials, and volumes are not reused or modified here.
FastAPI continues to run locally; this file does not start an AI application container.

## First startup — PowerShell

Docker Desktop must be running with Linux containers. From this directory:

```powershell
cd D:\Git\Dracarys_Waypoint\infra
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1
docker compose config --quiet
docker compose up -d
docker compose ps
```

`setup.ps1` creates an ignored `.env` with independent randomly generated credentials.
It preserves an existing `.env` and never starts Docker or prints credentials. If setup
has already been run, proceed directly to Compose. Do not copy the template placeholders
as actual credentials. Keep `.env` and volumes together across restarts; changing a
PostgreSQL password variable does not change an existing database's password.

The default startup starts **Qdrant + AI PostgreSQL** only. The AI database is prepared
for later conversations/checkpoints; the current scaffold does not connect to it.

## Optional profiles

```powershell
# Collector -> Tempo trace storage -> Grafana viewer.
docker compose --profile monitoring up -d
```

The first startup pulls images and creates volumes. No model API calls happen just
by starting these services. The AI application will use Gemini directly when its
model adapter is implemented.

## Local addresses

| Service | Address | Authentication |
| --- | --- | --- |
| AI PostgreSQL | `localhost:5434`, database/user `waypoint_ai` | `AI_POSTGRES_PASSWORD` |
| Qdrant HTTP/dashboard | http://localhost:6333/dashboard | `QDRANT_API_KEY` |
| Qdrant gRPC | `localhost:6334` | Same Qdrant key |
| Collector HTTP ingestion | http://localhost:4318/v1/traces | Local development only |
| Collector gRPC ingestion | `localhost:4317` | Local development only |
| Collector process health | http://localhost:13133/ | Local development only |
| Tempo readiness | http://localhost:3200/ready | Local development only |
| Grafana | http://localhost:3001 | `admin` / `GRAFANA_ADMIN_PASSWORD` |

All published ports bind to `127.0.0.1`. Override ports and image tags in `.env` if
necessary. These defaults avoid the existing business database's host port 5433.

## Verify after startup

```powershell
docker compose --profile monitoring ps
docker compose logs --tail 50 qdrant ai-postgres
docker compose exec ai-postgres pg_isready -U waypoint_ai -d waypoint_ai
```

For an authenticated Qdrant check without printing the key:

```powershell
$qdrantKeyLine = Get-Content .env | Where-Object { $_ -match '^QDRANT_API_KEY=' }
$qdrantKey = ($qdrantKeyLine -split '=', 2)[1]
Invoke-RestMethod 'http://localhost:6333/collections' -Headers @{ 'api-key' = $qdrantKey }
```

Optional profile checks (only after enabling them):

```powershell
Invoke-WebRequest 'http://localhost:13133/' -UseBasicParsing
Invoke-WebRequest 'http://localhost:3200/ready' -UseBasicParsing
Invoke-RestMethod 'http://localhost:3001/api/health'
```

PostgreSQL has a container health check. Qdrant/Tempo/Collector images do
not have shell-based health checks here; use the checks above rather than treating
`running` as proof of readiness. Change the commands' ports if you override defaults.

## Connect the AI service later

In `ai-service/.env`, set `AI_QDRANT_URL=http://localhost:6333` and copy the generated
Qdrant key locally into `AI_QDRANT_API_KEY`. When database persistence is implemented,
use `postgresql://waypoint_ai:<AI_POSTGRES_PASSWORD>@localhost:5434/waypoint_ai` with
the database adapter's appropriate driver. Never paste credentials into chat or Git.

For container clients use service names instead of `localhost`: `qdrant:6333`,
`ai-postgres:5432` and `otel-collector:4318` on this Compose network.
An application in a separate Compose project must explicitly join a shared network.

Monitoring stores received **traces only** with seven-day Tempo retention. It does not
collect application metrics/logs or instrument FastAPI/NestJS automatically. Grafana
has a preconfigured Tempo datasource but will remain empty until spans are sent.
LangSmith remains deferred and is not included as a container.

Initialization checks: Compose configuration and all four YAML files were validated;
config mounts and local-only published ports were checked. Containers were not started.
Registry checks for some monitoring images encountered registry/CDN DNS failures, so
image pulling and runtime startup must be verified on your first manual run.

## Stop and preserve data

```powershell
docker compose --profile monitoring down
```

Normal `down` preserves the named volumes. Keep the stable project name
`waypoint-ai-infra` to reuse them. Volume removal deletes data and is not part of
normal restart instructions. This is a local single-machine setup, not evidence of
production availability, TLS, backups, restore readiness, or performance.

## Configuration sources

- [Qdrant documentation](https://qdrant.tech/documentation/)
- [Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
- [Tempo single-binary example](https://github.com/grafana/tempo/tree/v3.1.0/example/docker-compose/single-binary)
