from __future__ import annotations

import asyncio
import sys
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import httpx
import pytest
from fastapi import HTTPException

from app.db import base as _registered_models  # noqa: F401
from app.modules.ollama_connector import service as connector_service
from app.modules.ollama_connector.models import OllamaConnector, OllamaConnectorJob, OllamaPairingCode
from app.modules.jobs import service as jobs_service
from app.services.ollama_provider import OllamaCloudProvider, OllamaProviderError

_registered_models.import_models()

CONNECTOR_ROOT = Path(__file__).resolve().parents[3] / "connector" / "windows"
if str(CONNECTOR_ROOT) not in sys.path:
    sys.path.insert(0, str(CONNECTOR_ROOT))
from xcalificator_ollama_connector import main as windows_connector  # noqa: E402


def test_cloud_discovery_uses_bearer_and_real_capabilities() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path.endswith("/tags"):
            return httpx.Response(200, json={"models": [{"model": "qwen3-vl:235b"}]})
        return httpx.Response(200, json={"capabilities": ["completion", "vision"]})

    provider = OllamaCloudProvider("synthetic-secret", transport=httpx.MockTransport(handler))
    models = asyncio.run(provider.discover_models())

    assert models[0].model_id == "qwen3-vl:235b"
    assert models[0].capabilities == ("text", "vision")
    assert all(request.headers["Authorization"] == "Bearer synthetic-secret" for request in requests)


def test_cloud_rejects_arbitrary_base_url() -> None:
    with pytest.raises(ValueError, match="no está autorizada"):
        OllamaCloudProvider("synthetic-secret", base_url="http://127.0.0.1:11434/api")


def test_cloud_errors_do_not_echo_secret() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, text="credential rejected")

    provider = OllamaCloudProvider("do-not-leak", transport=httpx.MockTransport(handler))
    with pytest.raises(OllamaProviderError) as error:
        asyncio.run(provider.list_models())

    assert "do-not-leak" not in str(error.value)


def test_windows_connector_requires_https_except_explicit_local_development() -> None:
    assert windows_connector._validate_server("https://xcalificator.example/") == "https://xcalificator.example"
    assert windows_connector._validate_server(
        "http://127.0.0.1:8000/", allow_http_localhost=True
    ) == "http://127.0.0.1:8000"
    with pytest.raises(windows_connector.ConnectorError, match="HTTPS"):
        windows_connector._validate_server("http://classroom.example")


def test_windows_connector_accepts_only_loopback_ollama_endpoints() -> None:
    assert windows_connector._normalize_ollama_api("http://127.0.0.1:11435") == (
        "http://127.0.0.1:11435/api"
    )
    assert windows_connector._normalize_ollama_api("http://localhost:11434/api/") == (
        "http://localhost:11434/api"
    )

    for unsafe_url in (
        "https://127.0.0.1:11434/api",
        "http://192.168.1.10:11434/api",
        "http://ollama:11434/api",
        "http://user:password@127.0.0.1:11434/api",
    ):
        with pytest.raises(windows_connector.ConnectorError, match="local"):
            windows_connector._normalize_ollama_api(unsafe_url)


def test_windows_connector_discovers_real_local_capabilities(monkeypatch: pytest.MonkeyPatch) -> None:
    def ollama_json(path: str, payload=None, **_kwargs):
        if path == "/tags":
            return {"models": [{"model": "qwen3-vl:8b"}, {"name": "llama3:8b"}]}
        if payload == {"model": "qwen3-vl:8b"}:
            return {"capabilities": ["completion", "vision"]}
        return {"capabilities": ["completion"]}

    monkeypatch.setattr(windows_connector, "ollama_json", ollama_json)

    assert windows_connector.discover_models() == [
        {"model_id": "qwen3-vl:8b", "capabilities": ["text", "vision"]},
        {"model_id": "llama3:8b", "capabilities": ["text"]},
    ]


def test_windows_connector_completes_claimed_job_without_logging_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[tuple[str, str, dict | None]] = []

    monkeypatch.setattr(windows_connector, "_heartbeat", lambda *_args: None)
    ollama_calls: list[str] = []

    def ollama_json(*_args, **kwargs):
        ollama_calls.append(kwargs["api_url"])
        return {"message": {"content": "respuesta sintética"}}

    monkeypatch.setattr(windows_connector, "ollama_json", ollama_json)

    def request_json(method: str, url: str, *, payload=None, **_kwargs):
        requests.append((method, url, payload))
        return {}

    monkeypatch.setattr(windows_connector, "request_json", request_json)
    windows_connector.execute_job(
        {
            "server": "https://xcalificator.example",
            "token": "synthetic-token",
            "ollama_api": "http://127.0.0.1:11435/api",
        },
        {
            "job_id": "job-synthetic",
            "lease_token": "lease-synthetic",
            "model": "qwen3:8b",
            "payload": {
                "operation": "chat",
                "messages": [{"role": "user", "content": "contenido sintético"}],
            },
        },
    )

    assert requests == [(
        "POST",
        "https://xcalificator.example/api/connector/jobs/job-synthetic/complete",
        {
            "lease_token": "lease-synthetic",
            "result": {"message": {"content": "respuesta sintética"}},
        },
    )]
    assert ollama_calls == ["http://127.0.0.1:11435/api"]


