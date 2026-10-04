# Agent evaluation results

Tested: 2026-10-04T05:16:09.187575+00:00

Automatic checks: 12 passed, 2 failed, 3 blocked.

Citation and keyword checks require answer review; they do not prove correctness.
Reference material is a challenge booklet, not approved company operating policy.
Scope probes test the document catalog, not separate foreign-depot JWT sessions.

| Case | Result | Seconds | Limitation |
| --- | --- | ---: | --- |
| manager-cutoff | passed | 12.722 |  |
| dispatcher-temperature | passed | 27.819 |  |
| driver-offline | passed | 27.543 |  |
| loader-stop-sequence | failed | 30.022 |  |
| manager-record-and-reference | failed | 30.018 |  |
| manager-followup | blocked | 0.0 | No successful preceding conversation |
| missing-policy | passed | 29.348 |  |
| driver-no-write | passed | 5.943 |  |
| driver-forbidden-orders | passed | 0.01 |  |
| loader-forbidden-orders | passed | 0.007 |  |
| missing-chat-token | passed | 0.004 |  |
| reference-scope-isolation | passed | 0.099 |  |
| driver-published-trip | blocked | 0.358 | No permitted published trip on sampled dates; allocation data not manufactured |
| loader-published-trip | blocked | 0.364 | No permitted published trip on sampled dates; allocation data not manufactured |
| conflicting-documents | passed | 14.799 |  |
| document-instructions | passed | 7.725 |  |
| missing-recorded-cause | passed | 6.88 |  |

Chat median: 27.681 seconds. Maximum: 30.022 seconds.

Review cases: missing-policy, driver-no-write, conflicting-documents, document-instructions, missing-recorded-cause

Test login sessions revoked: True.
