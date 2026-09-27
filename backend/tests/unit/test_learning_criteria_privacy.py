from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.modules.criterios_aprendizaje import audit as criteria_audit
from app.modules.criterios_aprendizaje import generation_service
from app.workers.tasks_learning_criteria import safe_failure_code


def test_audit_keeps_identifiers_and_drops_content_urls_and_keys(monkeypatch) -> None:
    sink = AsyncMock()
    monkeypatch.setattr(criteria_audit, "audit", sink)
    set_id = uuid4()
    version_id = uuid4()

    asyncio.run(criteria_audit.audit_criteria_event(
        AsyncMock(),
        event="source_added",
        actor_id=uuid4(),
        set_id=set_id,
        version_id=version_id,
        extra={
            "source_id": str(uuid4()),
            "source_type": "foto",
            "page_count": 2,
            "contenido": "Respuesta privada del estudiante",
            "private_file_key": "learning-criteria/secret/document.pdf",
            "url": "https://private.example.test/document.pdf",
            "api_key": "sk-secret",
            "imagen": b"private-bytes",
        },
    ))

    metadata = sink.await_args.kwargs["metadata"]
    assert metadata["criterion_set_id"] == str(set_id)
    assert metadata["criterion_version_id"] == str(version_id)
    assert metadata["source_type"] == "foto"
    assert metadata["page_count"] == 2
    serialized = str(metadata).lower()
    for forbidden in ("respuesta privada", "private_file_key", "private.example", "sk-secret", "private-bytes"):
        assert forbidden not in serialized


def test_worker_exposes_only_known_failure_codes() -> None:
    assert safe_failure_code(ValueError("criteria_version_missing")) == "criteria_version_missing"
    assert safe_failure_code(ValueError("criteria_context_insufficient")) == "criteria_context_insufficient"
    assert safe_failure_code(ValueError("criteria_api_key_sk-secret")) == "criteria_generation_failed"
    assert safe_failure_code(RuntimeError("https://private.example.test/document.pdf")) == "criteria_generation_failed"


def test_generation_job_persists_only_ids_hashes_and_control_fields(monkeypatch) -> None:
    version = SimpleNamespace(
        id=uuid4(),
        estado="borrador",
        teacher_intent_json={"que_evaluar": "Texto docente privado sk-secret"},
        source_fingerprint=None,
        generation_meta_json={},
        revision=1,
    )
    source = SimpleNamespace(
        id=uuid4(),
        content_hash="a" * 64,
        orden=1,
        tipo="foto",
    )
    actor = SimpleNamespace(id=uuid4())
    db = MagicMock()
    db.scalars = AsyncMock(return_value=[source])
    db.execute = AsyncMock(return_value=SimpleNamespace(first=lambda: None))
    db.commit = AsyncMock()
    monkeypatch.setattr(
        generation_service.authorization,
        "get_version_for_management",
        AsyncMock(return_value=(version, SimpleNamespace(id=uuid4()))),
    )
    create_job = AsyncMock(return_value=uuid4())
    monkeypatch.setattr(generation_service.jobs_service, "create_job", create_job)
    monkeypatch.setattr(generation_service.jobs_service, "dispatch_persisted_job", MagicMock(return_value=True))

    asyncio.run(generation_service.queue_proposal(
        db,
        version_id=version.id,
        regenerate=False,
        actor=actor,
    ))

    job_input = create_job.await_args.kwargs["input_json"]
    assert set(job_input) == {"version_id", "fingerprint", "regenerar", "prompt_version"}
    serialized = str(job_input).lower()
    assert "texto docente privado" not in serialized
    assert "sk-secret" not in serialized
    assert "private_file" not in serialized
