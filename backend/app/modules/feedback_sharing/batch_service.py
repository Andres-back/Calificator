"""Recoverable teacher batch decisions; no provider calls or implicit links."""
import hashlib
from uuid import uuid4, uuid5

from fastapi import HTTPException
from sqlalchemy import select, text

from app.core.logging import get_logger
from app.modules.authorization.service import effective_permissions
from app.modules.calificaciones.service import confirm_grade_decision, publish_grade_decision
from app.modules.feedback_sharing.access_policy import authorize_evaluation, load_source, project_source
from app.modules.feedback_sharing.batch_policy import CONFIRMED, batch_score, source_fingerprint
from app.modules.feedback_sharing.models import FeedbackDeliveryBatch
from app.modules.feedback_sharing.projection import digest
from app.modules.feedback_sharing.schemas import DeliveryReviewInput
from app.modules.feedback_sharing.service import approve_delivery_review, audit_control

logger = get_logger(__name__)


async def _authorize(db, actor, evaluation_id):
    evaluation = await authorize_evaluation(db, actor, evaluation_id)
    if 'grading.grade' not in await effective_permissions(db, actor):
        raise HTTPException(403, 'No tienes permiso para aceptar y publicar estas notas.')
    return evaluation


async def read_batch(db, actor, evaluation_id, request_id):
    await _authorize(db, actor, evaluation_id)
    batch = await db.scalar(select(FeedbackDeliveryBatch).where(
        FeedbackDeliveryBatch.actor_id == actor.id,
        FeedbackDeliveryBatch.evaluacion_id == evaluation_id,
        FeedbackDeliveryBatch.request_id == request_id))
    if not batch:
        raise HTTPException(404, 'Todavía no hay un resultado confirmado para esta solicitud.')
    return batch.results_json


async def accept_publish_batch(db, actor, evaluation_id, payload):
    await _authorize(db, actor, evaluation_id)
    request = payload.model_dump(mode='json')
    request['selecciones'].sort(key=lambda item: item['calificacion_id'])
    fingerprint = digest(request)
    lock_key = int.from_bytes(hashlib.sha256(f'feedback-batch:{actor.id}:{evaluation_id}:{payload.request_id}'.encode()).digest()[:8], 'big', signed=True)
    await db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': lock_key})
    existing = await db.scalar(select(FeedbackDeliveryBatch).where(
        FeedbackDeliveryBatch.actor_id == actor.id,
        FeedbackDeliveryBatch.evaluacion_id == evaluation_id,
        FeedbackDeliveryBatch.request_id == payload.request_id))
    if existing:
        if existing.request_fingerprint != fingerprint:
            raise HTTPException(409, 'Esta solicitud ya se utilizó con otra selección o mensaje.')
        return existing.results_json
    batch = FeedbackDeliveryBatch(id=uuid4(), actor_id=actor.id, evaluacion_id=evaluation_id,
        request_id=payload.request_id, request_fingerprint=fingerprint, results_json={}, state='completed')
    db.add(batch)
    await db.flush()
    results = []
    for selection in sorted(payload.selecciones, key=lambda item: str(item.calificacion_id)):
        grade_id = str(selection.calificacion_id)
        try:
            async with db.begin_nested():
                source = await load_source(db, selection.calificacion_id, lock=True, prepare_only=True)
                if source.evaluation.id != evaluation_id:
                    raise HTTPException(403, 'Este resultado no pertenece a esta evaluación.')
                if source_fingerprint(source) != selection.source_fingerprint:
                    raise HTTPException(409, 'source_changed')
                score = batch_score(source.grade, source.evaluation)
                # Load the relationship explicitly before the legacy preflight;
                # never perform implicit asynchronous ORM IO from a property.
                await db.refresh(source.grade, ['entrega'])
                already = source.grade.estado == 'publicada'
                existing_projection = None
                if already:
                    try:
                        existing_projection = await project_source(db, source)
                    except HTTPException:
                        pass
                if source.grade.estado not in CONFIRMED:
                    await confirm_grade_decision(db, source.grade, source.evaluation, score, actor=actor)
                if not already:
                    await publish_grade_decision(db, source.grade, source.evaluation, actor=actor)
                await db.flush()
                source = await load_source(db, selection.calificacion_id, prepare_only=True)
                if existing_projection and existing_projection.payload['retroalimentacion'] == selection.feedback_text:
                    projection = existing_projection
                else:
                    projection = await approve_delivery_review(db, actor, evaluation_id, DeliveryReviewInput(
                        calificacion_id=selection.calificacion_id, source_fingerprint=source.source_fingerprint,
                        feedback_text=selection.feedback_text, scope=selection.scope,
                        request_id=uuid5(payload.request_id, grade_id)))
                results.append({'calificacion_id':grade_id, 'estado':'already_published' if already else 'published',
                    'estado_academico':'publicada', 'fingerprint':projection.fingerprint,
                    'etapas':{'confirmacion':True,'publicacion':True,'devolucion':True}})
        except HTTPException as exc:
            changed = exc.detail == 'source_changed'
            results.append({'calificacion_id':grade_id, 'estado':'failed',
                'code':'source_changed' if changed else 'needs_review',
                'error':'La nota o devolución cambió. Actualiza y revísala antes de aceptar.' if changed else str(exc.detail),
                'retryable':False})
        except Exception as exc:
            # Do not log exception repr/SQL parameters containing student data.
            logger.error('feedback_batch_item_failed', error_type=type(exc).__name__)
            results.append({'calificacion_id':grade_id,'estado':'failed','code':'unavailable',
                'error':'No pudimos completar este estudiante. Actualiza la lista y vuelve a intentarlo.', 'retryable':True})
    successes = sum(item['estado'] != 'failed' for item in results)
    batch.state = 'completed' if successes == len(results) else 'partial' if successes else 'failed'
    batch.results_json = {'id':str(batch.id), 'request_id':str(payload.request_id),
        'total':len(results), 'exitosos':successes, 'fallidos':len(results)-successes, 'resultados':results}
    await audit_control(db, 'batch_published', batch.id, actor.id,
        {'total':len(results),'successes':successes,'failures':len(results)-successes}, entity_type='feedback_delivery_batch')
    await db.flush()
    return batch.results_json
