"""Operaciones docentes transaccionales, sin recalificar ni crear cuentas."""
from datetime import timedelta
import json
import secrets
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import func, select, text

from app.modules.calificaciones.models import Calificacion
from app.modules.evaluaciones.models import Evaluacion
from app.modules.feedback_sharing.access_policy import authorize_owner, authorize_teacher, credential_digest, db_now, enabled, guard_access, load_source, project_source
from app.modules.feedback_sharing.batch_policy import delivery_message
from app.modules.feedback_sharing.models import FeedbackAccess, FeedbackDeliveryReview, FeedbackPublication
from app.modules.feedback_sharing.projection import build_review_projection, confirmed_score, digest
from app.modules.feedback_sharing.credentials import seal_credential
from app.modules.materias.models import Materia


async def audit_control(db, action: str, access_id: UUID, actor_id: UUID | None, metadata: dict | None = None, *, entity_type: str = 'feedback_access'):
    # Misma transacción; nunca usar el helper best-effort para estas decisiones.
    await db.execute(text("INSERT INTO audit_events (actor_id,event,entity_type,entity_id,metadata) VALUES (:actor,:event,:entity_type,:id,CAST(:metadata AS jsonb))"), {"actor": actor_id, "event": f"feedback_{action}", "entity_type": entity_type, "id": str(access_id), "metadata": json.dumps(metadata or {})})


async def preview_grade(db, actor, evaluation_id: UUID, grade_id: UUID):
    enabled()
    source = await load_source(db, grade_id)
    if source.evaluation.id != evaluation_id:
        raise HTTPException(403, "Este resultado no pertenece a la evaluación seleccionada.")
    await authorize_teacher(db, actor, source, "grading.read")
    return source.projection


async def prepare_grade_preview(db, actor, evaluation_id, grade_id):
    enabled()
    source = await load_source(db, grade_id, prepare_only=True)
    if source.evaluation.id != evaluation_id:
        raise HTTPException(403, 'Este resultado no pertenece a la evaluación seleccionada.')
    await authorize_teacher(db, actor, source, 'grading.read')
    grade = source.grade
    processing = grade.estado in {'en_cola', 'procesando'}
    score = None if processing else grade.nota_confirmada if grade.nota_confirmada is not None else grade.nota_sugerida
    result = {'calificacion_id': grade.id, 'elegible': False, 'seleccionable': score is not None,
        'preparacion': 'needs_review', 'borrador_docente': {
            'estado': grade.estado, 'nota': str(score) if score is not None else None,
            'nota_maxima': str(source.evaluation.nota_maxima),
            'retroalimentacion': '' if processing else grade.feedback or '',
        }}
    try:
        projection = await project_source(db, source)
        result.update(elegible=True, preparacion='ready', fingerprint=projection.fingerprint, resultado=projection.payload)
    except HTTPException as exc:
        result['motivo'] = exc.detail
    try:
        note, _ = confirmed_score(grade, source.evaluation)
    except HTTPException:
        result['preparacion'] = 'no_grade'
    else:
        breakdown = source.breakdown
        result['revision_docente'] = {
            'source_fingerprint': source.source_fingerprint,
            'feedback_text': delivery_message((result.get('resultado') or {}).get('retroalimentacion', grade.feedback or '')),
            'detail_available': bool(breakdown and breakdown.cobertura_estado == 'completa'
                and not breakdown.requiere_revision and breakdown.nota_final == note),
        }
    from app.modules.feedback_sharing.batch_policy import prepare_candidate
    if score is not None and grade.estado != 'anulada':
        result['mensaje_editable'] = {'source_fingerprint': source.source_fingerprint,
            'feedback_text': delivery_message((result.get('resultado') or {}).get('retroalimentacion', grade.feedback or '')), 'detail_available': False}
    try:
        result['batch_candidate'] = prepare_candidate(source, result.get('resultado'))
    except HTTPException as exc:
        result['batch_unavailable_reason'] = exc.detail
    return result


