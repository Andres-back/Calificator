"""Tarea Celery: calificación asíncrona en lote."""
from __future__ import annotations

from app.workers.worker import celery_app


@celery_app.task(bind=True, name="tasks.grade_batch")
def grade_batch(self, evaluacion_id: str, estudiante_ids: list[str]) -> dict:
    """
    Califica en lote un conjunto de entregas.
    Los resultados se guardan directamente en la BD.
    """
    self.update_state(state="PROGRESS", meta={"progreso": 0, "total": len(estudiante_ids)})
    # Implementación real requiere loop async; por ahora es stub
    return {"status": "queued", "evaluacion_id": evaluacion_id, "count": len(estudiante_ids)}
