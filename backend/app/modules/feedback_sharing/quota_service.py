"""Admisión durable: cinco preguntas en ventana móvil por estudiante/evaluación."""
from datetime import timedelta
import math
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.modules.calificaciones.models import Calificacion
from app.modules.feedback_sharing.access_policy import UNAVAILABLE, db_now, guard_token
from app.modules.feedback_sharing.models import FeedbackAccess, FeedbackChatQuota, FeedbackChatRequest, FeedbackPublication
from app.modules.feedback_sharing.projection import digest


async def quota_snapshot(db, context):
    now = await db_now(db)
    count, oldest = (await db.execute(select(func.count(FeedbackChatRequest.id), func.min(FeedbackChatRequest.accepted_at)).join(FeedbackChatQuota, FeedbackChatRequest.quota_id == FeedbackChatQuota.id).where(
        FeedbackChatQuota.estudiante_id == context.publication.estudiante_id,
        FeedbackChatQuota.evaluacion_id == context.publication.evaluacion_id,
        FeedbackChatRequest.accepted_at > now - timedelta(seconds=600),
        FeedbackChatRequest.accepted_at <= now,
    ))).one()
    return {"restantes": max(0, 5 - count), "retry_after_seconds": max(1, math.ceil((oldest + timedelta(seconds=600) - now).total_seconds())) if count >= 5 and oldest else 0}


async def accept_question(db, token, payload, *, max_pending=None):
    context = await guard_token(db, token)
    # Orden: nota -> publicación -> acceso -> cuota -> petición. Nunca mantener
    # esta transacción abierta al esperar al proveedor; el caller debe commit.
    await db.scalar(select(Calificacion.id).where(Calificacion.id == context.publication.calificacion_id).with_for_update())
    context = await guard_token(db, token)
    await db.scalar(select(FeedbackPublication.id).where(FeedbackPublication.id == context.publication.id).with_for_update())
    await db.scalar(select(FeedbackAccess.id).where(FeedbackAccess.id == context.access.id).with_for_update())
    await db.execute(insert(FeedbackChatQuota).values(id=uuid4(), estudiante_id=context.publication.estudiante_id, evaluacion_id=context.publication.evaluacion_id).on_conflict_do_nothing(constraint="uq_feedback_quota_subject"))
    quota = await db.scalar(select(FeedbackChatQuota).where(FeedbackChatQuota.estudiante_id == context.publication.estudiante_id, FeedbackChatQuota.evaluacion_id == context.publication.evaluacion_id).with_for_update())
    existing = await db.scalar(select(FeedbackChatRequest).where(
        FeedbackChatRequest.access_id == context.access.id,
        FeedbackChatRequest.credential_generation == context.access.credential_generation,
        FeedbackChatRequest.client_request_id == payload.request_id,
    ).execution_options(populate_existing=True))
    fingerprint = digest(payload.mensaje)
    if existing:
        if existing.request_fingerprint != fingerprint:
            raise HTTPException(409, "Esta pregunta ya se envió con otro contenido.")
        return existing, False
    if max_pending is not None:
        pending = await db.scalar(select(func.count()).select_from(FeedbackChatRequest).where(FeedbackChatRequest.status.in_(["queued", "running"])))
        if pending >= max_pending:
            raise HTTPException(503, "Xali tiene varias preguntas pendientes. Intenta más tarde; puedes seguir leyendo tu devolución.")
    now = await db_now(db)
    if now >= context.access.expires_at:
        raise HTTPException(404, UNAVAILABLE)
    count, oldest = (await db.execute(select(func.count(FeedbackChatRequest.id), func.min(FeedbackChatRequest.accepted_at)).where(
        FeedbackChatRequest.quota_id == quota.id,
        FeedbackChatRequest.accepted_at > now - timedelta(seconds=600),
        FeedbackChatRequest.accepted_at <= now,
    ))).one()
    if count >= 5:
        seconds = max(1, math.ceil((oldest + timedelta(seconds=600) - now).total_seconds()))
        raise HTTPException(429, "Ya usaste tus 5 preguntas. Podrás preguntar de nuevo cuando termine la espera.", headers={"Retry-After": str(seconds)})
    request = FeedbackChatRequest(access_id=context.access.id, publication_id=context.publication.id, quota_id=quota.id, credential_generation=context.access.credential_generation, client_request_id=payload.request_id, request_fingerprint=fingerprint, message=payload.mensaje, accepted_at=now)
    db.add(request)
    await db.flush()
    return request, True
