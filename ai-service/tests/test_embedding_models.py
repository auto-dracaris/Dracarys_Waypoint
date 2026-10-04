import asyncio
import math
from types import SimpleNamespace

import pytest

from app.clients import embeddings
from app.core.config import Settings


@pytest.mark.parametrize("model", ["gemini-embedding-2", "models/gemini-embedding-2-preview"])
@pytest.mark.parametrize("query", [False, True])
def test_embedding_two_returns_individual_normalized_vectors_without_task_type(
    monkeypatch, model, query
):
    seen = {}

    class Google:
        def __init__(self, **kwargs):
            self.aio = self
            self.models = self

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def embed_content(self, **kwargs):
            seen.update(kwargs)
            # Reproduce the provider contract: plain strings aggregate, Content
            # entries return separate embeddings. This catches the original bug.
            contents = kwargs["contents"]
            count = 1 if isinstance(contents[0], str) else len(contents)
            return SimpleNamespace(
                embeddings=[SimpleNamespace(values=[3.0, 4.0]) for _ in range(count)]
            )

    monkeypatch.setattr(embeddings.genai, "Client", Google)
    settings = Settings(
        _env_file=None, embedding_model=model, embedding_dimensions=2, gemini_api_key="synthetic"
    )
    result = asyncio.run(
        embeddings.embed(settings, ["First passage", "Second passage"], query=query)
    )
    assert len(result) == 2
    assert all(math.isclose(sum(value * value for value in vector), 1) for vector in result)
    assert seen["config"].task_type is None
    assert seen["config"].output_dimensionality == 2
    assert [item.parts[0].text for item in seen["contents"]] == [
        (f"task: search result | query: {text}" if query else f"title: none | text: {text}")
        for text in ["First passage", "Second passage"]
    ]


@pytest.mark.parametrize("query", [False, True])
def test_embedding_one_preserves_task_type_and_plain_text_batches(monkeypatch, query):
    class Google:
        def __init__(self, **kwargs):
            self.aio = self
            self.models = self

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def embed_content(self, **kwargs):
            assert kwargs["contents"] == ["First", "Second"]
            assert kwargs["config"].task_type == (
                "RETRIEVAL_QUERY" if query else "RETRIEVAL_DOCUMENT"
            )
            return SimpleNamespace(embeddings=[SimpleNamespace(values=[1.0, 0.0])] * 2)

    monkeypatch.setattr(embeddings.genai, "Client", Google)
    settings = Settings(
        _env_file=None,
        embedding_model="gemini-embedding-001",
        embedding_dimensions=2,
        gemini_api_key="synthetic",
    )
    assert len(asyncio.run(embeddings.embed(settings, ["First", "Second"], query=query))) == 2
