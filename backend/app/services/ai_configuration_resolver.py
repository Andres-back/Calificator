"""Resolve immutable, secret-free AI routing for global and teacher settings."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai_config_service import AIConfigService


CAPABILITY_BY_FEATURE: dict[str, str] = {
    "calificacion_foto": "vision",
    "grading_photo": "vision",
    "evaluacion_digitalizar": "vision",
    "vision_ocr": "vision",
    "generacion_imagenes": "image",
    "rag": "embedding",
    "embeddings": "embedding",
}


def capability_for(feature: str) -> str:
    return CAPABILITY_BY_FEATURE.get(feature, "text")


def _hash_snapshot(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]


async def _teacher_configuration(db: AsyncSession, teacher_id: UUID) -> tuple[dict[str, Any], list[dict[str, Any]], set[str]]:
    try:
        config_result = await db.execute(
            text(
                "SELECT mode, allow_institutional_fallback, active, version "
                "FROM profesor_ai_configs WHERE profesor_id=:teacher"
            ),
            {"teacher": str(teacher_id)},
        )
        row = config_result.fetchone()
        config = dict(row._mapping) if row else {
            "mode": "institutional",
            "allow_institutional_fallback": True,
            "active": True,
            "version": 0,
        }
        preference_result = await db.execute(
            text(
                "SELECT feature, provider_id, model_id, active FROM profesor_ai_feature_preferences "
                "WHERE profesor_id=:teacher"
            ),
            {"teacher": str(teacher_id)},
        )
        credential_result = await db.execute(
            text(
                "SELECT provider_id FROM profesor_ai_credentials "
                "WHERE profesor_id=:teacher AND active=true"
            ),
            {"teacher": str(teacher_id)},
        )
        return config, [dict(item._mapping) for item in preference_result.fetchall()], {
            str(item.provider_id) for item in credential_result.fetchall()
        }
    except Exception:
        await db.rollback()
        return {
            "mode": "institutional",
            "allow_institutional_fallback": True,
            "active": True,
            "version": 0,
        }, [], set()


async def _recommended_model(db: AsyncSession, provider: str, capability: str) -> str | None:
    try:
        result = await db.execute(
            text(
                "SELECT model_id FROM ai_provider_models "
                "WHERE provider_id=:provider AND active=true AND :capability = ANY(capabilities) "
                "ORDER BY recommended DESC, updated_at DESC LIMIT 1"
            ),
            {"provider": provider, "capability": capability},
        )
        value = result.scalar()
        if value:
            return str(value)
    except Exception:
        await db.rollback()
    service = AIConfigService(db=db)
    models = await service.get_all_models()
    match = next((item for item in models if item.get("provider_id") == provider and item.get("active") and capability in (item.get("capabilities") or []) and item.get("recommended")), None)
    return str(match["model_id"]) if match else None


async def resolve_ai_configuration(
    db: AsyncSession,
    *,
    feature: str,
    teacher_id: UUID | None = None,
) -> dict[str, Any]:
    """Return a deterministic snapshot containing routing metadata, never credentials."""
    config_service = AIConfigService(db=db)
    route = await config_service.get_feature_config(feature)
    capability = str(route.get("capability") or capability_for(feature))
    primary_provider = str(route.get("primary_provider") or "groq")
    primary_provider_config = await config_service.get_provider_config(primary_provider)
    primary_model = route.get("primary_model") or primary_provider_config.get("model")
    rollout_enabled = bool(route.get("rollout_enabled", False))

    selection = {
        "provider": primary_provider,
        "model": primary_model,
        "credential_source": "institutional",
    }
    fallback = None
    teacher_version = 0
    mode = "institutional"
    personal_selected = False

    if teacher_id is not None:
        teacher, preferences, credential_providers = await _teacher_configuration(db, teacher_id)
        teacher_version = int(teacher.get("version") or 0)
        mode = str(teacher.get("mode") or "institutional") if teacher.get("active", True) else "institutional"
        chosen = None
        if rollout_enabled and mode == "advanced":
            chosen = next(
                (
                    item
                    for item in preferences
                    if item.get("feature") == feature and item.get("active")
                ),
                None,
            )
        elif rollout_enabled and mode == "automatic" and credential_providers:
            for provider_id in sorted(credential_providers):
                model_id = await _recommended_model(db, provider_id, capability)
                if model_id:
                    chosen = {"provider_id": provider_id, "model_id": model_id}
                    break
        if chosen and chosen.get("provider_id") in credential_providers:
            personal_selected = True
            teacher_provider = await config_service.get_provider_config(
                str(chosen["provider_id"])
            )
            selection = {
                "provider": str(chosen["provider_id"]),
                "model": chosen.get("model_id")
                or await _recommended_model(
                    db, str(chosen["provider_id"]), capability
                ),
                "credential_source": "teacher",
            }
            if (
                teacher.get("allow_institutional_fallback", True)
                and teacher_provider.get("allow_institutional_fallback", True)
            ):
                fallback = {
                    "provider": primary_provider,
                    "model": primary_model,
                    "credential_source": "institutional",
                    "reason": "teacher_consent",
                }

    if not personal_selected and fallback is None and route.get("fallback_provider"):
        fallback_provider = str(route.get("fallback_provider"))
        fallback_model = route.get("fallback_model")
        if not fallback_model:
            fallback_model = (
                await config_service.get_provider_config(fallback_provider)
            ).get("model")
        fallback = {
            "provider": fallback_provider,
            "model": fallback_model,
            "credential_source": "institutional",
            "reason": "global_route",
        }

    core = {
        "schema_version": 1,
        "feature": feature,
        "capability": capability,
        "mode": mode,
        "rollout_enabled": rollout_enabled,
        "primary": selection,
        "fallback": fallback,
        "teacher_config_version": teacher_version,
        "global_config_version": int(route.get("config_version") or 1),
    }
    core["config_hash"] = _hash_snapshot(core)
    core["captured_at"] = datetime.now(timezone.utc).isoformat()
    return core

async def resolve_teacher_secret(
    db: AsyncSession,
    *,
    teacher_id: UUID,
    provider: str,
) -> str:
    """Read the current teacher secret at execution time without serializing it."""
    from app.services.ai_credentials_service import decrypt_ai_secret

    result = await db.execute(
        text(
            "SELECT secret_encrypted FROM profesor_ai_credentials "
            "WHERE profesor_id=:teacher AND provider_id=:provider AND active=true"
        ),
        {"teacher": str(teacher_id), "provider": provider},
    )
    encrypted = result.scalar()
    return decrypt_ai_secret(str(encrypted)) if encrypted else ""
