from __future__ import annotations

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from app.modules.criterios_aprendizaje import application_service
from app.modules.evaluaciones.generation_service import build_generation_prompt
from app.modules.evaluaciones.schemas import EvaluacionGenerarRequest
from app.modules.criterios_aprendizaje.schemas import LearningCriterionInput
from app.modules.criterios_aprendizaje.service import _replace_criteria
from fastapi import HTTPException
import pytest


def _snapshot(version_id, set_id):
    return {
        "schema_version": 1,
        "version_id": str(version_id),
        "set_id": str(set_id),
        "criterios": [
            {
                "stable_key": "argumentacion",
                "nombre": "Argumentación",
                "descripcion": "Explica el procedimiento.",
                "evidencia_esperada": "Procedimiento visible.",
                "peso_porcentaje": 100.0,
                "puntaje_maximo": 5.0,
                "niveles": [],
                "official_standard_refs": [],
            }
        ],
    }


def test_application_dual_writes_evaluation_without_touching_grade(monkeypatch) -> None:
    version_id, set_id, actor_id = uuid4(), uuid4(), uuid4()
    snapshot = _snapshot(version_id, set_id)
    version = SimpleNamespace(id=version_id)
    criterion_set = SimpleNamespace(id=set_id)
    application = SimpleNamespace(id=uuid4())
    monkeypatch.setattr(
        application_service,
        "_approved_snapshot",
        AsyncMock(return_value=(version, criterion_set, snapshot)),
    )
    persist = AsyncMock(return_value=application)
    monkeypatch.setattr(application_service, "_persist_application", persist)
    evaluation = SimpleNamespace(
        id=uuid4(),
        materia_id=uuid4(),
        criterios=[],
        blueprint=SimpleNamespace(criterios=[]),
        nota_existente=Decimal("4.50"),
    )

    result = asyncio.run(
        application_service.apply_to_evaluation(
            AsyncMock(),
            evaluation=evaluation,
            version_id=version_id,
            actor_id=actor_id,
        )
    )

    assert result is application
    assert evaluation.criterios[0]["learning_criterion_key"] == "argumentacion"
    assert evaluation.blueprint.criterios == evaluation.criterios
    assert evaluation.nota_existente == Decimal("4.50")
    persist.assert_awaited_once()


def test_later_snapshot_changes_do_not_mutate_applied_payload(monkeypatch) -> None:
    version_id, set_id = uuid4(), uuid4()
    snapshot = _snapshot(version_id, set_id)
    stored = []

    async def persist(_db, **kwargs):
        stored.append(kwargs["snapshot"])
        return SimpleNamespace(id=uuid4())

    monkeypatch.setattr(
        application_service,
        "_approved_snapshot",
        AsyncMock(return_value=(SimpleNamespace(id=version_id), SimpleNamespace(id=set_id), snapshot)),
    )
    monkeypatch.setattr(application_service, "_persist_application", persist)
    evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4(), criterios=[], blueprint=None)
    asyncio.run(
        application_service.apply_to_evaluation(
            AsyncMock(), evaluation=evaluation, version_id=version_id, actor_id=uuid4()
        )
    )
    snapshot["criterios"][0]["nombre"] = "Versión posterior"

    # El dual-write y la aplicación se construyeron antes de la mutación externa.
    assert evaluation.criterios[0]["nombre"] == "Argumentación"
    assert stored[0]["version_id"] == str(version_id)


def test_generation_prompt_receives_approved_learning_evidence() -> None:
    request = EvaluacionGenerarRequest(
        materia_id=uuid4(), nombre="Fracciones", tema="Fracciones equivalentes",
        cantidad_preguntas=3, tipos_pregunta=["abierta"],
    )
    prompt = build_generation_prompt(
        request,
        materia_area="Matemáticas",
        materia_grado="5",
        dba_records=[],
        rag_chunks=[],
        approved_criteria={"criterios": [{
            "nombre": "Procedimiento",
            "descripcion": "Compara fracciones",
            "evidencia_esperada": "Justifica la equivalencia",
        }]},
    )

    assert "Justifica la equivalencia" in prompt
    assert "Fracciones equivalentes" in prompt


def test_criterion_cannot_claim_a_source_from_another_version() -> None:
    db = AsyncMock()
    db.scalars.return_value = []
    version = SimpleNamespace(id=uuid4())
    item = LearningCriterionInput(
        nombre="Procedimiento", descripcion="Explica los pasos.",
        evidencia_esperada="Cálculo visible.", peso_porcentaje=Decimal("100"),
        source_refs=[{"source_id": str(uuid4()), "pagina": 1}],
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(_replace_criteria(db, version, [item]))
    assert error.value.status_code == 422
    db.execute.assert_not_awaited()
