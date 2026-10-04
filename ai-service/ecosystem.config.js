const path = require('node:path');

const common = {
  cwd: __dirname,
  script: path.join(__dirname, '.venv/bin/python'),
  interpreter: 'none',
  exec_mode: 'fork',
  instances: 1,
  autorestart: true,
  watch: false,
  min_uptime: '10s',
  max_restarts: 10,
  restart_delay: 3000,
  kill_timeout: 10000,
  env: {
    AI_ENVIRONMENT: 'production',
    AI_AUTH_ENABLED: 'true',
    PYTHONUNBUFFERED: '1',
    PYTHONDONTWRITEBYTECODE: '1',
  },
};

module.exports = {
  apps: [
    {
      ...common,
      name: 'waypoint-ai',
      args: '-m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log --timeout-graceful-shutdown 8',
    },
    {
      ...common,
      name: 'waypoint-ai-worker',
      args: '-m app.ingestion.worker',
    },
  ],
};
