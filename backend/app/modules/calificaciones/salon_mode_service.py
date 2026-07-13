"""Modo Salón: calificación secuencial estudiante por estudiante."""
from __future__ import annotations

import uuid
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import is_student_enrolled
from app.core.logging import get_logger
from app.modules.calificaciones import service as calificaciones_service
from app.modules.calificaciones.grading_service import grade_submission
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.evaluaciones.models import Evaluacion
from app.modules.matriculas.models import Matricula
from app.shared.enums import CalificacionEstado, EntregaEstado, EntregaTipo, MatriculaEstado

logger = get_logger(__name__)


def create_sesion_id() -> str:
    return uuid.uuid4().hex


async def get_pending_students(db: AsyncSession, evaluacion_id: UUID) -> list[UUID]:
    """Devuelve IDs de estudiantes matriculados que aún no tienen calificación."""
    evaluacion = await db.scalar(select(Evaluacion).where(Evaluacion.id == evaluacion_id))
    if not evaluacion:
        return []

    # Estudiantes matriculados
    enrolled = await db.scalars(
        select(Matricula.estudiante_id).where(
            Matricula.materia_id == evaluacion.materia_id,
            Matricula.estado == MatriculaEstado.ACTIVO.value,
        )
    )
    enrolled_ids = set(enrolled)

    # Ya calificados
    calificados = await db.scalars(
        select(Calificacion.estudiante_id).where(Calificacion.evaluacion_id == evaluacion_id)
    )
    calificados_ids = set(calificados)

    return list(enrolled_ids - calificados_ids)


async def grade_student_photo(
    db: AsyncSession,
    *,
    evaluacion: Evaluacion,
    estudiante_id: UUID,
    image_bytes: bytes,
    image_mime: str,
    profesor_id: UUID,
) -> Calificacion:
    """
    Crea Entrega y Calificacion para un estudiante en Modo Salón.
    La IA sugiere; el docente confirma después.
    """
    calificaciones_service.ensure_evaluation_accepts_grading(evaluacion)
    if not await is_student_enrolled(db, evaluacion.materia_id, estudiante_id):
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="El estudiante no esta matriculado en esta materia")

    grading = await grade_submission(
        db,
        evaluacion_id=evaluacion.id,
        materia_id=evaluacion.materia_id,
        blueprint=evaluation_to_grading_blueprint(evaluacion),
        image_bytes=image_bytes,
        image_mime=image_mime,
        user_id=profesor_id,
    )
    calificaciones_service.validate_score_within_evaluation(
        grading.nota_sugerida,
        evaluacion,
        "nota_sugerida",
    )
    calificaciones_service.transition_to_grading_if_needed(evaluacion)

    entrega = Entrega(
        evaluacion_id=evaluacion.id,
        estudiante_id=estudiante_id,
        materia_id=evaluacion.materia_id,
        tipo=EntregaTipo.FOTO.value,
        estado=EntregaEstado.CALIFICADA.value,
        visual_text_json=grading.raw_model_output,
    )
    db.add(entrega)
    await db.flush()

    calificacion = Calificacion(
        evaluacion_id=evaluacion.id,
        entrega_id=entrega.id,
        estudiante_id=estudiante_id,
        materia_id=evaluacion.materia_id,
        profesor_id=profesor_id,
        nota_sugerida=grading.nota_sugerida,
        confianza=Decimal(str(grading.confianza)),
        feedback=grading.feedback_estudiante,
        resultado_json=grading.raw_model_output,
        estado=CalificacionEstado.SUGERIDA.value,
    )
    db.add(calificacion)
    await db.commit()
    await db.refresh(calificacion)
    return calificacion
