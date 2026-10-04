# Phase 1 guardrails

These safeguards run inside FastAPI. They add no gateway, service or dependency.
Existing authenticated role checks, record scope, fixed endpoint adapters, known
record IDs, read-only tools and execution limits remain the authorization boundary.

## Input

After authenticating and checking conversation ownership, every chat workflow
checks for empty input and recognizable credentials: labelled passwords/API keys,
Bearer values, JWTs, supported API-key formats and private keys. The caller's
actual authentication token is also checked when available. Rejected requests
return a short `needs_input` reply. Their text is not sent to models or tools and
is not stored in conversation turns. Their conversation ID remains usable.
Credentials in the Authorization header still work normally. Business references,
phone numbers and questions about resetting passwords remain allowed.

## Model context

Generation and follow-up planning redact recognizable credentials in retrieved
text before sending context to Gemini. Structured password/token/key fields are
also redacted in context dictionaries. System instructions explicitly label JSON
questions, document excerpts and API notes as untrusted data. Redaction operates
on copies; it does not modify original documents or the NestJS API.

This is a separation and redaction safeguard, not a prompt-injection detector.
Document approval and retrieval scope remain enforced by their existing layers.
Keyword matching does not reject ordinary questions mentioning attacks.

## Output and memory

Before every workflow saves its reply, output checks reject empty/malformed
answers, recognizable secrets, echoes of the caller token and citations naming
sources not present in the reply. Rejected answers use a short safe fallback.
Source-card string fields are redacted too. The existing 120-word/900-character
limit runs afterwards. Only the guarded reply is saved as the assistant turn.
Logs contain fixed events and failure categories, never rejected text.

Citation validation checks reference membership, not whether every generated
claim follows from evidence. These pattern checks do not detect every secret or
stop every injection. Claim-level grounding, document-injection detection,
request-rate/concurrency limits and dedicated detection models remain Phase 2.

## Verification

`tests/test_guardrails.py` covers benign questions, input secrets, all three chat
workflows, protected conversation storage, source redaction, opaque token echoes,
invalid citations and redaction before generation/follow-up provider requests.
Existing role, record-scope and bounded-tool tests remain regression coverage.
