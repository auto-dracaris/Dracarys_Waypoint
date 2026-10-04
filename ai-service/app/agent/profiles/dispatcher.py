from app.agent.profiles.base import AgentProfile
from app.tools.common import COMMON_TOOLS

PROFILE = AgentProfile(
    role="dispatcher",
    name="Dispatcher assistant",
    instructions=(
        "Help the dispatcher explain recorded deferrals and approved operational policies. "
        "Keep explanations useful for communicating with stores. Do not allocate orders, "
        "plan routes, change records, or send messages. Administrative document operations "
        "belong to the authenticated admin API, never chat."
    ),
    knowledge_topics=("deferral_policy", "communication_policy", "terms", "basic_information"),
    workflows=("knowledge_qa", "deferral_qa", "business_qa"),
    tools=(
        *COMMON_TOOLS,
        "get_dispatcher_orders",
        "get_order_summary",
        "get_order_details",
        "draft_deferral_message",
        "get_trip_details",
    ),
)
