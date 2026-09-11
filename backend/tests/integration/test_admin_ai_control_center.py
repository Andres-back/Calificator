import asyncio
from types import SimpleNamespace

import app.modules.admin_ai_config.control_center_service as center


class FakeConfigService:
    def __init__(self, db=None):
        self.db = db

    async def get_all_providers(self):
        return [{
            "id": "open_code", "name": "open_code", "label": "OpenCode",
            "active": True, "model": "qwen3.7-plus", "auth_configured": True,
        }]

    async def get_all_features(self):
        return [{
            "feature": "calificacion.valoracion", "label": "Valoración principal",
            "capability": "text", "primary_provider": "open_code",
            "primary_model": "qwen3.7-plus", "fallback_provider": None,
            "fallback_model": None, "rollout_enabled": False,
            "config_version": 7, "active": True,
        }]

    async def get_all_models(self):
        return [{
            "provider_id": "open_code", "model_id": "qwen3.7-plus",
            "label": "Qwen 3.7 Plus", "capabilities": ["text", "vision"],
            "active": True,
        }]

    async def get_feature_config(self, feature):
        return {
            "feature": feature, "primary_provider": "open_code",
            "primary_model": "qwen3.7-plus", "fallback_provider": None,
            "rollout_enabled": False, "config_version": 7,
        }


def test_control_center_distinguishes_configured_effective_and_observed(monkeypatch):
    monkeypatch.setattr(center, "AIConfigService", FakeConfigService)

    async def tools(_db, include_admin=False):
        assert include_admin is True
        return [{
            "tool_id": "taller", "label": "Taller", "category": "Material",
            "description": "Práctica", "aliases": [], "uses_ai": True,
            "uses_image_ai": False, "generation_enabled": True,
            "pause_reason": None, "config_version": 7,
        }]

    async def observed(_db):
        return [{
            "feature": "grading", "stage": "grading_primary",
            "provider": "opencode", "model": "modelo-observado",
            "status": "success", "observed_at": "2026-09-10T12:00:00Z",
            "routing_origin": "institutional", "config_version": 6,
            "fallback_used": False,
        }]

    monkeypatch.setattr(center, "get_tool_catalog", tools)
    monkeypatch.setattr(center, "_latest_observed", observed)

    result = asyncio.run(center.get_control_center(SimpleNamespace()))
    grading = next(item for item in result["functions"] if item["function_id"] == "calificacion")
    primary = next(item for item in grading["stages"] if item["stage_id"] == "grading_primary")
    prepare = next(item for item in grading["stages"] if item["stage_id"] == "prepare")

    assert primary["configured"]["model"] == "qwen3.7-plus"
    assert primary["effective"]["model"] == "qwen3.7-plus"
    assert primary["observed"]["model"] == "modelo-observado"
    assert prepare["configured"] is None
    assert prepare["editable"] is False


def test_validation_rejects_provider_not_integrated_by_the_stage():
    result = center.validate_control_center_payload(
        [{"id": "groq", "active": True, "model": "llama", "auth_configured": True}],
        [{"provider_id": "groq", "model_id": "llama", "active": True, "capabilities": ["vision"]}],
        [{
            "feature": "calificacion.extraccion", "capability": "vision",
            "primary_provider": "groq", "primary_model": "llama",
            "fallback_provider": None,
        }],
        None,
    )

    assert result["valid"] is False
    assert any("no admite" in error["message"] for error in result["errors"])


def test_validation_rejects_an_active_route_without_effective_credentials():
    result = center.validate_control_center_payload(
        [{"id": "open_code", "active": True, "model": "qwen3.7-plus", "auth_configured": False}],
        [{"provider_id": "open_code", "model_id": "qwen3.7-plus", "active": True, "capabilities": ["text"]}],
        [{
            "feature": "calificacion.valoracion", "capability": "text",
            "primary_provider": "open_code", "primary_model": "qwen3.7-plus",
            "fallback_provider": None,
        }],
        None,
    )

    assert result["valid"] is False
    assert any("credencial configurada" in error["message"] for error in result["errors"])


def test_validation_accepts_ollama_cloud_as_visual_fallback():
    providers = [
        {"id": "open_code", "active": True, "model": "qwen3.7-plus", "auth_configured": True},
        {"id": "ollama", "active": True, "model": "qwen3-vl:235b", "auth_configured": True},
    ]
    models = [
        {"provider_id": "open_code", "model_id": "qwen3.7-plus", "active": True, "capabilities": ["text", "vision"]},
        {"provider_id": "ollama", "model_id": "qwen3-vl:235b", "active": True, "capabilities": ["text", "vision"]},
    ]

    result = center.validate_control_center_payload(
        providers,
        models,
        [{
            "feature": "calificacion.extraccion",
            "capability": "vision",
            "primary_provider": "open_code",
            "primary_model": "qwen3.7-plus",
            "fallback_provider": "ollama",
            "fallback_model": "qwen3-vl:235b",
        }],
        None,
    )

    assert result["valid"] is True
    assert result["errors"] == []
