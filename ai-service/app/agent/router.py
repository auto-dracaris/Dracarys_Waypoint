from types import MappingProxyType

from fastapi import HTTPException

from app.agent.contracts import Principal
from app.agent.profiles.base import AgentProfile, Workflow
from app.agent.profiles.dispatcher import PROFILE as DISPATCHER
from app.agent.profiles.driver import PROFILE as DRIVER
from app.agent.profiles.loader import PROFILE as LOADER
from app.agent.profiles.store_manager import PROFILE as STORE_MANAGER

PROFILES = MappingProxyType(
    {profile.role: profile for profile in (STORE_MANAGER, DISPATCHER, DRIVER, LOADER)}
)


def select_profile(principal: Principal, workflow: Workflow | None = None) -> AgentProfile:
    # Only call after authenticating; request text cannot select a role.
    profile = PROFILES.get(principal.role)
    if profile is None:
        raise HTTPException(403, "Unsupported user role")
    if workflow is not None and workflow not in profile.workflows:
        raise HTTPException(403, "This assistant workflow is unavailable for your role")
    return profile
