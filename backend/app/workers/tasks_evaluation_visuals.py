"""Durable teacher-reviewed proposals on the presentation queue, not grading."""
import asyncio
from datetime import datetime, timedelta, timezone
from contextlib import suppress
from uuid import UUID

from sqlalchemy import select, text

from app.core.config import settings
from app.db.session import AsyncSessionLocal, engine
from app.modules.evaluaciones.models import EvaluacionRecurso
from app.modules.evaluaciones.visual_generation import generate_proposal_bytes, proposal_block
from app.modules.evaluaciones.visual_schemas import VisualProposalRequest, VisualUploadRequest
from app.modules.evaluaciones.visual_service import stage_resource
from app.modules.jobs import service as jobs
from app.modules.users.models import User
from app.workers.worker import celery_app


async def _heartbeat(job_id, token):
    while True:
        await asyncio.sleep(max(5, settings.AI_JOB_HEARTBEAT_SECONDS))
        async with AsyncSessionLocal() as db:
            renewed = await jobs.heartbeat_job(db, job_id, claim_token=token, stage='generating')
            await db.commit()
            if not renewed:
                return


async def _generate(job_id, token):
    async with AsyncSessionLocal() as db:
        if not await jobs.claim_job_running(db, job_id, claim_token=token):
            return {'status': 'not_claimed'}
        await db.commit()
        heartbeat = asyncio.create_task(_heartbeat(job_id, token))
        try:
            payload = await jobs.get_job_input(db, job_id)
            request = VisualProposalRequest.model_validate(payload['proposal'])
            owner = await db.scalar(text('SELECT user_id FROM ai_jobs WHERE id=:id'), {'id': job_id})
            user = await db.get(User, owner)
            if not settings.EVALUATION_VISUAL_GENERATION_ENABLED or user is None or user.estado != 'activo':
                raise ValueError('La generación ya no está habilitada para esta cuenta.')
            # Recheck ownership and version, without relying on HTTP-only permission hydration.
            from app.modules.materias.service import ensure_can_manage_materia
            from app.modules.evaluaciones.service import ensure_can_manage_evaluation
            from app.core.permissions import require_permission_now
            from app.modules.authorization.service import effective_permissions
            user._effective_permissions = await effective_permissions(db, user)
            require_permission_now(user, 'evaluations.update' if request.evaluacion_id else 'evaluations.create')
            subject = await ensure_can_manage_materia(db, request.materia_id, user)
            if request.evaluacion_id:
                evaluation = await ensure_can_manage_evaluation(db, request.evaluacion_id, user)
                if evaluation.materia_id != request.materia_id or evaluation.contenido_version_id != request.expected_version_id:
                    raise ValueError('La evaluación cambió. Abre su versión actual antes de crear otra propuesta.')
            resource = await db.scalar(select(EvaluacionRecurso).where(
                EvaluacionRecurso.propietario_id == subject.profesor_id,
                EvaluacionRecurso.request_key == request.request_key))
            table, chart = request.tabla, request.grafica
            if resource is None:
                await db.commit()  # Never retain a row lock during inference.
                config = payload.get('_ai_config') or {}
                content, table, chart = await generate_proposal_bytes(request, user_id=user.id, db=db,
                    ai_config=config.get('content' if request.tipo in {'tabla', 'grafica'} else 'image'))
                await jobs.lock_owned_job(db, job_id, token)  # Also rejects cancellation/late worker.
                resource = await stage_resource(db, propietario_id=subject.profesor_id,
                    request=VisualUploadRequest.model_validate(request.model_dump(include=set(VisualUploadRequest.model_fields))),
                    content=content, clase=('render_' + request.tipo if request.tipo in {'tabla', 'grafica'} else request.tipo),
                    origen='ia', job_id=job_id,
                    procedencia={'tabla': table.model_dump() if table else None, 'grafica': chart.model_dump() if chart else None})
                await db.commit()
            else:
                await jobs.lock_owned_job(db, job_id, token)
                expected_class = 'render_' + request.tipo if request.tipo in {'tabla', 'grafica'} else request.tipo
                if (resource.propietario_id != subject.profesor_id or resource.materia_id != request.materia_id
                        or resource.evaluacion_id != request.evaluacion_id or resource.borrador_id != request.borrador_id
                        or resource.job_id != job_id or resource.request_key != request.request_key
                        or resource.origen != 'ia' or resource.clase != expected_class):
                    raise ValueError('La propuesta guardada no corresponde a este trabajo.')
                from app.modules.evaluaciones.visual_service import read_resource_bytes, inspect_resource_bytes
                from app.modules.evaluaciones.visual_render import render_structured_visual
                from app.modules.evaluaciones.visual_schemas import VisualChart, VisualTable
                content = await read_resource_bytes(resource)
                await asyncio.to_thread(inspect_resource_bytes, content, clase=expected_class)
                table = VisualTable.model_validate(resource.procedencia_json['tabla']) if resource.procedencia_json.get('tabla') else None
                chart = VisualChart.model_validate(resource.procedencia_json['grafica']) if resource.procedencia_json.get('grafica') else None
                if request.tipo in {'tabla', 'grafica'}:
                    structured = table if request.tipo == 'tabla' else chart
                    if structured is None or content != await asyncio.to_thread(render_structured_visual, structured):
                        raise ValueError('Los datos no coinciden con la propuesta guardada.')
            block = proposal_block(request, resource.id, table=table, chart=chart)
            await jobs.lock_owned_job(db, job_id, token)
            await jobs.finish_job(db, job_id, estado='success', resultado_json={'claim_token': token,
                'bloque': block.model_dump(mode='json'), 'expected_version_id': str(request.expected_version_id) if request.expected_version_id else None,
                'mensaje': 'Propuesta lista para revisar. No se ha añadido ni publicado.'})
            await db.commit()
            return {'status': 'success'}
        except jobs.JobOwnershipLost:
            await db.rollback()
            return {'status': 'cancelled_or_reclaimed'}
        except Exception:
            await db.rollback()
            await jobs.finish_job(db, job_id, estado='requires_review', resultado_json={'claim_token': token},
                error='No pudimos completar esta propuesta. Tu evaluación sigue igual; comprueba la configuración de IA y los datos, reintenta o sube una imagen.')
            await db.commit()
            return {'status': 'requires_review'}
        finally:
            heartbeat.cancel()
            with suppress(asyncio.CancelledError):
                await heartbeat


