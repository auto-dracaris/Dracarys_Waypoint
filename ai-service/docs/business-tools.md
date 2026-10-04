# Role-specific read-only business tools

Implemented entirely in `ai-service`: NestJS, UI and allocation code are unchanged.
Store-manager, dispatcher, driver and loader tools are implemented. All write
operations remain future work. The existing document workflow stays unchanged.

## Chat request

Use the same FastAPI endpoint, `POST /api/v1/chat`, with `workflow: business_qa`:

```json
{
  "message": "Show my current orders",
  "workflow": "business_qa"
}
```

Send `Authorization: Bearer <role-specific-access-token>`. The token must be a real
NestJS access token, not its refresh token. Business requests authenticate against
NestJS `/auth/me` **even when AI_AUTH_ENABLED=false**. Local document chat still
supports its requested token-free bypass. No fake development principal can use
these business tools. The verified role determines the tool allowlist; a client
cannot select its own role through the message or request body.

## Tools and contracts

The dispatcher quick action “Summarize today’s orders” directly reads
`orders/summary` for the current Asia/Colombo calendar date, with the verified
user's token. It skips model tool selection and further planning for this fixed
read-only request. Other questions retain bounded model planning. If synthesis
times out, the retrieved order totals remain available with a source citation.
Clock-only evidence after failed planning is reported as an incomplete request,
rather than an answered business question.

## Answer style

Each role has its own task instructions and shares the presentation rules in
`app/agent/prompts.py`. Replies lead with the answer, use short paragraphs or
Markdown bullets, and use numbered steps for procedures. The chat renders
Markdown with styled emphasis, headings and lists. Prompts prefer concise lists
over tables on the narrow panel and avoid HTML or wrapping replies in code blocks.
Dispatcher summaries highlight counts and scope; store-manager replies focus on
their orders and cutoffs; driver replies focus on trips and recorded route changes;
loader replies distinguish planned quantities from confirmed loading.

Source citations remain validated and displayed by the chat. Missing information
and partial reads remain explicit in ordinary language. Generation timeouts are
logged internally; successful record fallback replies do not expose model or
planning diagnostics. Prompt rules guide model output; they are not a guarantee
of identical formatting for every provider response.

The model's system prompt targets around 120 words and up to three bullets, with
shorter replies for simple questions. This is a style target, not a hard limit.
Longer answers and deterministic fallbacks are returned and stored without being
replaced by a length warning. Secret and citation checks still apply to replies.
Generated guidance uses simple language and relevant paraphrases rather than copied
legal clauses or unconfirmed placeholders. If synthesis is unavailable, the reply
preserves live business facts and briefly points to document source cards instead
of pasting policy chunks into the chat.

Base URL configured by `AI_NESTJS_BASE_URL`: `http://localhost:5000/api`.

| Tool | Roles | Endpoint | Inputs |
| --- | --- | --- | --- |
| search_knowledge | All four roles | Existing hybrid retrieval | query, 1–2000 characters |
| get_current_datetime | All four roles | Server clock, Asia/Colombo | none |
| get_my_profile | All four roles | Already verified caller identity | none |
| get_my_orders | Store manager | GET /orders/my | page, limit, status/search |
| get_order_details | Store manager, dispatcher | GET /orders/{id} | positive integer order_id |
| get_order_placement_options | Store manager | GET /orders/placement-options | none |
| get_dispatcher_orders | Dispatcher | GET /orders | page, limit, date/depot/stage/search |
| get_order_summary | Dispatcher | GET /orders/summary | date/depot |
| draft_deferral_message | Dispatcher | GET /orders/{id} | order_id; local draft only |
| get_my_trips | Driver, loader | GET /trips | page, limit, date |
| get_trip_details | Driver, loader, dispatcher | GET /trips/{uuid} | trip_id, stop_page, stop_limit |
| get_route_change | Driver | GET /trips/{uuid}/route-change | trip_id |

Order statuses follow the current NestJS enum. Search is at most 50 characters.
Pagination defaults to page 1, limit 10. Listing reports the returned page and
total matching count, without implying a page covers every order. Detail returns
status, requested date, load quantities, temperature and latest recorded deferral.
Placement options show available delivery dates, cutoff timestamps (with time zone)
and temperatures. They do not predict an optimal day or guarantee delivery.

