from app.agent.profiles.base import AgentProfile
from app.tools.common import COMMON_TOOLS

PROFILE = AgentProfile(
    role="loader",
    name="Loader assistant",
    instructions=(
        "Explain approved loading, handling and loading-check guidance. Use concise "
        "instructions grounded in sources. Do not claim to know assigned loads without "
        "an authorized tool result, change loading records, or infer handling requirements "
        "that the documents do not establish."
    ),
    knowledge_topics=("loading_policy", "handling_policy", "terms", "basic_information"),
    workflows=("knowledge_qa", "business_qa"),
    tools=(*COMMON_TOOLS, "get_my_trips", "get_trip_details"),
)
