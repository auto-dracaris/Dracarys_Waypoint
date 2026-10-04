import asyncio
import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from langgraph.errors import GraphRecursionError

from app.agent.business import run_business
from app.agent.contracts import ChatRequest, ChatResponse, Principal
from app.agent.knowledge import run_knowledge
from app.agent.router import select_profile
from app.agent.workflow import run_workflow
from app.clients.business import BusinessClient
from app.clients.model import ModelClient
from app.clients.tool_planner import ToolPlanner
from app.retrieval.policies import PolicyRetriever
from app.storage.conversations import PostgresConversations

router = APIRouter(prefix="/api/v1", tags=["assistant"])
bearer = HTTPBearer(auto_error=False)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    settings = request.app.state.settings
    requires_identity = settings.auth_enabled or body.workflow == "business_qa"
    if requires_identity and not credentials:
        raise HTTPException(401, "Bearer authentication required")
    # Overrides are server-owned test dependencies, never request-provided identities.
    business = getattr(request.app.state, "business", None) or BusinessClient(settings)
    retrieval = getattr(request.app.state, "retrieval", None) or PolicyRetriever(settings)
    model = getattr(request.app.state, "model", None) or ModelClient(settings)
    store = getattr(request.app.state, "conversations", None)
    if store is None and settings.database_url:
        store = PostgresConversations(settings.database_url.get_secret_value())
    conversation_id = body.conversation_id or uuid4()
    try:
        async with asyncio.timeout(settings.request_timeout_seconds):
            if requires_identity:
                principal = await business.authenticate(credentials.credentials)
            else:
                principal = Principal(id=0, role=settings.development_role, depotId=1, outletId=1)
                if body.workflow == "deferral_qa":
                    raise HTTPException(
                        503, "Business workflows are deferred in document development mode"
                    )
            profile = select_profile(principal, body.workflow)
            if (
                requires_identity
                and body.workflow == "deferral_qa"
                and principal.role == "store_manager"
                and principal.outletId is None
            ):
                raise HTTPException(403, "Store manager has no assigned outlet")
            if store is None:
                raise HTTPException(503, "Conversation storage is not configured")
            async with store.session(
                conversation_id, principal.scope, body.conversation_id is None
            ) as memory:
                if body.workflow == "knowledge_qa":
                    result = await run_knowledge(
                        body, memory, principal, retrieval, model, profile, settings.max_agent_steps
                    )
                elif body.workflow == "business_qa":
                    planner = getattr(request.app.state, "planner", None) or ToolPlanner(settings)
                    result = await run_business(
                        body,
                        memory,
                        principal,
                        credentials.credentials,
                        business,
                        planner,
                        profile,
                        settings.max_agent_steps,
                        retrieval=retrieval,
                    )
                else:
                    result = await run_workflow(
                        body,
                        memory,
                        principal,
                        credentials.credentials,
                        business,
                        retrieval,
                        model,
                        settings.max_agent_steps,
                        profile,
                    )
                return ChatResponse(
                    conversation_id=conversation_id,
                    answer=result["answer"],
                    sources=result["sources"],
                    status=result["status"],
                )
    except HTTPException:
        raise
    except (TimeoutError, GraphRecursionError) as exc:
        raise HTTPException(504, "Assistant exceeded its execution budget") from exc
    except Exception as exc:
        # Fixed log text: upstream exception messages may contain credentials or payloads.
        logging.getLogger("waypoint_ai.agent").warning("assistant_dependency_failed")
        raise HTTPException(503, "Assistant dependency unavailable") from exc
