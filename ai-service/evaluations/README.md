# Repeatable agent evaluation

Run from `ai-service` after starting the AI API, NestJS, AI PostgreSQL and Qdrant.
The ingestion worker must finish new uploads, and a dispatcher must approve them.
This runner does not start containers, publish trips or change business records.
It creates test chat conversations and temporary login sessions, then logs out.

## Credentials and commands

Create `evaluations/accounts.local.json` (ignored by Git). Use locally seeded
accounts, not production credentials. Replace these placeholders:

```json
{
  "dispatcher": {"phone": "<phone>", "password": "<password>"},
  "store_manager": {"phone": "<phone>", "password": "<password>"},
  "driver": {"phone": "<phone>", "password": "<password>"},
  "loader": {"phone": "<phone>", "password": "<password>"}
}
```

```powershell
uv run python -m evaluations.run --accounts-file evaluations/accounts.local.json
```

Alternatively supply the same JSON through `AI_EVAL_ACCOUNTS_JSON`. Tokens,
passwords, raw answers and customer records are excluded from reports.

Rerun selected cases with `--case driver-no-write`. Repeat `--case` to select more.
The follow-up case requires `--case manager-record-and-reference` in the same run.
Use `--output evaluations/results/retest.local.json` to preserve the full report.
Exit codes: **0** all passed; **1** at least one failure; **2** blocked cases only.
JSON and readable Markdown reports are saved together.

## Corpus and evidence

`cases.json` contains 17 checks: role-specific retrieval, live order plus document
answers, conversation follow-ups, unavailable policy, unsupported writes,
authentication, role denials, document scopes, published trips and synthesis.
`reference-corpus.json` identifies the approved demo reference and expected pages.
Update that manifest when using a different database or re-uploading the reference.
Gold pages use one-based PDF page numbers, not printed page labels.

The reference is the 33-page Tech Triathlon challenge booklet. It is reference
material, not a company operating policy. The existing depot-1 upload was retained;
a clearly titled depot-4 reference copy permits the verified demo accounts to use it.
Both the API order and the permitted indexed PDF are real live test evidence.

Conflict, hostile-document and missing-cause checks call the configured model with
explicitly synthetic source fixtures. They do not test ingestion or retrieval.
Scope checks exercise the authoritative catalog using a verified account plus
synthetic foreign scope objects; they are not foreign-account JWT end-to-end tests.
Trip checks use existing permitted trips on today/order-request dates. Empty data
blocks them; the runner never manufactures allocation or publishes a trip.

## Interpret results

Expected-page retrieval, supplied citation IDs, actual order status and response
times are mechanical checks. Keyword matches and valid citation IDs do not prove
that the cited text supports every claim. Review the marked cases and important
combined answers separately. Read `results/review-notes.md` for observed limitations.

The baseline report is retained because answer review found an unsupported write
request incorrectly answered with unrelated excerpts despite passing its original
loose keyword check. The planner prompt and evaluator were tightened before rerun.

Dense-only versus BM25-only versus hybrid comparisons, token/cost measurement,
larger real-policy corpora and production-quality scoring remain future work.
Do not infer a production quality benchmark from this small demo suite.
