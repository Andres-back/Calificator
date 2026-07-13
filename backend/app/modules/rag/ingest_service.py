"""Servicio de ingesta RAG: chunking + embeddings + guardado."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.modules.rag.models import RagChunk, RagSource
from app.modules.rag.schemas import RagSourceCreate
from app.services.embedding_service import chunk_text, embed_texts
from app.shared.enums import RagTipo

logger = get_logger(__name__)


async def create_source(
    db: AsyncSession,
    payload: RagSourceCreate,
    profesor_id: UUID,
) -> RagSource:
    source = RagSource(
        profesor_id=profesor_id,
        materia_id=payload.materia_id,
        tipo=payload.tipo.value,
        titulo=payload.titulo,
        contenido_original=payload.contenido,
    )
    db.add(source)
    await db.flush()
    return source


async def ingest_source(db: AsyncSession, source_id: UUID) -> int:
    """
    Realiza el chunking y embedding de una fuente RAG.
    Devuelve la cantidad de chunks creados.
    """
    source = await db.scalar(select(RagSource).where(RagSource.id == source_id))
    if not source or not source.contenido_original:
        return 0

    # Eliminar chunks anteriores de esta fuente
    existing = await db.scalars(select(RagChunk).where(RagChunk.source_id == source.id))
    for chunk in existing:
        await db.delete(chunk)
    await db.flush()

    chunks = chunk_text(source.contenido_original)
    if not chunks:
        return 0

    logger.info("Ingesting source %s: %d chunks", source_id, len(chunks))
    embeddings = await embed_texts(chunks)

    for text_chunk, embedding in zip(chunks, embeddings, strict=False):
        rag_chunk = RagChunk(
            source_id=source.id,
            profesor_id=source.profesor_id,
            materia_id=source.materia_id,
            tipo=source.tipo,
            chunk_text=text_chunk,
            embedding=embedding,
        )
        db.add(rag_chunk)

    await db.commit()
    return len(chunks)
