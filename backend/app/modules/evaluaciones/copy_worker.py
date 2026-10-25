"""Deterministic editorial copying on the document queue; no provider imports."""
import asyncio
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import text

from app.core.config import settings
from app.db.session import AsyncSessionLocal, engine
from app.modules.evaluaciones import copy_service as copying
from app.modules.jobs import service as jobs
from app.workers.worker import celery_app


async def run(job_id, token):
    async with AsyncSessionLocal() as db:
        if not await jobs.claim_job_running(db, job_id, claim_token=token):
            return {'status': 'not_claimed'}
        await jobs.update_job_progress(db, job_id, progreso=5, resultado_json={'claim_token': token, 'stage': 'copying'})
        await db.commit()
        try:
            evaluation_id = await copying.perform_copy(db, job_id, token)
            return {'evaluacion_id': str(evaluation_id)}
        except jobs.JobOwnershipLost:
            await db.rollback()
            return {'status': 'reclaimed_or_finished'}
        except Exception as exc:
            await db.rollback()
            try:
                # Do not remove staging being reused by a new lease owner, or
                # bytes referenced by an uncertain but successful SQL commit.
                await jobs.lock_owned_job(db, job_id, token)
                await copying.cleanup_failed_files(db, job_id)
                message = exc.detail if isinstance(exc, HTTPException) else 'No pudimos completar la copia. El original sigue intacto. Revisa su material antes de reintentar.'
                await jobs.finish_job(db, job_id, estado='requires_review', resultado_json={'claim_token': token}, error=str(message))
                await db.commit()
            except jobs.JobOwnershipLost:
                await db.rollback()
            return {'status': 'requires_review'}


async def isolated(operation):
    await engine.dispose(close=False)
    try:
        return await operation
    finally:
        await engine.dispose()


@celery_app.task(bind=True, name='tasks.copy_evaluation', soft_time_limit=110, time_limit=120)
def copy_evaluation(self, job_id):
    return asyncio.run(isolated(run(UUID(job_id), str(self.request.id))))


async def recover():
    async with AsyncSessionLocal() as db:
        await jobs.fail_exhausted_jobs(db, tipo=copying.JOB_TYPE, limit=30)
        rows = await jobs.claim_recoverable_jobs(db, tipo=copying.JOB_TYPE,
            queued_seconds=settings.AI_JOB_QUEUED_RECOVERY_SECONDS, limit=30)
        stale = list((await db.execute(text("SELECT id FROM ai_jobs WHERE tipo=:kind AND estado IN ('requires_review','failed','failed_permanent','cancelled') AND finished_at < NOW()-INTERVAL '5 minutes' AND COALESCE(resultado_json->>'_copy_cleaned','false')!='true' ORDER BY finished_at LIMIT 10 FOR UPDATE SKIP LOCKED"), {'kind': copying.JOB_TYPE})).scalars())
        for job_id in stale:
            await copying.cleanup_failed_files(db, job_id)
            await db.execute(text("UPDATE ai_jobs SET resultado_json=resultado_json || jsonb_build_object('_copy_cleaned',true) WHERE id=:id"), {'id': job_id})
        await db.commit()
    return {'recovered': sum(bool(jobs.dispatch_persisted_job(row)) for row in rows)}


@celery_app.task(name='tasks.recover_evaluation_copies')
def recover_evaluation_copies():
    return asyncio.run(isolated(recover()))