async def save_feedback_message(db, actor, evaluation_id, payload):
    """Explicit text-only edit: never confirm a grade or authorize delivery."""
    enabled()
    source = await load_source(db, payload.calificacion_id, lock=True, prepare_only=True)
    if source.evaluation.id != evaluation_id:
        raise HTTPException(403, 'Este resultado no pertenece a la evaluación seleccionada.')
    await authorize_teacher(db, actor, source, 'grading.grade')
    previous = (await db.execute(text("SELECT metadata FROM audit_events WHERE actor_id=:actor AND entity_type='feedback_message' AND entity_id=:grade AND event='feedback_message_saved' AND metadata->>'request_id'=:request ORDER BY created_at DESC LIMIT 1"),
        {'actor': actor.id, 'grade': str(source.grade.id), 'request': str(payload.request_id)})).scalar_one_or_none()
    fingerprint = digest([payload.source_fingerprint, payload.feedback_text])
    if previous:
        if previous.get('fingerprint') != fingerprint or source.grade.feedback != payload.feedback_text:
            raise HTTPException(409, 'Hay un mensaje más reciente. Actualiza la devolución antes de guardar.')
        return await prepare_grade_preview(db, actor, evaluation_id, payload.calificacion_id)
    if source.source_fingerprint != payload.source_fingerprint:
        raise HTTPException(409, 'La devolución cambió. Actualízala antes de guardar tu mensaje.')
    if source.grade.estado in {'en_cola', 'procesando', 'anulada'}:
        raise HTTPException(409, 'Espera a que la nota esté disponible antes de editar el mensaje.')
    from app.modules.calificaciones.service import _append_timeline_event
    from app.modules.feedback_sharing.invalidations import suspend_grade_publications
    timeline = (source.grade.resultado_json or {}).get('_timeline', [])
    if not any(item.get('tipo') == 'retroalimentacion_original' for item in timeline):
        _append_timeline_event(source.grade, 'retroalimentacion_original', feedback=source.grade.feedback, detalle='Mensaje anterior a la primera edición de devolución')
    source.grade.feedback = payload.feedback_text
    _append_timeline_event(source.grade, 'retroalimentacion_editada', feedback=payload.feedback_text,
        actor_id=actor.id, actor_nombre=actor.nombre, detalle='Mensaje editado sin cambiar la nota ni autorizar su entrega')
    await suspend_grade_publications(db, source.grade.id)
    await audit_control(db, 'message_saved', source.grade.id, actor.id,
        {'request_id': str(payload.request_id), 'fingerprint': fingerprint}, entity_type='feedback_message')
    await db.flush()
    return await prepare_grade_preview(db, actor, evaluation_id, payload.calificacion_id)


async def approve_delivery_review(db, actor, evaluation_id, payload):
    """Store an immutable delivery decision, never change the academic grade."""
    enabled()
    source = await load_source(db, payload.calificacion_id, lock=True, prepare_only=True)
    if source.evaluation.id != evaluation_id:
        raise HTTPException(403, 'Este resultado no pertenece a la evaluación seleccionada.')
    await authorize_teacher(db, actor, source)
    if source.source_fingerprint != payload.source_fingerprint:
        raise HTTPException(409, 'La devolución cambió. Actualiza la lista y revísala antes de aprobar.')
    request_fingerprint = digest([payload.source_fingerprint, payload.scope, payload.feedback_text])
    previous = await db.scalar(select(FeedbackDeliveryReview).where(
        FeedbackDeliveryReview.calificacion_id == source.grade.id,
        FeedbackDeliveryReview.authorized_by == actor.id,
        FeedbackDeliveryReview.request_id == payload.request_id,
    ))
    if previous:
        if previous.request_fingerprint != request_fingerprint:
            raise HTTPException(409, 'Esta solicitud ya se utilizó con otra devolución.')
        projection = await project_source(db, source)
        expected = build_review_projection(source.grade, source.evaluation, source.student.nombre,
            source.subject.nombre, source.breakdown, previous, evidence_identity=source.evidence_identity)
        if projection.fingerprint != expected.fingerprint:
            raise HTTPException(409, 'Hay una revisión más reciente. Actualiza la lista.')
        return projection
    review = FeedbackDeliveryReview(id=uuid4(), calificacion_id=source.grade.id,
        authorized_by=actor.id, source_fingerprint=source.source_fingerprint,
        scope=payload.scope, feedback_text=payload.feedback_text,
        request_id=payload.request_id, request_fingerprint=request_fingerprint)
    projection = build_review_projection(source.grade, source.evaluation, source.student.nombre,
        source.subject.nombre, source.breakdown, review, evidence_identity=source.evidence_identity)
    from app.modules.feedback_sharing.invalidations import suspend_grade_publications
    await suspend_grade_publications(db, source.grade.id)
    db.add(review)
    await db.flush()
    await audit_control(db, 'delivery_reviewed', review.id, actor.id, {'scope': review.scope}, entity_type='feedback_delivery_review')
    return projection


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


