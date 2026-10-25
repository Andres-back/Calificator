"""Bounded deterministic jobs on the existing document queue, never grading."""

import asyncio
from contextlib import suppress
from uuid import UUID

from fastapi import HTTPException

from app.core.config import settings
from app.db.session import AsyncSessionLocal, engine
from app.modules.evaluaciones import print_preparation as printing
from app.modules.jobs import service as jobs
from app.workers.worker import celery_app


async def heartbeat(job_id, token):
    while True:
        await asyncio.sleep(max(5, settings.AI_JOB_HEARTBEAT_SECONDS))
        async with AsyncSessionLocal() as db:
            renewed = await jobs.heartbeat_job(
                db, job_id, claim_token=token, stage="preparing_print"
            )
            await db.commit()
            if not renewed:
                return


async def run(job_id, token):
    async with AsyncSessionLocal() as db:
        if not await jobs.claim_job_running(db, job_id, claim_token=token):
            return {"status": "not_claimed"}
        await db.commit()
        monitor = asyncio.create_task(heartbeat(job_id, token))
        try:
            return await printing.prepare_job(db, job_id, token)
        except jobs.JobOwnershipLost:
            await db.rollback()
            return {"status": "cancelled_or_reclaimed"}
        except Exception as exc:
            await db.rollback()
            message = (
                str(exc)
                if isinstance(exc, ValueError)
                else exc.detail
                if isinstance(exc, HTTPException)
                else "No pudimos preparar la impresión. Tu evaluación y tus ajustes siguen intactos; puedes reintentar."
            )
            await jobs.finish_job(
                db,
                job_id,
                estado="requires_review",
                resultado_json={"claim_token": token},
                error=message,
            )
            await db.commit()
            return {"status": "requires_review"}
        finally:
            monitor.cancel()
            with suppress(asyncio.CancelledError):
                await monitor


async def isolated(operation):
    await engine.dispose(close=False)
    try:
        return await operation
    finally:
        await engine.dispose()


@celery_app.task(
    bind=True,
    name="tasks.prepare_evaluation_print",
    soft_time_limit=110,
    time_limit=120,
)
def prepare_evaluation_print(self, job_id):
    return asyncio.run(isolated(run(UUID(job_id), str(self.request.id))))


async def recover():
    async with AsyncSessionLocal() as db:
        await jobs.fail_exhausted_jobs(db, tipo=printing.JOB_TYPE, limit=30)
        rows = await jobs.claim_recoverable_jobs(
            db,
            tipo=printing.JOB_TYPE,
            queued_seconds=settings.AI_JOB_QUEUED_RECOVERY_SECONDS,
            limit=30,
        )
        await printing.cleanup(db)
        await db.commit()
    return {"recovered": sum(bool(jobs.dispatch_persisted_job(row)) for row in rows)}


@celery_app.task(name="tasks.recover_evaluation_print")
def recover_evaluation_print():
    return asyncio.run(isolated(recover()))
