"""Búsqueda semántica en rag_chunks usando un espacio pgvector compatible."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.services.embedding_service import (
    EmbeddingUnavailableError,
    embed_single_with_metadata,
)

logger = get_logger(__name__)


async def search_chunks(
    db: AsyncSession,
    query: str,
    materia_id: UUID | None = None,
    profesor_id: UUID | None = None,
    tipo: str | None = None,
    limit: int = 8,
) -> list[dict]:
    """Devuelve solo fragmentos del mismo proveedor, modelo, dimensión y versión."""
    embedded = await embed_single_with_metadata(query, db=db, teacher_id=profesor_id)
    embedding_str = "[" + ",".join(str(value) for value in embedded.vector) + "]"
    filters: list[str] = [
        "c.embedding_provider = :embedding_provider",
        "c.embedding_model = :embedding_model",
        "c.embedding_dimensions = :embedding_dimensions",
        "c.embedding_space_version = :embedding_space_version",
        "c.embedding_vec IS NOT NULL",
    ]
    params: dict = {
        "embedding": embedding_str,
        "embedding_provider": embedded.space.provider,
        "embedding_model": embedded.space.model,
        "embedding_dimensions": embedded.space.dimensions,
        "embedding_space_version": embedded.space.version,
        "limit": limit,
    }
    if materia_id:
        filters.append(
            "((c.materia_id = CAST(:materia_id AS uuid) "
            "AND s.materia_id = CAST(:materia_id AS uuid)) "
            "OR (c.tipo = 'dba' AND c.profesor_id IS NULL AND s.profesor_id IS NULL))"
        )
        params["materia_id"] = str(materia_id)
    if profesor_id:
        filters.append(
            "((c.profesor_id = CAST(:profesor_id AS uuid) OR c.profesor_id IS NULL) "
            "AND (s.profesor_id = CAST(:profesor_id AS uuid) OR s.profesor_id IS NULL))"
        )
        params["profesor_id"] = str(profesor_id)
    if tipo:
        filters.append("c.tipo = :tipo")
        params["tipo"] = tipo
    where_sql = "WHERE " + " AND ".join(filters)

    try:
        async with db.begin_nested():
            result = await db.execute(
                text(
                    f"""
                    SELECT c.id, c.source_id, c.chunk_text, c.tipo, c.metadata,
                           s.titulo AS source_title, s.metadata AS source_metadata,
                           s.created_at AS source_created_at,
                           1 - (c.embedding_vec <=> CAST(:embedding AS vector)) AS similarity
                    FROM rag_chunks c
                    JOIN rag_sources s ON s.id = c.source_id
                    {where_sql}
                    ORDER BY c.embedding_vec <=> CAST(:embedding AS vector)
                    LIMIT :limit
                    """
                ),
                params,
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Semantic search unavailable: %s", type(exc).__name__)
        raise EmbeddingUnavailableError(
            "La búsqueda semántica no está disponible"
        ) from exc

    rows = result.fetchall()
    return [
        {
            "id": str(row.id),
            "source_id": str(row.source_id),
            "source_title": row.source_title,
            "source_version": str(
                (row.source_metadata or {}).get("version")
                or row.source_created_at.isoformat()
            ),
            "chunk_text": row.chunk_text,
            "tipo": row.tipo,
            "similarity": float(row.similarity),
            "metadata_json": row.metadata or {},
        }
        for row in rows
    ]