async def create_access(db, actor, evaluation_id: UUID, grade_id: UUID, fingerprint: str, request_id: UUID, days: int, evidence: bool, *, solo_si_falta: bool = False):
    enabled()
    if type(days) is not int or not 1 <= days <= 30:
        raise HTTPException(422, "Elige una duración de 1 a 30 días.")
    source = await load_source(db, grade_id, lock=True)
    if source.evaluation.id != evaluation_id:
        raise HTTPException(403, "Este resultado no pertenece a la evaluación seleccionada.")
    await authorize_teacher(db, actor, source)
    if source.projection.fingerprint != fingerprint:
        raise HTTPException(409, "El resultado cambió. Actualiza la vista previa antes de compartir.")
    # Keep the legacy digest byte-for-byte when the optional guard is false.
    creation_values = [str(grade_id), fingerprint, days, evidence]
    creation = digest([*creation_values, True] if solo_si_falta else creation_values)
    existing = await db.scalar(select(FeedbackAccess).where(FeedbackAccess.created_by == actor.id, FeedbackAccess.creation_request_id == request_id, FeedbackAccess.calificacion_id == grade_id))
    if existing:
        if existing.operations_json.get("creation") != creation:
            raise HTTPException(409, "Esta solicitud ya se utilizó con otras opciones.")
        return existing, None
    # The grade lock above serializes both new credentials and receipts from
    # another device. Do not overwrite the original creation_request_id.
    accesses = list((await db.scalars(select(FeedbackAccess).where(
        FeedbackAccess.calificacion_id == grade_id,
    ).execution_options(populate_existing=True))).all())
    receipt_key = f'creation:{actor.id}:{request_id}'
    receipts = [access for access in accesses if receipt_key in (access.operations_json or {})]
    if receipts:
        if len(receipts) != 1 or receipts[0].operations_json[receipt_key] != creation:
            raise HTTPException(409, 'Esta solicitud ya se utilizó con otras opciones.')
        return receipts[0], None
    if solo_si_falta and accesses:
        now = await db_now(db)
        available = []
        for candidate in accesses:
            if candidate.state != 'active' or candidate.disabled_at is not None or candidate.expires_at <= now:
                continue
            try:
                context = await guard_access(db, candidate)
            except HTTPException:
                continue
            available.append((candidate, context.publication))
        if len(available) != 1:
            raise HTTPException(409, 'Revisa los enlaces existentes antes de generar otro. No se creó un enlace adicional.')
        access, publication = available[0]
        if publication.evidence_enabled != evidence:
            raise HTTPException(409, 'El enlace existente comparte otras opciones. Revísalo antes de generar otro.')
        # Duration only applies to missing links; reuse never moves expiry.
        access.operations_json = {**(access.operations_json or {}), receipt_key: creation}
        await db.flush()
        return access, None
    publication = await new_publication(db, source, actor, evidence)
    token = secrets.token_urlsafe(32)
    now = await db_now(db)
    access = FeedbackAccess(publication_id=publication.id, calificacion_id=grade_id, created_by=actor.id, creation_request_id=request_id, credential_digest=credential_digest(token), credential_encrypted=seal_credential(token), expires_at=now + timedelta(days=days), created_at=now, updated_at=now, operations_json={"creation": creation})
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
    operation_body = payload.model_dump(mode="json")
    if action == 'reactivate' and not payload.mantener_vencimiento:
        operation_body.pop('mantener_vencimiento', None)
    operation_digest = digest([action, operation_body])
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
        access.credential_encrypted = seal_credential(token)
        access.credential_generation += 1
        metadata["generation"] = access.credential_generation
        event = "renewed"
    else:
        if payload.mantener_vencimiento and (
            access.state != 'active' or access.disabled_at is not None
            or access.expires_at <= now or publication.state != 'suspended'
        ):
            raise HTTPException(409, 'Solo puedes conservar el vencimiento de un enlace vigente suspendido por cambios. Revisa sus opciones.')
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
        if not payload.mantener_vencimiento:
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
