# AI service deployment on Lightsail

Use the same `/opt/waypoint` checkout, SSH user and PM2 daemon as `waypoint-api`.
PM2 runs FastAPI and the ingestion worker on the host. The existing
`infra/compose.yml` provides the independent AI PostgreSQL and Qdrant containers.
FastAPI binds to `127.0.0.1:8000`; the existing HTTPS site proxies `/ai-api/` to it.
The business API, business database, RabbitMQ and OSRM keep their existing setup.

## Verify locally first — Windows PowerShell

Preserve your existing `.env` and infrastructure. From `ai-service`:

```powershell
uv sync --locked
uv run ruff check .
uv run ruff format --check .
uv run pytest -q
```

Use the README's local API and worker startup commands to check chat and document
ingestion. A passing unit suite does not prove production connections or model quality.

## One-time setup — Linux server

Do this before pushing a release that enables the new workflow. All deployment
commands below run as the existing non-root PM2/SSH user. That user needs Docker
access, PM2 and `uv` on PATH. Install uv using its official instructions:
https://docs.astral.sh/uv/getting-started/installation/ . `deploy.sh` also searches
`~/.local/bin`; uv installs Python 3.11 when needed. Do not run deployments with sudo.

1. Ensure `/opt/waypoint` contains these files and confirm sufficient memory/disk
   for the API, worker, PostgreSQL and Qdrant alongside existing services.
2. If `infra/.env` does not exist, copy `infra/.env.example` to it. Generate separate
   random passwords/keys privately and replace **all** credential placeholders.
   Keep defaults for the local-only ports; do not open AI database/Qdrant ports
   in Lightsail. Preserve any existing `.env` and volumes.
3. If `ai-service/.env` does not exist, copy `.env.production.example` to `.env`.
   Set the database DSN and Qdrant key to match `infra/.env`. For a full assistant,
   set the Gemini key and validated generation/embedding model names. Blank
   generation settings keep factual/form fallbacks; blank embedding settings
   disable document ingestion/search. Keep dimensions/collection consistent with
   previously indexed documents. Never commit server secrets.
4. Restrict both `.env` files to the deployment user (`chmod 600`). Ensure the
   configured document directory is writable by that user. API and worker use
   the same persistent directory; do not put it in a temporary release directory.
5. Add this line **inside the site's existing HTTPS `server` block**:

   ```nginx
   include /opt/waypoint/ai-service/deploy/nginx-ai.conf;
   ```

   Validate with `sudo nginx -t`, then reload with `sudo systemctl reload nginx`.
   Keep the existing web/API routes. Vite's development proxy does not run in
   production; this Nginx include is required for chat, drafts and documents.
   The web app defaults to `/ai-api`, so no extra frontend variable is required.
6. Start the AI service:

   ```bash
   cd /opt/waypoint/ai-service
   bash deploy.sh
   pm2 status
   ```

   It installs locked runtime dependencies, starts AI infrastructure, initializes
   both owned schemas, verifies Qdrant, starts/restarts both PM2 processes and
   checks liveness and PM2 status. Initialization creates missing tables/indexes;
   it does not delete documents/conversations or alter the business schema.
7. If PM2 boot startup is not already configured, run `pm2 startup` and follow its
   generated administrator command, then `pm2 save`. Check Docker is enabled at
   boot. Confirm a server reboot restores all services.

The workflow now gates deployment on AI lint, formatting and tests, then runs
`bash deploy.sh` after the existing NestJS restart. Production/auth settings are
enforced by both the deployment script and PM2; other settings load from the
server-only `.env`. No secrets are copied through GitHub Actions.

## Verify the deployed site

- `/ai-api/health` must return JSON identifying `waypoint-ai-service`.
- `/ai-api/docs` must return 404; anonymous chat must return 401.
- Sign in and test chat for the deployed roles, including access denials.
- As a store manager, test both draft buttons; verify they only draft notes.
- As a dispatcher, upload a small test document, wait for ingestion, approve it
  and retrieve it with an allowed role/depot. Confirm a denied scope cannot see it.
- Restart the two AI PM2 processes and confirm conversations/documents persist.

`/health` is liveness. PM2 `online` does not prove that ingestion jobs are progressing.
Verify a completed job and real authenticated requests before accepting the release.
The deployment does not call Gemini as a smoke check or prove model answer quality.

## Operations and recovery

```bash
pm2 logs waypoint-ai --lines 50
pm2 logs waypoint-ai-worker --lines 50
docker compose -f /opt/waypoint/infra/compose.yml ps
```

PM2 keeps logs in its normal log directory. Use the server's existing log rotation
and monitor disk space. Restart after settings changes with `bash deploy.sh`.
Back up AI PostgreSQL and private originals together; retain Qdrant snapshots or
plan to reindex approved originals. Test restoration before relying on backups.
Do not remove infrastructure volumes or change database passwords on an existing
volume without a deliberate database credential change.

Like the existing backend deployment, restarting briefly interrupts requests.
There is no automatic rollback. If a release fails, restore the previous AI code
from a known good commit and rerun `deploy.sh` with the preserved `.env` and data.
Code rollback does not undo schema changes or document writes. Do not roll back
the whole shared checkout while other service changes are being deployed.
