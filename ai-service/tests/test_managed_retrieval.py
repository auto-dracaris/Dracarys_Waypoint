import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.agent.contracts import Principal
from app.core.config import Settings
from app.retrieval import policies


@pytest.mark.parametrize("auth_enabled,enforce_scope", [(True, None), (False, True)])
def test_catalog_removes_unapproved_deleted_and_stale_candidates_before_answer(
    monkeypatch, auth_enabled, enforce_scope
):
    source_id = str(uuid4())
    selected = {}

    class Index:
        async def query_points(self, **kwargs):
            selected.update(kwargs)
            return SimpleNamespace(
                points=[
                    SimpleNamespace(
                        id=str(uuid4()),
                        payload={
                            "source_id": source_id,
                            "version": version,
                            "title": "Terms",
                            "text": f"Version {version}",
                        },
                    )
                    for version in [1, 2, 3]
                ]
            )

        async def close(self):
            selected["closed"] = True

    class Catalog:
        async def allowed(self, payloads, principal, enforce_scope):
            assert principal.role == "store_manager" and enforce_scope
            assert len(payloads) == 3
            return {(source_id, 2)}

    async def embed(*args, **kwargs):
        return [[1.0] * 768]

    monkeypatch.setattr(policies, "index_client", lambda settings: Index())
    monkeypatch.setattr(policies, "embed", embed)
    settings = Settings(
        _env_file=None, auth_enabled=auth_enabled, embedding_model="synthetic", database_url=None
    )
    result = asyncio.run(
        policies.PolicyRetriever(settings, Catalog()).retrieve(
            "Terms", Principal(id=1, role="store_manager", depotId=1), enforce_scope=enforce_scope
        )
    )
    assert len(result) == 1 and result[0].version == 2
    assert selected["limit"] == 20 and selected["closed"]
    conditions = {condition.key for condition in selected["query_filter"].must}
    assert {"roles", "depot_id", "catalog_managed", "indexed"} <= conditions


def test_production_without_catalog_fails_before_provider_call(monkeypatch):
    async def embed(*args, **kwargs):
        pytest.fail("Do not call providers without the production permission catalog")

    monkeypatch.setattr(policies, "embed", embed)
    settings = Settings(
        _env_file=None,
        environment="production",
        embedding_model="synthetic",
        auth_enabled=True,
        database_url=None,
    )
    with pytest.raises(RuntimeError, match="authoritative"):
        asyncio.run(
            policies.PolicyRetriever(settings).retrieve(
                "Terms", Principal(id=1, role="store_manager", depotId=1)
            )
        )
