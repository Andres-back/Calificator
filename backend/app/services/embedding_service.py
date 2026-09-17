"""Servicio de embeddings para RAG con pgvector."""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any
from uuid import UUID

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai_credentials_service import get_effective_ai_credentials
from app.services.ollama_provider import OllamaEmbeddingProvider

logger = get_logger(__name__)

DIMENSIONS = settings.EMBEDDING_DIMENSIONS


class EmbeddingUnavailableError(RuntimeError):
    """Fallo seguro y recuperable del subsistema semántico."""


@dataclass(frozen=True, slots=True)
class EmbeddingSpace:
    provider: str
    model: str
    dimensions: int
    version: str


@dataclass(frozen=True, slots=True)
class EmbeddingBatch:
    vectors: list[list[float]]
    space: EmbeddingSpace


@dataclass(frozen=True, slots=True)
class EmbeddedVector:
    vector: list[float]
    space: EmbeddingSpace


def _openai_client(api_key: str) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=api_key)


def _space(provider: str, model: str) -> EmbeddingSpace:
    return EmbeddingSpace(
        provider=provider,
        model=model,
        dimensions=settings.EMBEDDING_DIMENSIONS,
        version=f"{settings.EMBEDDING_SPACE_VERSION}:{provider}:{model}",
    )


def _validate_vectors(
    vectors: list[list[float]], expected: int, dimensions: int
) -> None:
    if len(vectors) != expected:
        raise EmbeddingUnavailableError(
            "El proveedor devolvió una cantidad inesperada de vectores"
        )
    if any(len(vector) != dimensions for vector in vectors):
        raise EmbeddingUnavailableError(
            "El proveedor devolvió vectores con dimensión incompatible"
        )
    if any(not math.isfinite(value) for vector in vectors for value in vector):
        raise EmbeddingUnavailableError(
            "El proveedor devolvió valores vectoriales no válidos"
        )


async def embed_texts_with_metadata(
    texts: list[str],
    *,
    db: AsyncSession | None = None,
    teacher_id: UUID | None = None,
    ai_config: dict[str, Any] | None = None,
) -> EmbeddingBatch:
    """Genera vectores y describe de forma inmutable su espacio semántico."""
    if not texts:
        return EmbeddingBatch(
            vectors=[],
            space=_space(settings.EMBEDDING_PROVIDER, settings.EMBEDDING_MODEL),
        )
    model = settings.EMBEDDING_MODEL
    provider = settings.EMBEDDING_PROVIDER
    snapshot = dict(ai_config) if ai_config else None
    credentials = await get_effective_ai_credentials(db)
    api_key = credentials.openai_key

    if db is not None:
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

    try:
        if provider == "ollama_internal":
            vectors = await OllamaEmbeddingProvider(
                base_url=settings.OLLAMA_ENDPOINT,
                timeout_seconds=settings.EMBEDDING_TIMEOUT_SECONDS,
            ).embed(model=model, inputs=texts)
        elif provider == "openai" and api_key:
            vectors = await _embed_openai(texts, model, api_key)
        else:
            raise EmbeddingUnavailableError(
                "No hay un proveedor de embeddings disponible"
            )
    except EmbeddingUnavailableError:
        raise
    except Exception as exc:
        logger.warning("Embedding provider unavailable: %s", type(exc).__name__)
        raise EmbeddingUnavailableError(
            "El servicio de embeddings no está disponible"
        ) from exc

    space = _space(provider, model)
    _validate_vectors(vectors, len(texts), space.dimensions)
    return EmbeddingBatch(vectors=vectors, space=space)


async def embed_texts(
    texts: list[str],
    *,
    db: AsyncSession | None = None,
    teacher_id: UUID | None = None,
    ai_config: dict[str, Any] | None = None,
) -> list[list[float]]:
    batch = await embed_texts_with_metadata(
        texts,
        db=db,
        teacher_id=teacher_id,
        ai_config=ai_config,
    )
    return batch.vectors


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


async def embed_single_with_metadata(
    text: str,
    *,
    db: AsyncSession | None = None,
    teacher_id: UUID | None = None,
    ai_config: dict[str, Any] | None = None,
) -> EmbeddedVector:
    batch = await embed_texts_with_metadata(
        [text], db=db, teacher_id=teacher_id, ai_config=ai_config
    )
    return EmbeddedVector(vector=batch.vectors[0], space=batch.space)


async def _embed_openai(
    texts: list[str], model: str, api_key: str
) -> list[list[float]]:
    client = _openai_client(api_key)
    all_embeddings: list[list[float]] = []
    batch_size = 100
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = await client.embeddings.create(
            model=model,
            input=batch,
            dimensions=settings.EMBEDDING_DIMENSIONS,
        )
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
