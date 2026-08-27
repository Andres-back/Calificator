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
        "app.workers.tasks_deadlines",
        "app.workers.tasks_password_recovery",
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
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_cancel_long_running_tasks_on_connection_loss=False,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "assign-overdue-grades-every-minute": {
            "task": "tasks.assign_overdue_grades",
            "schedule": 60.0,
        },
        "cleanup-password-reset-requests": {
            "task": "tasks.cleanup_password_reset_requests",
            "schedule": 86400.0,
        },
        "recover-stale-grading-jobs": {
            "task": "tasks.recover_stale_grading_jobs",
            "schedule": float(settings.AI_JOB_RECOVERY_INTERVAL_SECONDS),
        },
    },
)


def main() -> None:
    celery_app.start()


if __name__ == "__main__":
    main()
