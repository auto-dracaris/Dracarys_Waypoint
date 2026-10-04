from qdrant_client import models

from app.agent.contracts import Principal, Source
from app.clients.embeddings import embed
from app.core.config import Settings
from app.retrieval.index import BM25_MODEL, DENSE, PIPELINE_VERSION, SPARSE, index_client
from app.storage.knowledge import KnowledgeRepository


class PolicyRetriever:
    def __init__(self, settings: Settings, catalog=None):
        self.settings = settings
        self.catalog = catalog or (
            KnowledgeRepository(settings.database_url.get_secret_value())
            if settings.database_url
            else None
        )

    async def retrieve(
        self, query: str, principal: Principal, *, enforce_scope: bool | None = None
    ) -> list[Source]:
        settings = self.settings
        scoped = settings.auth_enabled if enforce_scope is None else enforce_scope
        if not settings.embedding_model:
            return []  # Business facts can answer the deferral without a policy index.
        if self.catalog is None and settings.environment == "production":
            raise RuntimeError("Production retrieval requires the authoritative source catalog")
        vector = (await embed(settings, [query], query=True))[0]
        conditions = [
            models.FieldCondition(key="scope", match=models.MatchValue(value="depot_policy")),
            models.FieldCondition(
                key="embedding_model", match=models.MatchValue(value=settings.embedding_model)
            ),
            models.FieldCondition(
                key="pipeline_version", match=models.MatchValue(value=PIPELINE_VERSION)
            ),
        ]
        if self.catalog is not None:
            conditions += [
                models.FieldCondition(key="catalog_managed", match=models.MatchValue(value=True)),
                models.FieldCondition(key="indexed", match=models.MatchValue(value=True)),
            ]
        else:
            conditions += [
                models.FieldCondition(key="approved", match=models.MatchValue(value=True)),
                models.FieldCondition(key="current", match=models.MatchValue(value=True)),
            ]
        if scoped:
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
                limit=20 if self.catalog else 3,
                with_payload=True,
            )
            points = result.points
            if self.catalog:
                permitted = await self.catalog.allowed(
                    [point.payload or {} for point in points], principal, scoped
                )
                points = [
                    point
                    for point in points
                    if (
                        str((point.payload or {}).get("source_id")),
                        (point.payload or {}).get("version"),
                    )
                    in permitted
                ]
            return [
                Source.model_validate(
                    {
                        "id": f"policy:{point.id}",
                        "title": (point.payload or {})["title"],
                        "text": (point.payload or {})["text"],
                        "page": (point.payload or {}).get("page"),
                        "source_id": (point.payload or {}).get("source_id"),
                        "version": (point.payload or {}).get("version"),
                    }
                )
                for point in points[:3]
            ]
        finally:
            await qdrant.close()