The server validates response shapes and outlet ownership in addition to NestJS
permissions for managers. Dispatcher order visibility, driver trip ownership and
loader depot membership follow existing NestJS checks. Trip payloads do not expose
numeric driver/depot IDs, so the AI service relies on those backend checks and
validates returned trip UUIDs. It excludes raw user entities, credentials, contact
phone numbers and unrelated API fields.
NestJS 401/403/404 remain denial/missing-record responses, not assistant guesses.
Malformed responses fail with 502. An order ID must come from request.order_id,
an explicit `order 42`, `ORD0000042` or `#42` reference, or the conversation's last
successfully fetched order. Trip UUIDs must come from request.trip_id, an explicit
UUID in the message, or the last successfully read trip in that conversation.
Guessed model IDs are rejected before any calls in that turn execute.

Dispatcher lists use **stage**, not the manager's status filter. A deferred stage
can include historical deferrals for orders now delivered. Summary total excludes
cancelled orders; stage counts can overlap. Weight/volume aggregates cover awaiting
and allocated orders. Date filters use YYYY-MM-DD; depots are Peliyagoda or Kandy.

Trip listings default to the backend's today when no date is supplied. Stop details
show five stops per page by default (stop_limit 1–5). Lists support limit 1–25 and
default to 10. Planned ambient/chilled case totals are not loading confirmation or
proof of delivery. Trip listings and route snapshots explicitly report omitted rows;
source text is bounded. Pending route changes are read without acknowledgement;
no pending record does not imply an absence of route-change history.

Deferral drafts use the latest backend reason/note and recorded next date, clearly
label historical records, and make no delivery guarantee. No reason means no
reason-based draft. They are deterministic templates for dispatcher review and
perform only a GET; no model rewrite, policy inference or notification is involved.

## Agent flow

Verified role profile -> Gemini function selection -> validate all calls
-> execute permitted read-only tools -> plan missing reads within fixed limits
-> explain live facts and document guidance separately with checked citations.
The planner receives the question, known IDs and sanitized tool evidence. Credentials
and raw backend responses do not enter the planner. SDK automatic execution is
disabled. Application code owns tool names, endpoint paths, validation and access.
No caller/model can supply a URL, token, role or arbitrary outlet to a tool.

The Phase 1 shared pack is available in business_qa for all verified roles, including
managers without an assigned outlet. Outlet business operations still require an
assignment. get_my_profile returns only verified role and depot/outlet IDs; no extra
profile API read is needed after authentication. get_current_datetime returns the
UTC+05:30 Colombo clock, today and tomorrow, not operating dates or cutoff predictions.

search_knowledge uses the existing hybrid retriever and authoritative catalog with
role/depot enforcement **even when AI_AUTH_ENABLED=false**. It returns at most three
document excerpts per search, preserving citation IDs and source/version metadata.
Knowledge-only responses use answered when synthesis succeeds, sources_only when
only excerpts are available, or no_knowledge when no permitted evidence is found.
Other tool results remain available if search returns nothing. Document text is
untrusted evidence and cannot grant permissions or introduce record IDs.

Phase 2 allows at most three planning rounds, three calls per round and six calls
per request. Three document excerpts are retained across the whole request; up to
six API/profile/time sources can accompany them. Exact repeated calls are skipped.
New order/trip IDs must come from explicit input, scoped conversation memory, or
validated API adapter metadata; policy text and notes cannot introduce them.
Each subsequent API read still applies existing backend permissions. Calls in each
round are validated as a batch before reads begin. The existing request deadline
and graph step limit remain in force, including during synthesis.

Manager orders are sorted newest placement first by NestJS, so page 1 can identify
the latest matching order. Dispatcher lists have different sorting and must not be
treated as latest placement. No ID from a still-pending call can be guessed in the
same round. Order assignment responses expose a trip number, not a trip UUID; an
order-to-trip detail jump cannot invent that UUID. A permitted trip list or an
explicit UUID is still required, and managers do not gain driver trip tools.

The model separates live facts from policy guidance and must cite supplied source
IDs of the correct kind. Unsupported citations or synthesis failures fall back to
cited factual tool output. Permission denials still fail closed. Knowledge-service
or follow-up-provider failures can preserve facts already read with an explicit
limitation; unavailable knowledge-only requests return 503. No source evidence means
needs_input/no_knowledge, not a model guess. Dispatcher drafts stay deterministic.
Citation checks establish provenance, not that every generated claim is accurate;
review answer quality before production. There is no general conversation mode yet.

