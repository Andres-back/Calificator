"""Tarea Celery: generación de imágenes en background."""
from app.workers.worker import celery_app


@celery_app.task(bind=True, name="tasks.generate_image")
def generate_image_task(self, prompt: str, image_type: str) -> dict:
    return {"status": "queued", "prompt": prompt[:80]}
