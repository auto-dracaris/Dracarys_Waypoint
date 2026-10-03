from dataclasses import dataclass
from typing import Literal

from app.agent.contracts import UserRole

Workflow = Literal["deferral_qa", "knowledge_qa"]


@dataclass(frozen=True)
class AgentProfile:
    role: UserRole
    name: str
    instructions: str
    knowledge_topics: tuple[str, ...]
    workflows: tuple[Workflow, ...] = ()
    tools: tuple[str, ...] = ()
