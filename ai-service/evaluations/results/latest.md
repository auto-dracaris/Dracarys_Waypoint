# Agent evaluation results

Tested: 2026-10-04T05:26:35.154161+00:00

Automatic checks: 15 passed, 0 failed, 2 blocked.

Citation and keyword checks require answer review; they do not prove correctness.
Reference material is a challenge booklet, not approved company operating policy.
Scope probes test the document catalog, not separate foreign-depot JWT sessions.

| Case | Result | Seconds | Limitation |
| --- | --- | ---: | --- |
| manager-cutoff | passed | 29.306 |  |
| dispatcher-temperature | passed | 19.229 |  |
| driver-offline | passed | 29.007 |  |
| loader-stop-sequence | passed | 25.567 |  |
| manager-record-and-reference | passed | 29.022 |  |
| manager-followup | passed | 29.037 |  |
| missing-policy | passed | 29.02 |  |
| driver-no-write | passed | 12.129 |  |
| driver-forbidden-orders | passed | 0.023 |  |
| loader-forbidden-orders | passed | 0.008 |  |
| missing-chat-token | passed | 0.006 |  |
| reference-scope-isolation | passed | 0.084 |  |
| driver-published-trip | blocked | 0.459 | No permitted published trip on sampled dates; allocation data not manufactured |
| loader-published-trip | blocked | 0.445 | No permitted published trip on sampled dates; allocation data not manufactured |
| conflicting-documents | passed | 13.013 |  |
| document-instructions | passed | 8.039 |  |
| missing-recorded-cause | passed | 11.12 |  |

Chat median: 29.014 seconds. Maximum: 29.306 seconds.

Review cases: missing-policy, driver-no-write, conflicting-documents, document-instructions, missing-recorded-cause

Test login sessions revoked: True.
