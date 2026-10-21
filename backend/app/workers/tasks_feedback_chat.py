"""Consumidor aislado de devoluciones; el broker solo transporta un UUID."""
import asyncio
from uuid import UUID

from app.core.config import settings
from app.db.session import AsyncSessionLocal, engine
from app.modules.feedback_sharing.chat_service import dispatch_question, recover_requests, run_request
from app.modules.feedback_sharing.retention import purge_expired_conversations
from app.workers.worker import celery_app


async def _execute(request_id):
    await engine.dispose(close=False)
    try:
        return await run_request(UUID(request_id))
    finally:
        await engine.dispose()


async def _recover():
    if not settings.FEEDBACK_SHARING_ENABLED:
        return {"pending": 0}
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            ids = await recover_requests(db)
            await db.commit()
        for request_id in ids:
            await dispatch_question(request_id)
        return {"pending": len(ids)}
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.feedback_question", ignore_result=True, max_retries=0, soft_time_limit=65, time_limit=75)
def feedback_question(request_id):
    return asyncio.run(_execute(request_id))


@celery_app.task(name="tasks.recover_feedback_questions", ignore_result=True)
def recover_feedback_questions():
    return asyncio.run(_recover())


async def _cleanup():
    if not settings.FEEDBACK_SHARING_ENABLED:
        return {"purged_texts": 0}
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            count = await purge_expired_conversations(db)
            await db.commit()
            return {"purged_texts": count}
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.cleanup_feedback_conversations", ignore_result=True)
def cleanup_feedback_conversations():
    return asyncio.run(_cleanup())
