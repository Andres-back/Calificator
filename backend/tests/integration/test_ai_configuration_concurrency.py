import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest

import app.services.ai_configuration_resolver as resolver

class FakeConfigService:
    def __init__(self, db=None):
        self.db = db

    async def get_feature_config(self, feature):
        return {
            "feature": feature, "capability": "vision", "primary_provider": "open_code",
            "primary_model": "qwen3.7-plus", "fallback_provider": None,
            "rollout_enabled": True, "config_version": 1,
        }

    async def get_provider_config(self, provider):
        return {"id": provider, "model": "qwen3.7-plus", "allow_institutional_fallback": True}


@pytest.mark.asyncio
async def test_three_teachers_resolve_concurrently_without_crossing_identity(monkeypatch):
    monkeypatch.setattr(resolver, "AIConfigService", FakeConfigService)
    teachers = [uuid4(), uuid4(), uuid4()]

    async def teacher_config(_db, teacher_id):
        await asyncio.sleep(0)
        return (
            {"mode": "advanced", "allow_institutional_fallback": False, "active": True, "version": teachers.index(teacher_id) + 1},
            [{"feature": "calificacion_foto", "provider_id": "open_code", "model_id": f"model-{teachers.index(teacher_id)}", "active": True}],
            {"open_code"},
        )

    monkeypatch.setattr(resolver, "_teacher_configuration", teacher_config)
    snapshots = await asyncio.gather(*[
        resolver.resolve_ai_configuration(SimpleNamespace(), feature="calificacion_foto", teacher_id=teacher)
        for teacher in teachers
    ])

    assert [item["primary"]["model"] for item in snapshots] == ["model-0", "model-1", "model-2"]
    assert [item["teacher_config_version"] for item in snapshots] == [1, 2, 3]
    assert all("teacher_id" not in item and "api_key" not in str(item).lower() for item in snapshots)