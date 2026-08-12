"""Tarea Celery: generacion asincrona de presentaciones."""

from __future__ import annotations

import asyncio
from uuid import UUID

from app.core.logging import get_logger
from app.modules.presentaciones.service import generate_presentacion_assets
from app.workers.worker import celery_app

logger = get_logger(__name__)


async def _run_and_dispose(presentation_uuid: UUID) -> None:
    """Ejecuta la generación y LIBERA el pool asyncpg al final.

    Cada task de Celery corre en un event loop nuevo (asyncio.run). Si el pool
    del engine conserva conexiones creadas en el loop de un task anterior, el
    siguiente task falla con "Future attached to a different loop". Disponer el
    engine al terminar deja el pool vacío para el próximo loop.
    """
    from app.db.session import engine

    await engine.dispose(close=False)
    try:
        await generate_presentacion_assets(presentation_uuid)
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
        asyncio.run(_run_and_dispose(presentation_uuid))
        self.update_state(state="PROGRESS", meta={"progreso": 100})
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
    return {"status": "success", "presentacion_id": presentacion_id}
