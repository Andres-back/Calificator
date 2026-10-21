"""Operaciones docentes transaccionales, sin recalificar ni crear cuentas."""
from datetime import timedelta
import json
import secrets
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select, text

from app.modules.calificaciones.models import Calificacion
from app.modules.evaluaciones.models import Evaluacion
from app.modules.feedback_sharing.access_policy import authorize_owner, authorize_teacher, credential_digest, db_now, enabled, load_source
from app.modules.feedback_sharing.models import FeedbackAccess, FeedbackPublication
from app.modules.feedback_sharing.projection import digest
from app.modules.materias.models import Materia


async def audit_control(db, action: str, access_id: UUID, actor_id: UUID | None, metadata: dict | None = None):
    # Misma transacción; nunca usar el helper best-effort para estas decisiones.
    await db.execute(text("INSERT INTO audit_events (actor_id,event,entity_type,entity_id,metadata) VALUES (:actor,:event,'feedback_access',:id,CAST(:metadata AS jsonb))"), {"actor": actor_id, "event": f"feedback_{action}", "id": str(access_id), "metadata": json.dumps(metadata or {})})


async def preview_grade(db, actor, evaluation_id: UUID, grade_id: UUID):
    enabled()
    source = await load_source(db, grade_id)
    if source.evaluation.id != evaluation_id:
        raise HTTPException(403, "Este resultado no pertenece a la evaluación seleccionada.")
    await authorize_teacher(db, actor, source, "grading.read")
    return source.projection


async def new_publication(db, source, actor, evidence: bool):
    revision = (await db.scalar(select(func.max(FeedbackPublication.revision)).where(FeedbackPublication.calificacion_id == source.grade.id)) or 0) + 1
    publication = FeedbackPublication(
        calificacion_id=source.grade.id, estudiante_id=source.grade.estudiante_id,
        evaluacion_id=source.grade.evaluacion_id, materia_id=source.grade.materia_id,
        authorized_by=actor.id, breakdown_id=source.breakdown.id if source.breakdown else None,
        revision=revision, content_fingerprint=source.projection.fingerprint,
        payload_json=source.projection.payload, evidence_enabled=evidence,
    )
    db.add(publication)
    await db.flush()
    return publication


async def create_access(db, actor, evaluation_id: UUID, grade_id: UUID, fingerprint: str, request_id: UUID, days: int, evidence: bool):
    enabled()
    if type(days) is not int or not 1 <= days <= 30:
        raise HTTPException(422, "Elige una duración de 1 a 30 días.")
    source = await load_source(db, grade_id, lock=True)
    if source.evaluation.id != evaluation_id:
        raise HTTPException(403, "Este resultado no pertenece a la evaluación seleccionada.")
    await authorize_teacher(db, actor, source)
    if source.projection.fingerprint != fingerprint:
        raise HTTPException(409, "El resultado cambió. Actualiza la vista previa antes de compartir.")
    creation = digest([str(grade_id), fingerprint, days, evidence])
    existing = await db.scalar(select(FeedbackAccess).where(FeedbackAccess.created_by == actor.id, FeedbackAccess.creation_request_id == request_id, FeedbackAccess.calificacion_id == grade_id))
    if existing:
        if existing.operations_json.get("creation") != creation:
            raise HTTPException(409, "Esta solicitud ya se utilizó con otras opciones.")
        return existing, None
    publication = await new_publication(db, source, actor, evidence)
    token = secrets.token_urlsafe(32)
    now = await db_now(db)
    access = FeedbackAccess(publication_id=publication.id, calificacion_id=grade_id, created_by=actor.id, creation_request_id=request_id, credential_digest=credential_digest(token), expires_at=now + timedelta(days=days), created_at=now, updated_at=now, operations_json={"creation": creation})
    db.add(access)
    await db.flush()
    await audit_control(db, "created", access.id, actor.id, {"revision": publication.revision})
    return access, token


