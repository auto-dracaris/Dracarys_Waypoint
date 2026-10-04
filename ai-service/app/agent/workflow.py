from typing import TypedDict

from fastapi import HTTPException
from langgraph.graph import END, START, StateGraph

from app.agent.contracts import ChatRequest, Conversation, Deferral, Principal, Source
from app.agent.profiles.base import AgentProfile
from app.guardrails.output import guarded_reply


class State(TypedDict, total=False):
    order_id: int | None
    record: Deferral
    sources: list[Source]
    answer: str
    status: str


async def run_workflow(
    request: ChatRequest,
    memory: Conversation,
    principal: Principal,
    token: str,
    business,
    retrieval,
    model,
    max_steps: int,
    profile: AgentProfile,
):
    # Dependencies/credentials are invocation-local closures, never persistent graph state.
    async def resolve(state: State):
        return {"order_id": request.order_id or memory.last_order_id}

    async def facts(state: State):
        record = await business.deferral(state["order_id"], principal, token)
        # Enforce scope even for alternate/test adapters.
        if record.order_id != state["order_id"] or record.depot_id != principal.depotId:
            raise HTTPException(403, "Order outside your scope")
        if principal.role == "store_manager" and record.outlet_id != principal.outletId:
            raise HTTPException(403, "Order outside your outlet")
        return {"record": record}

    async def retrieve(state: State):
        record = state["record"]
        if not record.reason:
            return {"sources": []}
        # Search with authoritative reason rather than caller-supplied instructions.
        return {"sources": await retrieval.retrieve(f"Order deferral: {record.reason}", principal)}

    async def answer(state: State):
        order_id = state["order_id"]
        if not order_id:
            return {
                "answer": "Please provide the order number.",
                "status": "needs_order",
                "sources": [],
            }
        record = state["record"]
        if not record.reason:
            return {
                "answer": f"Order {order_id} has no recorded deferral reason. "
                "Please ask the dispatcher to review it.",
                "status": "reason_missing",
                "sources": [],
            }
        text = f"Order {order_id} was deferred. Recorded reason: {record.reason}."
        if record.reason_note:
            text += f" Dispatcher note: {record.reason_note}"
        text += (
            f" Recorded next date: {record.deferred_to_date}."
            if record.deferred_to_date
            else " No next date has been recorded."
        )
        fact_source = Source(
            id=f"order:{order_id}:deferral", title="Live deferral record", text=text
        )
        explanation = await model.explain(
            request.message, state["sources"], instructions=profile.instructions
        )
        if explanation:
            text += f"\n\n{explanation}"
        return {"answer": text, "status": "answered", "sources": [fact_source, *state["sources"]]}

    graph = StateGraph(State)
    for name, node in [
        ("resolve", resolve),
        ("facts", facts),
        ("retrieve", retrieve),
        ("answer", answer),
    ]:
        graph.add_node(name, node)
    graph.add_edge(START, "resolve")
    graph.add_conditional_edges("resolve", lambda state: "facts" if state["order_id"] else "answer")
    graph.add_edge("facts", "retrieve")
    graph.add_edge("retrieve", "answer")
    graph.add_edge("answer", END)
    result = await graph.compile().ainvoke({}, {"recursion_limit": max_steps})
    result = guarded_reply(result, token)
    if result["order_id"]:
        memory.last_order_id = result["order_id"]
    memory.turns = [*memory.turns, {"user": request.message, "assistant": result["answer"]}][-6:]
    return result