Follow-ups accept conversation_id and refetch fresh API facts. Only the last detail
order/trip IDs and bounded user/assistant turns persist. Bearer tokens stay in invocation
closures, outside graph state, logs and conversation storage. Existing deadlines,
graph step limits and conversation ownership checks also apply to business_qa.

## Local configuration and Bruno

Keep credentials in the existing ignored `.env`; do not copy the template over it:

```dotenv
AI_NESTJS_BASE_URL=http://localhost:5000/api
AI_GEMINI_MODEL=YOUR_CONFIGURED_MODEL
AI_GEMINI_API_KEY=YOUR_EXISTING_KEY
```

Start NestJS and its dependencies using its existing instructions, then restart
FastAPI to load this change. Record/profile/time tools do not need the ingestion
worker. Knowledge search needs an existing searchable corpus; run the worker to
process newly submitted documents. In Bruno, choose local, set secret chat_token to
a role-specific access token, and use its matching tools folder. Update order_id
to a real permitted order and trip_id to a real permitted trip UUID. Switching
users requires a new conversation. No database migration or new environment
configuration is needed for these tools; restart FastAPI after updating the code.

The default knowledge_qa workflow still retrieves approved documents. business_qa
returns live business facts and can synthesize a combined explanation with approved
document evidence. The older deferral_qa adapter remains unchanged and separately
gated. Shared tools and Combined answers Bruno folders test these paths.
No order creation/cancellation, deferral mutation, message sending, inventory or
trending-product recommendation is enabled by this implementation.

## Verification boundaries

Tests cover argument limits, query encoding, access-token forwarding, role/outlet
checks, unknown tools, guessed IDs, upstream denials, bounded calls, fresh follow-up
fetches and credential-safe conversation data. Mock APIs are not evidence of live
NestJS integration. A live Gemini function-selection probe uses a synthetic question
and no business records. Live backend tests need a role-specific access token.

Live demo testing verified all four logins and role identities, order listings,
summary/details, placement options, missing-record denials, forbidden-role denials,
chat for each role, and conversation ownership. A nullable backend outlet name
initially broke placement validation; the AI adapter now handles it and both live
tool and chat retests passed. One order follow-up initially returned 503; its retry
passed, but the initial failure's cause was not established.

The sampled database contained one order for one outlet, no assigned trips on the
sampled delivery dates, and no recorded deferral. Positive trip detail/route-change
reads, actual reason-based drafts and cross-record ownership denials therefore
remain unverified live. Invalid tokens were tested; expired signed tokens were not.
No business records were changed. Test login sessions were revoked after use.
See the credential-free [live results](live-business-test-results.json); historical
failures and subsequent retests are retained rather than silently overwritten.

Phase 1 shared-tool live probes verified profile and Colombo time answers, and a
scoped knowledge query that correctly returned no_knowledge. No matching permitted
documents were returned in that probe, so successful live citation retrieval remains
to be tested with an approved matching document. Scope and citation handling are
covered by automated tests. See [shared-tool results](live-common-tools-test-results.json).

Phase 2 live testing found the manager's latest order, fetched its details and
handled a conversation follow-up. No permitted policy matched the sampled query.
A Gemini response-schema compatibility issue was fixed; a live probe with clearly
synthetic API/policy evidence then produced valid citations of both kinds. This
does not establish a positive live company-document match. See
[Phase 2 results](live-phase2-test-results.json).

Subsequent [repeatable evaluation](../evaluations/README.md) found the existing
reference document restricted to depot 1 while the verified demo users belong to
depot 4. Access enforcement was correct. The original was preserved and a clearly
titled depot-4 reference copy was uploaded, indexed and approved. Live queries now
retrieve the expected booklet pages and combine them with the real order status,
with separate citations and an explicit reference-material boundary. This is not
a positive match against genuine company operating policies.

The suite retains its baseline: manual answer review found an unsupported delivery
completion request answered with unrelated excerpts. The planner now instructs
unsupported writes to select no tools, and that evaluation requires an explicit
needs_input response with no sources. Backend writes remain unavailable.
See [current results](../evaluations/results/latest.md) and
[review notes](../evaluations/results/review-notes.md) for limitations and blocked data.

Slow optional model calls have separate eight-second limits within the unchanged
overall request deadline. Follow-up planning reserves three seconds for answering;
synthesis reserves one second for returning/persisting retrieved evidence. A timed-out
follow-up produces an explicit incomplete-planning warning; timed-out synthesis returns
cited evidence with a generation-timeout notice. Initial planning, required tool reads,
authentication and permissions still obey the overall deadline and failure rules.
