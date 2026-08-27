from __future__ import annotations

import base64
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash
from app.modules.auth.models import PasswordResetRequest
from app.modules.users import service as user_service
from app.services.audit_service import audit
from app.modules.users.models import User
from app.shared.enums import UserEstado


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _selector(request_id: UUID) -> str:
    return base64.urlsafe_b64encode(request_id.bytes).decode("ascii").rstrip("=")


def _signature(request_id: UUID) -> str:
    digest = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        request_id.bytes,
        hashlib.sha256,
    ).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def build_reset_token(request_id: UUID) -> str:
    return f"{_selector(request_id)}.{_signature(request_id)}"


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def parse_reset_token(token: str) -> UUID:
    try:
        selector, provided_signature = token.split(".", 1)
        padded = selector + "=" * (-len(selector) % 4)
        request_id = UUID(bytes=base64.urlsafe_b64decode(padded.encode("ascii")))
    except (ValueError, TypeError) as exc:
        raise ValueError("invalid_reset_token") from exc
    if not hmac.compare_digest(_signature(request_id), provided_signature):
        raise ValueError("invalid_reset_token")
    return request_id


def fingerprint(value: str | None) -> str | None:
    if not value:
        return None
    return hashlib.sha256(
        f"{settings.SECRET_KEY}:{value}".encode("utf-8")
    ).hexdigest()


async def create_password_reset_request(
    db: AsyncSession,
    *,
    email: str,
    client_fingerprint: str | None,
) -> PasswordResetRequest | None:
    user = await user_service.get_user_by_email(db, email)
    if not user or user.estado != UserEstado.ACTIVO.value:
        return None

    # Serialize issuances per account. A second concurrent request observes the
    # first committed row and is throttled instead of leaving two valid links.
    user = await db.scalar(select(User).where(User.id == user.id).with_for_update())
    if not user or user.estado != UserEstado.ACTIVO.value:
        return None

    now = utcnow()
    cooldown = now - timedelta(seconds=settings.PASSWORD_RESET_EMAIL_COOLDOWN_SECONDS)
    recent = await db.scalar(
        select(PasswordResetRequest.id)
        .where(
            PasswordResetRequest.user_id == user.id,
            PasswordResetRequest.created_at >= cooldown,
        )
        .limit(1)
    )
    if recent:
        await audit(
            db,
            event="password_reset_limited",
            user_id=user.id,
            metadata={"reason": "account_cooldown"},
        )
        return None

    await db.execute(
        update(PasswordResetRequest)
        .where(
            PasswordResetRequest.user_id == user.id,
            PasswordResetRequest.consumed_at.is_(None),
            PasswordResetRequest.invalidated_at.is_(None),
        )
        .values(invalidated_at=now)
    )

    request = PasswordResetRequest(
        user_id=user.id,
        token_hash="pending",
        request_fingerprint=fingerprint(client_fingerprint),
        expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
    )
    db.add(request)
    await db.flush()
    request.token_hash = hash_reset_token(build_reset_token(request.id))
    await db.commit()
    await db.refresh(request)
    await audit(
        db,
        event="password_reset_created",
        user_id=user.id,
        metadata={"request_id": str(request.id)},
    )
    return request


async def validate_password_reset_token(
    db: AsyncSession,
    token: str,
    *,
    lock: bool = False,
) -> tuple[PasswordResetRequest, User]:
    request_id = parse_reset_token(token)
    query = select(PasswordResetRequest).where(PasswordResetRequest.id == request_id)
    if lock:
        query = query.with_for_update()
    request = await db.scalar(query)
    now = utcnow()
    if (
        request is None
        or not hmac.compare_digest(request.token_hash, hash_reset_token(token))
        or request.consumed_at is not None
        or request.invalidated_at is not None
        or request.expires_at <= now
    ):
        raise ValueError("invalid_reset_token")

    user = await db.get(User, request.user_id)
    if not user or user.estado != UserEstado.ACTIVO.value:
        raise ValueError("invalid_reset_token")
    return request, user


async def consume_password_reset_token(
    db: AsyncSession,
    *,
    token: str,
    password: str,
) -> User:
    request, user = await validate_password_reset_token(db, token, lock=True)
    now = utcnow()
    user.password_hash = get_password_hash(password)
    user.auth_version = int(user.auth_version or 1) + 1
    request.consumed_at = now
    await db.execute(
        update(PasswordResetRequest)
        .where(
            PasswordResetRequest.user_id == user.id,
            PasswordResetRequest.id != request.id,
            PasswordResetRequest.consumed_at.is_(None),
            PasswordResetRequest.invalidated_at.is_(None),
        )
        .values(invalidated_at=now)
    )
    await db.commit()
    await db.refresh(user)
    await audit(
        db,
        event="password_reset_consumed",
        user_id=user.id,
        metadata={"request_id": str(request.id)},
    )
    return user