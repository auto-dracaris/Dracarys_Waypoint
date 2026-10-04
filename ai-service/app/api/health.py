from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "waypoint-ai-service"
    version: str = "0.1.0"
    scope: Literal["liveness"] = "liveness"


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Process liveness only; does not assert external integration readiness."""
    return HealthResponse()