def test_connector_pairing_consumes_code_and_hashes_device_token() -> None:
    teacher_id = uuid4()
    connector_id = uuid4()
    pairing = OllamaPairingCode(
        id=uuid4(), profesor_id=teacher_id, code_hash="synthetic",
        expires_at=connector_service._now() + timedelta(minutes=5),
    )
    db = SimpleNamespace(
        scalar=AsyncMock(return_value=pairing), add=MagicMock(),
        flush=AsyncMock(), commit=AsyncMock(), refresh=AsyncMock(),
    )

    async def assign_connector_id() -> None:
        db.add.call_args.args[0].id = connector_id

    db.flush.side_effect = assign_connector_id
    connector, token = asyncio.run(connector_service.pair_connector(
        db, code="ABCD-EFGH-JKLM", name=" Portátil aula ",
        platform="windows", version="1.0.0",
    ))

    assert connector.id == connector_id
    assert connector.name == "Portátil aula"
    assert connector.secret_hash == connector_service._hash(token)
    assert token not in connector.secret_hash
    assert pairing.used_at is not None
    assert pairing.connector_id == connector_id
    db.commit.assert_awaited_once()


def test_invalid_pairing_code_is_rejected_without_creating_connector() -> None:
    db = SimpleNamespace(scalar=AsyncMock(return_value=None), add=MagicMock())

    with pytest.raises(HTTPException) as denied:
        asyncio.run(connector_service.pair_connector(
            db, code="USED-CODE", name="Equipo", platform="windows", version=None,
        ))

    assert denied.value.status_code == 409
    db.add.assert_not_called()


def test_heartbeat_renews_only_the_matching_lease() -> None:
    connector = OllamaConnector(
        id=uuid4(), profesor_id=uuid4(), name="Equipo", platform="windows",
        secret_hash="hash", status="connected",
    )
    lease_token = "lease-token-valid-for-testing"
    original_expiry = connector_service._now() + timedelta(seconds=10)
    job = OllamaConnectorJob(
        id=uuid4(), profesor_id=connector.profesor_id, connector_id=connector.id,
        idempotency_key="job-1", feature="chat", model_id="qwen3:8b",
        payload_encrypted="payload", status="leased", attempts=1,
        lease_token_hash=connector_service._hash(lease_token),
        lease_expires_at=original_expiry,
        expires_at=connector_service._now() + timedelta(hours=1),
    )
    db = SimpleNamespace(scalar=AsyncMock(return_value=job), commit=AsyncMock())

    asyncio.run(connector_service.heartbeat_job(db, connector, job.id, lease_token))

    assert job.status == "running"
    assert job.lease_expires_at > original_expiry
    db.commit.assert_awaited_once()

    with pytest.raises(HTTPException) as denied:
        asyncio.run(connector_service.heartbeat_job(db, connector, job.id, "wrong-token-value-for-test"))
    assert denied.value.status_code == 409


def test_connector_completion_is_idempotent(monkeypatch: pytest.MonkeyPatch) -> None:
    connector = OllamaConnector(
        id=uuid4(), profesor_id=uuid4(), name="Equipo", platform="windows",
        secret_hash="hash", status="connected",
    )
    lease_token = "lease-token-valid-for-testing"
    job = OllamaConnectorJob(
        id=uuid4(), profesor_id=connector.profesor_id, connector_id=connector.id,
        idempotency_key="job-2", feature="chat", model_id="qwen3:8b",
        payload_encrypted="payload", status="leased", attempts=1,
        lease_token_hash=connector_service._hash(lease_token),
        lease_expires_at=connector_service._now() + timedelta(seconds=30),
        expires_at=connector_service._now() + timedelta(hours=1),
    )
    db = SimpleNamespace(scalar=AsyncMock(return_value=job), commit=AsyncMock())
    monkeypatch.setattr(connector_service, "encrypt_ai_secret", lambda value: "encrypted:" + value)

    first = asyncio.run(connector_service.complete_job(
        db, connector, job.id, lease_token, {"response": "resultado"},
    ))
    second = asyncio.run(connector_service.complete_job(
        db, connector, job.id, lease_token, {"response": "duplicado"},
    ))

    assert first is True
    assert second is False
    assert job.status == "completed"
    assert job.result_encrypted == 'encrypted:{"response": "resultado"}'
    assert job.lease_token_hash is None
    db.commit.assert_awaited_once()


