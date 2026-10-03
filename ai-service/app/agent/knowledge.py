from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.agent.contracts import Source


class State(TypedDict, total=False):
    sources: list[Source]
    answer: str
    status: str


async def run_knowledge(request, memory, principal, retrieval, model, profile, max_steps):
    async def retrieve(state):
        return {"sources": await retrieval.retrieve(request.message, principal)}

    async def answer(state):
        sources = state["sources"]
        if not sources:
            return {
                "answer": "I could not find supporting information in the indexed documents.",
                "status": "no_knowledge",
            }
        explanation = await model.explain(
            request.message, sources, instructions=profile.instructions
        )
        if explanation:
            return {"answer": explanation, "status": "answered"}
        return {
            "answer": "I found the attached source excerpts, but could not produce a "
            "supported answer. Please review the sources.",
            "status": "sources_only",
        }

    graph = StateGraph(State)
    graph.add_node("retrieve", retrieve)
    graph.add_node("answer", answer)
    graph.add_edge(START, "retrieve")
    graph.add_edge("retrieve", "answer")
    graph.add_edge("answer", END)
    result = await graph.compile().ainvoke({}, {"recursion_limit": max_steps})
    memory.turns = [*memory.turns, {"user": request.message, "assistant": result["answer"]}][-6:]
    return result
