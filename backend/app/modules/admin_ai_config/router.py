from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.services.ai_credentials_service import (
    EffectiveAICredentials,
    encrypt_ai_secret,
    get_effective_ai_credentials,
)
from app.services.ai_config_service import AIConfigService
from app.modules.admin_ai_config.schemas import (
    AIProvider,
    AIProviderTestResponse,
    AIProviderUpdate,
    AISettingsRead,
    FeatureRouting,
    GlobalAIConfigRead,
    GlobalAIConfigUpdate,
    ProfesorAIConfigUpdate,
    UsageStatsRead,
)
from app.modules.users.models import User
from app.shared.enums import UserRole

logger = get_logger(__name__)

router = APIRouter(tags=["admin_ai_config"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _global_config_payload(
    stored: dict[str, Any],
    credentials: EffectiveAICredentials,
) -> dict[str, Any]:
    return {
        "modelo_llm_default": stored.get("modelo_llm_default"),
        "has_openai_key": credentials.configured_for("openai"),
        "has_cloudflare": credentials.configured_for("cloudflare"),
        "has_groq_key": credentials.configured_for("groq"),
        "has_open_code_key": credentials.configured_for("open_code"),
        "cloudflare_account_id": credentials.cloudflare_account_id or None,
        "credential_sources": credentials.sources or {},
    }


def _provider_list() -> list[dict[str, Any]]:
    """Lista maestra de proveedores con su config actual desde settings/env."""
    return [
        {
            "name": "open_code",
            "label": "OpenCode",
            "base_url": settings.OPEN_CODE_BASE_URL,
            "model": settings.OPEN_CODE_MODEL,
            "priority": 1,
            "timeout_seconds": settings.OPEN_CODE_TIMEOUT_SECONDS,
            "max_retries": 2,
            "auth_configured": bool(settings.OPEN_CODE_API_KEY),
        },
        {
            "name": "groq",
            "label": "Groq",
            "base_url": "https://api.groq.com/openai/v1",
            "model": settings.GROQ_MODEL,
            "priority": 2,
            "timeout_seconds": settings.GROQ_TIMEOUT_SECONDS,
            "max_retries": 2,
            "auth_configured": bool(settings.GROQ_API_KEY),
        },
        {
            "name": "ollama",
            "label": "Ollama",
            "base_url": settings.OLLAMA_ENDPOINT,
            "model": settings.OLLAMA_MODEL,
            "priority": 3,
            "timeout_seconds": settings.OLLAMA_TIMEOUT_SECONDS,
            "max_retries": 1,
            "auth_configured": True,
        },
        {
            "name": "template",
            "label": "Fallback por plantilla",
            "base_url": None,
            "model": None,
            "priority": 4,
            "timeout_seconds": 5,
            "max_retries": 0,
            "auth_configured": True,
        },
        {
            "name": "openai_image",
            "label": "OpenAI Imágenes",
            "base_url": "https://api.openai.com/v1",
            "model": settings.OPENAI_IMAGE_MODEL,
            "priority": 1,
            "timeout_seconds": settings.OPENAI_IMAGE_TIMEOUT_SECONDS,
            "max_retries": 2,
            "auth_configured": bool(settings.OPENAI_API_KEY),
        },
        {
            "name": "cloudflare_image",
            "label": "Cloudflare Images",
            "base_url": None,
            "model": settings.CLOUDFLARE_IMAGE_MODEL,
            "priority": 2,
            "timeout_seconds": settings.CLOUDFLARE_TIMEOUT_SECONDS,
            "max_retries": 1,
            "auth_configured": bool(settings.CLOUDFLARE_API_TOKEN),
        },
    ]


def _feature_routing() -> list[dict[str, Any]]:
    """Lista de funcionalidades y su ruteo por defecto."""
    return [
        {"feature": "xali", "label": "Chatbot Xali", "primary_provider": "groq", "fallback_provider": "template"},
        {"feature": "grading_text", "label": "Calificación de texto", "primary_provider": "groq", "fallback_provider": "template"},
        {"feature": "grading_photo", "label": "Calificación por foto", "primary_provider": "groq", "fallback_provider": "template"},
        {"feature": "feedback", "label": "Generación de retroalimentación", "primary_provider": "groq", "fallback_provider": "template"},
        {"feature": "questions", "label": "Generación de preguntas", "primary_provider": "groq", "fallback_provider": "template"},
        {"feature": "tools", "label": "Herramientas educativas", "primary_provider": "groq", "fallback_provider": "template"},
        {"feature": "presentations", "label": "Presentaciones", "primary_provider": "groq", "fallback_provider": "template"},
        {"feature": "images", "label": "Generación de imágenes", "primary_provider": "openai_image", "fallback_provider": "cloudflare_image"},
        {"feature": "rag", "label": "RAG", "primary_provider": "openai", "fallback_provider": None},
        {"feature": "embeddings", "label": "Embeddings", "primary_provider": "openai", "fallback_provider": None},
        {"feature": "vision", "label": "Visión/OCR", "primary_provider": "groq", "fallback_provider": "template"},
    ]


async def _test_provider_connection(
    provider: str,
    credentials: EffectiveAICredentials,
    provider_config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run a credential check without generating billable content."""
    result = {"status": "unknown", "latency_ms": None, "http_code": None, "error": None}
    start = datetime.now(timezone.utc)
    provider_config = provider_config or {}

    try:
        if provider == "open_code":
            if not credentials.open_code_key:
                raise ValueError("OpenCode no tiene una credencial configurada")
            base_url = str(provider_config.get("base_url") or settings.OPEN_CODE_BASE_URL).rstrip("/")
            headers = {"Authorization": f"Bearer {credentials.open_code_key}"}
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get(f"{base_url}/models", headers=headers)
            elapsed = (datetime.now(timezone.utc) - start).total_seconds() * 1000
            result["status"] = "ok" if r.status_code == 200 else "error"
            result["http_code"] = r.status_code
            result["latency_ms"] = int(elapsed)
            if r.status_code != 200:
                result["error"] = r.text[:200]

        elif provider == "groq":
            if not credentials.groq_key:
                raise ValueError("Groq no tiene una credencial configurada")
            headers = {"Authorization": f"Bearer {credentials.groq_key}"}
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get("https://api.groq.com/openai/v1/models", headers=headers)
            elapsed = (datetime.now(timezone.utc) - start).total_seconds() * 1000
            result["status"] = "ok" if r.status_code == 200 else "error"
            result["http_code"] = r.status_code
            result["latency_ms"] = int(elapsed)
            if r.status_code != 200:
                result["error"] = r.text[:200]

        elif provider == "ollama":
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get(f"{settings.OLLAMA_ENDPOINT}/api/tags")
            elapsed = (datetime.now(timezone.utc) - start).total_seconds() * 1000
            result["status"] = "ok" if r.status_code == 200 else "error"
            result["http_code"] = r.status_code
            result["latency_ms"] = int(elapsed)
            if r.status_code != 200:
                result["error"] = r.text[:200]

        elif provider == "openai_image":
            if not credentials.openai_key:
                raise ValueError("OpenAI no tiene una credencial configurada")
            # Listing models validates auth and does not generate a billable image.
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {credentials.openai_key}"})
            elapsed = (datetime.now(timezone.utc) - start).total_seconds() * 1000
            result["status"] = "ok" if r.status_code == 200 else "error"
            result["http_code"] = r.status_code
            result["latency_ms"] = int(elapsed)
            if r.status_code != 200:
                result["error"] = r.text[:200]

        elif provider == "cloudflare_image":
            if credentials.cloudflare_token and credentials.cloudflare_account_id:
                headers = {"Authorization": f"Bearer {credentials.cloudflare_token}"}
                async with httpx.AsyncClient(timeout=10) as c:
                    r = await c.get(f"https://api.cloudflare.com/client/v4/accounts/{credentials.cloudflare_account_id}/ai/models", headers=headers)
                elapsed = (datetime.now(timezone.utc) - start).total_seconds() * 1000
                result["status"] = "ok" if r.status_code == 200 else "error"
                result["http_code"] = r.status_code
                result["latency_ms"] = int(elapsed)
                if r.status_code != 200:
                    result["error"] = r.text[:200]
            else:
                result["status"] = "error"
                result["error"] = "Cloudflare no configurado (token o account_id faltante)"

        elif provider == "template":
            result["status"] = "ok"
            result["latency_ms"] = 0
            result["http_code"] = 200

    except httpx.TimeoutException:
        elapsed = (datetime.now(timezone.utc) - start).total_seconds() * 1000
        result["status"] = "error"
        result["latency_ms"] = int(elapsed)
        result["error"] = "Timeout de conexión"
    except Exception as exc:
        elapsed = (datetime.now(timezone.utc) - start).total_seconds() * 1000
        result["status"] = "error"
        result["latency_ms"] = int(elapsed)
        result["error"] = str(exc)[:200]

    return result


# ── Config global ─────────────────────────────────────────────────────────────

@router.get("/admin/ai-config", response_model=GlobalAIConfigRead)
async def get_global_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    row = await db.execute(text("SELECT * FROM ai_global_config ORDER BY created_at DESC LIMIT 1"))
    stored_row = row.fetchone()
    stored = dict(stored_row._mapping) if stored_row else {}
    credentials = await get_effective_ai_credentials(db)
    return _global_config_payload(stored, credentials)


@router.patch("/admin/ai-config")
async def update_global_config(
    payload: GlobalAIConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    existing = await db.execute(text("SELECT id FROM ai_global_config LIMIT 1"))
    row = existing.fetchone()
    secret_mapping = {
        "openai_key": "openai_key_encrypted",
        "groq_key": "groq_key_encrypted",
        "cloudflare_token": "cloudflare_token_encrypted",
        "open_code_key": "open_code_key_encrypted",
    }
    clear_mapping = {
        "openai_key": payload.clear_openai_key,
        "groq_key": payload.clear_groq_key,
        "cloudflare_token": payload.clear_cloudflare_token,
        "open_code_key": payload.clear_open_code_key,
    }
    updates: dict[str, Any] = {}
    provided_fields = payload.model_fields_set
    for field, column in secret_mapping.items():
        if clear_mapping[field]:
            updates[column] = None
            continue
        if field in provided_fields:
            secret = getattr(payload, field)
            if secret is not None:
                updates[column] = encrypt_ai_secret(secret.get_secret_value())

    if payload.clear_cloudflare_account_id:
        updates["cloudflare_account_id"] = None
    elif "cloudflare_account_id" in provided_fields:
        updates["cloudflare_account_id"] = payload.cloudflare_account_id

    if "modelo_llm_default" in provided_fields:
        updates["modelo_llm_default"] = payload.modelo_llm_default

    if not updates:
        return {"status": "unchanged"}

    if row:
        params = {"id": str(row.id), **updates}
        assignments = [f"{column}=:{column}" for column in updates]
        await db.execute(
            text(f"UPDATE ai_global_config SET {', '.join(assignments)}, updated_at=NOW() WHERE id=:id"),
            params,
        )
    else:
        insert_cols = ", ".join(updates)
        insert_vals = ", ".join(f":{column}" for column in updates)
        await db.execute(text(f"INSERT INTO ai_global_config ({insert_cols}) VALUES ({insert_vals})"), updates)
    await db.commit()
    logger.info(
        "Admin AI credentials updated",
        extra={"admin_id": str(current_user.id), "fields": sorted(updates)},
    )
    return {"status": "updated"}


@router.get("/admin/ai-settings", response_model=AISettingsRead)
async def get_full_ai_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the effective persisted IA configuration plus non-sensitive runtime status."""
    require_role(current_user, [UserRole.ADMIN])
    svc = AIConfigService(db=db)
    await svc.init()
    credentials = await get_effective_ai_credentials(db)

    persisted_providers = await svc.get_all_providers()

    # Latest failures are runtime telemetry only. Provider model, priority and
    # enabled state always come from the persisted configuration used by routing.
    last_errors: dict[str, dict[str, Any]] = {}
    try:
        test_rows = await db.execute(
            text("SELECT provider, error, created_at FROM ai_usage_logs WHERE success=false AND provider IS NOT NULL ORDER BY created_at DESC LIMIT 50")
        )
        for row in test_rows:
            provider_id = row.provider
            if provider_id and provider_id not in last_errors:
                last_errors[provider_id] = {
                    "error": row.error,
                    "at": str(row.created_at)[:19] if row.created_at else None,
                }
    except Exception:
        await db.rollback()

    providers: list[dict[str, Any]] = []
    for persisted in persisted_providers:
        provider_id = str(persisted["id"])
        error_info = last_errors.get(provider_id, {})
        providers.append({
            **persisted,
            # Keep name for legacy frontend consumers while exposing the real id.
            "id": provider_id,
            "name": provider_id,
            "tipo": persisted.get("tipo", "imagen" if "image" in provider_id else "texto"),
            "auth_configured": credentials.configured_for(provider_id),
            "last_test_status": "error" if error_info else None,
            "last_test_error": error_info.get("error"),
            "last_test_at": error_info.get("at"),
        })

    features = await svc.get_all_features()

    totals = await db.execute(
        text("SELECT COUNT(*) as total_calls, COALESCE(SUM(tokens_input),0) as tokens_in, COALESCE(SUM(tokens_output),0) as tokens_out, COALESCE(SUM(costo_estimado),0) as total_cost FROM ai_usage_logs")
    )
    total_row = totals.fetchone()
    by_provider = await db.execute(
        text("SELECT provider, COUNT(*) as calls, COALESCE(SUM(costo_estimado),0) as cost FROM ai_usage_logs GROUP BY provider ORDER BY calls DESC")
    )

    cfg_row = await db.execute(text("SELECT * FROM ai_global_config ORDER BY created_at DESC LIMIT 1"))
    cfg = cfg_row.fetchone()
    cfg_mapping = dict(cfg._mapping) if cfg else {}
    global_config = _global_config_payload(cfg_mapping, credentials)

    return {
        "providers": providers,
        "features": features,
        "global_config": global_config,
        "usage": {
            "total_calls": total_row.total_calls,
            "total_tokens_input": total_row.tokens_in,
            "total_tokens_output": total_row.tokens_out,
            "total_cost": float(total_row.total_cost),
            "by_provider": [
                {"provider": row.provider, "calls": row.calls, "cost": float(row.cost)}
                for row in by_provider
            ],
        },
    }

@router.post("/admin/ai-providers/{provider}/test", response_model=AIProviderTestResponse)
async def test_provider(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Prueba la conexión con un proveedor de IA específico."""
    require_role(current_user, [UserRole.ADMIN])
    valid_providers = {p["name"] for p in _provider_list()}
    if provider not in valid_providers:
        return {"status": "error", "detail": f"Proveedor desconocido: {provider}"}

    credentials = await get_effective_ai_credentials(db)
    svc = AIConfigService(db=db)
    provider_config = next(
        (item for item in await svc.get_all_providers() if item.get("id") == provider),
        None,
    )
    result = await _test_provider_connection(provider, credentials, provider_config)
    return {
        "status": result["status"],
        "latency_ms": result["latency_ms"],
        "http_code": result["http_code"],
        "error": result["error"],
        "detail": _test_detail_message(result, provider),
    }


def _test_detail_message(result: dict, provider: str) -> str:
    if result["status"] == "ok":
        return f"Conexión exitosa ({result['latency_ms']}ms)"
    if result["error"]:
        return f"Error: {result['error'][:150]}"
    return "Error desconocido"


@router.get("/admin/ai-usage")
async def get_usage_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    totals = await db.execute(
        text("SELECT COUNT(*) as total_calls, COALESCE(SUM(tokens_input),0) as tokens_in, COALESCE(SUM(tokens_output),0) as tokens_out, COALESCE(SUM(costo_estimado),0) as total_cost FROM ai_usage_logs")
    )
    t = totals.fetchone()
    by_provider = await db.execute(
        text("SELECT provider, COUNT(*) as calls, COALESCE(SUM(costo_estimado),0) as cost FROM ai_usage_logs GROUP BY provider ORDER BY calls DESC")
    )
    return {
        "total_calls": t.total_calls,
        "total_tokens_input": t.tokens_in,
        "total_tokens_output": t.tokens_out,
        "total_cost": float(t.total_cost),
        "by_provider": [{"provider": r.provider, "calls": r.calls, "cost": float(r.cost)} for r in by_provider],
    }


@router.post("/admin/ai-cache/clear")
async def clear_ai_cache(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    svc = AIConfigService(db=db)
    await svc.init()
    await svc.invalidate_cache()
    logger.info("AI cache cleared by admin", extra={"admin_id": str(current_user.id)})
    return {"status": "ok", "message": "Caché invalidada."}


@router.put("/admin/ai-providers")
async def save_providers(
    payload: list[dict[str, Any]],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    svc = AIConfigService(db=db)
    await svc.init()

    # Standardize: ensure all have required fields
    for p in payload:
        p.setdefault("tipo", "texto")
        p.setdefault("active", True)
        p.setdefault("priority", p.get("priority", 99))
        p.setdefault("timeout_seconds", p.get("timeout_seconds", 30))
        p.setdefault("max_retries", p.get("max_retries", 2))

    # Template must stay active
    template = [p for p in payload if p.get("id") == "template"]
    if template:
        template[0]["active"] = True
        template[0]["priority"] = 99

    await svc.save_providers(payload, admin_id=current_user.id)
    return {"status": "ok", "detail": "Proveedores actualizados."}


@router.put("/admin/ai-features")
async def save_features(
    payload: list[dict[str, Any]],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    svc = AIConfigService(db=db)
    await svc.init()
    await svc.save_features(payload, admin_id=current_user.id)
    return {"status": "ok", "detail": "Ruteo de funcionalidades actualizado."}


@router.patch("/admin/ai-providers/{provider_id}")
async def update_provider(
    provider_id: str,
    payload: AIProviderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    svc = AIConfigService(db=db)
    await svc.init()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        return {"status": "ok", "detail": "Sin cambios."}
    await svc.save_provider(provider_id, updates, admin_id=current_user.id)
    return {"status": "ok", "detail": "Proveedor actualizado."}


@router.post("/admin/ai-settings/restore-defaults")
async def restore_defaults(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    svc = AIConfigService(db=db)
    await svc.init()
    await svc.restore_defaults(admin_id=current_user.id)
    return {"status": "ok", "detail": "Configuración restaurada a valores predeterminados."}


@router.get("/admin/ai-config-hash")
async def get_config_hash(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    svc = AIConfigService(db=db)
    await svc.init()
    backend_hash = await svc.get_config_hash()

    # Get worker hash via Celery task
    worker_hash = None
    worker_error = None
    try:
        from app.workers.tasks_ai_config import get_ai_config_version
        worker_result = get_ai_config_version.apply_async()
        worker_data = worker_result.get(timeout=10)
        worker_hash = worker_data.get("config_hash") if isinstance(worker_data, dict) else None
        worker_error = worker_data.get("error") if isinstance(worker_data, dict) else None
    except Exception as exc:
        worker_error = str(exc)[:200]

    return {
        "backend_hash": backend_hash,
        "worker_hash": worker_hash,
        "consistent": backend_hash == worker_hash if worker_hash else False,
        "backend_source": "db",
        "worker_source": "worker-process",
        "worker_error": worker_error,
    }


@router.get("/admin/ai-audit")
async def get_audit_logs(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    total = await db.execute(text("SELECT COUNT(*) FROM ai_config_audit_logs"))
    total_count = total.scalar()
    rows = await db.execute(
        text("SELECT action, entity, entity_id, field_name, old_value, new_value, result, created_at FROM ai_config_audit_logs ORDER BY created_at DESC LIMIT :l OFFSET :o"),
        {"l": limit, "o": offset}
    )
    logs = []
    for r in rows:
        logs.append({
            "action": r.action,
            "entity": r.entity,
            "entity_id": r.entity_id,
            "field": r.field_name,
            "old_value": r.old_value,
            "new_value": r.new_value,
            "result": r.result,
            "created_at": str(r.created_at)[:19] if r.created_at else None,
        })
    return {"total": total_count, "limit": limit, "offset": offset, "logs": logs}


@router.patch("/profesor/ai-config")
async def update_profesor_config(
    payload: ProfesorAIConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    encrypted_openai_key = (
        encrypt_ai_secret(payload.openai_key.get_secret_value())
        if payload.openai_key is not None
        else None
    )
    existing = await db.execute(text("SELECT id FROM profesor_ai_configs WHERE profesor_id=:p"), {"p": str(current_user.id)})
    row = existing.fetchone()
    if row:
        await db.execute(
            text("UPDATE profesor_ai_configs SET openai_key_encrypted=COALESCE(:ok, openai_key_encrypted), modelo_llm_preferido=COALESCE(:m, modelo_llm_preferido) WHERE profesor_id=:p"),
            {"ok": encrypted_openai_key, "m": payload.modelo_llm_preferido, "p": str(current_user.id)},
        )
    else:
        await db.execute(
            text("INSERT INTO profesor_ai_configs (profesor_id, openai_key_encrypted, modelo_llm_preferido) VALUES (:p, :ok, :m)"),
            {"p": str(current_user.id), "ok": encrypted_openai_key, "m": payload.modelo_llm_preferido},
        )
    await db.commit()
    return {"status": "updated"}
