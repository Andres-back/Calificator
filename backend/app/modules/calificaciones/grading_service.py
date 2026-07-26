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
      1. Vision Agent (mimo-v2.5) → extrae texto de imagen
      2. Grader A (deepseek-v4-flash) → califica por texto
      3. Grader B (qwen3.7-plus, multimodal) → califica viendo imagen directo
      4. Comparator → compara A vs B, produce nota final con doble verificación

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
    return await orchestrate_grading(
        db,
        evaluacion_id=evaluacion_id,
        materia_id=materia_id,
        blueprint=blueprint,
        image_bytes=image_bytes,
        image_mime=image_mime,
        student_response_text=student_response_text,
        user_id=user_id,
    )
