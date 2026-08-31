"""Celery task that verifies the effective AI configuration in a worker."""

from __future__ import annotations

import asyncio

from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal, engine
from app.services.ai_config_service import AIConfigService
from app.modules.ollama_connector import service as connector_service
from app.modules.jobs import service as jobs_service
from app.workers.worker import celery_app

logger = get_logger(__name__)


async def _get_config_hash_and_dispose() -> str:
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            service = AIConfigService(db=db)
            await service.init()
            return await service.get_config_hash()
    finally:
        # A fork worker survives across tasks, but asyncio.run creates a loop
        # per task. Never leave asyncpg connections bound to the closed loop.
        await engine.dispose()


@celery_app.task(bind=True, name="tasks.get_ai_config_version")
def get_ai_config_version(self, _dummy: str = "") -> dict:
    """Return the effective configuration hash seen by this worker process."""
    try:
        hash_value = asyncio.run(_get_config_hash_and_dispose())
        return {"status": "ok", "config_hash": hash_value, "source": "worker"}
    except Exception as exc:
        logger.exception("Worker config version fetch failed")
        return {
            "status": "error",
            "error": str(exc)[:500],
            "config_hash": None,
            "source": "worker",
        }


async def _expire_local_jobs_and_dispose() -> list[dict]:
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            return await connector_service.expire_local_jobs(db)
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.recover_expired_local_jobs")
def recover_expired_local_jobs() -> dict:
    resumed = asyncio.run(_expire_local_jobs_and_dispose())
    dispatched = 0
    for job in resumed:
        try:
            if jobs_service.dispatch_persisted_job(job):
                dispatched += 1
        except Exception:  # noqa: BLE001
            logger.exception(
                "Could not republish expired local source job",
                extra={"source_job_id": str(job.get("id"))},
            )
    return {"resumed": len(resumed), "dispatched": dispatched}
