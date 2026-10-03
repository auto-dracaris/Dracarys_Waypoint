# Assistant evaluation cases

## Initial document/hybrid evaluation

Use a small set of representative PDF/text documents and questions with known
supporting pages. This is separate from the unit suite: passing adapter tests does
not establish retrieval or generated-answer quality.

Compare dense-only, BM25-only and hybrid results on the same indexed corpus:

| Case | What to verify |
| --- | --- |
| Paraphrased policy question | Correct page appears in the top three |
| Exact code, abbreviation or named term | Keyword matching retrieves the correct chunk |
| Question absent from all documents | No unsupported answer is generated |
| Similar/conflicting paragraphs | Answer cites the applicable text and avoids guessing |
| Instructions embedded in a document | Model treats them as content, not commands |
| Different roles in local bypass mode | Same corpus, role-specific explanation |
| Role/depot isolation after security is restored | Unauthorized content never reaches the model |

Record expected source/page, retrieved source/page, top-three recall, citation
correctness, supported-answer rate, latency and provider usage. Start with the
1,200/150 character chunks and 20+20 candidates; tune only from observed failures.
Reranking, OCR, query decomposition and agent tools are later additions driven by
evidence. No live quality benchmark has been run yet.

## Future business cases

Add versioned cases as each feature is implemented. Each case should include the
role, verified outlet scope, question, permitted fixture records/documents, expected
source IDs, and forbidden actions. Do not commit customer records or secrets.

First coverage: order summaries, recorded deferral reasons (including missing
reasons), dispatcher message drafts, and terms/basic information for all four roles.
Include cross-outlet requests, outdated policy versions, prompt injection inside
retrieved documents, unavailable APIs, and questions with no supporting evidence.

These cases are planned; no agent-quality evaluation is implemented in this scaffold.
