from __future__ import annotations

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.calificaciones import router
from app.modules.calificaciones.models import Entrega
from app.modules.calificaciones.schemas import EntregaOnlineCreate
from app.shared.enums import (
    EntregaEstado,
    EntregaTipo,
    EvaluacionEstado,
    EvaluacionModalidad,
    PoliticaIntento,
    UserRole,
)


class FakeDB:
    def __init__(self) -> None:
        self.added: list[object] = []
        self.commits = 0
        self.refreshes = 0

    def add(self, value: object) -> None:
        self.added.append(value)

    async def commit(self) -> None:
        self.commits += 1
        for value in self.added:
            if getattr(value, "id", None) is None:
                value.id = uuid4()

    async def refresh(self, _value: object) -> None:
        self.refreshes += 1

    async def scalar(self, _query):
        raise AssertionError("La política de práctica libre no consulta intentos previos")


def _evaluation(modality: str = EvaluacionModalidad.ONLINE.value) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        materia_id=uuid4(),
        profesor_id=uuid4(),
        nombre="Evaluación online",
        modalidad=modality,
        estado=EvaluacionEstado.PUBLICADA.value,
        nota_maxima=Decimal("5"),
        tiempo_limite_minutos=None,
        fecha_publicacion=None,
        politica_intento=PoliticaIntento.PRACTICA_LIBRE.value,
        intentos_permitidos=None,
        blueprint=None,
        dba_ids=[],
        dba_personalizado_ids=[],
        metas_profesor=[],
        criterios=[],
        preguntas=[],
        respuestas_esperadas=[],
    )


def _student() -> SimpleNamespace:
    return SimpleNamespace(id=uuid4(), rol=UserRole.ESTUDIANTE.value)


def _configure(monkeypatch, evaluation: SimpleNamespace) -> None:
    async def get_evaluation(_db, evaluation_id):
        assert evaluation_id == evaluation.id
        return evaluation

    async def enrolled(_db, materia_id, student_id):
        assert materia_id == evaluation.materia_id
        assert student_id is not None
        return True

    monkeypatch.setattr(
        router.evaluaciones_service,
        "get_evaluation_or_404",
        get_evaluation,
    )
    monkeypatch.setattr(router, "is_student_enrolled", enrolled)


def test_physical_evaluation_rejects_online_submission(monkeypatch) -> None:
    evaluation = _evaluation(EvaluacionModalidad.FISICA.value)
    evaluation.recepcion_habilitada = True
    student = _student()
    db = FakeDB()
    _configure(monkeypatch, evaluation)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            router.crear_entrega_online(
                evaluation.id,
                EntregaOnlineCreate(respuesta_texto="P1: respuesta del estudiante"),
                current_user=student,
                db=db,
            )
        )

    assert exc.value.status_code == 409
    assert "fisica" in str(exc.value.detail).lower()
    assert db.added == []
    assert db.commits == 0


def test_online_submission_is_persisted_and_enqueued_without_waiting_for_ai(monkeypatch) -> None:
    evaluation = _evaluation()
    student = _student()
    db = FakeDB()
    _configure(monkeypatch, evaluation)
    queued: list[Entrega] = []

    async def enqueue(_db, **kwargs):
        delivery = kwargs["entrega"]
        assert db.commits == 1
        assert delivery.estado == EntregaEstado.RECIBIDA.value
        queued.append(delivery)
        return object()

    monkeypatch.setattr(router, "_enqueue_persisted_grading", enqueue)

    delivery = asyncio.run(
        router.crear_entrega_online(
            evaluation.id,
            EntregaOnlineCreate(respuesta_texto="P1: procedimiento completo"),
            current_user=student,
            db=db,
        )
    )

    assert delivery.respuesta_texto == "P1: procedimiento completo"
    assert delivery.estado == EntregaEstado.RECIBIDA.value
    assert [item.id for item in queued] == [delivery.id]
    assert db.commits == 1


def test_online_submission_remains_received_when_queue_is_temporarily_unavailable(
    monkeypatch,
) -> None:
    evaluation = _evaluation()
    student = _student()
    db = FakeDB()
    _configure(monkeypatch, evaluation)

    async def unavailable_queue(_db, **_kwargs):
        raise HTTPException(status_code=503, detail="cola no disponible")

    monkeypatch.setattr(router, "_enqueue_persisted_grading", unavailable_queue)

    delivery = asyncio.run(
        router.crear_entrega_online(
            evaluation.id,
            EntregaOnlineCreate(respuesta_texto="P1: evidencia conservada"),
            current_user=student,
            db=db,
        )
    )

    assert delivery.estado == EntregaEstado.RECIBIDA.value
    assert delivery.respuesta_texto == "P1: evidencia conservada"
    assert db.commits == 1
    assert db.refreshes == 2


def test_mixed_online_section_waits_for_physical_evidence(monkeypatch) -> None:
    evaluation = _evaluation(EvaluacionModalidad.MIXTA.value)
    evaluation.preguntas = [
        {"numero": 1, "modalidad_respuesta": "online"},
        {"numero": 2, "modalidad_respuesta": "fisica"},
    ]
    student = _student()
    db = FakeDB()
    _configure(monkeypatch, evaluation)

    async def should_not_enqueue(*_args, **_kwargs):
        raise AssertionError("La evaluación mixta espera la evidencia física")

    monkeypatch.setattr(router, "_enqueue_persisted_grading", should_not_enqueue)

    delivery = asyncio.run(
        router.crear_entrega_online(
            evaluation.id,
            EntregaOnlineCreate(respuesta_texto="P1: respuesta online conservada"),
            current_user=student,
            db=db,
        )
    )

    assert delivery.tipo == EntregaTipo.MIXTA.value
    assert delivery.estado == EntregaEstado.RECIBIDA.value
    assert delivery.visual_text_json["pipeline_status"] == "pending_physical_evidence"
    assert delivery.visual_text_json["secciones"]["online"]["preguntas"] == [1]
    assert delivery.visual_text_json["secciones"]["fisica"]["preguntas"] == [2]