from __future__ import annotations

import asyncio
import smtplib
import ssl
import time
from dataclasses import dataclass
from email.message import EmailMessage
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.auth.models import MailGlobalConfig
from app.services.ai_credentials_service import decrypt_ai_secret, encrypt_ai_secret


@dataclass(frozen=True)
class EffectiveMailConfig:
    host: str
    port: int
    use_starttls: bool
    username: str
    from_email: str
    password: str
    source: str

    @property
    def configured(self) -> bool:
        return bool(
            self.host
            and self.port
            and self.username
            and self.from_email
            and self.password
        )


async def get_effective_mail_config(
    db: AsyncSession,
) -> tuple[EffectiveMailConfig, MailGlobalConfig | None]:
    stored = await db.get(MailGlobalConfig, 1)
    if stored is not None:
        password = decrypt_ai_secret(stored.password_encrypted)
        return (
            EffectiveMailConfig(
                host=stored.host,
                port=stored.port,
                use_starttls=stored.use_starttls,
                username=stored.username,
                from_email=stored.from_email,
                password=password,
                source="database",
            ),
            stored,
        )

    return (
        EffectiveMailConfig(
            host=settings.SMTP_HOST.strip(),
            port=settings.SMTP_PORT,
            use_starttls=settings.SMTP_STARTTLS,
            username=settings.SMTP_USERNAME.strip(),
            from_email=settings.SMTP_FROM_EMAIL.strip(),
            password=settings.SMTP_PASSWORD.strip(),
            source="environment" if settings.SMTP_PASSWORD.strip() else "not_configured",
        ),
        None,
    )


async def save_mail_config(
    db: AsyncSession,
    *,
    host: str,
    port: int,
    use_starttls: bool,
    username: str,
    from_email: str,
    password: str | None,
    updated_by: UUID,
) -> MailGlobalConfig:
    stored = await db.get(MailGlobalConfig, 1)
    normalized_password = (password or "").strip()
    if stored is None and not normalized_password:
        raise ValueError("Debes ingresar la contraseña de aplicación la primera vez.")
    encrypted = (
        encrypt_ai_secret(normalized_password)
        if normalized_password
        else stored.password_encrypted
    )

    if stored is None:
        stored = MailGlobalConfig(
            id=1,
            host=host.strip(),
            port=port,
            use_starttls=use_starttls,
            username=username.strip(),
            from_email=from_email.strip(),
            password_encrypted=encrypted,
            updated_by=updated_by,
        )
        db.add(stored)
    else:
        stored.host = host.strip()
        stored.port = port
        stored.use_starttls = use_starttls
        stored.username = username.strip()
        stored.from_email = from_email.strip()
        stored.password_encrypted = encrypted
        stored.updated_by = updated_by
        stored.last_test_status = None
        stored.last_test_latency_ms = None
        stored.last_test_error_code = None
        stored.last_test_at = None
    await db.flush()
    return stored


def send_mail_sync(
    config: EffectiveMailConfig,
    *,
    recipient: str,
    subject: str,
    text_body: str,
    html_body: str,
) -> int:
    if not config.configured:
        raise RuntimeError("smtp_not_configured")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = config.from_email
    message["To"] = recipient
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    started = time.perf_counter()
    with smtplib.SMTP(config.host, config.port, timeout=20) as smtp:
        smtp.ehlo()
        if config.use_starttls:
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
        smtp.login(config.username, config.password)
        smtp.send_message(message)
    return round((time.perf_counter() - started) * 1000)


async def send_mail(
    config: EffectiveMailConfig,
    *,
    recipient: str,
    subject: str,
    text_body: str,
    html_body: str,
) -> int:
    return await asyncio.to_thread(
        send_mail_sync,
        config,
        recipient=recipient,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
    )


def password_reset_message(reset_url: str) -> tuple[str, str, str]:
    subject = "Restablece tu contraseña de XCalificator"
    text_body = (
        "Recibimos una solicitud para restablecer tu contraseña.\n\n"
        f"Abre este enlace durante los próximos {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutos:\n"
        f"{reset_url}\n\n"
        "Si no solicitaste el cambio, ignora este mensaje. Tu contraseña seguirá igual."
    )
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
      <h1 style="font-size:24px">Restablece tu contraseña</h1>
      <p>Recibimos una solicitud para cambiar la contraseña de tu cuenta de XCalificator.</p>
      <p style="margin:28px 0">
        <a href="{reset_url}" style="background:#4f46e5;color:white;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">
          Crear nueva contraseña
        </a>
      </p>
      <p>El enlace vence en {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutos y solo puede usarse una vez.</p>
      <p style="color:#667085;font-size:13px">Si no solicitaste el cambio, ignora este mensaje.</p>
    </div>
    """
    return subject, text_body, html_body