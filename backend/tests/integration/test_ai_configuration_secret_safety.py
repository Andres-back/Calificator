import json
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.modules.admin_ai_config.schemas import TeacherAIConfigRead
from app.services.ai_credentials_service import upsert_teacher_ai_credential


class RecordingDB:
    def __init__(self):
        self.params = []

    async def execute(self, _statement, params):
        self.params.append(params)
        return SimpleNamespace(rowcount=1)


@pytest.mark.asyncio
async def test_synthetic_secret_never_appears_in_public_contract_or_plain_sql(monkeypatch):
    monkeypatch.setattr("app.services.ai_credentials_service.settings.SECRET_KEY", "secret-safety-key-at-least-32-characters")
    synthetic = "sk-synthetic-never-log-9876"
    db = RecordingDB()
    await upsert_teacher_ai_credential(
        db, teacher_id=uuid4(), provider_id="openai", api_key=synthetic
    )
    assert synthetic not in json.dumps(db.params)

    public = TeacherAIConfigRead(
        mode="automatic", allow_institutional_fallback=True, active=True, version=1,
        credentials=[{"provider_id": "openai", "configured": True, "last_four": "9876"}],
    ).model_dump(mode="json")
    serialized = json.dumps(public).lower()
    assert synthetic.lower() not in serialized
    assert "secret_encrypted" not in serialized
    assert "api_key" not in serialized