async def _run(job_id, token):
    await engine.dispose(close=False)
    try:
        return await _generate(job_id, token)
    finally:
        await engine.dispose()


@celery_app.task(bind=True, name='tasks.generate_evaluation_visual')
def generate_evaluation_visual(self, job_id):
    return asyncio.run(_run(UUID(job_id), str(self.request.id)))


async def _recover():
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            await jobs.fail_exhausted_jobs(db, tipo='evaluacion_visual', limit=settings.AI_JOB_RECOVERY_BATCH_SIZE)
            rows = await jobs.claim_recoverable_jobs(db, tipo='evaluacion_visual',
                queued_seconds=settings.AI_JOB_QUEUED_RECOVERY_SECONDS, limit=settings.AI_JOB_RECOVERY_BATCH_SIZE)
            await db.commit()
        return sum(bool(jobs.dispatch_persisted_job(row)) for row in rows)
    finally:
        await engine.dispose()


@celery_app.task(name='tasks.recover_evaluation_visuals')
def recover_evaluation_visuals():
    return {'recovered': asyncio.run(_recover())}


async def _cleanup():
    from app.modules.evaluaciones.visual_service import cleanup_staged_resources
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            count = await cleanup_staged_resources(db, before=datetime.now(timezone.utc) - timedelta(days=7))
            await db.commit()
            return count
    finally:
        await engine.dispose()


@celery_app.task(name='tasks.cleanup_evaluation_visual_proposals')
def cleanup_evaluation_visual_proposals():
    return {'retired': asyncio.run(_cleanup())}
