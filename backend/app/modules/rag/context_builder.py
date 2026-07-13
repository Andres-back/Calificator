"""Context Builder: construye contexto RAG para distintos flujos."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.rag.retrieval_service import search_chunks


async def build_context_for_grading(
    db: AsyncSession,
    materia_id: UUID,
    evaluacion_nombre: str,
    student_response: str,
    limit: int = 6,
) -> list[dict]:
    query = f"Calificar evaluación: {evaluacion_nombre}. Respuesta: {student_response[:300]}"
    return await search_chunks(db, query, materia_id=materia_id, limit=limit)


async def build_context_for_evaluation_creation(
    db: AsyncSession,
    materia_id: UUID,
    dba_texto: str,
    metas: list[str],
    limit: int = 8,
) -> list[dict]:
    query = f"Crear evaluación. DBA: {dba_texto}. Metas: {', '.join(metas)}"
    return await search_chunks(db, query, materia_id=materia_id, limit=limit)


async def build_context_for_xali(
    db: AsyncSession,
    materia_id: UUID,
    user_question: str,
    limit: int = 6,
) -> list[dict]:
    return await search_chunks(db, user_question, materia_id=materia_id, limit=limit)


async def build_context_for_reinforcement_plan(
    db: AsyncSession,
    materia_id: UUID,
    dificultades: list[str],
    limit: int = 6,
) -> list[dict]:
    query = f"Plan de refuerzo. Dificultades: {', '.join(dificultades)}"
    return await search_chunks(db, query, materia_id=materia_id, limit=limit)


async def build_context_for_reports(
    db: AsyncSession,
    materia_id: UUID,
    tema: str,
    limit: int = 4,
) -> list[dict]:
    return await search_chunks(db, tema, materia_id=materia_id, limit=limit)


def format_context_as_text(chunks: list[dict]) -> str:
    """Convierte chunks a texto plano para incluir en prompts LLM."""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(f"[Fuente {i} - {chunk.get('tipo', '')}]\n{chunk.get('chunk_text', '')}")
    return "\n\n".join(parts)
