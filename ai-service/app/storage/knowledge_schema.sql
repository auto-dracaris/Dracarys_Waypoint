CREATE TABLE IF NOT EXISTS ai_documents (
    id uuid PRIMARY KEY,
    active_version integer NOT NULL,
    deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ai_document_versions (
    document_id uuid NOT NULL REFERENCES ai_documents(id),
    version integer NOT NULL,
    metadata jsonb NOT NULL,
    recipe jsonb NOT NULL,
    filename text NOT NULL,
    approved boolean NOT NULL DEFAULT false,
    ingestion_status text NOT NULL DEFAULT 'queued'
        CHECK (ingestion_status IN ('queued', 'processing', 'ready', 'failed')),
    error_code text,
    chunks integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (document_id, version)
);
CREATE TABLE IF NOT EXISTS ai_ingestion_jobs (
    id uuid PRIMARY KEY,
    document_id uuid NOT NULL REFERENCES ai_documents(id),
    version integer NOT NULL,
    kind text NOT NULL CHECK (kind IN ('ingest', 'delete')),
    state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'running', 'done', 'failed')),
    attempts integer NOT NULL DEFAULT 0,
    lease_token uuid,
    lease_until timestamptz,
    available_at timestamptz NOT NULL DEFAULT now(),
    error_code text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_ingestion_jobs_queue ON ai_ingestion_jobs(state, available_at);
CREATE TABLE IF NOT EXISTS ai_document_requests (
    key uuid PRIMARY KEY,
    fingerprint text NOT NULL,
    receipt jsonb NOT NULL
);
