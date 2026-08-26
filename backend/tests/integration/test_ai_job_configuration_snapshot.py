import json
from uuid import uuid4

import pytest

from app.modules.jobs.service import create_job


class RecordingSession:
    def __init__(self):
        self.params = None

    async def execute(self, _statement, params):
        self.params = params


@pytest.mark.asyncio
async def test_job_persists_sanitized_immutable_routing_snapshot(monkeypatch):
    resolved_calls = []

    async def resolve(*_args, **kwargs):
        resolved_calls.append(kwargs)
        return {
            "feature": "calificacion_foto",
            "primary": {"provider": "open_code", "model": "qwen3.7-plus", "credential_source": "teacher"},
            "fallback": None,
            "config_hash": "abc123",
            "captured_at": "2026-08-25T00:00:00Z",
        }

    monkeypatch.setattr("app.services.ai_configuration_resolver.resolve_ai_configuration", resolve)
    db = RecordingSession()
    teacher_id = uuid4()
    await create_job(
        db,
        user_id=teacher_id,
        tipo="calificacion_lote",
        input_json={"evaluacion_id": str(uuid4())},
    )

    payload = json.loads(db.params["input_json"])
    assert resolved_calls == [{
        "feature": "calificacion_foto",
        "teacher_id": teacher_id,
    }]
    assert payload["_ai_config"]["primary"]["model"] == "qwen3.7-plus"
    serialized = json.dumps(payload).lower()
    assert "api_key" not in serialized
    assert "secret" not in serialized
    assert "bearer" not in serialized