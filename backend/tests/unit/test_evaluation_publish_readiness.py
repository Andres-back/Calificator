from __future__ import annotations

import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.evaluaciones import service
from app.shared.enums import EvaluacionEstado, EvaluacionModalidad


class FakeDB:
    def __init__(self) -> None:
        self.commits = 0

    async def commit(self) -> None:
        self.commits += 1


def _evaluation(
    *,
    questions: list[dict],
    expected_answers: list[dict],
    modality: str = EvaluacionModalidad.ONLINE.value,
    strategy: str = "ia_asistida",
) -> SimpleNamespace:
    questions = [dict(item) for item in questions]
    for question in questions:
        question.setdefault("puntaje", 5 / len(questions))

    return SimpleNamespace(
        id=uuid4(),
        estado=EvaluacionEstado.BORRADOR.value,
        recepcion_habilitada=False,
        fecha_publicacion=None,
        modalidad=modality,
        nota_maxima=5,
        criterios=[{"nombre": "Dominio", "puntaje_maximo": 5}],
        preguntas=questions,
        respuestas_esperadas=expected_answers,
        dba_ids=[],
        dba_personalizado_ids=[],
        blueprint=SimpleNamespace(
            criterios=[{"nombre": "Dominio", "puntaje_maximo": 5}],
            preguntas=questions,
            respuestas_esperadas=expected_answers,
            reglas_feedback={"estrategia_calificacion": strategy},
        ),
    )


@pytest.mark.parametrize(
    "evaluation",
    [
        _evaluation(questions=[], expected_answers=[]),
        _evaluation(
            questions=[
                {
                    "numero": 1,
                    "tipo": "opcion_multiple",
                    "enunciado": "Cuanto es 4 x 9?",
                    "opciones": ["32", "36", "40"],
                }
            ],
            expected_answers=[],
        ),
    ],
    ids=["empty-structure", "objective-question-without-key"],
)
def test_publish_rejects_an_empty_or_ungradable_structure(
    monkeypatch,
    evaluation,
) -> None:
    db = FakeDB()

    async def reload(_db, evaluation_id):
        assert evaluation_id == evaluation.id
        return evaluation

    async def rebuild(_db, selected, *_args, **_kwargs):
        assert selected is evaluation
        return evaluation.blueprint

    monkeypatch.setattr(service, "get_evaluation_or_404", reload)
    monkeypatch.setattr(service, "_build_or_update_blueprint", rebuild)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(service.publish_evaluation(db, evaluation))

    assert exc.value.status_code == 409
    assert evaluation.estado == EvaluacionEstado.BORRADOR.value
    assert evaluation.recepcion_habilitada is False
    assert db.commits == 0


def test_publish_allows_manual_evidence_without_an_answer_key_and_opens_reception(
    monkeypatch,
) -> None:
    evaluation = _evaluation(
        questions=[
            {
                "numero": 1,
                "tipo": "abierta",
                "enunciado": "Presenta la evidencia solicitada.",
                "modalidad_respuesta": "fisica",
            }
        ],
        expected_answers=[],
        modality=EvaluacionModalidad.FISICA.value,
        strategy="manual",
    )
    db = FakeDB()

    async def reload(_db, evaluation_id):
        assert evaluation_id == evaluation.id
        return evaluation

    monkeypatch.setattr(service, "get_evaluation_or_404", reload)

    result = asyncio.run(service.publish_evaluation(db, evaluation))

    assert result is evaluation
    assert evaluation.estado == EvaluacionEstado.PUBLICADA.value
    assert evaluation.recepcion_habilitada is True
    assert evaluation.fecha_publicacion is not None
    assert db.commits == 1
