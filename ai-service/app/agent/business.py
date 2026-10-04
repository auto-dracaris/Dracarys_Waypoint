import re
from typing import TypedDict
from uuid import UUID

from fastapi import HTTPException
from langgraph.graph import END, START, StateGraph

from app.agent.contracts import Source
from app.clients.tool_planner import ToolCall
from app.tools.orders import execute, validate_call


class State(TypedDict, total=False):
    calls: list[ToolCall]
    sources: list[Source]
    answer: str
    status: str
    knowledge_empty: bool


async def run_business(
    request, memory, principal, token, business, planner, profile, max_steps, retrieval=None
):
    # Token and principal stay in invocation-local closures, never graph or memory data.
    async def plan(state):
        context = {}
        if "get_trip_details" in profile.tools:
            context["trip_id"] = str(request.trip_id) if request.trip_id else memory.last_trip_id
        calls = await planner.plan(
            request.message, request.order_id or memory.last_order_id, profile, **context
        )
        if len(calls) > 3:
            raise HTTPException(502, "Assistant exceeded the tool call limit")
        return {"calls": calls}

    async def tools(state):
        # Validate every call before fetching any records, including for alternate planners.
        arguments = [validate_call(call, principal, profile) for call in state["calls"]]
        known_ids = {
            int(value)
            for value in re.findall(
                r"(?:\border\s+(?:(?:id|number)\s+)?#?|\bORD|#)(\d{1,10})\b",
                request.message,
                flags=re.IGNORECASE,
            )
        }
        if request.order_id or memory.last_order_id:
            known_ids.add(request.order_id or memory.last_order_id)
        for call, args in zip(state["calls"], arguments, strict=True):
            if (
                call.name in ("get_order_details", "draft_deferral_message")
                and args.order_id not in known_ids
            ):
                raise HTTPException(502, "Assistant selected an order ID that was not supplied")
        known_trips = {
            UUID(value)
            for value in re.findall(
                r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b",
                request.message,
            )
        }
        if request.trip_id or memory.last_trip_id:
            known_trips.add(UUID(str(request.trip_id or memory.last_trip_id)))
        for call, args in zip(state["calls"], arguments, strict=True):
            if (
                call.name in ("get_trip_details", "get_route_change")
                and args.trip_id not in known_trips
            ):
                raise HTTPException(502, "Assistant selected a trip ID that was not supplied")
        sources = []
        knowledge_empty = False
        for call, args in zip(state["calls"], arguments, strict=True):
            result = await execute(call, args, principal, token, business, retrieval)
            if call.name == "search_knowledge":
                knowledge_empty = knowledge_empty or not result
                sources.extend(result)
            else:
                sources.append(result)
        return {"sources": sources, "knowledge_empty": knowledge_empty}

    async def answer(state):
        if not state["sources"]:
            if state["knowledge_empty"]:
                return {
                    "answer": "I could not find supporting information "
                    "in your permitted indexed documents.",
                    "status": "no_knowledge",
                }
            return {
                "answer": "Please ask about approved knowledge, your profile, current time, "
                "or an order or trip operation available to your role. "
                "For details or a message draft, provide the order number or trip UUID. "
                "Creating or changing records and sending messages are not enabled.",
                "status": "needs_input",
            }
        text = "\n\n".join(
            f"Document excerpt — {source.title} [{source.id}]:\n{source.text}"
            if source.id.startswith("policy:")
            else source.text
            for source in state["sources"]
        )
        if state["knowledge_empty"]:
            text += "\n\nNo supporting information was found in your permitted indexed documents."
        knowledge_only = all(call.name == "search_knowledge" for call in state["calls"])
        return {"answer": text, "status": "sources_only" if knowledge_only else "answered"}

    graph = StateGraph(State)
    for name, node in (("plan", plan), ("tools", tools), ("answer", answer)):
        graph.add_node(name, node)
    graph.add_edge(START, "plan")
    graph.add_edge("plan", "tools")
    graph.add_edge("tools", "answer")
    graph.add_edge("answer", END)
    result = await graph.compile().ainvoke({}, {"recursion_limit": max_steps})
    for call in result["calls"]:
        if call.name in ("get_order_details", "draft_deferral_message"):
            memory.last_order_id = call.arguments["order_id"]
        if call.name in ("get_trip_details", "get_route_change"):
            memory.last_trip_id = str(UUID(str(call.arguments["trip_id"])))
    memory.turns = [*memory.turns, {"user": request.message, "assistant": result["answer"]}][-6:]
    return result
