"""Servicio de calificación por foto/texto usando orquestación multi-agente.

Delegado al nuevo orchestrator multi-agente (agents.py + orchestrator.py).
Mantiene la misma interfaz pública para compatibilidad con los routers.
"""
from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.modules.calificaciones.orchestrator import orchestrate_grading
from app.modules.calificaciones.schemas import GradingResult
from app.modules.evaluaciones.blueprint_service import grading_answer_key_status

logger = get_logger(__name__)


async def grade_submission(
    db: AsyncSession,
    *,
    evaluacion_id: UUID,
    materia_id: UUID,
    blueprint: dict,
    student_response_text: str | None = None,
    image_bytes: bytes | None = None,
    image_mime: str = "image/jpeg",
    user_id: UUID | None = None,
) -> GradingResult:
    """
    Califica una entrega usando orquestación multi-agente.

    Pipeline:
      1. Foto/PDF: DeepSeek Vision extrae la evidencia (Qwen/MiMo como respaldo)
      2. Flash genera un desglose explicable y otro pase Flash lo verifica
      3. Pro arbitra únicamente discrepancias, baja confianza o fallos reales
      4. La extracción visual usa timeouts finitos; la entrega permanece recuperable

    Args:
        db: Sesión de BD.
        evaluacion_id: UUID de evaluación.
        materia_id: UUID de materia.
        blueprint: Mapa de evaluación.
        student_response_text: Respuesta texto (opcional).
        image_bytes: Imagen (opcional).
        image_mime: MIME type.
        user_id: ID del usuario.

    Returns:
        GradingResult con nota final consolidada.
    """
    result = await orchestrate_grading(
        db,
        evaluacion_id=evaluacion_id,
        materia_id=materia_id,
        blueprint=blueprint,
        image_bytes=image_bytes,
        image_mime=image_mime,
        student_response_text=student_response_text,
        user_id=user_id,
    )
    key_complete, missing_answers = grading_answer_key_status(blueprint)
    if not key_complete:
        result.confianza = min(result.confianza, 0.39)
        result.requiere_revision_docente = True
        warning = (
            "La evaluacion no tiene una clave completa para las preguntas "
            f"{', '.join(map(str, missing_answers))}; la nota requiere revision docente."
        )
        if warning not in result.alertas:
            result.alertas.append(warning)
        raw_output = dict(result.raw_model_output or {})
        raw_output["answer_key"] = {
            "complete": False,
            "missing_questions": missing_answers,
        }
        result.raw_model_output = raw_output
    return result
