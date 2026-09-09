"""Búsqueda semántica en rag_chunks usando pgvector (cosine similarity)."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.services.embedding_service import embed_single

logger = get_logger(__name__)


async def search_chunks(
    db: AsyncSession,
    query: str,
    materia_id: UUID | None = None,
    profesor_id: UUID | None = None,
    tipo: str | None = None,
    limit: int = 8,
) -> list[dict]:
    """
    Búsqueda semántica: devuelve chunks ordenados por similitud coseno.
    Usa la columna embedding_vec (vector pgvector) si existe; cae a ARRAY si no.
    """
    query_embedding = await embed_single(query)
    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"
    filters: list[str] = []
    params: dict = {"embedding": embedding_str, "limit": limit}
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
    where_sql = f"WHERE {' AND '.join(filters)}" if filters else ""

    # Intenta con columna vector nativa (embedding_vec); si no, usa la columna ARRAY
    try:
        # Keep a missing pgvector extension/column from aborting the caller's
        # transaction before the portable fallback query can run.
        async with db.begin_nested():
            sql = f"""
                SELECT
                    c.id,
                    c.source_id,
                    c.chunk_text,
                    c.tipo,
                    c.metadata,
                    s.titulo AS source_title,
                    s.metadata AS source_metadata,
                    s.created_at AS source_created_at,
                    1 - (c.embedding_vec <=> CAST(:embedding AS vector)) AS similarity
                FROM rag_chunks c
                JOIN rag_sources s ON s.id = c.source_id
                {where_sql}
                {"AND" if where_sql else "WHERE"} c.embedding_vec IS NOT NULL
                ORDER BY c.embedding_vec <=> CAST(:embedding AS vector)
                LIMIT :limit
            """
            result = await db.execute(
                text(sql),
                params,
            )
    except Exception:  # noqa: BLE001
        # Fallback: sin order semántico, sólo por texto
        logger.warning("pgvector similarity search unavailable, falling back to text search")
        fallback_params = {k: v for k, v in params.items() if k != "embedding"}
        sql_fallback = f"""
            SELECT c.id, c.source_id, c.chunk_text, c.tipo, c.metadata,
                   s.titulo AS source_title, s.metadata AS source_metadata,
                   s.created_at AS source_created_at, 0.5 AS similarity
            FROM rag_chunks c
            JOIN rag_sources s ON s.id = c.source_id
            {where_sql}
            LIMIT :limit
        """
        result = await db.execute(
            text(sql_fallback),
            fallback_params,
        )

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
