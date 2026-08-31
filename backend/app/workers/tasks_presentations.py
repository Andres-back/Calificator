"""Tarea Celery: generacion asincrona de presentaciones."""

from __future__ import annotations

import asyncio
from uuid import UUID

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.presentaciones.service import generate_presentacion_assets
from app.modules.jobs import service as jobs_service
from app.db.session import AsyncSessionLocal, engine
from app.workers.worker import celery_app

logger = get_logger(__name__)


async def _run_and_dispose(presentation_uuid: UUID) -> str:
    """Ejecuta la generación y LIBERA el pool asyncpg al final.

    Cada task de Celery corre en un event loop nuevo (asyncio.run). Si el pool
    del engine conserva conexiones creadas en el loop de un task anterior, el
    siguiente task falla con "Future attached to a different loop". Disponer el
    engine al terminar deja el pool vacío para el próximo loop.
    """
    await engine.dispose(close=False)
    try:
        return await generate_presentacion_assets(presentation_uuid)
    finally:
        await engine.dispose()


@celery_app.task(bind=True, name="tasks.generate_presentation")
def generate_presentation(self, presentacion_id: str) -> dict:
    logger.info(
        "Presentation generation started by Celery",
        extra={"presentation_id": presentacion_id},
    )
    try:
        presentation_uuid = UUID(presentacion_id)
        self.update_state(state="PROGRESS", meta={"progreso": 10})
        status_value = asyncio.run(_run_and_dispose(presentation_uuid))
        self.update_state(
            state="PROGRESS",
            meta={
                "progreso": 25 if status_value == "waiting_connector" else 100,
                "estado": status_value,
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "Presentation generation failed in Celery",
            extra={"presentation_id": presentacion_id},
        )
        return {
            "status": "failed",
            "presentacion_id": presentacion_id,
            "error": str(exc)[:500],
        }

    logger.info(
        "Presentation generation finished by Celery",
        extra={"presentation_id": presentacion_id},
    )
    return {"status": status_value, "presentacion_id": presentacion_id}


async def _claim_stale_presentations() -> list[dict]:
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            rows = await jobs_service.claim_stale_queued_jobs(
                db,
                tipo="presentacion",
                stale_seconds=settings.AI_JOB_QUEUED_RECOVERY_SECONDS,
                limit=settings.AI_JOB_RECOVERY_BATCH_SIZE,
            )
            await db.commit()
            return rows
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.recover_stale_presentation_jobs")
def recover_stale_presentation_jobs() -> dict:
    rows = asyncio.run(_claim_stale_presentations())
    recovered = 0
    for row in rows:
        try:
            if jobs_service.dispatch_persisted_job(row):
                recovered += 1
        except Exception:  # noqa: BLE001
            logger.exception(
                "Could not republish stale presentation job",
                extra={"job_id": str(row.get("id"))},
            )
    return {"selected": len(rows), "recovered": recovered}
