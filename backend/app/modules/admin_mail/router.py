from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_roles
from app.db.session import get_db
from app.modules.admin_mail.schemas import (
    MailConfigRead,
    MailConfigUpdate,
    MailTestResult,
    PasswordRecoveryStatus,
)
from app.modules.auth.models import MailGlobalConfig, PasswordResetRequest
from app.modules.auth.password_recovery_service import utcnow
from app.modules.users.models import User
from app.services.mail_service import (
    get_effective_mail_config,
    save_mail_config,
    send_mail,
)
from app.shared.enums import UserRole

router = APIRouter(prefix="/admin/mail", tags=["admin_mail"])
_admin_only = require_roles(UserRole.ADMIN)


def _read_payload(
    config: object,
    stored: MailGlobalConfig | None,
) -> MailConfigRead:
    return MailConfigRead(
        host=config.host,
        port=config.port,
        use_starttls=config.use_starttls,
        username=config.username,
        from_email=config.from_email or None,
        configured=config.configured,
        has_password=bool(config.password),
        source=config.source,
        last_test_status=stored.last_test_status if stored else None,
        last_test_latency_ms=stored.last_test_latency_ms if stored else None,
        last_test_error_code=stored.last_test_error_code if stored else None,
        last_test_at=stored.last_test_at if stored else None,
    )


@router.get("/config", response_model=MailConfigRead)
async def read_mail_config(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(_admin_only),
) -> MailConfigRead:
    config, stored = await get_effective_mail_config(db)
    return _read_payload(config, stored)


@router.put("/config", response_model=MailConfigRead)
async def update_mail_config(
    payload: MailConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(_admin_only),
) -> MailConfigRead:
    try:
        await save_mail_config(
            db,
            host=payload.host,
            port=payload.port,
            use_starttls=payload.use_starttls,
            username=payload.username,
            from_email=str(payload.from_email),
            password=payload.password.get_secret_value() if payload.password else None,
            updated_by=current_user.id,
        )
        await db.commit()
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    config, stored = await get_effective_mail_config(db)
    return _read_payload(config, stored)


@router.post("/test", response_model=MailTestResult)
async def test_mail_config(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(_admin_only),
) -> MailTestResult:
    config, stored = await get_effective_mail_config(db)
    if not config.configured:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Configura primero el servidor y la contraseña de aplicación.",
        )
    if stored is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Guarda la configuración antes de probarla.",
        )

    try:
        latency = await send_mail(
            config,
            recipient=config.from_email,
            subject="Prueba de correo de XCalificator",
            text_body="La configuración SMTP funciona correctamente.",
            html_body=(
                "<div style='font-family:Arial,sans-serif'>"
                "<h2>Configuración correcta</h2>"
                "<p>XCalificator puede enviar correos de recuperación.</p></div>"
            ),
        )
        stored.last_test_status = "success"
        stored.last_test_latency_ms = latency
        stored.last_test_error_code = None
        stored.last_test_at = utcnow()
        await db.commit()
        return MailTestResult(
            status="success",
            detail=f"Correo de prueba enviado a {config.from_email}.",
            latency_ms=latency,
        )
    except Exception as exc:
        error_code = type(exc).__name__
        stored.last_test_status = "error"
        stored.last_test_latency_ms = None
        stored.last_test_error_code = error_code[:80]
        stored.last_test_at = utcnow()
        await db.commit()
        return MailTestResult(
            status="error",
            detail="No fue posible enviar el correo. Revisa servidor, puerto y credenciales.",
            error_code=error_code,
        )


@router.get("/recovery-status", response_model=PasswordRecoveryStatus)
async def password_recovery_status(
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(_admin_only),
) -> PasswordRecoveryStatus:
    since = utcnow() - timedelta(hours=24)
    pending = await db.scalar(
        select(func.count(PasswordResetRequest.id)).where(
            PasswordResetRequest.delivery_status.in_(("pending", "sending")),
            PasswordResetRequest.expires_at > utcnow(),
        )
    )
    sent = await db.scalar(
        select(func.count(PasswordResetRequest.id)).where(
            PasswordResetRequest.delivery_status == "sent",
            PasswordResetRequest.created_at >= since,
        )
    )
    failed = await db.scalar(
        select(func.count(PasswordResetRequest.id)).where(
            PasswordResetRequest.delivery_status == "failed",
            PasswordResetRequest.created_at >= since,
        )
    )
    return PasswordRecoveryStatus(
        pending=int(pending or 0),
        sent_last_24h=int(sent or 0),
        failed_last_24h=int(failed or 0),
    )
