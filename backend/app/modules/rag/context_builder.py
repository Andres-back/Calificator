"""Context Builder: construye contexto RAG para distintos flujos."""
from __future__ import annotations

from uuid import UUID
import re

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


def _terms(value: object) -> set[str]:
    return {
        term for term in re.findall(r"[a-záéíóúñ0-9]{4,}", str(value or "").lower())
        if term not in {"pregunta", "respuesta", "para", "como", "esta", "este"}
    }


async def build_question_context_for_grading(
    db: AsyncSession,
    *,
    materia_id: UUID,
    profesor_id: UUID | None,
    evaluacion_nombre: str,
    questions: list[dict],
    detected_answers: list[dict],
    limit: int = 12,
) -> tuple[dict[str, list[dict]], list[dict]]:
    """Recupera una vez y asigna fuentes autorizadas a cada respuesta extraída."""
    answer_by_number = {
        str(item.get("pregunta", item.get("numero"))): item.get("respuesta")
        for item in detected_answers
        if item.get("pregunta", item.get("numero")) is not None
    }
    pairs: list[tuple[str, str, str]] = []
    for index, question in enumerate(questions):
        number = str(question.get("numero") or index + 1)
        statement = str(
            question.get("enunciado")
            or question.get("pregunta")
            or question.get("texto")
            or ""
        )
        answer = str(answer_by_number.get(number) or "")
        pairs.append((number, statement, answer))
    if not pairs:
        return {}, []

    query = "\n".join(
        f"P{number}: {statement}. Respuesta del estudiante: {answer}"
        for number, statement, answer in pairs
    )
    chunks = await search_chunks(
        db,
        f"Calificar {evaluacion_nombre}. {query}",
        materia_id=materia_id,
        profesor_id=profesor_id,
        limit=max(1, min(limit, 20)),
    )
    assigned: dict[str, list[dict]] = {}
    provenance: list[dict] = []
    for number, statement, answer in pairs:
        query_terms = _terms(f"{statement} {answer}")
        ranked = sorted(
            chunks,
            key=lambda chunk: (
                len(query_terms & _terms(chunk.get("chunk_text"))),
                float(chunk.get("similarity") or 0),
            ),
            reverse=True,
        )
        selected = [
            chunk for chunk in ranked
            if not query_terms or query_terms & _terms(chunk.get("chunk_text"))
        ][:2]
        assigned[number] = selected
        for chunk in selected:
            reference = {
                "pregunta": number,
                "source_id": chunk.get("source_id"),
                "chunk_id": chunk.get("id"),
                "titulo": chunk.get("source_title") or chunk.get("tipo") or "Fuente",
                "version": chunk.get("source_version"),
                "fragmento": str(chunk.get("chunk_text") or "")[:500],
            }
            if reference not in provenance:
                provenance.append(reference)
    return assigned, provenance


def format_question_context_as_text(context: dict[str, list[dict]]) -> str:
    if not any(context.values()):
        return "(sin fuentes adicionales pertinentes)"
    parts: list[str] = []
    for number, chunks in context.items():
        for chunk in chunks:
            parts.append(
                f"[Pregunta {number} · {chunk.get('source_title') or chunk.get('tipo') or 'Fuente'}]"
                f"\n{chunk.get('chunk_text', '')}"
            )
    return "\n\n".join(parts)


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
