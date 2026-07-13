"""Celery task that verifies the effective AI configuration in a worker."""
from __future__ import annotations

import asyncio

from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal, engine
from app.services.ai_config_service import AIConfigService
from app.workers.worker import celery_app

logger = get_logger(__name__)


async def _get_config_hash_and_dispose() -> str:
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
