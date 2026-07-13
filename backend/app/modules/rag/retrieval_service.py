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
        filters.append("(materia_id = CAST(:materia_id AS uuid) OR tipo = 'dba')")
        params["materia_id"] = str(materia_id)
    if tipo:
        filters.append("tipo = :tipo")
        params["tipo"] = tipo
    where_sql = f"WHERE {' AND '.join(filters)}" if filters else ""

    # Intenta con columna vector nativa (embedding_vec); si no, usa la columna ARRAY
    try:
        sql = f"""
            SELECT
                id,
                chunk_text,
                tipo,
                metadata,
                1 - (embedding_vec <=> CAST(:embedding AS vector)) AS similarity
            FROM rag_chunks
            {where_sql}
            {"AND" if where_sql else "WHERE"} embedding_vec IS NOT NULL
            ORDER BY embedding_vec <=> CAST(:embedding AS vector)
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
            SELECT id, chunk_text, tipo, metadata, 0.5 AS similarity
            FROM rag_chunks
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
            "chunk_text": row.chunk_text,
            "tipo": row.tipo,
            "similarity": float(row.similarity),
            "metadata_json": row.metadata or {},
        }
        for row in rows
    ]
