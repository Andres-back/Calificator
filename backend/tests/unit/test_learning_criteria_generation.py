from __future__ import annotations

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.modules.criterios_aprendizaje import generation_service
from app.modules.criterios_aprendizaje.generation_service import normalize_proposal
from app.services.vision_extractor import VisionExtractionError
from app.shared.enums import JobEstado


def test_proposal_is_bounded_to_known_sources_and_sums_one_hundred() -> None:
    source_id = str(uuid4())
    criteria, coverage = normalize_proposal(
        {
            "criterios": [
                {
                    "nombre": "Comprende el concepto",
                    "descripcion": "Explica el concepto con sus propias palabras.",
                    "evidencia_esperada": "Una explicación relacionada con el material.",
                    "source_refs": [
                        {"source_id": source_id, "pagina": 2},
                        {"source_id": str(uuid4()), "pagina": 1},
                    ],
                },
                {
                    "nombre": "Aplica el procedimiento",
                    "descripcion": "Usa el procedimiento en una situación nueva.",
                    "evidencia_esperada": "Procedimiento visible y resultado coherente.",
                },
                {
                    "nombre": "Justifica su respuesta",
                    "descripcion": "Relaciona el resultado con los datos disponibles.",
                    "evidencia_esperada": "Argumento breve basado en el ejercicio.",
                },
            ],
            "cobertura": {"resumen": "Cubre la intención", "advertencias": []},
        },
        {source_id},
    )

    assert sum((item.peso_porcentaje for item in criteria), Decimal("0")) == Decimal("100.00")
    assert criteria[0].source_refs == [{"source_id": source_id, "pagina": 2}]
    assert all(len(item.niveles) == 4 for item in criteria)
    assert coverage["resumen"] == "Cubre la intención"


def test_empty_or_vague_provider_contract_is_not_accepted() -> None:
    with pytest.raises(ValueError, match="no devolvió criterios"):
        normalize_proposal({"criterios": []}, set())


def test_proposal_rejects_a_page_outside_the_uploaded_document() -> None:
    source_id = str(uuid4())
    criteria, _coverage = normalize_proposal({"criterios": [{
        "nombre": "Comprensión",
        "descripcion": "Interpreta la idea principal.",
        "evidencia_esperada": "Explicación justificada.",
        "source_refs": [{"source_id": source_id, "pagina": 99}],
    }]}, {source_id}, {source_id: 2})

    assert criteria[0].source_refs == []


def test_provider_cannot_hide_incomplete_criteria_among_valid_rows() -> None:
    criteria, _coverage = normalize_proposal(
        {
            "criterios": [
                {"nombre": "X", "descripcion": "no", "evidencia_esperada": ""},
                {
                    "nombre": "Producción escrita",
                    "descripcion": "Organiza las ideas en una secuencia comprensible.",
                    "evidencia_esperada": "Texto con inicio, desarrollo y cierre.",
                },
            ]
        },
        set(),
    )

    assert [item.nombre for item in criteria] == ["Producción escrita"]
    assert criteria[0].peso_porcentaje == Decimal("100.00")


def _generation_db() -> MagicMock:
    db = MagicMock()
    db.get = AsyncMock()
    db.scalars = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    return db


def test_queue_reuses_active_and_completed_job_for_the_same_fingerprint(monkeypatch) -> None:
    actor = SimpleNamespace(id=uuid4())
    active_id = uuid4()
    version = SimpleNamespace(
        id=uuid4(),
        estado="procesando",
        teacher_intent_json={"que_evaluar": "Comprensión"},
        source_fingerprint=None,
        generation_meta_json={},
    )
    criterion_set = SimpleNamespace(id=uuid4())
    db = _generation_db()
    db.scalars.return_value = []
    monkeypatch.setattr(
        generation_service.authorization,
        "get_version_for_management",
        AsyncMock(return_value=(version, criterion_set)),
    )

    class ActiveResult:
        def first(self):
            return SimpleNamespace(id=active_id, estado=JobEstado.RUNNING.value)

    db.execute.return_value = ActiveResult()
    create_job = AsyncMock()
    monkeypatch.setattr(generation_service.jobs_service, "create_job", create_job)
    found_id, state = asyncio.run(
        generation_service.queue_proposal(db, version_id=version.id, regenerate=False, actor=actor)
    )
    assert (found_id, state) == (active_id, JobEstado.RUNNING.value)
    create_job.assert_not_awaited()

    completed_id = uuid4()
    version.estado = "requiere_revision"
    version.source_fingerprint = generation_service._source_fingerprint(version, [])
    version.generation_meta_json = {"job_id": str(completed_id)}

    class EmptyResult:
        def first(self):
            return None

    db.execute.return_value = EmptyResult()
    found_id, state = asyncio.run(
        generation_service.queue_proposal(db, version_id=version.id, regenerate=False, actor=actor)
    )
    assert (found_id, state) == (completed_id, JobEstado.SUCCESS.value)
    create_job.assert_not_awaited()


def test_generation_without_source_or_teacher_intent_fails_before_calling_a_model(monkeypatch) -> None:
    version = SimpleNamespace(
        id=uuid4(),
        set_id=uuid4(),
        teacher_intent_json={"que_evaluar": ""},
    )
    db = _generation_db()
    db.get.return_value = version
    db.scalars.return_value = []
    llm = MagicMock()
    monkeypatch.setattr(generation_service, "LLMRouter", llm)

    with pytest.raises(ValueError, match="criteria_context_insufficient"):
        asyncio.run(
            generation_service.run_proposal(
                db,
                version_id=version.id,
                user_id=uuid4(),
                job_id=uuid4(),
                ai_config={},
            )
        )

    llm.assert_not_called()
    db.commit.assert_not_awaited()


def test_visual_extractor_honors_interchangeable_provider_and_teacher_credential(monkeypatch) -> None:
    captured: dict = {}

    class Extractor:
        def __init__(self, **kwargs) -> None:
            captured.update(kwargs)

    credential = AsyncMock(return_value="teacher-private-key")
    monkeypatch.setattr(generation_service, "VisionExtractor", Extractor)
    monkeypatch.setattr(generation_service, "get_teacher_ai_credential", credential)
    user_id = uuid4()

    asyncio.run(
        generation_service._vision_extractor(
            _generation_db(),
            user_id=user_id,
            ai_config={
                "stages": {
                    "extraction": {
                        "primary": {
                            "provider": "ollama",
                            "model": "qwen3-vl:cloud",
                            "credential_source": "teacher",
                        }
                    }
                }
            },
        )
    )

    assert captured["provider"] == "ollama"
    assert captured["primary_model"] == "qwen3-vl:cloud"
    assert captured["api_key"] == "teacher-private-key"
    assert captured["tracking"] == {"teacher_id": str(user_id), "feature": "criterios_aprendizaje"}


def test_only_temporary_provider_failures_are_recoverable() -> None:
    assert generation_service.transient_generation_error(
        VisionExtractionError("vision_timeout", temporary=True)
    ) is True
    assert generation_service.transient_generation_error(
        VisionExtractionError("vision_invalid_file", temporary=False)
    ) is False
    assert generation_service.transient_generation_error(RuntimeError("503 transport unavailable")) is True
    assert generation_service.transient_generation_error(ValueError("invalid rubric")) is False
