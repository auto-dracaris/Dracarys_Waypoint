# First assistant workflow

## Current initial build

Business APIs and tools are deferred until actual contracts arrive. The default is
knowledge_qa for all four profiles. An explicit local mode disables authentication
and role/depot authorization while preserving profile instructions; production
rejects that bypass. Secured mode remains available for later integration/testing.
Deferral_qa is an explicit legacy workflow, disabled in document development mode.

Documents: local PDF/text -> extract -> page-aware chunks -> Gemini dense embeddings
plus server-side BM25 -> Qdrant hybrid collection. Questions: role profile ->
dense/BM25 search -> RRF -> three sources -> supported answer. Manual local seeding
is implemented; admin APIs, durable jobs and source lifecycle storage are deferred.
See [current setup and limits](document-development.md).

The sections below describe the secured deferral foundation, not the default
local document workflow. Driver/loader now enable knowledge_qa; the earlier
statement about no enabled workflows refers only to the deferral slice.

One modular FastAPI service, separately deployable from NestJS.

After authentication, `agent/router.py` selects an immutable role profile from
`agent/profiles/`: store manager, dispatcher, driver or loader. The profile supplies
role-specific model instructions, topic guidance and explicit workflow capabilities.
Topics guide future knowledge features; they are not security grants or additional
retrieval filters. Retrieved documents must still pass role/depot checks in code.
All profile tool lists are empty. The existing deferral adapter remains read-only.

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
- `tools`: reserved for later business operations; authorization belongs in NestJS.
- `retrieval`: role/outlet/document-version filters and citation generation.
- `ingestion`: reserved for approved document ingestion.
- `clients`: NestJS authentication/facts and Gemini policy explanation.
- `storage`: owned PostgreSQL conversations and transactional updates.

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
