"""Tarea Celery: exportación de reportes PDF/Excel en background."""
from app.workers.worker import celery_app


@celery_app.task(bind=True, name="tasks.export_report")
def export_report(self, materia_id: str, formato: str) -> dict:
    return {"status": "queued", "materia_id": materia_id, "formato": formato}
