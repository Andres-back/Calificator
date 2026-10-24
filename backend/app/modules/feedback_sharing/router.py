"""Gestión docente: seleccionar, previsualizar y emitir, nunca recalificar."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.authorization.service import effective_permissions
from app.modules.calificaciones.feedback_usefulness import assess_feedback_usefulness
from app.modules.calificaciones.models import Calificacion
from app.modules.feedback_sharing.access_policy import authorize_evaluation, db_now, guard_access
from app.modules.feedback_sharing.http_policy import PrivateRoute
from app.modules.feedback_sharing.models import FeedbackAccess, FeedbackPublication
from app.modules.feedback_sharing.schemas import AccessAction, AccessCreate, DeliveryReviewInput, PreviewInput, ReactivateInput, RenewInput, SelectedInput
from app.modules.feedback_sharing.service import approve_delivery_review, create_access, manage_access, prepare_grade_preview, preview_grade
from app.modules.users.models import User

router = APIRouter(tags=["devoluciones"], route_class=PrivateRoute)


async def apply_action(db, actor, access_id, action, payload):
    access, token = await manage_access(db, actor, access_id, action, payload)
    await db.commit()
    return {"id": access.id, "estado": access.state, "version": access.version,
            "expires_at": access.expires_at, "credential_available": token is not None,
            "url": f"{settings.PUBLIC_APP_URL.rstrip('/')}/devolucion#{token}" if token else None}


@router.post("/devoluciones/accesos/{access_id}/desactivar")
async def disable_access(access_id: UUID, payload: AccessAction, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await apply_action(db, actor, access_id, "disable", payload)


@router.post("/devoluciones/accesos/{access_id}/reactivar")
async def reactivate_access(access_id: UUID, payload: ReactivateInput, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await apply_action(db, actor, access_id, "reactivate", payload)


@router.post("/devoluciones/accesos/{access_id}/renovar")
async def renew_access(access_id: UUID, payload: RenewInput, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await apply_action(db, actor, access_id, "renew", payload)


@router.get("/devoluciones/disponibilidad")
async def availability(actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if actor.rol not in {"profesor", "admin"} or "grading.read" not in await effective_permissions(db, actor):
        raise HTTPException(403, "Esta opción es para docentes autorizados.")
    return {"enabled": settings.FEEDBACK_SHARING_ENABLED}


@router.post("/evaluaciones/{evaluation_id}/devoluciones/previsualizar")
async def preview(evaluation_id: UUID, payload: PreviewInput, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    evaluation = await authorize_evaluation(db, actor, evaluation_id, "grading.read")
    results = []
    for grade_id in payload.calificacion_ids:
        try:
            item = await prepare_grade_preview(db, actor, evaluation_id, grade_id)
            if item.get('resultado'):
                projection = item['resultado']
                item['revision_retroalimentacion'] = assess_feedback_usefulness(projection['retroalimentacion'], projection['respuestas'])
            results.append(item)
        except HTTPException as exc:
            item = {"calificacion_id": grade_id, "elegible": False, "motivo": exc.detail}
            grade = await db.get(Calificacion, grade_id)
            # This is authenticated teacher-only data, never a publication or
            # public projection. Other evaluations must not leak into a batch.
            if grade and grade.evaluacion_id == evaluation_id and grade.materia_id == evaluation.materia_id:
                processing = grade.estado in {"en_cola", "procesando"}
                score = None if processing else grade.nota_confirmada if grade.nota_confirmada is not None else grade.nota_sugerida
                item["borrador_docente"] = {
                    "estado": grade.estado, "nota": str(score) if score is not None else None,
                    "nota_maxima": str(evaluation.nota_maxima),
                    "retroalimentacion": "" if processing else grade.feedback or "",
                }
            results.append(item)
    return {"resultados": results}


@router.post('/evaluaciones/{evaluation_id}/devoluciones/revisar')
async def review_delivery(evaluation_id: UUID, payload: DeliveryReviewInput, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await authorize_evaluation(db, actor, evaluation_id)
    projection = await approve_delivery_review(db, actor, evaluation_id, payload)
    await db.commit()
    return {'calificacion_id': payload.calificacion_id, 'elegible': True,
        'seleccionable': True, 'preparacion': 'ready', 'fingerprint': projection.fingerprint,
        'resultado': projection.payload}


@router.post("/evaluaciones/{evaluation_id}/devoluciones/accesos")
async def issue(evaluation_id: UUID, payload: AccessCreate, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await authorize_evaluation(db, actor, evaluation_id)
    results = []
    for selection in payload.selecciones:
        try:
            async with db.begin_nested():
                access, token = await create_access(db, actor, evaluation_id, selection.calificacion_id, selection.fingerprint, payload.request_id, payload.duracion_dias, payload.evidencia)
                results.append({"calificacion_id": selection.calificacion_id, "id": access.id, "estado": access.state, "version": access.version, "expires_at": access.expires_at, "credential_available": token is not None, "url": f"{settings.PUBLIC_APP_URL.rstrip('/')}/devolucion#{token}" if token else None})
        except HTTPException as exc:
            results.append({"calificacion_id": selection.calificacion_id, "error": exc.detail})
    await db.commit()
    return {"resultados": results}


@router.get("/evaluaciones/{evaluation_id}/devoluciones/accesos")
async def list_accesses(evaluation_id: UUID, cursor: UUID | None = None, limit: int = Query(50, ge=1, le=100), actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await authorize_evaluation(db, actor, evaluation_id, "grading.read")
    query = select(FeedbackAccess, FeedbackPublication).join(FeedbackPublication, FeedbackAccess.publication_id == FeedbackPublication.id).where(FeedbackPublication.evaluacion_id == evaluation_id)
    if cursor:
        query = query.where(FeedbackAccess.id > cursor)
    rows = (await db.execute(query.order_by(FeedbackAccess.id).limit(limit + 1))).all()
    results = []
    now = await db_now(db)
    for access, publication in rows[:limit]:
        state = access.state
        if state == "active":
            if now >= access.expires_at:
                state = "expired"
            else:
                try:
                    await guard_access(db, access)
                except HTTPException:
                    state = "suspended"
        results.append({"id": access.id, "calificacion_id": access.calificacion_id, "estudiante": publication.payload_json["estudiante"], "estado": state, "version": access.version, "expires_at": access.expires_at, "fingerprint": publication.content_fingerprint})
    return {"resultados": results, "next_cursor": str(rows[limit - 1][0].id) if len(rows) > limit else None}


@router.post("/evaluaciones/{evaluation_id}/devoluciones/fichas")
async def print_sheets(evaluation_id: UUID, payload: SelectedInput, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await authorize_evaluation(db, actor, evaluation_id)
    results = []
    for selection in payload.selecciones:
        try:
            projection = await preview_grade(db, actor, evaluation_id, selection.calificacion_id)
            if projection.fingerprint != selection.fingerprint:
                raise HTTPException(409, "El resultado cambió. Revisa la vista previa.")
            results.append({"calificacion_id": selection.calificacion_id, "resultado": projection.payload})
        except HTTPException as exc:
            results.append({"calificacion_id": selection.calificacion_id, "error": exc.detail})
    return {"resultados": results}
