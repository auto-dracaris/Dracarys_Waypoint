# Evaluation review notes

## Evidence and corpus

The original ready/approved document allowed depot 1. All four verified demo
accounts belong to depot 4. That mismatch explained the empty permitted retrieval;
it was not an embedding failure. The original remains unchanged. A second upload,
clearly titled "WayPoint challenge booklet - demo depot reference", is approved for
depot 4 and all four roles (57 indexed chunks). Its identifier is in the manifest.

This is challenge reference material, not authoritative company operating policy.
No business order, allocation or trip record was changed by this evaluation.

## Baseline answer review

The baseline automatic suite reported 15 passes and two data blocks. Review of the
actual stored answers found an unsupported completion request answered with unrelated
booklet excerpts. Its loose "cannot" keyword check incorrectly passed. Therefore
15 automatic passes must not be interpreted as 15 correct answers. The original
report is preserved as `baseline.json`. The planner now selects no functions for
unsupported write requests; the evaluator requires a needs_input answer, no sources
and a clear unsupported-action statement. A regression test rejects the old false pass.

The reviewed baseline combined order answer stated the real confirmed status,
explicitly said no recorded deferral reason was available, and separately explained
the booklet's 4 PM cutoff with API/document citations. It identified the booklet as
reference material. The overtime question clearly stated the supplied documents do
not establish an approved pay rate. These reviews are evidence for those sampled
answers, not a general semantic accuracy score.

## Remaining verification boundaries

Driver and loader published-trip checks need permitted existing trips. None were
found on the sampled dates. The planning owner must supply/publish those records;
this work does not manufacture allocations or alter the planning system.

The repeat run exhibited intermittent HTTP 504 responses at the existing 30-second
request deadline. `before-budget-fix.json` preserves that full run; targeted reports
also preserve a missing-document planner selection and another timeout. The planner
instruction now requires document evidence for explicitly combined questions.
Optional follow-up planning and synthesis have eight-second local limits, reserving
time for cited evidence fallback inside the unchanged overall deadline. Two regression
tests exercise slow calls and evidence preservation. Initial planning or required
reads can still time out. Reports retain every outcome; latency is not a capacity
benchmark. A successful fallback is not a successful generated explanation.

In the final run, the combined record/reference response contained both API and
document citations but used the generation-timeout fallback and incomplete-planning
notice. This confirms evidence preservation, not successful fluent synthesis in
that run. The latest absent-pay-rate query also returned sources_only; its automatic
pass checks response/citation validity and requires answer review. Only the reviewed
baseline established an explicit missing-policy explanation for that sampled question.

Conflict, hostile-document and missing-cause checks exercise synthesis with synthetic
sources, not the ingestion/retrieval pipeline. Scope isolation checks operate at the
catalog layer with synthetic foreign scope identities, not separate foreign-depot
JWT sessions. Automatic citation validity and keywords do not prove semantic support.

Do not extend deployment readiness claims to real deferral causes, route changes,
actual company policy, expired signed JWTs, load/cost behavior or unsupported writes.
