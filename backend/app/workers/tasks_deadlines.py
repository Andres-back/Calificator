"""Materializa calificaciones de cero cuando vence una entrega."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.modules.calificaciones import service as calificaciones_service
from app.modules.evaluaciones.models import Evaluacion
from app.shared.enums import EvaluacionEstado
from app.workers.worker import celery_app


async def _assign_overdue_grades() -> int:
    async with AsyncSessionLocal() as db:
        evaluations = list(await db.scalars(
            select(Evaluacion).where(
                Evaluacion.deleted_at.is_(None),
                Evaluacion.fecha_limite_entrega.is_not(None),
                Evaluacion.fecha_limite_entrega <= datetime.now(timezone.utc),
                Evaluacion.estado != EvaluacionEstado.BORRADOR.value,
            )
        ))
        total = 0
        for evaluation in evaluations:
            created = await calificaciones_service.assign_overdue_zero_grades(db, evaluation)
            total += len(created)
        return total


@celery_app.task(name="tasks.assign_overdue_grades")
def assign_overdue_grades_task() -> dict[str, int]:
    return {"created": asyncio.run(_assign_overdue_grades())}
