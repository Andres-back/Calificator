from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.admin_ai_config import router as admin_ai_router
from app.services.ai_credentials_service import (
    delete_teacher_ai_credential,
    decrypt_ai_secret,
    encrypt_ai_secret,
    upsert_teacher_ai_credential,
)


class RecordingSession:
    def __init__(self, rowcount=1):
        self.calls = []
        self.rowcount = rowcount

    async def execute(self, statement, params):
        self.calls.append((str(statement), params))
        return SimpleNamespace(rowcount=self.rowcount)


@pytest.mark.anyio
async def test_upsert_encrypts_and_never_passes_plaintext_to_sql(monkeypatch):
    monkeypatch.setattr("app.services.ai_credentials_service.settings.SECRET_KEY", "test-secret-at-least-32-characters-long")
    db = RecordingSession()
    raw = "teacher-private-key-1234"

    await upsert_teacher_ai_credential(
        db, teacher_id=uuid4(), provider_id="open_code", api_key=raw
    )

    statement, params = db.calls[0]
    assert "ON CONFLICT (profesor_id, provider_id)" in statement
    assert raw not in str(params)
    assert params["secret"].startswith("enc:v1:")
    assert decrypt_ai_secret(params["secret"]) == raw
    assert params["last_four"] == "1234"


@pytest.mark.anyio
async def test_delete_is_scoped_by_teacher_and_provider():
    db = RecordingSession(rowcount=1)
    teacher = uuid4()

    deleted = await delete_teacher_ai_credential(
        db, teacher_id=teacher, provider_id="openai"
    )

    statement, params = db.calls[0]
    assert "profesor_id=:teacher" in statement
    assert "provider_id=:provider" in statement
    assert params == {"teacher": str(teacher), "provider": "openai"}
    assert deleted is True


def test_encryption_is_nondeterministic_and_round_trips(monkeypatch):
    monkeypatch.setattr("app.services.ai_credentials_service.settings.SECRET_KEY", "test-secret-at-least-32-characters-long")
    first = encrypt_ai_secret("same-key")
    second = encrypt_ai_secret("same-key")
    assert first != second
    assert decrypt_ai_secret(first) == "same-key"


@pytest.mark.anyio
async def test_ollama_cloud_credentials_are_encrypted_and_isolated_by_teacher(monkeypatch):
    monkeypatch.setattr("app.services.ai_credentials_service.settings.SECRET_KEY", "test-secret-at-least-32-characters-long")
    first_teacher = uuid4()
    second_teacher = uuid4()
    first_db = RecordingSession()
    second_db = RecordingSession()

    await upsert_teacher_ai_credential(
        first_db, teacher_id=first_teacher, provider_id="ollama", api_key="ollama-teacher-one"
    )
    await upsert_teacher_ai_credential(
        second_db, teacher_id=second_teacher, provider_id="ollama", api_key="ollama-teacher-two"
    )

    first_params = first_db.calls[0][1]
    second_params = second_db.calls[0][1]
    assert first_params["teacher"] == str(first_teacher)
    assert second_params["teacher"] == str(second_teacher)
    assert first_params["provider"] == second_params["provider"] == "ollama"
    assert first_params["secret"] != second_params["secret"]
    assert "ollama-teacher-one" not in str(first_params)
    assert "ollama-teacher-two" not in str(second_params)
    assert decrypt_ai_secret(first_params["secret"]) == "ollama-teacher-one"
    assert decrypt_ai_secret(second_params["secret"]) == "ollama-teacher-two"


@pytest.mark.anyio
async def test_ollama_local_is_rejected_for_every_student_evidence_feature(monkeypatch):
    sensitive_features = {
        "calificacion_texto": "text",
        "calificacion_foto": "vision",
        "evaluacion_digitalizar": "vision",
        "vision_ocr": "vision",
    }

    class FakeConfigService:
        def __init__(self, *, db):
            self.db = db

        async def get_all_providers(self):
            return []

        async def get_all_models(self):
            return []

        async def get_all_features(self):
            return [
                {"feature": feature, "active": True, "capability": capability}
                for feature, capability in sensitive_features.items()
            ]

    monkeypatch.setattr(admin_ai_router, "AIConfigService", FakeConfigService)
    for feature in sensitive_features:
        preference = SimpleNamespace(
            feature=feature,
            provider="ollama_local",
            model="qwen3-vl:8b",
            active=True,
        )
        with pytest.raises(HTTPException) as denied:
            await admin_ai_router._validate_teacher_preferences(
                object(), [preference], teacher_id=uuid4()
            )
        assert denied.value.status_code == 422
        assert "únicamente para presentaciones" in denied.value.detail
