celery_app.conf.update(
    beat_schedule={
        "demo-periodic": {"task": "tasks.demo", "schedule": 60.0},
    }
)