from qdrant_client import models

from app.agent.contracts import Principal, Source
from app.clients.embeddings import embed
from app.core.config import Settings
from app.retrieval.index import BM25_MODEL, DENSE, PIPELINE_VERSION, SPARSE, index_client


class PolicyRetriever:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def retrieve(self, query: str, principal: Principal) -> list[Source]:
        settings = self.settings
        if not settings.embedding_model:
            return []  # Business facts can answer the deferral without a policy index.
        vector = (await embed(settings, [query], query=True))[0]
        conditions = [
            models.FieldCondition(key="approved", match=models.MatchValue(value=True)),
            models.FieldCondition(key="current", match=models.MatchValue(value=True)),
            models.FieldCondition(key="scope", match=models.MatchValue(value="depot_policy")),
            models.FieldCondition(
                key="embedding_model", match=models.MatchValue(value=settings.embedding_model)
            ),
            models.FieldCondition(
                key="pipeline_version", match=models.MatchValue(value=PIPELINE_VERSION)
            ),
        ]
        if settings.auth_enabled:
            conditions += [
                models.FieldCondition(key="roles", match=models.MatchValue(value=principal.role)),
                models.FieldCondition(
                    key="depot_id", match=models.MatchValue(value=principal.depotId)
                ),
            ]
        filters = models.Filter(must=conditions)
        qdrant = index_client(settings)
        try:
            result = await qdrant.query_points(
                collection_name=settings.qdrant_collection,
                prefetch=[
                    models.Prefetch(query=vector, using=DENSE, filter=filters, limit=20),
                    models.Prefetch(
                        query=models.Document(text=query, model=BM25_MODEL),
                        using=SPARSE,
                        filter=filters,
                        limit=20,
                    ),
                ],
                query=models.FusionQuery(fusion=models.Fusion.RRF),
                query_filter=filters,
                limit=3,
                with_payload=True,
            )
            return [
                Source.model_validate(
                    {
                        "id": f"policy:{point.id}",
                        "title": (point.payload or {})["title"],
                        "text": (point.payload or {})["text"],
                        "page": (point.payload or {}).get("page"),
                        "source_id": (point.payload or {}).get("source_id"),
                    }
                )
                for point in result.points
            ]
        finally:
            await qdrant.close()
