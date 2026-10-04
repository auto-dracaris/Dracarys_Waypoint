"""Review-only delivery notes from an unsubmitted order form."""

import asyncio
import logging
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, ConfigDict, Field

from app.api.issue_drafts import IssueDraftResponse, bearer
from app.clients.business import BusinessClient
from app.clients.model import ModelClient
from app.guardrails.input import input_rejection
from app.guardrails.output import guarded_reply

router = APIRouter(prefix="/api/v1/order-drafts", tags=["drafting"])


class OrderDraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    requested_date: date
    temperature_requirement: Literal["ambient", "chilled"]
    quantity: int = Field(ge=1, le=100000, strict=True)
    weight_kg: float = Field(gt=0, le=100000, allow_inf_nan=False, strict=True)
    volume_m3: float = Field(gt=0, le=100000, allow_inf_nan=False, strict=True)
    notes: str = Field(default="", max_length=500)


def form_draft(body):
    return (
        f"Requested delivery: {body.requested_date.strftime('%d %B %Y')}. "
        f"The order contains {body.quantity} {body.temperature_requirement} cases, "
        f"with a total weight of {body.weight_kg:g} kg and volume of {body.volume_m3:g} m³."
    )


@router.post("", response_model=IssueDraftResponse)
async def draft_order(
    body: OrderDraftRequest,
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    if not credentials:
        raise HTTPException(401, "Bearer authentication required")
    settings = request.app.state.settings
    business = getattr(request.app.state, "business", None) or BusinessClient(settings)
    model = getattr(request.app.state, "model", None) or ModelClient(settings)
    try:
        async with asyncio.timeout(settings.request_timeout_seconds):
            principal = await business.authenticate(credentials.credentials)
            if principal.role != "store_manager" or principal.outletId is None:
                raise HTTPException(
                    403, "Drafting requires a store manager with an assigned outlet"
                )
            if body.notes.strip() and input_rejection(body.notes, credentials.credentials):
                raise HTTPException(422, "Remove credentials from your notes and try again")
            draft = None
            try:
                async with asyncio.timeout(8):
                    draft = await model.draft_order(body.model_dump(mode="json"))
            except Exception:
                logging.getLogger("waypoint_ai.drafting").warning("order_draft_model_unavailable")
            if draft:
                guarded = guarded_reply(
                    {"answer": draft, "status": "answered", "sources": []}, credentials.credentials
                )
                if guarded["status"] != "answered" or len(draft) > 500:
                    draft = None
            return IssueDraftResponse(
                draft=draft or form_draft(body), origin="ai" if draft else "form"
            )
    except HTTPException:
        raise
    except TimeoutError as exc:
        raise HTTPException(504, "Drafting took too long. Please try again") from exc
    except Exception as exc:
        logging.getLogger("waypoint_ai.drafting").warning("order_draft_dependency_unavailable")
        raise HTTPException(
            503, "Drafting is unavailable. Please write your note manually"
        ) from exc
