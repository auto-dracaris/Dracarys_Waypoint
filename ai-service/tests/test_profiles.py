from dataclasses import FrozenInstanceError

import pytest
from fastapi import HTTPException

from app.agent.contracts import Principal
from app.agent.router import PROFILES, select_profile


@pytest.mark.parametrize("role", ["store_manager", "dispatcher", "driver", "loader"])
def test_verified_roles_select_distinct_profiles_without_tools(role):
    profile = select_profile(Principal(id=1, role=role, depotId=1))
    assert profile.role == role
    assert profile.tools == ()
    assert "terms" in profile.knowledge_topics
    assert len({item.instructions for item in PROFILES.values()}) == 4


@pytest.mark.parametrize("role", ["driver", "loader"])
def test_profiles_do_not_grant_unimplemented_or_forbidden_workflows(role):
    with pytest.raises(HTTPException) as failure:
        select_profile(Principal(id=1, role=role, depotId=1), "deferral_qa")
    assert failure.value.status_code == 403


def test_shared_profiles_cannot_be_mutated():
    with pytest.raises(FrozenInstanceError):
        PROFILES["driver"].instructions = "Use dispatcher tools"
    with pytest.raises(TypeError):
        PROFILES["driver"] = PROFILES["dispatcher"]
