"""Servicio de embeddings para RAG con pgvector."""
from __future__ import annotations

import httpx
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai_credentials_service import get_effective_ai_credentials

logger = get_logger(__name__)

DIMENSIONS = 1536


def _openai_client(api_key: str) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=api_key)


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Genera embeddings para una lista de textos. Usa OpenAI text-embedding-3-small."""
    model = getattr(settings, "EMBEDDING_MODEL", "text-embedding-3-small")
    provider = getattr(settings, "EMBEDDING_PROVIDER", "openai")
    credentials = await get_effective_ai_credentials()

    if provider == "openai" and credentials.openai_key:
        return await _embed_openai(texts, model, credentials.openai_key)

    # Fallback: embeddings simples basados en hash (solo para desarrollo sin API key)
    logger.warning("No embedding provider configured, using zero vectors")
    return [[0.0] * DIMENSIONS for _ in texts]


async def embed_single(text: str) -> list[float]:
    results = await embed_texts([text])
    return results[0]


async def _embed_openai(texts: list[str], model: str, api_key: str) -> list[list[float]]:
    client = _openai_client(api_key)
    # Dividir en lotes de 100 para respetar límites de la API
    all_embeddings: list[list[float]] = []
    batch_size = 100
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = await client.embeddings.create(model=model, input=batch)
        all_embeddings.extend([item.embedding for item in response.data])
    return all_embeddings


def chunk_text(text: str, chunk_size: int = 700, overlap: int = 100) -> list[str]:
    """
    Chunking por palabras con overlap.
    chunk_size y overlap en tokens aproximados (1 token ≈ 0.75 palabras).
    """
    words = text.split()
    chunk_words = int(chunk_size * 0.75)
    overlap_words = int(overlap * 0.75)

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_words, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += chunk_words - overlap_words

    return [c for c in chunks if c.strip()]
