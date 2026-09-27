"""Trabajo recuperable para propuestas de criterios de aprendizaje."""
from __future__ import annotations

import asyncio
from contextlib import suppress
from uuid import UUID

from sqlalchemy import text

from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal, engine
from app.modules.criterios_aprendizaje import generation_service
from app.modules.jobs import service as jobs_service
from app.shared.enums import JobEstado, JobTipo
from app.workers.worker import celery_app


logger = get_logger(__name__)


async def _heartbeat(job_id: UUID, claim_token: str) -> None:
    while True:
        await asyncio.sleep(max(5, settings.AI_JOB_HEARTBEAT_SECONDS))
        async with AsyncSessionLocal() as db:
            renewed = await jobs_service.heartbeat_job(
                db, job_id, claim_token=claim_token, stage="criteria_generation"
            )
            await db.commit()
        if not renewed:
            return


async def _run(*, job_id: UUID, version_id: UUID, user_id: UUID, claim_token: str) -> dict:
    heartbeat: asyncio.Task | None = None
    async with AsyncSessionLocal() as db:
        claimed = await jobs_service.claim_job_running(db, job_id, claim_token=claim_token)
        await db.commit()
        if not claimed:
            return {"status": await jobs_service.get_job_state(db, job_id) or "duplicate"}
        heartbeat = asyncio.create_task(_heartbeat(job_id, claim_token))
        try:
            job_input = await jobs_service.get_job_input(db, job_id)
            ai_config = job_input.get("_ai_config") if isinstance(job_input.get("_ai_config"), dict) else {}
            await jobs_service.update_job_progress(
                db,
                job_id,
                progreso=10,
                resultado_json={"stage": "reading_sources", "claim_token": claim_token},
            )
            await db.commit()
            result = await generation_service.run_proposal(
                db,
                version_id=version_id,
                user_id=user_id,
                job_id=job_id,
                ai_config=ai_config,
            )
            result["claim_token"] = claim_token
            await jobs_service.finish_job(
                db, job_id, estado=JobEstado.SUCCESS.value, resultado_json=result
            )
            await db.commit()
            return result
        except Exception as exc:
            await db.rollback()
            attempts = int(
                await db.scalar(
                    text("SELECT attempt_count FROM ai_jobs WHERE id=CAST(:id AS uuid)"),
                    {"id": str(job_id)},
                )
                or 0
            )
            if generation_service.transient_generation_error(exc) and attempts < settings.AI_JOB_MAX_ATTEMPTS:
                result = {
                    "status": JobEstado.RETRYING.value,
                    "stage": "retrying",
                    "claim_token": claim_token,
                    "attempt_count": attempts,
                }
                released = await jobs_service.release_job_for_retry(
                    db,
                    job_id,
                    claim_token=claim_token,
                    resultado_json=result,
                    error=type(exc).__name__,
                    delay_seconds=min(30, max(2, 2 ** max(attempts, 1))),
                )
                await db.commit()
                if released:
                    return result
            code = str(exc) if str(exc).startswith("criteria_") else "criteria_generation_failed"
            await generation_service.mark_generation_failed(db, version_id=version_id, code=code)
            failure = {
                "status": JobEstado.FAILED.value,
                "stage": "failed",
                "error_code": code,
                "claim_token": claim_token,
            }
            await jobs_service.finish_job(
                db,
                job_id,
                estado=JobEstado.FAILED.value,
                resultado_json=failure,
                error=code,
            )
            await db.commit()
            return failure
        finally:
            if heartbeat:
                heartbeat.cancel()
                with suppress(asyncio.CancelledError):
                    await heartbeat


async def _run_and_dispose(**kwargs) -> dict:
    await engine.dispose(close=False)
    try:
        return await _run(**kwargs)
    finally:
        await engine.dispose()


@celery_app.task(bind=True, name="tasks.propose_learning_criteria")
def propose_learning_criteria(self, **kwargs) -> dict:
    result = asyncio.run(
        _run_and_dispose(
            job_id=UUID(kwargs["job_id"]),
            version_id=UUID(kwargs["version_id"]),
            user_id=UUID(kwargs["user_id"]),
            claim_token=str(self.request.id),
        )
    )
    if result.get("status") == JobEstado.RETRYING.value:
        attempts = int(result.get("attempt_count") or 1)
        propose_learning_criteria.apply_async(
            kwargs=kwargs,
            queue="criteria",
            countdown=min(30, max(2, 2 ** max(attempts, 1))),
        )
    return result


async def _claim_recoverable() -> tuple[list[dict], int]:
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            exhausted = await jobs_service.fail_exhausted_jobs(
                db,
                tipo=JobTipo.CRITERIOS_APRENDIZAJE.value,
                limit=settings.AI_JOB_RECOVERY_BATCH_SIZE,
            )
            rows = await jobs_service.claim_recoverable_jobs(
                db,
                tipo=JobTipo.CRITERIOS_APRENDIZAJE.value,
                queued_seconds=settings.AI_JOB_QUEUED_RECOVERY_SECONDS,
                limit=settings.AI_JOB_RECOVERY_BATCH_SIZE,
            )
            await db.commit()
            return rows, len(exhausted)
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.recover_stale_learning_criteria_jobs")
def recover_stale_learning_criteria_jobs() -> dict:
    rows, exhausted = asyncio.run(_claim_recoverable())
    recovered = sum(1 for row in rows if jobs_service.dispatch_persisted_job(row))
    return {"selected": len(rows), "recovered": recovered, "exhausted": exhausted}
