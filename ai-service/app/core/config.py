from typing import Literal

from pydantic import AnyHttpUrl, Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="AI_",
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    environment: Literal["development", "test", "production"] = "development"
    auth_enabled: bool = True
    development_role: Literal["store_manager", "dispatcher", "driver", "loader"] = "store_manager"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    cors_origins: list[str] = Field(default_factory=list)
    request_timeout_seconds: float = Field(default=30, gt=0, le=300)
    max_agent_steps: int = Field(default=8, ge=1, le=50)
    nestjs_base_url: AnyHttpUrl = AnyHttpUrl("http://localhost:5000/api")
    qdrant_url: AnyHttpUrl = AnyHttpUrl("http://localhost:6333")
    qdrant_api_key: SecretStr | None = None
    qdrant_collection: str = "waypoint_knowledge_hybrid_v1"
    gemini_api_key: SecretStr | None = None
    gemini_model: str | None = None
    embedding_model: str | None = None
    embedding_dimensions: int = Field(default=768, gt=0, le=4096)
    chunk_size: int = Field(default=1200, ge=100, le=4000)
    chunk_overlap: int = Field(default=150, ge=0)
    database_url: SecretStr | None = None
    # Relative endpoint template, configured only after NestJS implements this contract.
    deferral_endpoint: str | None = None

    @model_validator(mode="after")
    def require_production_security(self):
        if self.chunk_overlap >= self.chunk_size // 2:
            raise ValueError("Chunk overlap must be less than half the chunk size")
        if self.environment == "production" and not self.auth_enabled:
            raise ValueError("Authentication bypass is only available in development/test")
        return self
