"""Administrative projection and validation for the effective AI control center."""
from __future__ import annotations

from collections import defaultdict
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.herramientas.tool_control_service import get_tool_catalog
from app.modules.herramientas.tool_registry import TOOLS, canonical_tool_id
from app.services.ai_capability_registry import STAGES, editable_runtime_features
from app.services.ai_config_service import AIConfigService, DEFAULT_FEATURES
from app.services.ai_configuration_resolver import resolve_ai_configuration


def _route_payload(route: dict[str, Any], providers: dict[str, dict[str, Any]]) -> dict[str, Any]:
    primary_provider = str(route.get("primary_provider") or "")
    fallback_provider = str(route.get("fallback_provider") or "")
    return {
        "provider": primary_provider or None,
        "model": route.get("primary_model") or providers.get(primary_provider, {}).get("model"),
        "fallback_provider": fallback_provider or None,
        "fallback_model": route.get("fallback_model") or providers.get(fallback_provider, {}).get("model"),
        "teacher_override_allowed": bool(route.get("rollout_enabled", False)),
        "config_version": int(route.get("config_version") or 1),
    }


async def _latest_observed(db: AsyncSession) -> list[dict[str, Any]]:
    try:
        result = await db.execute(text("""
            SELECT DISTINCT ON (feature, COALESCE(stage, 'other'))
                   feature, stage, provider, model, status,
                   COALESCE(completed_at, created_at) AS observed_at,
                   routing_origin, config_version, fallback_used
            FROM ai_usage_events
            ORDER BY feature, COALESCE(stage, 'other'),
                     COALESCE(completed_at, created_at) DESC
        """))
        return [dict(row._mapping) for row in result.fetchall()]
    except Exception:
        await db.rollback()
        return []


