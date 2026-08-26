import asyncio
import json
from uuid import uuid4

import pytest

from app.modules.jobs.service import (
    claim_stale_queued_jobs,
    create_job,
    get_job_input,
    get_job_queue_time_ms,
)


class RecordingSession:
    def __init__(self):
        self.params = None

    async def execute(self, _statement, params):
        self.params = params


class ScalarRecordingSession:
    def __init__(self, values):
        self.values = iter(values)
        self.calls = []

    async def scalar(self, statement):
        self.calls.append((str(statement), statement.compile().params))
        return next(self.values)


class MappingResult:
    def __init__(self, rows):
        self.rows = rows

    def mappings(self):
        return self

    def all(self):
        return self.rows


class RecoveryRecordingSession:
    def __init__(self, rows):
        self.rows = rows
        self.statement = ""
        self.params = None

    async def execute(self, statement, params):
        self.statement = str(statement)
        self.params = params
        return MappingResult(self.rows)


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


def test_job_reads_cast_text_parameters_to_postgresql_uuid():
    job_id = uuid4()
    db = ScalarRecordingSession([{"feature": "calificacion_foto"}, 1250])

    async def run_reads():
        return await get_job_input(db, job_id), await get_job_queue_time_ms(db, job_id)

    payload, queue_ms = asyncio.run(run_reads())

    assert payload == {"feature": "calificacion_foto"}
    assert queue_ms == 1250
    assert len(db.calls) == 2
    for statement, params in db.calls:
        assert "id=CAST(:id AS uuid)" in statement
        assert params == {"id": job_id}


def test_stale_job_selection_is_throttled_and_excludes_started_jobs():
    job_id = uuid4()
    db = RecoveryRecordingSession(
        [{"id": job_id, "user_id": uuid4(), "input_json": {"evaluacion_id": "e"}}]
    )

    rows = asyncio.run(
        claim_stale_queued_jobs(
            db,
            tipo="calificacion_lote",
            stale_seconds=300,
            limit=25,
        )
    )

    assert rows[0]["id"] == job_id
    assert "started_at IS NULL" in db.statement
    assert "recovery_enqueued_at" in db.statement
    assert "FOR UPDATE SKIP LOCKED" in db.statement
    assert db.params["stale_seconds"] == 300
    assert db.params["limit"] == 25
