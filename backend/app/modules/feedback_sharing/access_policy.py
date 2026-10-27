"""Validación de cada consulta; la credencial nunca equivale a login."""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import re
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.permissions import is_student_enrolled
from app.modules.authorization.service import effective_permissions
from app.modules.calificaciones.breakdown_service import get_active_breakdown
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.evaluaciones.models import Evaluacion
from app.modules.feedback_sharing.models import FeedbackAccess, FeedbackDeliveryReview, FeedbackPublication
from app.modules.feedback_sharing.projection import Projection, build_projection, build_review_projection, review_source_fingerprint
from app.modules.materias.models import Materia
from app.modules.users.models import User

UNAVAILABLE = "Este enlace no está disponible. Pide a tu profesor que lo revise."


def enabled() -> None:
    if not settings.FEEDBACK_SHARING_ENABLED:
        raise HTTPException(404, UNAVAILABLE)


def credential_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def db_now(db):
    return await db.scalar(select(func.clock_timestamp()))


@dataclass
class Source:
    grade: Calificacion
    evaluation: Evaluacion
    subject: Materia
    student: User
    breakdown: object
    delivery: Entrega | None
    projection: Projection | None
    evidence_identity: dict | None = None
    source_fingerprint: str | None = None


async def load_source(db, grade_id: UUID, *, lock: bool = False, prepare_only: bool = False) -> Source:
    query = select(Calificacion).where(Calificacion.id == grade_id).execution_options(populate_existing=True)
    if lock:
        query = query.with_for_update()
    grade = await db.scalar(query)
    if grade is None:
        raise HTTPException(404, "Resultado no disponible.")
    evaluation = await db.scalar(select(Evaluacion).options(selectinload(Evaluacion.blueprint)).where(Evaluacion.id == grade.evaluacion_id).execution_options(populate_existing=True))
    if evaluation is None or evaluation.deleted_at is not None or evaluation.materia_id != grade.materia_id:
        raise HTTPException(409, "La evaluación ya no está disponible.")
    subject = await db.scalar(select(Materia).where(Materia.id == grade.materia_id).execution_options(populate_existing=True))
    student = await db.scalar(select(User).where(User.id == grade.estudiante_id).execution_options(populate_existing=True))
    if not subject or subject.estado != "activa" or not student or student.estado != "activo":
        raise HTTPException(409, "La materia o el estudiante ya no están disponibles.")
    if not await is_student_enrolled(db, subject.id, student.id):
        raise HTTPException(409, "El estudiante ya no está matriculado en esta materia.")
    from app.modules.calificaciones.service import _select_current_calificaciones

    grades = list((await db.scalars(select(Calificacion).where(Calificacion.evaluacion_id == evaluation.id, Calificacion.estudiante_id == student.id))).all())
    current = _select_current_calificaciones(grades, evaluation.politica_intento)
    if not any(item.id == grade.id for item in current):
        raise HTTPException(409, "Revisa el resultado vigente de este estudiante.")
    breakdown = await get_active_breakdown(db, grade.id)
    delivery = await db.get(Entrega, grade.entrega_id, populate_existing=True) if grade.entrega_id else None
    if delivery and (delivery.estudiante_id != grade.estudiante_id or delivery.evaluacion_id != grade.evaluacion_id or delivery.materia_id != grade.materia_id):
        raise HTTPException(409, "La evidencia no corresponde a este resultado.")
    from app.modules.evaluaciones.grading_visual_context import evaluation_with_delivery_document
    evaluation = await evaluation_with_delivery_document(db, evaluation, delivery)
    evidence_identity = {"archivo": delivery.archivo_url, "metadata": delivery.visual_text_json} if delivery else None
    fingerprint = review_source_fingerprint(grade, evaluation, student.nombre, subject.nombre, breakdown, evidence_identity=evidence_identity)
    source = Source(grade, evaluation, subject, student, breakdown, delivery, None, evidence_identity, fingerprint)
    if not prepare_only:
        source.projection = await project_source(db, source)
    return source


