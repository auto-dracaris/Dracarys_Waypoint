# Initial build: documents first, business APIs later

Business endpoint shapes, available data and tool operations are not known yet.
Do not bind tools to assumed NestJS endpoints. The deferral/admin contracts are
proposals to revisit when real backend contracts arrive. The initial working path
is standalone document ingestion and knowledge Q&A.

## Local operation

The .env template sets AI_AUTH_ENABLED=false, disabling user authentication and
role/depot authorization in development/test only. Production rejects this setting.
Roles control instructions, not access, in this mode. AI_DEVELOPMENT_ROLE selects
store_manager, dispatcher, driver or loader; restart after changing it. All roles
search the same local corpus. Bind the server to 127.0.0.1 and do not publish this
bypass configuration. Qdrant credentials and Gemini keys are still required by
those services; only application user authentication is bypassed.

Without AI_DATABASE_URL, conversations use bounded process-local memory and reset
on restart. With it, initialize the conversation table using
`uv run python -m app.storage.conversations`; PostgreSQL persists conversations.
Conversation IDs are development context, not secure user identities while auth is off.

Start Docker infrastructure manually as planned. Configure the ignored service .env:

```dotenv
AI_ENVIRONMENT=development
AI_AUTH_ENABLED=false
AI_DEVELOPMENT_ROLE=store_manager
AI_QDRANT_COLLECTION=waypoint_knowledge_hybrid_v1
AI_QDRANT_URL=http://localhost:6333
AI_QDRANT_API_KEY=YOUR_LOCAL_QDRANT_KEY
AI_GEMINI_API_KEY=YOUR_GEMINI_KEY
AI_EMBEDDING_MODEL=YOUR_EVALUATED_EMBEDDING_MODEL
AI_EMBEDDING_DIMENSIONS=768
AI_CHUNK_SIZE=1200
AI_CHUNK_OVERLAP=150
AI_GEMINI_MODEL=YOUR_EVALUATED_CHAT_MODEL
```

Chunk size/overlap are character counts, not tokens. Size must be 100–4,000;
overlap must be nonnegative and less than half the size. They are read from .env
on each CLI run. Reindex documents to apply chunking changes. Changing embedding
dimensions requires a matching new collection and reindexing; existing vectors are
not resized. Restart the API after changing embedding settings.

Dimensions must be supported by the chosen model. No model name or response quality
has been validated yet. Chunks/questions are sent to Gemini; original files are
read locally, not sent as whole file uploads.

Run from ai-service:

```powershell
uv sync --locked
uv run python -m app.ingestion.seed add 'D:\Documents\policy.pdf' --title 'Policy title'
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Use /docs or send a token-free question:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/v1/chat `
  -ContentType 'application/json' -Body '{"message":"What do the terms say?"}'
```

Default workflow: knowledge_qa. Answers include source ID, document title, chunk ID
and page. No chunks returns no_knowledge; an unavailable chat model or unsupported
model answer returns excerpts with sources_only. Missing embedding configuration
yields no searchable knowledge; seeding requires embedding configuration and the
provider key. Configured external failures return 503. Conversation follow-ups are
accepted, but full-history question rewriting is not implemented: ask self-contained questions.

The CLI prints a deterministic source_id. Remove it with:

```powershell
uv run python -m app.ingestion.seed delete SOURCE_UUID
```

Manual seeding is development-only, supports one operator at a time, and acts as
development approval after indexing succeeds. It is not a durable job or admin API.
Repeated files are rejected; delete before reseeding. Originals stay at their local
paths. Upload UI, object storage, URL crawling, OCR and admin lifecycle storage are deferred.

## Pipeline and retrieval decisions

1. Validate UTF-8 text or text-based PDF, at most 20 MiB, with extractable content.
2. Preserve PDF pages; reject encrypted/scanned-only files, over 200 pages or over
   500,000 extracted characters.
3. Split near paragraph/sentence/word boundaries using AI_CHUNK_SIZE and
   AI_CHUNK_OVERLAP (defaults 1,200/150 characters), within pages; at most 600 chunks.
4. Embed chunks with RETRIEVAL_DOCUMENT and questions with RETRIEVAL_QUERY. Normalize
   dense vectors, using the same model/dimensions/preprocessing for both paths.
5. Store named dense cosine and sparse BM25 vectors in a separate Qdrant collection.
   BM25 runs on the configured server. The SDK cloud_inference flag forwards the
   Document request; it does not change the configured URL or require a cloud endpoint.
6. Keep chunks hidden until all writes finish; handled failures remove partial chunks.
   A process crash may leave hidden chunks needing manual cleanup. This is not
   transactional/distributed ingestion.
7. Retrieve 20 dense and 20 BM25 candidates, fuse rankings with RRF and return three
   sources. Both branches apply identical lifecycle/model filters.
8. Auth-disabled mode omits role/depot filters. Auth-enabled mode applies both.
   Approved/current and pipeline/model filters apply in either mode.

Collection setup checks named vector sizes/distance/IDF configuration and refuses
incompatible schemas. No existing collection is overwritten. Server-side BM25 and
the full live path need verification against your manually started Qdrant version.
Chunk sizes and search limits are starting settings to evaluate, not universal best
values. RRF combines rankings but does not establish relevance.

References: [Qdrant hybrid queries](https://qdrant.tech/documentation/search/hybrid-queries/)
and [server-side BM25](https://qdrant.tech/documentation/inference/inference-bm25/).

## When backend contracts arrive

Finalize tools and source ownership from actual API data. Enable authentication,
verify permissions in NestJS and retrieval, and implement authoritative source/version
revalidation. Index payload flags alone cannot guarantee immediate revocation during
async document updates. Add durable jobs, retries, approval and version lifecycle.
Then verify real tools and document ingestion. Gateway/monitoring remain deferred.
