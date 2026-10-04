import logging
import re

from app.agent.response_limits import limit_reply
from app.guardrails.context import safe_sources
from app.guardrails.policy import contains_secret

CITATIONS = re.compile(r"\[((?:api:|policy:|identity:|runtime:|order:)[^\]]+)\]")


def guarded_reply(result, token=None):
    sources = safe_sources(result.get("sources", []))
    answer = result.get("answer")
    reason = None
    if not isinstance(answer, str) or not answer.strip():
        reason = "malformed"
    elif contains_secret(answer) or (token and len(token) >= 16 and token in answer):
        reason = "secret"
    else:
        allowed = {source.id for source in sources}
        if any(
            identifier.strip() not in allowed
            for group in CITATIONS.findall(answer)
            for identifier in group.split(",")
        ):
            reason = "citation"
    if token and len(token) >= 16:
        sources = [
            source.model_copy(
                update={
                    field: value.replace(token, "[REDACTED]")
                    for field in type(source).model_fields
                    if isinstance(value := getattr(source, field), str)
                }
            )
            for source in sources
        ]
    if reason:
        # Fixed event and category only: never log rejected content or credentials.
        logging.getLogger("waypoint_ai.guardrails").warning("reply_rejected_%s", reason)
        result = {
            **result,
            "answer": "I could not safely verify this reply. "
            "Please rephrase your question or review the available sources.",
            "status": "sources_only" if sources else "needs_input",
        }
    return limit_reply({**result, "sources": sources})
