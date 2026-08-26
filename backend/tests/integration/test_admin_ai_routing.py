from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

import app.modules.admin_ai_config.router as router
from app.modules.admin_ai_config.schemas import (
    AIConfigurationPublication,
    AIModel,
    AIProvider,
    FeatureRouting,
    FeatureRoutingPublication,
)


class Rows:
    def __init__(self, versions):
        self.versions = versions

    def fetchall(self):
        return [SimpleNamespace(config_version=value) for value in self.versions]


class FakeDB:
    def __init__(self, versions=(4,)):
        self.versions = versions

    async def execute(self, _statement, _params=None):
        return Rows(self.versions)


class FakeService:
    saved = []
    published = []
    restored_version = 8

    def __init__(self, db=None):
        self.db = db

    async def init(self):
        return None

    async def get_all_providers(self):
        return [{"id": "open_code", "active": True, "model": "qwen3.7-plus"}]

    async def get_all_models(self):
        return [{"provider_id": "open_code", "model_id": "qwen3.7-plus", "active": True, "capabilities": ["vision", "text"]}]

    async def save_features(self, features, admin_id=None):
        self.saved.append((features, admin_id))

    async def publish_configuration(self, providers, models, features, admin_id=None):
        self.published.append((providers, models, features, admin_id))
        return 5

    async def restore_previous_configuration(self, admin_id=None):
        return self.restored_version


@pytest.fixture(autouse=True)
def fake_service(monkeypatch):
    FakeService.saved = []
    FakeService.published = []
    FakeService.restored_version = 8
    monkeypatch.setattr(router, "AIConfigService", FakeService)


def publication(version=4, capability="vision"):
    return FeatureRoutingPublication(
        expected_version=version,
        features=[FeatureRouting(
            feature="calificacion_foto", label="Calificación por foto", capability=capability,
            primary_provider="open_code", primary_model="qwen3.7-plus",
            fallback_provider=None, rollout_enabled=True, config_version=version, active=True,
        )],
    )


@pytest.mark.asyncio
async def test_feature_publication_rejects_a_stale_admin_version():
    with pytest.raises(HTTPException) as exc:
        await router.save_features(
            publication(version=3),
            current_user=SimpleNamespace(id=uuid4(), rol="admin"),
            db=FakeDB((4,)),
        )
    assert exc.value.status_code == 409
    assert FakeService.saved == []


@pytest.mark.asyncio
async def test_feature_publication_validates_then_saves_the_complete_set():
    admin_id = uuid4()
    result = await router.save_features(
        publication(version=4),
        current_user=SimpleNamespace(id=admin_id, rol="admin"),
        db=FakeDB((4, 4)),
    )
    assert result["status"] == "ok"
    assert len(FakeService.saved) == 1
    saved, actor = FakeService.saved[0]
    assert actor == admin_id
    assert saved[0]["primary_model"] == "qwen3.7-plus"
    assert saved[0]["rollout_enabled"] is True


@pytest.mark.asyncio
async def test_incompatible_model_rolls_back_before_persistence():
    with pytest.raises(HTTPException) as exc:
        await router.save_features(
            publication(version=4, capability="embedding"),
            current_user=SimpleNamespace(id=uuid4(), rol="admin"),
            db=FakeDB((4,)),
        )
    assert exc.value.status_code == 422
    assert FakeService.saved == []

def atomic_publication(*, referenced_model_active=True):
    return AIConfigurationPublication(
        expected_version=4,
        providers=[AIProvider(
            id="open_code", name="open_code", tipo="texto", label="OpenCode",
            model="qwen3.7-plus", active=True, priority=1,
        )],
        models=[
            AIModel(
                provider_id="open_code", model_id="qwen3.7-plus", label="Qwen",
                capabilities=["vision", "text"], recommended=True,
                active=referenced_model_active,
            ),
            AIModel(
                provider_id="open_code", model_id="qwen3.6-plus", label="Qwen anterior",
                capabilities=["vision", "text"], recommended=False, active=False,
            ),
        ],
        features=[FeatureRouting(
            feature="calificacion_foto", label="Calificación", capability="vision",
            primary_provider="open_code", primary_model="qwen3.7-plus",
            fallback_provider=None, rollout_enabled=True, config_version=4, active=True,
        )],
    )


@pytest.mark.asyncio
async def test_atomic_publication_accepts_disabling_an_unused_model():
    admin_id = uuid4()
    result = await router.publish_ai_configuration(
        atomic_publication(),
        current_user=SimpleNamespace(id=admin_id, rol="admin"),
        db=FakeDB((4,)),
    )
    assert result["version"] == 5
    assert FakeService.published[0][1][1]["active"] is False
    assert FakeService.published[0][3] == admin_id


@pytest.mark.asyncio
async def test_atomic_publication_rejects_disabling_a_referenced_model():
    with pytest.raises(HTTPException) as exc:
        await router.publish_ai_configuration(
            atomic_publication(referenced_model_active=False),
            current_user=SimpleNamespace(id=uuid4(), rol="admin"),
            db=FakeDB((4,)),
        )
    assert exc.value.status_code == 422
    assert FakeService.published == []


@pytest.mark.asyncio
async def test_restore_previous_configuration_returns_new_version():
    result = await router.restore_previous_configuration(
        current_user=SimpleNamespace(id=uuid4(), rol="admin"),
        db=FakeDB((4,)),
    )
    assert result["version"] == 8
    assert "última configuración" in result["detail"]