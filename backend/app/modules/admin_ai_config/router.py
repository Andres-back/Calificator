from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
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
    list_teacher_ai_credentials,
    upsert_teacher_ai_credential,
    delete_teacher_ai_credential,
    get_teacher_ai_credential,
)
from app.services.ai_config_service import AIConfigService
from app.modules.admin_ai_config.usage_service import (
    get_recent_provider_errors,
    get_usage_summary,
)
from app.modules.admin_ai_config.schemas import (
    AIProviderTestResponse,
    AIProviderUpdate,
    AISettingsRead,
    GlobalAIConfigRead,
    GlobalAIConfigUpdate,
    ProfesorAIConfigUpdate,
    TeacherAIConfigRead,
    TeacherAIConfigUpdate,
    TeacherAICredentialUpdate,
    ProviderModelTestRequest,
    FeatureRoutingPublication,
    AIConfigurationPublication,
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
            "name": "openai",
            "label": "OpenAI",
            "base_url": "https://api.openai.com/v1",
            "model": settings.OPENAI_MODEL,
            "priority": 1,
            "timeout_seconds": settings.OPENAI_TIMEOUT_SECONDS,
            "max_retries": 2,
            "auth_configured": bool(settings.OPENAI_API_KEY),
        },
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
        {
            "name": "openai",
            "label": "OpenAI",
            "base_url": "https://api.openai.com/v1",
            "model": settings.OPENAI_MODEL,
            "priority": 1,
            "timeout_seconds": settings.OPENAI_TIMEOUT_SECONDS,
            "max_retries": 2,
            "auth_configured": bool(settings.OPENAI_API_KEY),
        },
        {"feature": "xali", "label": "Chatbot Xali", "primary_provider": "groq", "fallback_provider": "template"},
        {"feature": "grading_text", "label": "Calificación de texto", "primary_provider": "groq", "fallback_provider": "template"},
        {"feature": "grading_photo", "label": "Calificación por foto", "primary_provider": "groq", "fallback_provider": "template"},
        {"feature": "feedback", "label": "Generación de retroalimentación", "primary_provider": "groq", "fallback_provider": "template"},
        {"feature": "questions", "label": "Generación de preguntas", "primary_provider": "groq", "fallback_provider": "template"},
        {"feature": "evaluacion_digitalizar", "label": "Digitalización de evaluaciones", "primary_provider": "open_code", "fallback_provider": None},
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

        elif provider in {"openai", "openai_image"}:
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
        last_errors = await get_recent_provider_errors(db)
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
    models = await svc.get_all_models()
    config_version = max((int(item.get("config_version") or 1) for item in features), default=1)

    usage_summary = await get_usage_summary(db)

    cfg_row = await db.execute(text("SELECT * FROM ai_global_config ORDER BY created_at DESC LIMIT 1"))
    cfg = cfg_row.fetchone()
    cfg_mapping = dict(cfg._mapping) if cfg else {}
    global_config = _global_config_payload(cfg_mapping, credentials)

    return {
        "providers": providers,
        "models": models,
        "features": features,
        "version": config_version,
        "global_config": global_config,
        "usage": usage_summary,
    }