async def project_source(db, source: Source) -> Projection:
    review = await db.scalar(select(FeedbackDeliveryReview).where(
        FeedbackDeliveryReview.calificacion_id == source.grade.id,
    ).order_by(FeedbackDeliveryReview.authorized_at.desc(), FeedbackDeliveryReview.id.desc()).limit(1))
    args = (source.grade, source.evaluation, source.student.nombre, source.subject.nombre, source.breakdown)
    if review and review.source_fingerprint == source.source_fingerprint:
        return build_review_projection(*args, review, evidence_identity=source.evidence_identity)
    return build_projection(*args, evidence_identity=source.evidence_identity)


async def authorize_teacher(db, actor: User, source: Source, permission: str = "grading.publish") -> None:
    await authorize_owner(db, actor, source.evaluation, source.subject, permission)


async def authorize_owner(db, actor, evaluation, subject, permission="grading.publish"):
    if actor.estado != "activo" or actor.rol not in {"profesor", "admin"}:
        raise HTTPException(403, "No tienes permiso para compartir este resultado.")
    if permission not in await effective_permissions(db, actor):
        raise HTTPException(403, "No tienes permiso para compartir este resultado.")
    if actor.rol != "admin" and (evaluation.profesor_id != actor.id or subject.profesor_id != actor.id):
        raise HTTPException(403, "No tienes permiso sobre esta materia.")


async def authorize_evaluation(db, actor, evaluation_id, permission="grading.publish"):
    enabled()
    evaluation = await db.get(Evaluacion, evaluation_id, populate_existing=True)
    if not evaluation or evaluation.deleted_at is not None:
        raise HTTPException(404, "Evaluación no disponible.")
    subject = await db.get(Materia, evaluation.materia_id, populate_existing=True)
    if not subject:
        raise HTTPException(404, "Materia no disponible.")
    await authorize_owner(db, actor, evaluation, subject, permission)
    return evaluation


@dataclass
class AccessContext:
    access: FeedbackAccess
    publication: FeedbackPublication
    source: Source


async def guard_access(db, access: FeedbackAccess, *, generation: int | None = None) -> AccessContext:
    enabled()
    try:
        access = await db.scalar(select(FeedbackAccess).where(FeedbackAccess.id == access.id).execution_options(populate_existing=True))
        if access is None:
            raise HTTPException(404, UNAVAILABLE)
        if access.state != "active" or (generation is not None and generation != access.credential_generation):
            raise HTTPException(404, UNAVAILABLE)
        publication = await db.get(FeedbackPublication, access.publication_id, populate_existing=True)
        if publication is None or publication.state != "authorized" or publication.calificacion_id != access.calificacion_id:
            raise HTTPException(404, UNAVAILABLE)
        source = await load_source(db, publication.calificacion_id)
        # La autorización explícita más reciente puede ser de un administrador;
        # created_by sigue siendo procedencia, no el emisor de esa nueva revisión.
        owner = await db.get(User, publication.authorized_by, populate_existing=True)
        if owner is None:
            raise HTTPException(404, UNAVAILABLE)
        await authorize_teacher(db, owner, source)
        if (publication.estudiante_id != source.grade.estudiante_id or publication.evaluacion_id != source.grade.evaluacion_id
                or publication.materia_id != source.grade.materia_id or publication.content_fingerprint != source.projection.fingerprint):
            raise HTTPException(404, UNAVAILABLE)
        if await db_now(db) >= access.expires_at:
            raise HTTPException(404, UNAVAILABLE)
        return AccessContext(access, publication, source)
    except HTTPException:
        raise HTTPException(404, UNAVAILABLE) from None


async def guard_token(db, token: str) -> AccessContext:
    enabled()
    if not re.fullmatch(r"[A-Za-z0-9_-]{43}", token):
        raise HTTPException(404, UNAVAILABLE)
    access = await db.scalar(select(FeedbackAccess).where(FeedbackAccess.credential_digest == credential_digest(token)).execution_options(populate_existing=True))
    if access is None:
        raise HTTPException(404, UNAVAILABLE)
    return await guard_access(db, access)
