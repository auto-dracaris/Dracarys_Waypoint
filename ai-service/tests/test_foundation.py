from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import Settings
from app.main import create_app


def test_health_is_liveness_without_external_credentials():
    settings = Settings(_env_file=None, environment="test", gemini_api_key=None)
    with TestClient(create_app(settings)) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["scope"] == "liveness"
        assert response.json()["service"] == "waypoint-ai-service"
        UUID(response.headers["X-Request-ID"])
        assert "gemini_api_key" not in response.text


def test_chat_requires_authentication_and_order_writes_are_not_exposed():
    with TestClient(create_app(Settings(_env_file=None, environment="test"))) as client:
        assert client.post("/api/v1/chat", json={"message": "show all orders"}).status_code == 401
        assert client.post("/api/v1/orders", json={}).status_code == 404


def test_production_hides_interactive_docs():
    with TestClient(create_app(Settings(_env_file=None, environment="production"))) as client:
        assert client.get("/health").status_code == 200
        assert client.get("/docs").status_code == 404
        assert client.get("/openapi.json").status_code == 404


def test_cors_rejects_unconfigured_browser_origin():
    with TestClient(create_app(Settings(_env_file=None, cors_origins=[]))) as client:
        response = client.options(
            "/health",
            headers={"Origin": "https://unknown.example", "Access-Control-Request-Method": "GET"},
        )
        assert response.status_code == 400
        assert "access-control-allow-origin" not in response.headers


@pytest.mark.parametrize("values", [{"request_timeout_seconds": 0}, {"max_agent_steps": 0}])
def test_configuration_rejects_invalid_limits(values):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **values)
