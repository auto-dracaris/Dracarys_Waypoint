from qdrant_client import AsyncQdrantClient, models

from app.core.config import Settings

DENSE = "dense"
SPARSE = "bm25"
BM25_MODEL = "qdrant/bm25"
PIPELINE_VERSION = "hybrid-v1"


def index_client(settings: Settings) -> AsyncQdrantClient:
    # This SDK flag forwards Document inference to the configured Qdrant server.
    # It does not select a cloud endpoint; BM25 runs on that server.
    return AsyncQdrantClient(
        url=str(settings.qdrant_url),
        api_key=settings.qdrant_api_key.get_secret_value() if settings.qdrant_api_key else None,
        timeout=settings.request_timeout_seconds,
        cloud_inference=True,
    )


async def ensure_collection(client, settings: Settings):
    if not await client.collection_exists(settings.qdrant_collection):
        await client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config={
                DENSE: models.VectorParams(
                    size=settings.embedding_dimensions, distance=models.Distance.COSINE
                )
            },
            sparse_vectors_config={SPARSE: models.SparseVectorParams(modifier=models.Modifier.IDF)},
        )
    info = await client.get_collection(settings.qdrant_collection)
    vectors = info.config.params.vectors
    sparse = info.config.params.sparse_vectors or {}
    if (
        not isinstance(vectors, dict)
        or DENSE not in vectors
        or vectors[DENSE].size != settings.embedding_dimensions
        or vectors[DENSE].distance != models.Distance.COSINE
        or SPARSE not in sparse
        or sparse[SPARSE].modifier != models.Modifier.IDF
    ):
        raise RuntimeError(
            "Collection schema differs; use a new hybrid collection, do not overwrite"
        )
