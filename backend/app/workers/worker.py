"""Celery worker principal de XCalificator."""
from celery import Celery

from app.core.config import settings
from app.db.base import import_models

import_models()

celery_app = Celery(
    "xcalificator",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.tasks_grading",
        "app.workers.tasks_presentations",
        "app.workers.tasks_rag",
        "app.workers.tasks_images",
        "app.workers.tasks_reports",
        "app.workers.tasks_ai_config",
        "app.workers.tasks_digitalization",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="America/Bogota",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
)


def main() -> None:
    celery_app.start()


if __name__ == "__main__":
    main()