def _observed_stage(stage: Any, rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    feature_aliases = {
        "calificacion": {"grading", "calificacion_foto", "calificacion_texto"},
        "digitalizacion": {"evaluacion_digitalizar", "digitalization"},
        "presentaciones": {"presentacion", "presentaciones"},
        "recursos": {"tools", "herramientas_educativas", str(stage.runtime_feature)},
        "evaluaciones": {"generacion_preguntas", "evaluaciones"},
        "xali": {"xali", "xali_chat", "rag", "embeddings"},
    }.get(stage.function_id, {str(stage.runtime_feature)})
    stage_aliases = {
        "content": {"content", "other"},
        "images": {"images", "image", "other"},
        "answer": {"answer", "other"},
        "retrieval": {"retrieval", "embedding", "other"},
    }.get(stage.stage_id, {stage.stage_id})
    candidates = [
        row for row in rows
        if str(row.get("feature")) in feature_aliases
        and str(row.get("stage") or "other") in stage_aliases
    ]
    if not candidates:
        return None
    row = max(candidates, key=lambda item: str(item.get("observed_at") or ""))
    return {
        "provider": row.get("provider"),
        "model": row.get("model"),
        "status": row.get("status"),
        "at": row.get("observed_at"),
        "origin": row.get("routing_origin"),
        "config_version": row.get("config_version"),
        "fallback_used": bool(row.get("fallback_used")),
    }


async def get_control_center(db: AsyncSession) -> dict[str, Any]:
    service = AIConfigService(db=db)
    providers_list = await service.get_all_providers()
    providers = {str(item["id"]): item for item in providers_list}
    features = await service.get_all_features()
    feature_map = {str(item["feature"]): item for item in features}
    observed = await _latest_observed(db)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    function_labels: dict[str, str] = {}
    for stage in STAGES:
        function_labels[stage.function_id] = stage.function_label
        configured = None
        effective = None
        inherits_from = None
        if stage.runtime_feature:
            exact = feature_map.get(stage.runtime_feature)
            route = exact or await service.get_feature_config(stage.runtime_feature)
            inherits_from = None if exact else stage.inherits_from
            configured = {**_route_payload(route, providers), "inherits_from": inherits_from}
            effective = {
                **_route_payload(route, providers),
                "origin": "institutional" if not inherits_from else f"inherited:{inherits_from}",
            }
        grouped[stage.function_id].append({
            **stage.as_dict(),
            "configured": configured,
            "effective": effective,
            "observed": _observed_stage(stage, observed),
        })
    tools = await get_tool_catalog(db, include_admin=True)
    for tool in tools:
        route_key = f"herramienta.{tool['tool_id']}"
        route = feature_map.get(route_key)
        tool["route_override"] = _route_payload(route, providers) if route else None
        tool["inherits_from"] = None if route else "herramientas_educativas"
    version = max((int(item.get("config_version") or 1) for item in features), default=1)
    return {
        "version": version,
        "functions": [
            {"function_id": key, "label": function_labels[key], "stages": stages}
            for key, stages in grouped.items()
        ],
        "tools": tools,
        "providers": providers_list,
        "models": await service.get_all_models(),
        "deployment": {
            "provider_max_concurrency": getattr(settings, "AI_PROVIDER_MAX_CONCURRENCY", None),
            "slow_warning_seconds": getattr(settings, "AI_JOB_SLOW_WARNING_SECONDS", None),
            "managed_by": "deployment",
            "editable": False,
        },
    }


async def get_effective_route(
    db: AsyncSession,
    *,
    function_id: str,
    stage_id: str,
    teacher_id: UUID | None = None,
    tool_id: str | None = None,
) -> dict[str, Any]:
    stage = next((item for item in STAGES if item.function_id == function_id and item.stage_id == stage_id), None)
    if stage is None or stage.runtime_feature is None:
        return {"function_id": function_id, "stage_id": stage_id, "editable": False, "effective": None}
    # Tool task names are canonicalized by AIConfigService into the optional
    # per-tool route and then into the general educational-tools route. Passing
    # the public task id here keeps that exact runtime resolution behavior.
    feature = canonical_tool_id(tool_id) if tool_id else stage.runtime_feature
    resolved = await resolve_ai_configuration(db, feature=feature, teacher_id=teacher_id)
    return {
        "function_id": function_id,
        "stage_id": stage_id,
        "tool_id": canonical_tool_id(tool_id) if tool_id else None,
        "editable": stage.editable,
        "effective": resolved,
    }


def validate_control_center_payload(
    providers: list[dict[str, Any]],
    models: list[dict[str, Any]],
    features: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    provider_ids = [str(item.get("id") or "") for item in providers]
    if len(set(provider_ids)) != len(provider_ids):
        errors.append({"field": "providers", "message": "Hay proveedores duplicados."})
    provider_map = {str(item.get("id")): item for item in providers}
    model_keys = [(str(item.get("provider_id")), str(item.get("model_id"))) for item in models]
    if len(set(model_keys)) != len(model_keys):
        errors.append({"field": "models", "message": "Hay modelos duplicados."})
    model_map = {key: item for key, item in zip(model_keys, models)}
    stage_by_feature = {
        str(stage.runtime_feature): stage
        for stage in STAGES
        if stage.runtime_feature
    }
    allowed_routes = {str(item["feature"]) for item in DEFAULT_FEATURES} | editable_runtime_features()
    allowed_routes |= {f"herramienta.{tool.tool_id}" for tool in TOOLS}
    seen_features: set[str] = set()
    normalized_features: list[dict[str, Any]] = []
    for index, raw in enumerate(features):
        feature = dict(raw)
        feature_id = str(feature.get("feature") or "")
        field = f"features.{index}"
        if feature_id in seen_features:
            errors.append({"field": field, "message": "Ruta duplicada."})
        seen_features.add(feature_id)
        if feature_id not in allowed_routes:
            errors.append({"field": field, "message": "La ruta no tiene un consumidor registrado."})
        capability = str(feature.get("capability") or "text")
        primary = str(feature.get("primary_provider") or "")
        primary_provider = provider_map.get(primary)
        registered_stage = stage_by_feature.get(feature_id)
        if (
            registered_stage
            and registered_stage.supported_providers
            and primary not in registered_stage.supported_providers
        ):
            errors.append({
                "field": field,
                "message": "El consumidor de esta etapa no admite ese proveedor.",
            })
        model_id = feature.get("primary_model") or (primary_provider or {}).get("model")
        feature["primary_model"] = model_id
        if not primary_provider or not primary_provider.get("active"):
            errors.append({"field": field, "message": "Proveedor principal ausente o inactivo."})
        elif primary != "template":
            model = model_map.get((primary, str(model_id)))
            if not model or not model.get("active") or capability not in (model.get("capabilities") or []):
                errors.append({"field": field, "message": f"Modelo principal incompatible con {capability}."})
            if not primary_provider.get("auth_configured", False):
                errors.append({"field": field, "message": "El proveedor principal no tiene una credencial configurada."})
        fallback = feature.get("fallback_provider")
        if fallback and fallback != "template":
            fallback_provider = provider_map.get(str(fallback))
            fallback_model = feature.get("fallback_model") or (fallback_provider or {}).get("model")
            feature["fallback_model"] = fallback_model
            fallback_entry = model_map.get((str(fallback), str(fallback_model)))
            if not fallback_provider or not fallback_provider.get("active") or not fallback_entry or capability not in (fallback_entry.get("capabilities") or []):
                errors.append({"field": field, "message": f"Modelo de respaldo incompatible con {capability}."})
            if (
                registered_stage
                and registered_stage.supported_providers
                and str(fallback) not in registered_stage.supported_providers
            ):
                errors.append({"field": field, "message": "El consumidor de esta etapa no admite ese proveedor de respaldo."})
            if fallback_provider and not fallback_provider.get("auth_configured", False):
                errors.append({"field": field, "message": "El proveedor de respaldo no tiene una credencial configurada."})
            if str(fallback) == primary and str(fallback_model) == str(model_id):
                errors.append({"field": field, "message": "Principal y respaldo deben ser distintos."})
        normalized_features.append(feature)
    normalized_tools: list[dict[str, Any]] | None = None
    if tools is not None:
        normalized_tools = []
        seen_tools: set[str] = set()
        canonical_ids = {tool.tool_id for tool in TOOLS}
        for index, raw in enumerate(tools):
            tool = dict(raw)
            tool_id = canonical_tool_id(str(tool.get("tool_id") or ""))
            field = f"tools.{index}"
            if tool_id not in canonical_ids:
                errors.append({"field": field, "message": "Herramienta desconocida."})
            if tool_id in seen_tools:
                errors.append({"field": field, "message": "Herramienta duplicada o alias repetido."})
            seen_tools.add(tool_id)
            enabled = bool(tool.get("generation_enabled", True))
            reason = str(tool.get("pause_reason") or "").strip() or None
            if not enabled and not reason:
                errors.append({"field": field, "message": "Indica el motivo de la pausa."})
            normalized_tools.append({"tool_id": tool_id, "generation_enabled": enabled, "pause_reason": reason})
        missing = canonical_ids - seen_tools
        if missing:
            warnings.append({"field": "tools", "message": f"{len(missing)} herramientas conservarán su estado actual."})
    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "normalized": {"providers": providers, "models": models, "features": normalized_features, "tools": normalized_tools},
    }
