import logging
from time import perf_counter
from uuid import uuid4

import psycopg
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.chat import router as chat_router
from app.api.documents import router as documents_router
from app.api.health import router as health_router
from app.api.upload_limit import UploadBodyLimit
from app.core.config import Settings
from app.core.logging import configure_logging
from app.storage.development import DevelopmentConversations


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings if settings is not None else Settings()
    configure_logging(settings.log_level)
    application = FastAPI(
        title="WayPoint AI Service",
        version="0.1.0",
        description="Document knowledge Q&A with role profiles and hybrid retrieval.",
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.environment != "production" else None,
    )
    application.state.settings = settings
    if not settings.auth_enabled:
        if not settings.database_url:
            application.state.conversations = DevelopmentConversations()
        logging.getLogger("waypoint_ai").warning("local_authentication_bypass_enabled")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
        expose_headers=["X-Request-ID"],
    )
    application.add_middleware(UploadBodyLimit)

    @application.exception_handler(psycopg.Error)
    async def storage_unavailable(request, exception):
        logging.getLogger("waypoint_ai.storage").warning("knowledge_storage_unavailable")
        return JSONResponse(status_code=503, content={"detail": "Knowledge storage unavailable"})

    @application.middleware("http")
    async def record_request(request: Request, call_next):
        # Generate locally; a caller-controlled ID is not a verified identity.
        request_id = str(uuid4())
        request.state.request_id = request_id
        started = perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            # Do not record bodies, tokens, query parameters, or document contents.
            logging.getLogger("waypoint_ai.http").info(
                "request_completed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "status_code": status_code,
                    "duration_ms": round((perf_counter() - started) * 1000, 2),
                },
            )

    application.include_router(health_router)
    application.include_router(chat_router)
    application.include_router(documents_router)
    return application


app = create_app()
