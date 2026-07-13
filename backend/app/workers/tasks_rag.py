"""Tarea Celery: ingesta de fuentes RAG en background."""
from app.workers.worker import celery_app


@celery_app.task(bind=True, name="tasks.ingest_rag")
def ingest_rag(self, source_id: str) -> dict:
    self.update_state(state="PROGRESS", meta={"progreso": 0})
    return {"status": "queued", "source_id": source_id}
