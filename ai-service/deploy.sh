#!/usr/bin/env bash
# Run as the existing non-root PM2/SSH deployment user on the Linux server.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
export PATH="$HOME/.local/bin:$PATH"
export AI_ENVIRONMENT=production AI_AUTH_ENABLED=true
export PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

for tool in uv docker pm2; do
  command -v "$tool" >/dev/null || { echo "Install $tool for the deployment user first." >&2; exit 1; }
done
for file in .env ../infra/.env; do
  [[ -f "$file" ]] || { echo "Missing $file; follow docs/deployment.md first." >&2; exit 1; }
done

uv sync --locked --no-dev --python 3.11
# Fail safely without printing settings or credentials.
.venv/bin/python - <<'PY'
from app.core.config import Settings

try:
    settings = Settings()
    if not settings.database_url or not settings.qdrant_api_key:
        raise ValueError("missing storage credentials")
    if (settings.gemini_model or settings.embedding_model) and not settings.gemini_api_key:
        raise ValueError("missing model credentials")
    settings.document_storage_path.mkdir(parents=True, exist_ok=True)
except Exception:
    raise SystemExit("Invalid production configuration; check the server .env privately.") from None
PY

# Stable existing Compose project/volumes; only the two AI dependencies are started.
docker compose -f ../infra/compose.yml up -d --wait ai-postgres qdrant
.venv/bin/python -m app.storage.conversations
.venv/bin/python -m app.storage.knowledge

# Qdrant has no Compose healthcheck; verify its authenticated API explicitly.
.venv/bin/python - <<'PY'
import time
import httpx
from app.core.config import Settings

settings = Settings()
for attempt in range(15):
    try:
        response = httpx.get(
            f"{str(settings.qdrant_url).rstrip('/')}/collections",
            headers={"api-key": settings.qdrant_api_key.get_secret_value()},
            timeout=3,
        )
        response.raise_for_status()
        assert isinstance(response.json()["result"]["collections"], list)
        break
    except Exception:
        if attempt == 14:
            raise SystemExit("Qdrant readiness failed; check its URL/key and server logs privately.") from None
        time.sleep(2)
PY

pm2 startOrRestart ecosystem.config.js --update-env
.venv/bin/python - <<'PY'
import time
import httpx

for attempt in range(15):
    try:
        response = httpx.get("http://127.0.0.1:8000/health", timeout=3)
        response.raise_for_status()
        assert response.json()["service"] == "waypoint-ai-service"
        break
    except Exception:
        if attempt == 14:
            raise SystemExit("AI service did not start; inspect pm2 logs waypoint-ai.") from None
        time.sleep(2)
PY
pm2 jlist | node -e '
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const apps = JSON.parse(input);
  const names = ["waypoint-ai", "waypoint-ai-worker"];
  if (!names.every(name => apps.some(app => app.name === name && app.pm2_env.status === "online"))) {
    console.error("AI API/worker is not online; inspect PM2 logs.");
    process.exitCode = 1;
  }
});'
pm2 save
echo "AI API and ingestion worker started. Verify authenticated browser flows after deployment."