async def _lock_managed_access(db, actor, access_id):
    """Cerrar también una fuente suspendida, sin exigir proyección compartible."""
    enabled()
    grade_id = await db.scalar(select(FeedbackAccess.calificacion_id).where(FeedbackAccess.id == access_id))
    if grade_id is None:
        raise HTTPException(404, "Enlace no disponible.")
    grade = await db.scalar(select(Calificacion).where(Calificacion.id == grade_id).with_for_update().execution_options(populate_existing=True))
    if grade is None:
        raise HTTPException(404, "Resultado no disponible.")
    evaluation = await db.get(Evaluacion, grade.evaluacion_id, populate_existing=True)
    subject = await db.get(Materia, grade.materia_id, populate_existing=True)
    if not evaluation or not subject or evaluation.materia_id != subject.id:
        raise HTTPException(404, "Materia no disponible.")
    await authorize_owner(db, actor, evaluation, subject)
    # La nota raíz serializa cambios del puntero de publicación. El acceso se
    # vuelve a cargar después, siempre en orden nota -> publicación -> acceso.
    publication_id = await db.scalar(select(FeedbackAccess.publication_id).where(FeedbackAccess.id == access_id))
    publication = await db.scalar(select(FeedbackPublication).where(FeedbackPublication.id == publication_id).with_for_update().execution_options(populate_existing=True))
    access = await db.scalar(select(FeedbackAccess).where(FeedbackAccess.id == access_id).with_for_update().execution_options(populate_existing=True))
    if not access or not publication or access.calificacion_id != grade.id or publication.calificacion_id != grade.id:
        raise HTTPException(409, "El enlace cambió. Actualiza la lista.")
    return access, publication


async def manage_access(db, actor, access_id, action, payload):
    """Mutación optimista e idempotente; caller confirma antes de responder."""
    if action not in {"disable", "reactivate", "renew"}:
        raise ValueError("Unsupported feedback access operation")
    access, publication = await _lock_managed_access(db, actor, access_id)
    operation_key = str(payload.request_id)
    operation_digest = digest([action, payload.model_dump(mode="json")])
    operations = access.operations_json or {}
    previous = operations.get(operation_key)
    if previous is not None:
        if previous != operation_digest:
            raise HTTPException(409, "Esta solicitud ya se utilizó con otras opciones.")
        # No devolver credenciales ni volver a aplicar una vigencia al reintentar.
        return access, None
    if access.version != payload.expected_version:
        raise HTTPException(409, "El enlace cambió. Actualiza la lista antes de continuar.")
    token = None
    now = await db_now(db)
    metadata = {"revision": publication.revision}
    if action == "disable":
        access.state = "disabled"
        access.disabled_at = now
        event = "disabled"
    elif action == "renew":
        if not payload.confirmar_reemplazo:
            raise HTTPException(422, "Confirma que el enlace anterior dejará de funcionar.")
        token = secrets.token_urlsafe(32)
        access.credential_digest = credential_digest(token)
        access.credential_generation += 1
        metadata["generation"] = access.credential_generation
        event = "renewed"
    else:
        source = await load_source(db, access.calificacion_id)
        await authorize_teacher(db, actor, source)
        if source.projection.fingerprint != payload.fingerprint:
            raise HTTPException(409, "El resultado cambió. Actualiza la vista previa antes de reactivar.")
        # Cada autorización tiene snapshot propio. Nunca sustituir el contenido
        # de una revisión histórica ni permitir que un trabajo previo la use.
        replacement = await new_publication(db, source, actor, payload.evidencia)
        publication.state = "suspended"
        publication.suspended_at = now
        access.publication_id = replacement.id
        access.state = "active"
        access.disabled_at = None
        access.expires_at = now + timedelta(days=payload.duracion_dias)
        metadata["previous_revision"] = publication.revision
        metadata["revision"] = replacement.revision
        event = "reactivated"
    access.version += 1
    access.updated_at = now
    access.operations_json = {**operations, operation_key: operation_digest}
    await db.flush()
    await audit_control(db, event, access.id, actor.id, metadata)
    return access, token
