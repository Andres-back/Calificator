from types import SimpleNamespace
from uuid import uuid4

import pytest

import app.services.ai_configuration_resolver as resolver


class FakeConfigService:
    route = {
        "feature": "calificacion_foto",
        "capability": "vision",
        "primary_provider": "open_code",
        "primary_model": "qwen3.7-plus",
        "fallback_provider": None,
        "fallback_model": None,
        "rollout_enabled": True,
        "config_version": 7,
    }
    providers = {
        "open_code": {
            "id": "open_code",
            "model": "qwen3.7-plus",
            "allow_institutional_fallback": True,
        },
        "groq": {"id": "groq", "model": "llama"},
    }

    def __init__(self, db=None):
        self.db = db

    async def get_feature_config(self, feature):
        return {**self.route, "feature": feature}

    async def get_provider_config(self, provider):
        return self.providers.get(provider, {"id": provider, "active": False})

    async def get_all_models(self):
        return [
            {
                "provider_id": "open_code",
                "model_id": "qwen3.7-plus",
                "capabilities": ["text", "vision"],
                "recommended": True,
                "active": True,
            }
        ]


@pytest.fixture(autouse=True)
def fake_service(monkeypatch):
    monkeypatch.setattr(resolver, "AIConfigService", FakeConfigService)


@pytest.mark.anyio
async def test_rollout_disabled_keeps_institutional_route(monkeypatch):
    FakeConfigService.route = {**FakeConfigService.route, "rollout_enabled": False}
    async def teacher_config(*_args, **_kwargs):
        return ({"mode": "automatic", "active": True, "version": 1}, [], {"open_code"})

    monkeypatch.setattr(resolver, "_teacher_configuration", teacher_config)

    snapshot = await resolver.resolve_ai_configuration(
        SimpleNamespace(), feature="calificacion_foto", teacher_id=uuid4()
    )

    assert snapshot["primary"]["credential_source"] == "institutional"
    assert snapshot["primary"]["model"] == "qwen3.7-plus"
    assert snapshot["rollout_enabled"] is False
    assert "secret" not in str(snapshot).lower()
    FakeConfigService.route = {**FakeConfigService.route, "rollout_enabled": True}


@pytest.mark.anyio
async def test_advanced_personal_route_requires_consent_for_fallback(monkeypatch):
    async def teacher_config(*_args, **_kwargs):
        return (
            {"mode": "advanced", "allow_institutional_fallback": False, "active": True, "version": 3},
            [{"feature": "calificacion_foto", "provider_id": "open_code", "model_id": "qwen3.7-plus", "active": True}],
            {"open_code"},
        )

    monkeypatch.setattr(resolver, "_teacher_configuration", teacher_config)
    snapshot = await resolver.resolve_ai_configuration(
        SimpleNamespace(), feature="calificacion_foto", teacher_id=uuid4()
    )

    assert snapshot["primary"] == {
        "provider": "open_code",
        "model": "qwen3.7-plus",
        "credential_source": "teacher",
    }
    assert snapshot["fallback"] is None
    assert snapshot["teacher_config_version"] == 3
    assert len(snapshot["config_hash"]) == 20


@pytest.mark.anyio
async def test_automatic_mode_selects_recommended_compatible_model(monkeypatch):
    async def teacher_config(*_args, **_kwargs):
        return (
            {"mode": "automatic", "allow_institutional_fallback": True, "active": True, "version": 2},
            [],
            {"open_code"},
        )

    async def recommended(*_args, **_kwargs):
        return "qwen3.7-plus"

    monkeypatch.setattr(resolver, "_teacher_configuration", teacher_config)
    monkeypatch.setattr(resolver, "_recommended_model", recommended)
    snapshot = await resolver.resolve_ai_configuration(
        SimpleNamespace(), feature="evaluacion_digitalizar", teacher_id=uuid4()
    )

    assert snapshot["primary"]["credential_source"] == "teacher"
    assert snapshot["primary"]["model"] == "qwen3.7-plus"
    assert snapshot["fallback"]["credential_source"] == "institutional"
    assert "api_key" not in str(snapshot).lower()


@pytest.mark.anyio
async def test_local_connector_is_limited_to_presentations(monkeypatch):
    async def teacher_config(*_args, **_kwargs):
        return (
            {"mode": "automatic", "allow_institutional_fallback": True, "active": True, "version": 4},
            [],
            {"ollama_local"},
        )

    async def recommended(*_args, provider, **_kwargs):
        return "qwen3:8b" if provider == "ollama_local" else None

    monkeypatch.setattr(resolver, "_teacher_configuration", teacher_config)
    monkeypatch.setattr(resolver, "_recommended_teacher_model", recommended)

    grading = await resolver.resolve_ai_configuration(
        SimpleNamespace(), feature="calificacion_texto", teacher_id=uuid4()
    )
    presentation = await resolver.resolve_ai_configuration(
        SimpleNamespace(), feature="presentaciones", teacher_id=uuid4()
    )

    assert grading["primary"]["credential_source"] == "institutional"
    assert presentation["primary"] == {
        "provider": "ollama_local",
        "model": "qwen3:8b",
        "credential_source": "connector",
    }
