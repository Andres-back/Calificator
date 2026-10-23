"""Secure storage and runtime resolution for AI provider credentials."""
from __future__ import annotations

import base64
import hashlib
from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_ENCRYPTED_PREFIX = "enc:v1:"


def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_ai_secret(value: str) -> str:
    """Encrypt a non-empty credential before persisting it."""
    normalized = value.strip()
    if not normalized:
        raise ValueError("La credencial no puede estar vacia.")
    token = _fernet().encrypt(normalized.encode("utf-8")).decode("ascii")
    return f"{_ENCRYPTED_PREFIX}{token}"


def decrypt_ai_secret(value: str | None) -> str:
    """Decrypt current values and tolerate legacy plaintext rows.

    Legacy plaintext is accepted only for backwards compatibility. It is never
    returned by an API and is replaced by encrypted data on the next update.
    """
    if not value:
        return ""
    if not value.startswith(_ENCRYPTED_PREFIX):
        return value
    try:
        token = value.removeprefix(_ENCRYPTED_PREFIX)
        return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError, UnicodeDecodeError):
        logger.error("Stored AI credential could not be decrypted")
        return ""


@dataclass(frozen=True)
class EffectiveAICredentials:
    openai_key: str = ""
    groq_key: str = ""
    open_code_key: str = ""
    cloudflare_token: str = ""
    cloudflare_account_id: str = ""
    ollama_key: str = ""
    sources: dict[str, str] | None = None

    def source_for(self, provider: str) -> str:
        return (self.sources or {}).get(provider, "not_configured")

    def configured_for(self, provider: str) -> bool:
        if provider in {"openai", "openai_image", "openai_vision"}:
            return bool(self.openai_key)
        if provider in {"groq", "groq_vision"}:
            return bool(self.groq_key)
        if provider == "open_code":
            return bool(self.open_code_key)
        if provider in {"cloudflare", "cloudflare_image"}:
            return bool(self.cloudflare_token and self.cloudflare_account_id)
        if provider == "ollama":
            return bool(self.ollama_key)
        return provider == "template"


async def create_api_credential_revision(
    db: AsyncSession, *, provider_id: str, base_url: str, secret: str, actor_id: UUID | None,
) -> str:
    """Create a destination-bound revision without publishing it or revoking jobs."""
    await db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:provider))"), {"provider": "api_credential:" + provider_id})
    version = await db.scalar(text("SELECT COALESCE(MAX(version), 0) + 1 FROM ai_api_credentials WHERE provider_id=:provider"), {"provider": provider_id})
    identifier = str(uuid4())
    await db.execute(text(
        "INSERT INTO ai_api_credentials (id, provider_id, version, base_url, secret_encrypted, created_by) "
        "VALUES (:id, :provider, :version, :url, :secret, :actor)"
    ), {"id": identifier, "provider": provider_id, "version": version, "url": base_url.rstrip("/"),
        "secret": encrypt_ai_secret(secret), "actor": str(actor_id) if actor_id else None})
    return identifier


async def resolve_api_credential(db: AsyncSession, provider: dict[str, Any]) -> str:
    """Resolve exactly the revision captured in a job; never cross destinations."""
    revision = provider.get("credential_revision")
    if revision:
        row = (await db.execute(text(
            "SELECT secret_encrypted FROM ai_api_credentials WHERE id=:id AND provider_id=:provider "
            "AND base_url=:url AND revoked_at IS NULL"
        ), {"id": str(revision), "provider": provider.get("id") or provider.get("provider"),
            "url": str(provider.get("base_url") or "").rstrip("/")})).first()
        value = decrypt_ai_secret(row[0]) if row else ""
        if not value:
            raise ValueError("La revisión de credencial no está disponible para esta conexión.")
        return value
    credentials = await get_effective_ai_credentials(db)
    field = {"open_code": "open_code_key", "openai": "openai_key", "groq": "groq_key", "ollama": "ollama_key"}.get(str(provider.get("id") or provider.get("provider")))
    return str(getattr(credentials, field, "") or "") if field else ""


async def _read_database_credentials(db: AsyncSession) -> dict[str, Any]:
    try:
        result = await db.execute(text("SELECT * FROM ai_global_config ORDER BY created_at DESC LIMIT 1"))
        row = result.fetchone()
        return dict(row._mapping) if row else {}
    except Exception as exc:  # pragma: no cover - defensive fallback for partial deployments
        await db.rollback()
        logger.warning("AI credential database lookup failed; using environment fallback: %s", type(exc).__name__)
        return {}