def test_connector_completion_resumes_source_once(monkeypatch: pytest.MonkeyPatch) -> None:
    teacher_id = uuid4()
    source_job_id = uuid4()
    connector = OllamaConnector(
        id=uuid4(), profesor_id=teacher_id, name="Equipo", platform="windows",
        secret_hash="hash", status="connected",
    )
    lease_token = "lease-token-valid-for-testing"
    job = OllamaConnectorJob(
        id=uuid4(), source_job_id=source_job_id, profesor_id=teacher_id,
        connector_id=connector.id, idempotency_key="source-stage-1",
        feature="grading", model_id="qwen3:8b", payload_encrypted="payload",
        status="leased", attempts=1,
        lease_token_hash=connector_service._hash(lease_token),
        lease_expires_at=connector_service._now() + timedelta(seconds=30),
        expires_at=connector_service._now() + timedelta(hours=1),
    )
    db = SimpleNamespace(scalar=AsyncMock(return_value=job), commit=AsyncMock())
    resumed = {
        "id": source_job_id,
        "user_id": teacher_id,
        "tipo": "calificacion_lote",
        "input_json": {"evaluacion_id": str(uuid4()), "entrega_ids": [str(uuid4())]},
    }
    resume = AsyncMock(return_value=resumed)
    dispatch = MagicMock(return_value=True)
    monkeypatch.setattr(connector_service, "encrypt_ai_secret", lambda value: "encrypted:" + value)
    monkeypatch.setattr(jobs_service, "resume_job_after_connector", resume)
    monkeypatch.setattr(jobs_service, "dispatch_persisted_job", dispatch)

    first = asyncio.run(connector_service.complete_job(
        db, connector, job.id, lease_token, {"message": {"content": "respuesta"}},
    ))
    second = asyncio.run(connector_service.complete_job(
        db, connector, job.id, lease_token, {"message": {"content": "duplicado"}},
    ))

    assert first is True
    assert second is False
    resume.assert_awaited_once_with(
        db, source_job_id=source_job_id, connector_job_id=job.id,
    )
    dispatch.assert_called_once_with(resumed)
    db.commit.assert_awaited_once()


def test_connector_failure_resumes_source_for_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    teacher_id = uuid4()
    source_job_id = uuid4()
    connector = OllamaConnector(
        id=uuid4(), profesor_id=teacher_id, name="Equipo", platform="windows",
        secret_hash="hash", status="connected",
    )
    lease_token = "lease-token-valid-for-testing"
    job = OllamaConnectorJob(
        id=uuid4(), source_job_id=source_job_id, profesor_id=teacher_id,
        connector_id=connector.id, idempotency_key="source-stage-failed",
        feature="presentacion", model_id="qwen3:8b", payload_encrypted="payload",
        status="leased", attempts=1,
        lease_token_hash=connector_service._hash(lease_token),
        lease_expires_at=connector_service._now() + timedelta(seconds=30),
        expires_at=connector_service._now() + timedelta(hours=1),
    )
    db = SimpleNamespace(scalar=AsyncMock(return_value=job), commit=AsyncMock())
    resumed = {"id": source_job_id, "tipo": "presentacion", "input_json": {"presentacion_id": str(source_job_id)}}
    resume = AsyncMock(return_value=resumed)
    dispatch = MagicMock(return_value=True)
    monkeypatch.setattr(jobs_service, "resume_job_after_connector", resume)
    monkeypatch.setattr(jobs_service, "dispatch_persisted_job", dispatch)

    asyncio.run(connector_service.fail_job(
        db, connector, job.id, lease_token, "local_inference_failed",
    ))

    assert job.status == "failed"
    resume.assert_awaited_once_with(
        db, source_job_id=source_job_id, connector_job_id=job.id,
    )
    dispatch.assert_called_once_with(resumed)


