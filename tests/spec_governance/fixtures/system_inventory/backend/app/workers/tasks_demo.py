from app.workers.worker import celery_app

@celery_app.task(bind=True, name="tasks.demo")
def demo_task(self, item_id: str):
    return item_id