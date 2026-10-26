"""Acciones docentes explícitas; los snapshots nunca son públicos."""

from datetime import datetime
import json
import mimetypes
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.permissions import get_current_user, require_permission_now
from app.db.session import get_db
from app.modules.calificaciones import revision_service, service
from app.modules.calificaciones.models import (
    Calificacion,
    CalificacionRevision,
    Entrega,
)
from app.modules.calificaciones.schemas import (
    CalificacionRead,
    CalificacionRevisionRead,
)
from app.modules.evaluaciones import service as evaluation_service
from app.modules.users.models import User
from app.services.evidence_bundle_service import (
    EvidenceBundleError,
    build_evidence_bundle,
)
from app.services.storage_service import resolve_upload_path

router = APIRouter()


async def owned_grade(db, grade_id, actor, *, lock=False):
    require_permission_now(actor, "grading.grade")
    grade = await service.get_calificacion_or_404(db, grade_id)
    evaluation = await evaluation_service.ensure_can_manage_evaluation(
        db, grade.evaluacion_id, actor
    )
    if lock:
        grade = await db.scalar(
            select(Calificacion)
            .options(selectinload(Calificacion.entrega))
            .where(Calificacion.id == grade_id)
            .with_for_update(of=Calificacion)
            .execution_options(populate_existing=True)
        )
        if grade is None:
            raise HTTPException(404, "Calificación no encontrada")
        if grade.entrega_id:
            await db.scalar(
                select(Entrega)
                .where(Entrega.id == grade.entrega_id)
                .with_for_update()
                .execution_options(populate_existing=True)
            )
    return grade, evaluation


@router.post(
    "/calificaciones/{calificacion_id}/recalificar",
    response_model=CalificacionRead,
    status_code=202,
)
async def recalificar_entrega(
    calificacion_id: UUID,
    solicitud_id: UUID = Form(...),
    version_esperada: datetime = Form(...),
    confirmar_reapertura: bool = Form(False),
    motivo: str | None = Form(None, max_length=1000),
    foto: list[UploadFile] | None = File(None),
    rotaciones: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_permission_now(current_user, "grading.grade")
    grade, evaluation = await owned_grade(db, calificacion_id, current_user, lock=True)
    from app.modules.materias.service import ensure_active_materia
    await ensure_active_materia(db, evaluation.materia_id)
    service.ensure_evaluation_active(evaluation)
    bundle = None
    if foto:
        try:
            turns = json.loads(rotaciones) if rotaciones else None
            if turns is not None and (
                not isinstance(turns, list)
                or any(type(turn) is not int for turn in turns)
            ):
                raise EvidenceBundleError("La rotación de las hojas no es válida.")
            bundle = await build_evidence_bundle(foto, rotations=turns)
        except (EvidenceBundleError, ValueError, TypeError) as exc:
            raise HTTPException(400, "Revisa las fotos o el PDF: " + str(exc)) from exc
    return await revision_service.reprocess_grade(
        db,
        grade=grade,
        evaluation=evaluation,
        actor_id=current_user.id,
        request_id=solicitud_id,
        expected_version=version_esperada,
        confirmed=confirmar_reapertura,
        reason=motivo,
        bundle=bundle,
    )


@router.get(
    "/calificaciones/{calificacion_id}/revisiones",
    response_model=list[CalificacionRevisionRead],
)
async def listar_revisiones(
    calificacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_permission_now(current_user, "grading.grade")
    await owned_grade(db, calificacion_id, current_user)
    rows = (
        await db.execute(
            select(CalificacionRevision, User.nombre)
            .join(User, User.id == CalificacionRevision.actor_id)
            .where(CalificacionRevision.calificacion_id == calificacion_id)
            .order_by(
                CalificacionRevision.created_at.desc(), CalificacionRevision.id.desc()
            )
            .limit(100)
        )
    ).all()
    return [
        {
            "id": row.id,
            "created_at": row.created_at,
            "actor_nombre": actor,
            "accion": row.accion,
            "motivo": row.motivo,
            "estado_anterior": row.snapshot_json.get("estado"),
            "nota_anterior": row.snapshot_json.get("nota_confirmada")
            if row.snapshot_json.get("nota_confirmada") is not None
            else row.snapshot_json.get("nota_sugerida"),
            "feedback_anterior": row.snapshot_json.get("feedback"),
            "evidencia_url": f"/api/calificaciones/{calificacion_id}/revisiones/{row.id}/evidencia"
            if row.archivo_url
            else None,
        }
        for row, actor in rows
    ]


@router.get("/calificaciones/{calificacion_id}/revisiones/{revision_id}/evidencia")
async def evidencia_revision(
    calificacion_id: UUID,
    revision_id: UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_permission_now(current_user, "grading.grade")
    await owned_grade(db, calificacion_id, current_user)
    revision = await db.scalar(
        select(CalificacionRevision).where(
            CalificacionRevision.id == revision_id,
            CalificacionRevision.calificacion_id == calificacion_id,
        )
    )
    if revision is None or not revision.archivo_url:
        raise HTTPException(404, "Evidencia anterior no encontrada")
    try:
        path = resolve_upload_path(revision.archivo_url)
        if not path.is_file():
            raise ValueError("missing")
    except (OSError, ValueError) as exc:
        raise HTTPException(404, "Evidencia anterior no disponible") from exc
    return FileResponse(
        path,
        media_type=mimetypes.guess_type(path.name)[0] or "application/octet-stream",
        headers={
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": f'inline; filename="evidencia-anterior{path.suffix}"',
        },
    )
