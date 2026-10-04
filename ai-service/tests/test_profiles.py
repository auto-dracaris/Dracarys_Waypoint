from dataclasses import FrozenInstanceError

import pytest
from fastapi import HTTPException

from app.agent.contracts import Principal
from app.agent.router import PROFILES, select_profile
from app.tools.common import COMMON_TOOLS


@pytest.mark.parametrize("role", ["store_manager", "dispatcher", "driver", "loader"])
def test_verified_roles_select_distinct_profiles_with_scoped_tools(role):
    profile = select_profile(Principal(id=1, role=role, depotId=1))
    assert profile.role == role
    expected = {
        "store_manager": ("get_my_orders", "get_order_details", "get_order_placement_options"),
        "dispatcher": (
            "get_dispatcher_orders",
            "get_order_summary",
            "get_order_details",
            "draft_deferral_message",
            "get_trip_details",
        ),
        "driver": ("get_my_trips", "get_trip_details", "get_route_change"),
        "loader": ("get_my_trips", "get_trip_details"),
    }
    assert profile.tools == (*COMMON_TOOLS, *expected[role])
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
