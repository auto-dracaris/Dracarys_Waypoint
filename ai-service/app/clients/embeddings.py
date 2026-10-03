import math

from google import genai
from google.genai import types

from app.core.config import Settings


async def embed(settings: Settings, texts: list[str], *, query: bool) -> list[list[float]]:
    if not settings.embedding_model or not settings.gemini_api_key:
        raise RuntimeError("Configure an embedding model and Gemini key first")
    client = genai.Client(api_key=settings.gemini_api_key.get_secret_value())
    async with client.aio as google:
        result = await google.models.embed_content(
            model=settings.embedding_model,
            contents=texts,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY" if query else "RETRIEVAL_DOCUMENT",
                output_dimensionality=settings.embedding_dimensions,
            ),
        )
    vectors = []
    if not result.embeddings or len(result.embeddings) != len(texts):
        raise RuntimeError("Invalid embedding response")
    for item in result.embeddings:
        vector = item.values or []
        if len(vector) != settings.embedding_dimensions or not all(map(math.isfinite, vector)):
            raise RuntimeError("Embedding dimension/value mismatch")
        magnitude = math.sqrt(sum(value * value for value in vector))
        if magnitude == 0:
            raise RuntimeError("Empty embedding vector")
        vectors.append([value / magnitude for value in vector])
    return vectors
