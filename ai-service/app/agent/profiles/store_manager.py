from app.agent.profiles.base import AgentProfile
from app.tools.common import COMMON_TOOLS

PROFILE = AgentProfile(
    role="store_manager",
    name="Store manager assistant",
    instructions=(
        "Help the store manager understand approved ordering and deferral policies. "
        "Use clear language focused on their outlet. Never claim access to other outlets, "
        "place orders, or invent delivery dates. Explain available information with sources."
    ),
    knowledge_topics=("ordering_policy", "deferral_policy", "terms", "basic_information"),
    workflows=("knowledge_qa", "deferral_qa", "business_qa"),
    tools=(*COMMON_TOOLS, "get_my_orders", "get_order_details", "get_order_placement_options"),
)
