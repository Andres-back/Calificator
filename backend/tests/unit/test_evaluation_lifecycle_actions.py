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
    state: str,
    reception_enabled: bool,
    modality: str = EvaluacionModalidad.ONLINE.value,
) -> SimpleNamespace:
    questions = [
        {
            "numero": 1,
            "tipo": "opcion_multiple",
            "enunciado": "Cuanto es 4 x 9?",
            "opciones": ["A) 32", "B) 36"],
            "puntaje": 5,
            "modalidad_respuesta": "online",
        }
    ]
    if modality == EvaluacionModalidad.FISICA.value:
        questions[0]["modalidad_respuesta"] = "fisica"
    elif modality == EvaluacionModalidad.MIXTA.value:
        questions[0]["puntaje"] = 2.5
        questions.append(
            {
                "numero": 2,
                "tipo": "abierta",
                "enunciado": "Muestra el procedimiento.",
                "puntaje": 2.5,
                "modalidad_respuesta": "fisica",
            }
        )
    return SimpleNamespace(
        id=uuid4(),
        estado=state,
        recepcion_habilitada=reception_enabled,
        fecha_publicacion=None,
        modalidad=modality,
        nota_maxima=5,
        criterios=[{"nombre": "Dominio", "puntaje_maximo": 5}],
        preguntas=questions,
        respuestas_esperadas=[{"numero": 1, "respuesta": "B) 36"}],
        dba_ids=[],
        dba_personalizado_ids=[],
        blueprint=SimpleNamespace(
            criterios=[{"nombre": "Dominio", "puntaje_maximo": 5}],
            preguntas=questions,
            respuestas_esperadas=[{"numero": 1, "respuesta": "B) 36"}],
            reglas_feedback={"estrategia_calificacion": "mixta"},
        ),
    )


def _patch_reload(monkeypatch, evaluation) -> None:
    async def reload(_db, evaluation_id):
        assert evaluation_id == evaluation.id
        return evaluation

    monkeypatch.setattr(service, "get_evaluation_or_404", reload)


@pytest.mark.parametrize(
    "modality",
    [
        EvaluacionModalidad.ONLINE.value,
        EvaluacionModalidad.FISICA.value,
        EvaluacionModalidad.MIXTA.value,
    ],
)
def test_publish_opens_reception_for_every_modality(monkeypatch, modality: str) -> None:
    evaluation = _evaluation(
        state=EvaluacionEstado.BORRADOR.value,
        reception_enabled=False,
        modality=modality,
    )
    db = FakeDB()
    _patch_reload(monkeypatch, evaluation)

    result = asyncio.run(service.publish_evaluation(db, evaluation))

    assert result is evaluation
    assert evaluation.estado == EvaluacionEstado.PUBLICADA.value
    assert evaluation.recepcion_habilitada is True
    assert evaluation.fecha_publicacion is not None
    assert db.commits == 1


@pytest.mark.parametrize(
    "state",
    [
        EvaluacionEstado.PUBLICADA.value,
        EvaluacionEstado.EN_CALIFICACION.value,
        EvaluacionEstado.PENDIENTE_REVISION.value,
    ],
)
def test_pause_and_reactivate_preserve_the_workflow_state(monkeypatch, state: str) -> None:
    evaluation = _evaluation(state=state, reception_enabled=True)
    db = FakeDB()
    _patch_reload(monkeypatch, evaluation)

    paused = asyncio.run(service.pause_reception(db, evaluation))
    assert paused is evaluation
    assert evaluation.estado == state
    assert evaluation.recepcion_habilitada is False

    reactivated = asyncio.run(service.activate_reception(db, evaluation))
    assert reactivated is evaluation
    assert evaluation.estado == state
    assert evaluation.recepcion_habilitada is True
    assert db.commits == 2


@pytest.mark.parametrize(
    "state",
    [EvaluacionEstado.BORRADOR.value, EvaluacionEstado.CERRADA.value],
)
def test_reception_cannot_be_activated_outside_a_live_state(
    monkeypatch,
    state: str,
) -> None:
    evaluation = _evaluation(state=state, reception_enabled=False)
    db = FakeDB()
    _patch_reload(monkeypatch, evaluation)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(service.activate_reception(db, evaluation))

    assert exc.value.status_code == 409
    assert evaluation.recepcion_habilitada is False
    assert db.commits == 0


@pytest.mark.parametrize(
    "state",
    [
        EvaluacionEstado.PUBLICADA.value,
        EvaluacionEstado.EN_CALIFICACION.value,
        EvaluacionEstado.PENDIENTE_REVISION.value,
    ],
)
def test_close_is_final_and_disables_reception(monkeypatch, state: str) -> None:
    evaluation = _evaluation(state=state, reception_enabled=True)
    db = FakeDB()
    _patch_reload(monkeypatch, evaluation)

    result = asyncio.run(service.close_evaluation(db, evaluation))

    assert result is evaluation
    assert evaluation.estado == EvaluacionEstado.CERRADA.value
    assert evaluation.recepcion_habilitada is False
    assert db.commits == 1
