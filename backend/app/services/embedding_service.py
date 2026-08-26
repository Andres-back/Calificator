"""Servicio de embeddings para RAG con pgvector."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai_credentials_service import get_effective_ai_credentials

logger = get_logger(__name__)

DIMENSIONS = 1536


def _openai_client(api_key: str) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=api_key)


async def embed_texts(
    texts: list[str],
    *,
    db: AsyncSession | None = None,
    teacher_id: UUID | None = None,
    ai_config: dict[str, Any] | None = None,
) -> list[list[float]]:
    """Generate embeddings using the captured compatible route when enabled."""
    model = getattr(settings, "EMBEDDING_MODEL", "text-embedding-3-small")
    provider = getattr(settings, "EMBEDDING_PROVIDER", "openai")
    snapshot = dict(ai_config) if ai_config else None
    credentials = await get_effective_ai_credentials(db)
    api_key = credentials.openai_key

    if db is not None and (teacher_id is not None or snapshot):
        try:
            from app.services.ai_configuration_resolver import (
                resolve_ai_configuration,
            )
            from app.services.ai_credentials_service import (
                get_teacher_ai_credential,
            )

            if snapshot is None:
                snapshot = await resolve_ai_configuration(
                    db, feature="embeddings", teacher_id=teacher_id
                )
            if snapshot.get("rollout_enabled"):
                selected = snapshot.get("primary") or {}
                fallback = snapshot.get("fallback") or {}
                provider = str(selected.get("provider") or provider)
                model = str(selected.get("model") or model)
                if (
                    selected.get("credential_source") == "teacher"
                    and provider == "openai"
                ):
                    teacher_key = (
                        await get_teacher_ai_credential(
                            db,
                            teacher_id=teacher_id,
                            provider_id="openai",
                        )
                        if teacher_id is not None
                        else ""
                    )
                    if teacher_key:
                        api_key = teacher_key
                    elif (
                        fallback.get("provider") == "openai"
                        and fallback.get("credential_source") == "institutional"
                    ):
                        api_key = credentials.openai_key
                    else:
                        raise RuntimeError(
                            "La API personal de embeddings no está disponible y "
                            "no hay fallback institucional autorizado"
                        )
        except RuntimeError:
            raise
        except Exception as exc:
            logger.warning(
                "Embedding AI configuration unavailable; using institutional route: %s",
                type(exc).__name__,
            )

    if provider == "openai" and api_key:
        return await _embed_openai(texts, model, api_key)

    # Portable development fallback when no embedding service is configured.
    logger.warning("No embedding provider configured, using zero vectors")
    return [[0.0] * DIMENSIONS for _ in texts]


async def embed_single(
    text: str,
    *,
    db: AsyncSession | None = None,
    teacher_id: UUID | None = None,
    ai_config: dict[str, Any] | None = None,
) -> list[float]:
    results = await embed_texts(
        [text],
        db=db,
        teacher_id=teacher_id,
        ai_config=ai_config,
    )
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
