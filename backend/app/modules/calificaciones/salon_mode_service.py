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
from app.modules.calificaciones.breakdown_service import create_automatic_breakdown
from app.modules.calificaciones.grading_service import grade_submission
from app.modules.calificaciones.models import Calificacion, Entrega, SalonSesion, SalonSesionEstudiante
from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.evaluaciones.models import Evaluacion
from app.modules.matriculas.models import Matricula
from app.shared.enums import (
    CalificacionEstado, EntregaEstado, EntregaTipo,
    MatriculaEstado, SalonEstudianteEstado,
)

logger = get_logger(__name__)


def create_sesion_id() -> str:
    return uuid.uuid4().hex


async def get_pending_students(db: AsyncSession, evaluacion_id: UUID) -> list[UUID]:
    """Devuelve IDs de estudiantes matriculados que aún no tienen calificación."""
    evaluacion = await db.scalar(select(Evaluacion).where(Evaluacion.id == evaluacion_id))
    if not evaluacion:
        return []

    enrolled = await db.scalars(
        select(Matricula.estudiante_id).where(
            Matricula.materia_id == evaluacion.materia_id,
            Matricula.estado == MatriculaEstado.ACTIVO.value,
        )
    )
    enrolled_ids = set(enrolled)

    calificados = await db.scalars(
        select(Calificacion.estudiante_id).where(Calificacion.evaluacion_id == evaluacion_id)
    )
    calificados_ids = set(calificados)

    return list(enrolled_ids - calificados_ids)


async def init_sesion_estudiantes(
    db: AsyncSession, sesion: SalonSesion, evaluacion: Evaluacion
) -> list[SalonSesionEstudiante]:
    """Precarga todos los estudiantes matriculados en la sesión con estado pendiente."""
    enrolled = await db.scalars(
        select(Matricula.estudiante_id).where(
            Matricula.materia_id == evaluacion.materia_id,
            Matricula.estado == MatriculaEstado.ACTIVO.value,
        )
    )
    rows = []
    for eid in enrolled:
        sse = SalonSesionEstudiante(
            sesion_id=sesion.id,
            estudiante_id=eid,
            estado=SalonEstudianteEstado.PENDIENTE.value,
        )
        db.add(sse)
        rows.append(sse)
    await db.flush()
    return rows


async def get_sesion_summary(
    db: AsyncSession, sesion_id: str
) -> tuple[list[SalonSesionEstudiante], int, int, int, int, int]:
    """Devuelve estudiantes y conteos de una sesión."""
    rows = await db.scalars(
        select(SalonSesionEstudiante)
        .where(SalonSesionEstudiante.sesion_id == sesion_id)
        .order_by(SalonSesionEstudiante.created_at)
    )
    estudiantes = list(rows)
    total = len(estudiantes)
    pendientes = sum(1 for e in estudiantes if e.estado == SalonEstudianteEstado.PENDIENTE.value)
    calificados = sum(1 for e in estudiantes if e.estado == SalonEstudianteEstado.CALIFICADO.value)
    confirmados = sum(1 for e in estudiantes if e.estado == SalonEstudianteEstado.CONFIRMADO.value)
    omitidos = sum(1 for e in estudiantes if e.estado == SalonEstudianteEstado.OMITIDO.value)
    return estudiantes, total, pendientes, calificados, confirmados, omitidos


async def update_estudiante_estado(
    db: AsyncSession,
    sesion_id: str,
    estudiante_id: UUID,
    estado: str,
    error_msg: str | None = None,
) -> SalonSesionEstudiante | None:
    """Actualiza el estado de un estudiante en la sesión."""
    sse = await db.scalar(
        select(SalonSesionEstudiante).where(
            SalonSesionEstudiante.sesion_id == sesion_id,
            SalonSesionEstudiante.estudiante_id == estudiante_id,
        )
    )
    if sse:
        sse.estado = estado
        if error_msg is not None:
            sse.error_msg = error_msg
        await db.flush()
    return sse


async def grade_student_photo(
    db: AsyncSession,
    *,
    evaluacion: Evaluacion,
    estudiante_id: UUID,
    image_bytes: bytes,
    image_mime: str,
    profesor_id: UUID,
    sesion_id: str | None = None,
) -> Calificacion:
    """
    Crea Entrega y Calificacion para un estudiante en Modo Salón.
    Actualiza el estado del estudiante en la sesión si se provee sesion_id.
    """
    calificaciones_service.ensure_evaluation_accepts_grading(evaluacion)
    if not await is_student_enrolled(db, evaluacion.materia_id, estudiante_id):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="El estudiante no esta matriculado en esta materia")

    await calificaciones_service.ensure_student_can_submit_new_evidence(
        db, evaluacion, estudiante_id,
    )

    if sesion_id:
        await update_estudiante_estado(
            db, sesion_id, estudiante_id,
            SalonEstudianteEstado.FOTOGRAFIADO.value,
        )
        await db.flush()

    try:
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
            grading.nota_sugerida, evaluacion, "nota_sugerida",
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
        await db.flush()
        await create_automatic_breakdown(
            db,
            calificacion=calificacion,
            blueprint=evaluation_to_grading_blueprint(evaluacion),
            raw_output=grading.raw_model_output,
            pipeline_run_id=f"salon:{sesion_id or entrega.id}:{entrega.id}",
        )

        if sesion_id:
            await update_estudiante_estado(
                db, sesion_id, estudiante_id,
                SalonEstudianteEstado.CALIFICADO.value,
            )

        await db.commit()
        await db.refresh(calificacion)
        return calificacion

    except Exception as e:
        if sesion_id:
            await update_estudiante_estado(
                db, sesion_id, estudiante_id,
                SalonEstudianteEstado.ERROR.value,
                str(e),
            )
        await db.commit()
        raise
