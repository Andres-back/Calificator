from __future__ import annotations

import asyncio
from datetime import timedelta
from urllib.parse import quote
from uuid import UUID

from sqlalchemy import delete, select


from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal, engine
from app.modules.auth.models import PasswordResetRequest
from app.modules.auth.password_recovery_service import (
    build_reset_token,
    hash_reset_token,
    utcnow,
)
from app.modules.users.models import User
from app.services.mail_service import (
    get_effective_mail_config,
    password_reset_message,
    send_mail,
)
from app.workers.worker import celery_app

logger = get_logger(__name__)


async def _mark_failed(
    request_id: UUID,
    error_code: str,
) -> None:
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            request = await db.get(PasswordResetRequest, request_id)
            if request and request.delivery_status != "sent":
                request.delivery_status = "failed"
                request.delivery_error_code = error_code[:80]
                await db.commit()
    finally:
        await engine.dispose()


async def _send(request_id: UUID) -> dict[str, str | int]:
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            query = (
                select(PasswordResetRequest)
                .where(PasswordResetRequest.id == request_id)
                .with_for_update()
            )
            request = await db.scalar(query)
            now = utcnow()
            if request is None:
                return {"status": "ignored", "reason": "missing"}
            if request.delivery_status == "sent":
                return {"status": "sent", "attempts": request.delivery_attempts}
            if (
                request.consumed_at is not None
                or request.invalidated_at is not None
                or request.expires_at <= now
            ):
                return {"status": "ignored", "reason": "inactive"}

            token = build_reset_token(request.id)
            if hash_reset_token(token) != request.token_hash:
                request.delivery_status = "failed"
                request.delivery_error_code = "token_integrity"
                await db.commit()
                return {"status": "failed", "reason": "token_integrity"}

            user = await db.get(User, request.user_id)
            if user is None:
                return {"status": "ignored", "reason": "missing_user"}

            config, _stored = await get_effective_mail_config(db)
            if not config.configured:
                request.delivery_status = "failed"
                request.delivery_attempts += 1
                request.delivery_error_code = "smtp_not_configured"
                await db.commit()
                return {"status": "failed", "reason": "smtp_not_configured"}

            request.delivery_status = "sending"
            request.delivery_attempts += 1
            request.delivery_error_code = None
            await db.commit()

            reset_url = (
                f"{settings.PUBLIC_APP_URL.rstrip('/')}/restablecer-contrasena"
                f"?token={quote(token, safe='')}"
            )
            subject, text_body, html_body = password_reset_message(reset_url)
            await send_mail(
                config,
                recipient=user.email,
                subject=subject,
                text_body=text_body,
                html_body=html_body,
            )

            await db.refresh(request)
            request.delivery_status = "sent"
            request.sent_at = utcnow()
            request.delivery_error_code = None
            await db.commit()
            return {"status": "sent", "attempts": request.delivery_attempts}
    finally:
        await engine.dispose()


@celery_app.task(
    bind=True,
    name="tasks.send_password_reset_email",
    max_retries=2,
    default_retry_delay=20,
)
def send_password_reset_email(self, request_id: str) -> dict[str, str | int]:
    parsed_id = UUID(request_id)
    try:
        return asyncio.run(_send(parsed_id))
    except Exception as exc:
        error_code = type(exc).__name__
        logger.warning(
            "Password reset email delivery failed for request %s: %s",
            request_id,
            error_code,
        )
        try:
            asyncio.run(_mark_failed(parsed_id, error_code))
        except Exception:
            logger.exception("Could not persist password reset delivery failure")
        raise self.retry(exc=exc)


async def _cleanup() -> dict[str, int]:
    await engine.dispose(close=False)
    try:
        async with AsyncSessionLocal() as db:
            threshold = utcnow() - timedelta(days=30)
            result = await db.execute(
                delete(PasswordResetRequest).where(
                    PasswordResetRequest.created_at < threshold
                )
            )
            await db.commit()
            return {"deleted": int(result.rowcount or 0)}
    finally:
        await engine.dispose()


@celery_app.task(name="tasks.cleanup_password_reset_requests")
def cleanup_password_reset_requests() -> dict[str, int]:
    return asyncio.run(_cleanup())