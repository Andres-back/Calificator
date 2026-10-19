"""Modo Salón: calificación secuencial estudiante por estudiante."""
from __future__ import annotations

import uuid
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import is_student_enrolled
from app.core.logging import get_logger
from app.modules.calificaciones import service as calificaciones_service
from app.modules.calificaciones import photo_service
from app.modules.calificaciones.models import Calificacion, Entrega, SalonSesion, SalonSesionEstudiante
from app.modules.evaluaciones.grading_visual_context import pin_new_submission_content
from app.modules.evaluaciones.models import Evaluacion
from app.modules.matriculas.models import Matricula
from app.services.storage_service import save_upload, resolve_upload_path
from app.shared.enums import (
    EntregaEstado, EntregaTipo,
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

    entrega = Entrega(evaluacion_id=evaluacion.id, estudiante_id=estudiante_id,
        materia_id=evaluacion.materia_id, tipo=EntregaTipo.PDF.value if image_mime == 'application/pdf' else EntregaTipo.FOTO.value,
        estado=EntregaEstado.PROCESANDO.value, visual_text_json={})
    await pin_new_submission_content(db, evaluacion, entrega)
    filename = 'evidencia.pdf' if image_mime == 'application/pdf' else 'evidencia.jpg'
    stored_url = await save_upload(image_bytes, filename, subfolder='entregas', max_size_bytes=15 * 1024 * 1024)
    entrega.archivo_url = stored_url
    persisted = False
    try:
        db.add(entrega)
        await db.commit()  # Release the evaluation lock and preserve evidence before inference.
        persisted = True
        await db.refresh(entrega)
    except Exception:
        await db.rollback()
        if not persisted:
            resolve_upload_path(stored_url).unlink(missing_ok=True)
        raise
    try:
        calificacion = await photo_service.grade_persisted_photo(db, evaluacion=evaluacion, entrega=entrega,
            estudiante_id=estudiante_id, profesor_id=profesor_id, image_bytes=image_bytes, image_mime=image_mime)
    except Exception as e:
        if sesion_id:
            await update_estudiante_estado(
                db, sesion_id, estudiante_id,
                SalonEstudianteEstado.ERROR.value,
                str(e),
            )
        await db.commit()
        raise
    if sesion_id:
        await update_estudiante_estado(db, sesion_id, estudiante_id,
            SalonEstudianteEstado.ERROR.value if calificacion.nota_sugerida is None else SalonEstudianteEstado.CALIFICADO.value)
        await db.commit()
    return calificacion