def test_dispatch_persisted_grading_uses_original_identifiers(monkeypatch: pytest.MonkeyPatch) -> None:
    send_task = MagicMock()
    from app.workers.worker import celery_app

    monkeypatch.setattr(celery_app, "send_task", send_task)
    source_id, teacher_id, evaluation_id, delivery_id = (
        uuid4(), uuid4(), uuid4(), uuid4()
    )

    accepted = jobs_service.dispatch_persisted_job({
        "id": source_id,
        "user_id": teacher_id,
        "tipo": "calificacion_lote",
        "input_json": {
            "evaluacion_id": str(evaluation_id),
            "estudiante_ids": [],
            "entrega_ids": [str(delivery_id)],
        },
    })

    assert accepted is True
    send_task.assert_called_once_with(
        "tasks.grade_batch",
        kwargs={
            "evaluacion_id": str(evaluation_id),
            "estudiante_ids": [],
            "entrega_ids": [str(delivery_id)],
            "job_id": str(source_id),
            "profesor_id": str(teacher_id),
        },
    )


def test_dispatch_persisted_digitalization_requires_complete_input(monkeypatch: pytest.MonkeyPatch) -> None:
    send_task = MagicMock()
    from app.workers.worker import celery_app

    monkeypatch.setattr(celery_app, "send_task", send_task)
    source_id, teacher_id, subject_id = uuid4(), uuid4(), uuid4()
    payload = {
        "materia_id": str(subject_id),
        "file_key": "digitalizaciones/safe-key",
        "filename": "evaluacion.pdf",
        "nombre": "Evaluación",
        "descripcion": None,
        "nota_maxima": "5",
        "modalidad": "papel",
    }

    assert jobs_service.dispatch_persisted_job({
        "id": source_id, "user_id": teacher_id,
        "tipo": "evaluacion_digitalizacion", "input_json": payload,
    }) is True
    assert jobs_service.dispatch_persisted_job({
        "id": source_id, "user_id": teacher_id,
        "tipo": "evaluacion_digitalizacion", "input_json": {"nombre": "incompleta"},
    }) is False
    send_task.assert_called_once()


def test_revocation_invalidates_connector_and_releases_leases() -> None:
    teacher_id = uuid4()
    connector = OllamaConnector(
        id=uuid4(), profesor_id=teacher_id, name="Equipo", platform="windows",
        secret_hash="previous-hash", status="connected", active=True,
    )
    db = SimpleNamespace(
        scalar=AsyncMock(side_effect=[connector, uuid4()]),
        execute=AsyncMock(), flush=AsyncMock(), commit=AsyncMock(),
    )

    asyncio.run(connector_service.revoke_connector(
        db, connector_id=connector.id, profesor_id=teacher_id,
    ))

    assert connector.active is False
    assert connector.status == "revoked"
    assert connector.revoked_at is not None
    assert connector.secret_hash != "previous-hash"
    db.execute.assert_awaited_once()
    db.flush.assert_awaited_once()
    db.commit.assert_awaited_once()

    isolated_db = SimpleNamespace(scalar=AsyncMock(return_value=None))
    with pytest.raises(HTTPException) as denied:
        asyncio.run(connector_service.revoke_connector(
            isolated_db, connector_id=connector.id, profesor_id=uuid4(),
        ))
    assert denied.value.status_code == 404


def test_revoking_last_connector_releases_suspended_source(monkeypatch: pytest.MonkeyPatch) -> None:
    teacher_id, source_job_id = uuid4(), uuid4()
    connector = OllamaConnector(
        id=uuid4(), profesor_id=teacher_id, name="Único equipo", platform="windows",
        secret_hash="hash", status="connected", active=True,
    )
    connector_job = OllamaConnectorJob(
        id=uuid4(), source_job_id=source_job_id, profesor_id=teacher_id,
        idempotency_key="presentation:1", feature="presentacion",
        model_id="qwen3:8b", payload_encrypted="payload",
        status="waiting_connector",
        expires_at=connector_service._now() + timedelta(hours=1),
    )
    db = SimpleNamespace(
        scalar=AsyncMock(side_effect=[connector, None]),
        scalars=AsyncMock(return_value=[connector_job]),
        execute=AsyncMock(), flush=AsyncMock(), commit=AsyncMock(),
    )
    source = {
        "id": source_job_id,
        "tipo": "presentacion",
        "input_json": {"presentacion_id": str(source_job_id)},
    }
    resume = AsyncMock(return_value=source)
    dispatch = MagicMock(return_value=True)
    monkeypatch.setattr(jobs_service, "resume_job_after_connector", resume)
    monkeypatch.setattr(jobs_service, "dispatch_persisted_job", dispatch)

    asyncio.run(connector_service.revoke_connector(
        db, connector_id=connector.id, profesor_id=teacher_id,
    ))

    assert connector_job.status == "failed"
    assert connector_job.error_code == "connector_revoked"
    resume.assert_awaited_once_with(
        db, source_job_id=source_job_id, connector_job_id=connector_job.id,
    )
    dispatch.assert_called_once_with(source)
