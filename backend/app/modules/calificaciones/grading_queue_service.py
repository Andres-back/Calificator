from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.calificaciones import photo_service
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.jobs import service as jobs_service
from app.shared.enums import JobTipo
from app.workers.tasks_grading import grade_delivery


async def enqueue_persisted_grading(
    db: AsyncSession,
    *,
    evaluacion: object,
    entrega: Entrega,
    estudiante_id: UUID,
    profesor_id: UUID,
    evidence_metadata: dict | None = None,
    calificacion: Calificacion | None = None,
) -> Calificacion:
    """Crea un trabajo persistente y devuelve sin esperar a los modelos."""
    parent_job_id = await jobs_service.create_job(
        db,
        user_id=profesor_id,
        tipo=JobTipo.CALIFICACION_LOTE.value,
        input_json={
            "evaluacion_id": str(evaluacion.id),
            "entrega_ids": [str(entrega.id)],
            "estudiante_ids": [str(estudiante_id)],
            "modalidad": "vision",
        },
    )
    parent_input = await jobs_service.get_job_input(db, parent_job_id)
    job_id = await jobs_service.create_job(
        db,
        user_id=profesor_id,
        tipo=JobTipo.CALIFICACION_ENTREGA.value,
        parent_job_id=parent_job_id,
        entrega_id=entrega.id,
        stage="queued",
        input_json={
            "evaluacion_id": str(evaluacion.id),
            "entrega_ids": [str(entrega.id)],
            "estudiante_ids": [str(estudiante_id)],
            "modalidad": "vision",
            "_ai_config": parent_input.get("_ai_config"),
        },
    )
    queued_grade = photo_service.prepare_queued_grading(
        entrega=entrega,
        evaluacion=evaluacion,
        estudiante_id=estudiante_id,
        profesor_id=profesor_id,
        job_id=job_id,
        evidence_metadata=evidence_metadata,
        calificacion=calificacion,
    )
    if calificacion is None:
        db.add(queued_grade)
    await jobs_service.aggregate_parent_job(db, parent_job_id)
    await db.commit()
    await db.refresh(queued_grade)

    try:
        grade_delivery.apply_async(
            kwargs={
                "evaluacion_id": str(evaluacion.id),
                "entrega_id": str(entrega.id),
                "job_id": str(job_id),
                "profesor_id": str(profesor_id),
            },
            queue="grading",
        )
    except Exception:  # noqa: BLE001
        # Un acuse perdido no significa que el worker no haya recibido el
        # mensaje. Solo marcamos jobs todavía no reclamados para republicación.
        await jobs_service.mark_job_retrying(
            db,
            job_id,
            error="Publicación pendiente; se reintentará automáticamente",
        )
        await db.commit()
    return queued_grade