async def get_effective_ai_credentials(db: AsyncSession | None = None) -> EffectiveAICredentials:
    """Resolve database credentials first and environment variables second."""
    owns_session = db is None
    if owns_session:
        from app.db.session import AsyncSessionLocal

        db = AsyncSessionLocal()

    assert db is not None
    try:
        stored = await _read_database_credentials(db)
    finally:
        if owns_session:
            await db.close()

    values = {
        "openai": decrypt_ai_secret(stored.get("openai_key_encrypted")),
        "groq": decrypt_ai_secret(stored.get("groq_key_encrypted")),
        "open_code": decrypt_ai_secret(stored.get("open_code_key_encrypted")),
        "cloudflare": decrypt_ai_secret(stored.get("cloudflare_token_encrypted")),
        "ollama": decrypt_ai_secret(stored.get("ollama_key_encrypted")),
    }
    environment = {
        "openai": getattr(settings, "OPENAI_API_KEY", ""),
        "groq": getattr(settings, "GROQ_API_KEY", ""),
        "open_code": getattr(settings, "OPEN_CODE_API_KEY", ""),
        "cloudflare": getattr(settings, "CLOUDFLARE_API_TOKEN", ""),
        "ollama": getattr(settings, "OLLAMA_API_KEY", ""),
    }
    resolved: dict[str, str] = {}
    sources: dict[str, str] = {}
    for provider in values:
        if values[provider]:
            resolved[provider] = values[provider]
            sources[provider] = "database"
        elif environment[provider]:
            resolved[provider] = environment[provider]
            sources[provider] = "environment"
        else:
            resolved[provider] = ""
            sources[provider] = "not_configured"

    account_id = str(stored.get("cloudflare_account_id") or getattr(settings, "CLOUDFLARE_ACCOUNT_ID", "") or "")
    if sources["cloudflare"] == "database" and not stored.get("cloudflare_account_id"):
        sources["cloudflare"] = "mixed" if getattr(settings, "CLOUDFLARE_ACCOUNT_ID", "") else "not_configured"
    elif sources["cloudflare"] == "environment" and stored.get("cloudflare_account_id"):
        sources["cloudflare"] = "mixed"

    return EffectiveAICredentials(
        openai_key=resolved["openai"],
        groq_key=resolved["groq"],
        open_code_key=resolved["open_code"],
        cloudflare_token=resolved["cloudflare"],
        cloudflare_account_id=account_id,
        ollama_key=resolved["ollama"],
        sources=sources,
    )

async def list_teacher_ai_credentials(db: AsyncSession, teacher_id: Any) -> list[dict[str, Any]]:
    """Return only masked metadata for credentials owned by one teacher."""
    result = await db.execute(
        text(
            "SELECT provider_id, last_four, last_test_status, last_test_latency_ms, last_test_at "
            "FROM profesor_ai_credentials WHERE profesor_id=:teacher AND active=true ORDER BY provider_id"
        ),
        {"teacher": str(teacher_id)},
    )
    return [
        {**dict(row._mapping), "configured": True}
        for row in result.fetchall()
    ]


async def upsert_teacher_ai_credential(
    db: AsyncSession,
    *,
    teacher_id: Any,
    provider_id: str,
    api_key: str,
    account_id: str | None = None,
) -> None:
    """Encrypt and atomically replace a teacher-owned provider credential."""
    normalized = api_key.strip()
    await db.execute(
        text(
            "INSERT INTO profesor_ai_credentials "
            "(profesor_id, provider_id, secret_encrypted, account_id_encrypted, last_four, active, updated_at) "
            "VALUES (:teacher, :provider, :secret, :account, :last_four, true, NOW()) "
            "ON CONFLICT (profesor_id, provider_id) DO UPDATE SET "
            "secret_encrypted=EXCLUDED.secret_encrypted, account_id_encrypted=EXCLUDED.account_id_encrypted, "
            "last_four=EXCLUDED.last_four, active=true, last_test_status=NULL, last_test_error_code=NULL, updated_at=NOW()"
        ),
        {
            "teacher": str(teacher_id),
            "provider": provider_id,
            "secret": encrypt_ai_secret(normalized),
            "account": encrypt_ai_secret(account_id) if account_id else None,
            "last_four": normalized[-4:] if len(normalized) >= 4 else normalized,
        },
    )


async def delete_teacher_ai_credential(db: AsyncSession, *, teacher_id: Any, provider_id: str) -> bool:
    result = await db.execute(
        text("DELETE FROM profesor_ai_credentials WHERE profesor_id=:teacher AND provider_id=:provider"),
        {"teacher": str(teacher_id), "provider": provider_id},
    )
    return bool(result.rowcount)


async def get_teacher_ai_credential(db: AsyncSession, *, teacher_id: Any, provider_id: str) -> str:
    value = await db.scalar(
        text(
            "SELECT secret_encrypted FROM profesor_ai_credentials "
            "WHERE profesor_id=:teacher AND provider_id=:provider AND active=true"
        ),
        {"teacher": str(teacher_id), "provider": provider_id},
    )
    return decrypt_ai_secret(str(value)) if value else ""