@router.post("/admin/ai-providers/{provider}/test", response_model=AIProviderTestResponse)
async def test_provider(
    provider: str,
    payload: ProviderModelTestRequest | None = None,
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
    if payload and payload.model:
        compatible = any(item.get("provider_id") == provider and item.get("model_id") == payload.model and payload.capability in (item.get("capabilities") or []) and item.get("active") for item in await svc.get_all_models())
        if not compatible:
            raise HTTPException(status_code=422, detail="El modelo no es compatible con la capacidad seleccionada.")
        provider_config = {**(provider_config or {}), "model": payload.model}
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
    return await get_usage_summary(db)



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


@router.put("/admin/ai-settings/publish")
async def publish_ai_configuration(
    payload: AIConfigurationPublication,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Publish providers, models and routes in one version-checked transaction."""
    require_role(current_user, [UserRole.ADMIN])
    svc = AIConfigService(db=db)
    await svc.init()
    locked = await db.execute(text("SELECT config_version FROM ai_feature_routing FOR UPDATE"))
    current_version = max((int(row.config_version or 1) for row in locked.fetchall()), default=1)
    if current_version != payload.expected_version:
        raise HTTPException(
            status_code=409,
            detail="La configuración global cambió en otra sesión. Recarga y vuelve a intentar.",
        )

    providers = [item.model_dump() for item in payload.providers]
    models = [item.model_dump() for item in payload.models]
    features = [item.model_dump() for item in payload.features]
    if len({item["id"] for item in providers}) != len(providers):
        raise HTTPException(status_code=422, detail="Hay proveedores duplicados.")
    if len({(item["provider_id"], item["model_id"]) for item in models}) != len(models):
        raise HTTPException(status_code=422, detail="Hay modelos duplicados.")
    provider_map = {item["id"]: item for item in providers}
    model_map = {(item["provider_id"], item["model_id"]): item for item in models}
    template = provider_map.get("template")
    if template:
        template["active"] = True
        template["priority"] = 99

    for feature in features:
        if not feature.get("active"):
            continue
        capability = str(feature.get("capability") or "text")
        primary_provider = str(feature.get("primary_provider") or "")
        primary_model = feature.get("primary_model") or provider_map.get(primary_provider, {}).get("model")
        feature["primary_model"] = primary_model
        provider = provider_map.get(primary_provider)
        if not provider or not provider.get("active"):
            raise HTTPException(status_code=422, detail=f"Proveedor principal inválido en {feature.get('feature')}.")
        if primary_provider != "template":
            model = model_map.get((primary_provider, primary_model))
            if not model or not model.get("active") or capability not in (model.get("capabilities") or []):
                raise HTTPException(status_code=422, detail=f"Modelo principal incompatible o inactivo en {feature.get('label')}.")
        fallback_provider = feature.get("fallback_provider")
        if fallback_provider and fallback_provider != "template":
            fallback_model = feature.get("fallback_model") or provider_map.get(fallback_provider, {}).get("model")
            feature["fallback_model"] = fallback_model
            fallback = model_map.get((fallback_provider, fallback_model))
            if not fallback or not fallback.get("active") or capability not in (fallback.get("capabilities") or []):
                raise HTTPException(status_code=422, detail=f"Modelo de respaldo incompatible o inactivo en {feature.get('label')}.")
            if fallback_provider == primary_provider and fallback_model == primary_model:
                raise HTTPException(status_code=422, detail="La ruta principal y el respaldo deben ser distintos.")

    version = await svc.publish_configuration(
        providers, models, features, admin_id=current_user.id
    )
    return {
        "status": "ok",
        "detail": "Configuración de IA publicada.",
        "version": version,
    }

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
    payload: FeatureRoutingPublication | list[dict[str, Any]],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    svc = AIConfigService(db=db)
    await svc.init()
    if isinstance(payload, FeatureRoutingPublication):
        locked = await db.execute(text("SELECT config_version FROM ai_feature_routing FOR UPDATE"))
        current_version = max((int(row.config_version or 1) for row in locked.fetchall()), default=1)
        if current_version != payload.expected_version:
            raise HTTPException(status_code=409, detail="La configuración global cambió en otra sesión. Recarga y vuelve a intentar.")
        feature_payload = [item.model_dump() for item in payload.features]
    else:
        feature_payload = payload
    providers = {item["id"]: item for item in await svc.get_all_providers()}
    models = {(item["provider_id"], item["model_id"]): item for item in await svc.get_all_models()}
    for feature in feature_payload:
        capability = str(feature.get("capability") or "text")
        primary_provider = str(feature.get("primary_provider") or "")
        primary_model = feature.get("primary_model")
        fallback_provider = feature.get("fallback_provider")
        fallback_model = feature.get("fallback_model")
        if not primary_model:
            primary_model = providers.get(primary_provider, {}).get("model")
            feature["primary_model"] = primary_model
        if fallback_provider and fallback_provider != "template" and not fallback_model:
            fallback_model = providers.get(fallback_provider, {}).get("model")
            feature["fallback_model"] = fallback_model
        if primary_provider not in providers or not providers[primary_provider].get("active"):
            raise HTTPException(status_code=422, detail=f"Proveedor principal inválido en {feature.get('feature')}.")
        if primary_model:
            model = models.get((primary_provider, primary_model))
            if not model or not model.get("active") or capability not in (model.get("capabilities") or []):
                raise HTTPException(status_code=422, detail=f"Modelo principal incompatible con {capability}.")
        if fallback_provider and fallback_provider != "template" and not fallback_model:
            raise HTTPException(status_code=422, detail="El proveedor de respaldo no tiene un modelo configurado.")
        if fallback_provider and fallback_provider != "template":
            fallback = models.get((fallback_provider, fallback_model))
            if not fallback or capability not in (fallback.get("capabilities") or []):
                raise HTTPException(status_code=422, detail=f"Modelo de respaldo incompatible con {capability}.")
            if fallback_provider == primary_provider and fallback_model == primary_model:
                raise HTTPException(status_code=422, detail="La ruta principal y el respaldo deben ser distintos.")
    await svc.save_features(feature_payload, admin_id=current_user.id)
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


@router.post("/admin/ai-settings/restore-previous")
async def restore_previous_configuration(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    svc = AIConfigService(db=db)
    await svc.init()
    version = await svc.restore_previous_configuration(admin_id=current_user.id)
    if version is None:
        raise HTTPException(status_code=409, detail="No existe una publicación anterior para restaurar.")
    return {
        "status": "ok",
        "detail": "Se restauró la última configuración publicada válida.",
        "version": version,
    }

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


@router.patch("/profesor/ai-config", deprecated=True)
async def update_profesor_config(
    payload: ProfesorAIConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR])
    if payload.openai_key is not None:
        await _teacher_allowed_provider(db, "openai")
        await upsert_teacher_ai_credential(
            db,
            teacher_id=current_user.id,
            provider_id="openai",
            api_key=payload.openai_key.get_secret_value(),
        )
    encrypted_openai_key = None
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

async def _record_teacher_ai_audit(
    db: AsyncSession,
    *,
    actor_id: Any,
    action: str,
    entity: str,
    entity_id: str | None = None,
    new_value: str | None = None,
) -> None:
    """Append a sanitized audit event inside the caller transaction."""
    await db.execute(
        text(
            "INSERT INTO ai_config_audit_logs "
            "(admin_id, action, entity, entity_id, new_value, result) "
            "VALUES (:actor, :action, :entity, :entity_id, :new_value, 'ok')"
        ),
        {
            "actor": str(actor_id),
            "action": action,
            "entity": entity,
            "entity_id": entity_id,
            "new_value": new_value[:500] if new_value else None,
        },
    )

async def _teacher_allowed_provider(db: AsyncSession, provider: str) -> dict[str, Any]:
    row = await db.execute(
        text(
            "SELECT id, active, allow_teacher_credentials FROM ai_provider_settings "
            "WHERE id=:provider"
        ),
        {"provider": provider},
    )
    item = row.fetchone()
    if not item or not item.active or not item.allow_teacher_credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Este proveedor no admite credenciales docentes.")
    return dict(item._mapping)


async def _validate_teacher_preferences(
    db: AsyncSession,
    preferences: list[Any],
) -> None:
    service = AIConfigService(db=db)
    providers = {item["id"]: item for item in await service.get_all_providers()}
    models = {(item["provider_id"], item["model_id"]): item for item in await service.get_all_models()}
    features = {item["feature"]: item for item in await service.get_all_features()}
    for preference in preferences:
        if not preference.active:
            continue
        provider = providers.get(preference.provider or "")
        feature = features.get(preference.feature)
        model = models.get((preference.provider or "", preference.model or ""))
        if not feature or not feature.get("active"):
            raise HTTPException(status_code=422, detail=f"Funcionalidad desconocida o inactiva: {preference.feature}.")
        if not provider or not provider.get("active") or not provider.get("allow_teacher_credentials"):
            raise HTTPException(status_code=422, detail=f"Proveedor no autorizado para {preference.feature}.")
        capability = str((feature or {}).get("capability") or "text")
        if not model or not model.get("active") or capability not in (model.get("capabilities") or []):
            raise HTTPException(status_code=422, detail=f"Modelo incompatible con {capability} en {preference.feature}.")


@router.get("/profesor/ai-config", response_model=TeacherAIConfigRead)
async def get_teacher_ai_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    require_role(current_user, [UserRole.PROFESOR])
    service = AIConfigService(db=db)
    await service.init()
    providers = [
        {**item, "name": str(item["id"])}
        for item in await service.get_all_providers()
        if item.get("active") and item.get("allow_teacher_credentials")
    ]
    provider_ids = {str(item["id"]) for item in providers}
    models = [item for item in await service.get_all_models() if item.get("active") and item.get("provider_id") in provider_ids]
    features = [item for item in await service.get_all_features() if item.get("active")]

    config_result = await db.execute(
        text(
            "SELECT mode, allow_institutional_fallback, active, version "
            "FROM profesor_ai_configs WHERE profesor_id=:teacher"
        ),
        {"teacher": str(current_user.id)},
    )
    config_row = config_result.fetchone()
    config = dict(config_row._mapping) if config_row else {
        "mode": "institutional",
        "allow_institutional_fallback": True,
        "active": True,
        "version": 0,
    }
    preference_result = await db.execute(
        text(
            "SELECT feature, provider_id AS provider, model_id AS model, active "
            "FROM profesor_ai_feature_preferences WHERE profesor_id=:teacher ORDER BY feature"
        ),
        {"teacher": str(current_user.id)},
    )
    return {
        **config,
        "providers": providers,
        "models": models,
        "features": features,
        "credentials": await list_teacher_ai_credentials(db, current_user.id),
        "preferences": [dict(row._mapping) for row in preference_result.fetchall()],
    }


@router.put("/profesor/ai-config", response_model=TeacherAIConfigRead)
async def save_teacher_ai_config(
    payload: TeacherAIConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    require_role(current_user, [UserRole.PROFESOR])
    await _validate_teacher_preferences(db, payload.preferences)
    current_version = await db.scalar(
        text("SELECT version FROM profesor_ai_configs WHERE profesor_id=:teacher FOR UPDATE"),
        {"teacher": str(current_user.id)},
    )
    actual_version = int(current_version or 0)
    if actual_version != payload.expected_version:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La configuración cambió en otra sesión. Recarga y vuelve a intentar.")
    next_version = actual_version + 1
    await db.execute(
        text(
            "INSERT INTO profesor_ai_configs "
            "(profesor_id, mode, allow_institutional_fallback, active, version, updated_at) "
            "VALUES (:teacher, :mode, :fallback, :active, :version, NOW()) "
            "ON CONFLICT (profesor_id) DO UPDATE SET mode=EXCLUDED.mode, "
            "allow_institutional_fallback=EXCLUDED.allow_institutional_fallback, "
            "active=EXCLUDED.active, version=EXCLUDED.version, updated_at=NOW()"
        ),
        {
            "teacher": str(current_user.id),
            "mode": payload.mode,
            "fallback": payload.allow_institutional_fallback,
            "active": payload.active,
            "version": next_version,
        },
    )
    await db.execute(
        text("DELETE FROM profesor_ai_feature_preferences WHERE profesor_id=:teacher"),
        {"teacher": str(current_user.id)},
    )
    for preference in payload.preferences:
        await db.execute(
            text(
                "INSERT INTO profesor_ai_feature_preferences "
                "(profesor_id, feature, provider_id, model_id, active, config_version, updated_at) "
                "VALUES (:teacher, :feature, :provider, :model, :active, :version, NOW())"
            ),
            {
                "teacher": str(current_user.id),
                "feature": preference.feature,
                "provider": preference.provider,
                "model": preference.model,
                "active": preference.active,
                "version": next_version,
            },
        )
    await _record_teacher_ai_audit(
        db,
        actor_id=current_user.id,
        action="save_teacher_ai_config",
        entity="teacher_ai_config",
        entity_id=str(current_user.id),
        new_value=f"mode={payload.mode};fallback={payload.allow_institutional_fallback};preferences={len(payload.preferences)};version={next_version}",
    )
    await db.commit()
    return await get_teacher_ai_config(current_user=current_user, db=db)


@router.put("/profesor/ai-credentials/{provider}")
async def save_teacher_ai_credential(
    provider: str,
    payload: TeacherAICredentialUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    require_role(current_user, [UserRole.PROFESOR])
    await _teacher_allowed_provider(db, provider)
    await upsert_teacher_ai_credential(
        db,
        teacher_id=current_user.id,
        provider_id=provider,
        api_key=payload.api_key.get_secret_value(),
        account_id=payload.account_id.get_secret_value() if payload.account_id else None,
    )
    await _record_teacher_ai_audit(
        db, actor_id=current_user.id, action="replace_teacher_ai_credential",
        entity="teacher_ai_credential", entity_id=provider, new_value="configured",
    )
    await db.commit()
    logger.info("Teacher AI credential replaced", extra={"teacher_id": str(current_user.id), "provider": provider})
    return {"status": "updated", "provider_id": provider, "configured": True}


@router.delete("/profesor/ai-credentials/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_teacher_ai_credential(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    require_role(current_user, [UserRole.PROFESOR])
    await delete_teacher_ai_credential(db, teacher_id=current_user.id, provider_id=provider)
    await _record_teacher_ai_audit(
        db, actor_id=current_user.id, action="delete_teacher_ai_credential",
        entity="teacher_ai_credential", entity_id=provider, new_value="deleted",
    )
    await db.commit()
    logger.info("Teacher AI credential removed", extra={"teacher_id": str(current_user.id), "provider": provider})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/profesor/ai-providers/{provider}/test", response_model=AIProviderTestResponse)
async def test_teacher_ai_provider(
    provider: str,
    payload: ProviderModelTestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    require_role(current_user, [UserRole.PROFESOR])
    await _teacher_allowed_provider(db, provider)
    service = AIConfigService(db=db)
    models = await service.get_all_models()
    if payload.model:
        compatible = any(
            item.get("provider_id") == provider
            and item.get("model_id") == payload.model
            and payload.capability in (item.get("capabilities") or [])
            and item.get("active")
            for item in models
        )
        if not compatible:
            raise HTTPException(status_code=422, detail="El modelo no es compatible con la capacidad seleccionada.")
    secret = payload.api_key.get_secret_value() if payload.api_key else await get_teacher_ai_credential(
        db, teacher_id=current_user.id, provider_id=provider
    )
    if not secret:
        raise HTTPException(status_code=422, detail="Configura una clave o ingresa una clave temporal para probar.")
    credentials = EffectiveAICredentials(
        openai_key=secret if provider in {"openai", "openai_image", "openai_vision"} else "",
        groq_key=secret if provider in {"groq", "groq_vision"} else "",
        open_code_key=secret if provider == "open_code" else "",
        cloudflare_token=secret if provider in {"cloudflare", "cloudflare_image"} else "",
        sources={provider: "teacher"},
    )
    provider_config = next((item for item in await service.get_all_providers() if item.get("id") == provider), {})
    if payload.model:
        provider_config = {**provider_config, "model": payload.model}
    result = await _test_provider_connection(provider, credentials, provider_config)
    safe_error_code = "provider_error" if result.get("status") != "ok" else None
    if payload.api_key is None:
        await db.execute(
            text(
                "UPDATE profesor_ai_credentials SET last_test_status=:status, "
                "last_test_latency_ms=:latency, last_test_http_code=:http_code, "
                "last_test_error_code=:error_code, last_test_at=NOW(), updated_at=NOW() "
                "WHERE profesor_id=:teacher AND provider_id=:provider"
            ),
            {
                "status": result.get("status"),
                "latency": result.get("latency_ms"),
                "http_code": result.get("http_code"),
                "error_code": safe_error_code,
                "teacher": str(current_user.id),
                "provider": provider,
            },
        )
        await _record_teacher_ai_audit(
            db,
            actor_id=current_user.id,
            action="test_teacher_ai_credential",
            entity="teacher_ai_credential",
            entity_id=provider,
            new_value=f"status={result.get('status')};http={result.get('http_code')}",
        )
        await db.commit()
    public_result = {**result, "error": safe_error_code}
    return {**public_result, "detail": _test_detail_message(public_result, provider)}