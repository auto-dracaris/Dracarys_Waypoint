import asyncio
import json
import logging
import re
from typing import TypedDict
from uuid import UUID

from fastapi import HTTPException
from langgraph.graph import END, START, StateGraph

from app.agent.contracts import Source
from app.clients.tool_planner import ToolCall, is_today_order_summary
from app.guardrails.output import guarded_reply
from app.tools.orders import execute, validate_call

MAX_ROUNDS = 3
MAX_CALLS = 6
OPTIONAL_MODEL_SECONDS = 8


class State(TypedDict, total=False):
    pending: list[ToolCall]
    calls: list[ToolCall]
    sources: list[Source]
    results: list[dict]
    rounds: int
    answer: str
    status: str
    knowledge_empty: bool
    knowledge_unavailable: bool
    planning_unavailable: bool
    limited: bool


async def run_business(
    request,
    memory,
    principal,
    token,
    business,
    planner,
    profile,
    max_steps,
    retrieval=None,
    model=None,
    deadline=None,
):
    # Credentials and permission-bearing identity stay in invocation-local closures.
    order_ids = {
        int(value)
        for value in re.findall(
            r"(?:\border\s+(?:(?:id|number)\s+)?#?|\bORD|#)(\d{1,10})\b",
            request.message,
            flags=re.IGNORECASE,
        )
    }
    if request.order_id or memory.last_order_id:
        order_ids.add(request.order_id or memory.last_order_id)
    trip_ids = {
        str(UUID(value))
        for value in re.findall(
            r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b",
            request.message,
        )
    }
    if request.trip_id or memory.last_trip_id:
        trip_ids.add(str(UUID(str(request.trip_id or memory.last_trip_id))))
    completed = set()

    def optional_deadline(reserve):
        limit = asyncio.get_running_loop().time() + OPTIONAL_MODEL_SECONDS
        return min(limit, deadline - reserve) if deadline is not None else limit

    async def plan(state):
        remaining = MAX_CALLS - len(state["calls"])
        if state["rounds"] == 0:
            context = {}
            if "get_trip_details" in profile.tools:
                context["trip_id"] = (
                    str(request.trip_id) if request.trip_id else memory.last_trip_id
                )
            calls = await planner.plan(
                request.message, request.order_id or memory.last_order_id, profile, **context
            )
        else:
            try:
                async with asyncio.timeout_at(optional_deadline(3)):
                    calls = await planner.plan_followup(
                        request.message,
                        profile,
                        state["results"],
                        sorted(order_ids),
                        sorted(trip_ids),
                        remaining,
                    )
            except Exception:
                logging.getLogger("waypoint_ai.agent").warning("followup_planning_unavailable")
                return {"pending": [], "planning_unavailable": True}
        if len(calls) > min(3, remaining):
            raise HTTPException(502, "Assistant exceeded the tool call limit")
        # Validate the entire batch before executing any read in this round.
        arguments = [validate_call(call, principal, profile) for call in calls]
        pending = []
        batch = set()
        for call, args in zip(calls, arguments, strict=True):
            if (
                call.name in ("get_order_details", "draft_deferral_message")
                and args.order_id not in order_ids
            ):
                raise HTTPException(502, "Assistant selected an order ID that was not supplied")
            if (
                call.name in ("get_trip_details", "get_route_change")
                and str(args.trip_id) not in trip_ids
            ):
                raise HTTPException(502, "Assistant selected a trip ID that was not supplied")
            key = (call.name, json.dumps(args.model_dump(mode="json"), sort_keys=True))
            if key not in completed and key not in batch:
                pending.append(call)
                batch.add(key)
        return {"pending": pending, "rounds": state["rounds"] + 1}

    async def tools(state):
        sources = list(state["sources"])
        results = list(state["results"])
        calls = list(state["calls"])
        knowledge_empty = state["knowledge_empty"]
        knowledge_unavailable = state["knowledge_unavailable"]
        for call in state["pending"]:
            args = validate_call(call, principal, profile)
            unavailable = False
            try:
                value = await execute(call, args, principal, token, business, retrieval)
            except TimeoutError:
                raise
            except Exception as exc:
                if call.name != "search_knowledge" or (
                    isinstance(exc, HTTPException) and exc.status_code in (401, 403)
                ):
                    raise
                unavailable = True
                knowledge_unavailable = True
                value = []
                logging.getLogger("waypoint_ai.agent").warning("tool_knowledge_unavailable")
            rows = value if isinstance(value, list) else [value]
            if call.name == "search_knowledge":
                knowledge_empty = knowledge_empty or not rows
            # Only API adapters can introduce IDs; document text never introduces them.
            if call.name in ("get_my_orders", "get_dispatcher_orders", "get_order_details"):
                for source in rows:
                    order_ids.update(source.order_ids)
            if call.name in ("get_my_trips", "get_trip_details"):
                for source in rows:
                    trip_ids.update(str(identifier) for identifier in source.trip_ids)
            accepted = []
            for source in rows:
                if any(
                    existing.id == source.id and existing.text == source.text
                    for existing in sources
                ):
                    continue
                if any(existing.id == source.id for existing in sources):
                    source = source.model_copy(update={"id": f"{source.id}:read:{len(calls) + 1}"})
                if (
                    source.id.startswith("policy:")
                    and sum(item.id.startswith("policy:") for item in sources) >= 3
                ):
                    continue
                sources.append(source)
                accepted.append(source)
            results.append(
                {
                    "tool": call.name,
                    "arguments": args.model_dump(mode="json"),
                    "sources": [source.model_dump() for source in accepted],
                    "empty": not rows,
                    "unavailable": unavailable,
                }
            )
            completed.add((call.name, json.dumps(args.model_dump(mode="json"), sort_keys=True)))
            calls.append(call)
        knowledge_empty = any(call.name == "search_knowledge" for call in calls) and not any(
            source.id.startswith("policy:") for source in sources
        )
        limited = state["rounds"] >= MAX_ROUNDS or len(calls) >= MAX_CALLS
        return {
            "sources": sources,
            "results": results,
            "calls": calls,
            "knowledge_empty": knowledge_empty,
            "knowledge_unavailable": knowledge_unavailable,
            "limited": limited,
        }

    async def answer(state):
        if (
            state["planning_unavailable"]
            and state["sources"]
            and all(source.id == "runtime:datetime" for source in state["sources"])
        ):
            return {
                "answer": "I could check the current date, but could not retrieve the "
                "records needed to answer your question. Please try again.",
                "status": "needs_input",
            }
        if not state["sources"]:
            if state["knowledge_unavailable"]:
                raise HTTPException(503, "Knowledge retrieval is unavailable")
            if state["knowledge_empty"]:
                return {
                    "answer": "I could not find supporting information "
                    "in your permitted indexed documents.",
                    "status": "no_knowledge",
                }
            return {
                "answer": "Please ask about approved knowledge, your profile, current time, "
                "or an order or trip operation available to your role. For details or a "
                "message draft, provide the order number or trip UUID. Creating or changing "
                "records and sending messages are not enabled.",
                "status": "needs_input",
            }
        explanation = None
        generation_timed_out = False
        # Preserve deterministic dispatcher drafts; synthesis cannot rewrite a historical cause.
        if model is not None and not any(
            call.name == "draft_deferral_message" for call in state["calls"]
        ):
            try:
                async with asyncio.timeout_at(optional_deadline(1)):
                    explanation = await model.combine(
                        request.message,
                        state["sources"],
                        instructions=profile.instructions,
                        knowledge_empty=state["knowledge_empty"],
                        limited=state["limited"],
                    )
            except HTTPException:
                raise
            except TimeoutError:
                generation_timed_out = True
            except Exception:
                logging.getLogger("waypoint_ai.agent").warning("combined_answer_unavailable")
        text = explanation or "\n\n".join(
            f"{source.title}\n{source.text} [{source.id}]"
            if source.id.startswith("policy:")
            else f"{source.text} [{source.id}]"
            for source in state["sources"]
        )
        if state["knowledge_unavailable"]:
            text += "\n\nSome guidance could not be checked. Please review the available sources."
        elif state["knowledge_empty"]:
            text += "\n\nNo supporting information was found in your permitted indexed documents."
        if state["limited"] and not state["planning_unavailable"]:
            text += "\n\nThis covers the records checked so far; additional details may be missing."
        if state["planning_unavailable"]:
            text += (
                "\n\nI could not check all the requested details. "
                "This reply covers the information available so far."
            )
        if generation_timed_out:
            logging.getLogger("waypoint_ai.agent").warning("combined_answer_timed_out")
            # The cited record facts remain usable without describing model internals.
        knowledge_only = all(call.name == "search_knowledge" for call in state["calls"])
        status = "sources_only" if knowledge_only and not explanation else "answered"
        return {"answer": text, "status": status}

    def after_tools(state):
        if (
            is_today_order_summary(request.message)
            and len(state["calls"]) == 1
            and (state["calls"][0].name == "get_order_summary")
        ):
            return "answer"
        if state["limited"] or not callable(getattr(planner, "plan_followup", None)):
            return "answer"
        return "plan"

    graph = StateGraph(State)
    for name, node in (("plan", plan), ("tools", tools), ("answer", answer)):
        graph.add_node(name, node)
    graph.add_edge(START, "plan")
    graph.add_conditional_edges("plan", lambda state: "tools" if state["pending"] else "answer")
    graph.add_conditional_edges("tools", after_tools)
    graph.add_edge("answer", END)
    result = await graph.compile().ainvoke(
        {
            "calls": [],
            "sources": [],
            "results": [],
            "rounds": 0,
            "knowledge_empty": False,
            "knowledge_unavailable": False,
            "planning_unavailable": False,
            "limited": False,
        },
        {"recursion_limit": max_steps},
    )
    result = guarded_reply(result, token)
    for call in result["calls"]:
        if call.name in ("get_order_details", "draft_deferral_message"):
            memory.last_order_id = call.arguments["order_id"]
        if call.name in ("get_trip_details", "get_route_change"):
            memory.last_trip_id = str(UUID(str(call.arguments["trip_id"])))
    memory.turns = [*memory.turns, {"user": request.message, "assistant": result["answer"]}][-6:]
    return result
