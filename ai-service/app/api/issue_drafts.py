"""Review-only drafting from user-entered form facts; never submits an issue."""

import asyncio
import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.clients.business import BusinessClient
from app.clients.model import ModelClient
from app.guardrails.input import input_rejection
from app.guardrails.output import guarded_reply

router = APIRouter(prefix="/api/v1/issue-drafts", tags=["drafting"])
bearer = HTTPBearer(auto_error=False)


class IssueDraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    delivery_reference: str = Field(min_length=1, max_length=80)
    issue_type: Literal["Damaged goods", "Missing goods", "Wrong items"]
    ordered_cases: int = Field(ge=1, le=100000, strict=True)
    accepted_cases: int = Field(ge=0, le=100000, strict=True)
    damaged_cases: int = Field(ge=0, le=100000, strict=True)
    notes: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def consistent_facts(self):
        counted = self.accepted_cases + self.damaged_cases
        if not self.delivery_reference.strip() or counted > self.ordered_cases:
            raise ValueError("Check the delivery reference and quantities before drafting")
        if self.issue_type == "Damaged goods" and (
            self.damaged_cases == 0 or counted != self.ordered_cases
        ):
            raise ValueError("Enter damaged cases and check the quantities before drafting")
        if self.issue_type == "Missing goods" and counted == self.ordered_cases:
            raise ValueError("The quantities do not show any missing cases")
        if self.issue_type == "Wrong items" and not self.notes.strip():
            raise ValueError("Describe which items were wrong before drafting")
        return self


class IssueDraftResponse(BaseModel):
    draft: str = Field(max_length=500)
    origin: Literal["ai", "form"]


def form_draft(body):
    text = (
        f"For delivery {body.delivery_reference}, I accepted {body.accepted_cases} "
        f"of {body.ordered_cases} ordered cases"
    )
    if body.damaged_cases:
        text += f" and recorded {body.damaged_cases} damaged cases"
    missing = body.ordered_cases - body.accepted_cases - body.damaged_cases
    if missing:
        text += f"; {missing} cases were not received"
    text += "."
    if body.issue_type == "Wrong items":
        text += " I am reporting wrong items; please review the details provided."
    else:
        text += " Please review this delivery issue."
    return text


@router.post("", response_model=IssueDraftResponse)
async def draft_issue(
    body: IssueDraftRequest,
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
            if input_rejection(
                body.delivery_reference + "\n" + body.notes, credentials.credentials
            ):
                raise HTTPException(
                    422, "Remove credentials from the reference or notes and try again"
                )
            draft = None
            try:
                async with asyncio.timeout(8):
                    draft = await model.draft_issue(body.model_dump())
            except Exception:
                logging.getLogger("waypoint_ai.drafting").warning("issue_draft_model_unavailable")
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
        logging.getLogger("waypoint_ai.drafting").warning("issue_draft_dependency_unavailable")
        raise HTTPException(
            503, "Drafting is unavailable. Please write your note manually"
        ) from exc
