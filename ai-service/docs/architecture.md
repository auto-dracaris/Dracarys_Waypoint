# First assistant workflow

## Current initial build

Read-only business tools for all four roles now use existing order/trip APIs through
the explicit business_qa workflow, including review-only dispatcher deferral drafts.
Write operations remain deferred. See
[business tools](business-tools.md). The default is
knowledge_qa for all four profiles. An explicit local document mode disables
authentication and role/depot authorization while preserving profile instructions;
production rejects that bypass. Business tools always verify a real NestJS token,
even in local document mode, and preserve existing backend permissions.
Deferral_qa is an explicit legacy workflow, disabled in document development mode.

Each verified profile also exposes a shared pack: search_knowledge,
get_current_datetime and get_my_profile. Knowledge-tool retrieval always enforces
role/depot scope and catalog approval/version checks, including in local document
mode. Phase 1 returns separately cited excerpts and deterministic tool facts;
multi-round planning and generated combined explanations remain Phase 2 work.

Documents: local PDF/text -> extract -> page-aware chunks -> Gemini dense embeddings
plus server-side BM25 -> Qdrant hybrid collection. Questions: role profile ->
dense/BM25 search -> RRF -> three sources -> supported answer. Manual local seeding
remains available without a catalog. FastAPI management endpoints store private
originals and register versions and jobs transactionally in AI PostgreSQL. A separate
worker extracts and indexes drafts; dispatcher approval publishes the ready version.
Retrieval checks the authoritative catalog after hybrid search, so replacement and
deletion revoke old content immediately even before physical index cleanup.
See [current setup and limits](document-management.md).

The sections below describe the secured deferral foundation, not the default
local document workflow. Driver/loader now enable knowledge_qa; the earlier
statement about no enabled workflows refers only to the deferral slice.

One modular FastAPI service, separately deployable from NestJS.

After authentication, `agent/router.py` selects an immutable role profile from
`agent/profiles/`: store manager, dispatcher, driver or loader. The profile supplies
role-specific model instructions, topic guidance and explicit workflow capabilities.
Topics guide future knowledge features; they are not security grants or additional
retrieval filters. Retrieved documents must still pass role/depot checks in code.
The store-manager profile allows get_my_orders, get_order_details and
get_order_placement_options. Other profile tool lists remain empty. Business chat
always verifies a real access token, even in local document development mode.
Gemini selects at most three tools; code validates all calls and endpoint paths,
then renders the backend facts directly. The existing deferral adapter stays read-only.

Profiles share clients, memory and workflow implementations. The first task archetype
is deferral_qa, available to managers and dispatchers only. Driver and loader
profiles are defined but have no enabled workflows yet; knowledge Q&A comes after
ingestion. Neither chat text nor a requested archetype can override the verified role.
The router chooses profiles directly; there is no agent-to-agent delegation.

Request path: bearer token -> NestJS /auth/me -> owned conversation -> LangGraph
resolve order -> scoped NestJS deferral lookup -> approved Qdrant policy retrieval
-> sourced answer -> PostgreSQL memory. Model requests call Gemini directly.

Modules:
- `api`: HTTP contracts and routes, without provider or business logic.
- `core`: configuration and logging.
- `agent`: graph state, nodes, prompts, tool selection, and step limits.
- `tools`: validated read-only order tools; NestJS retains record/action authorization.
- `retrieval`: role/outlet/document-version filters and citation generation.
- `ingestion`: extraction, chunking, durable worker and optional local seeding.
- `clients`: NestJS authentication/facts and Gemini policy explanation.
- `storage`: AI-owned conversations, document catalog, jobs and private originals.

The endpoint supports deferral Q&A only. Send order_id explicitly on the first
factual turn. Follow-ups reuse that ID and fetch fresh records. Recorded reasons
and dates are rendered from business facts; Gemini can add a separately labelled
policy explanation with checked source IDs. Citation checks do not establish that
every generated claim is accurate; evaluate explanations before enabling them.

Memory contains the last order ID and six turns. Only the order ID is used as
follow-up context in this slice; full-history reasoning and graph checkpoint/resume
are not implemented. Tokens stay outside stored graph/conversation data. Ownership
includes verified user, role, depot and outlet. Transactions and advisory locks
serialize turns across workers; busy conversations return 409. Failed turns roll
back. One connection per turn is sufficient initially; add a pool based on measured
load. Agree on retention before production; no automatic cleanup exists yet.

Retrieval accepts approved/current, role-matching depot-wide policies only. Never
put outlet-private documents in this payload contract. Ingestion must match the
query embedding model, dimensions and preprocessing. No corpus or ingestion
pipeline is delivered in this slice. No identity headers or chat text grant access.

First feature: deferral Q&A. Summaries, drafts, general terms Q&A, ordering and
recommendations come later.
NestJS remains the authority for live records, permissions, and business writes.
Allocation, LangSmith, OpenTelemetry, graph databases and the gateway are deferred.

Total request deadlines and graph step limits are enforced. Retrieval is capped at
three policy chunks of 4,000 characters each. Model-selected URLs and arbitrary
tool execution are not exposed. Live integrations still require verification.

References: [LangGraph memory](https://docs.langchain.com/oss/python/langgraph/add-memory),
[Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output),
[Qdrant filtering](https://qdrant.tech/documentation/concepts/filtering/).

See [admin knowledge contract](admin-knowledge-contract.md) for document/source
ownership, proposed endpoints, authentication and lifecycle requirements. This phase
delivers contracts only; processing/persistence and ingestion routes come next.
