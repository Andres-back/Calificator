from types import SimpleNamespace
from uuid import uuid4

import pytest

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


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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