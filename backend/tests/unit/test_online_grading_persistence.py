from __future__ import annotations

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.calificaciones import router
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.calificaciones.schemas import EntregaOnlineCreate, GradingResult
from app.shared.enums import (
    CalificacionEstado,
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

    def add(self, value: object) -> None:
        self.added.append(value)

    async def commit(self) -> None:
        self.commits += 1
        for value in self.added:
            if getattr(value, "id", None) is None:
                value.id = uuid4()

    async def refresh(self, _value: object) -> None:
        return None

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
    monkeypatch.setattr(router, "evaluation_to_grading_blueprint", lambda _evaluation: {})
    monkeypatch.setattr(router.service, "transition_to_grading_if_needed", lambda _evaluation: None)


def test_physical_evaluation_rejects_online_submission(monkeypatch) -> None:
    evaluation = _evaluation(EvaluacionModalidad.FISICA.value)
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


def test_online_evidence_is_committed_before_ai_and_survives_failure(monkeypatch) -> None:
    evaluation = _evaluation()
    student = _student()
    db = FakeDB()
    _configure(monkeypatch, evaluation)

    async def failing_grader(*_args, **_kwargs):
        assert db.commits == 1
        assert isinstance(db.added[0], Entrega)
        assert db.added[0].estado == EntregaEstado.PROCESANDO.value
        raise RuntimeError("provider timeout")

    monkeypatch.setattr(router, "grade_submission", failing_grader)

    delivery = asyncio.run(
        router.crear_entrega_online(
            evaluation.id,
            EntregaOnlineCreate(respuesta_texto="P1: respuesta que debe conservarse"),
            current_user=student,
            db=db,
        )
    )

    grades = [item for item in db.added if isinstance(item, Calificacion)]
    assert db.commits == 2
    assert delivery.respuesta_texto == "P1: respuesta que debe conservarse"
    assert delivery.estado == EntregaEstado.REQUIERE_REINTENTO.value
    assert len(grades) == 1
    assert grades[0].nota_sugerida is None
    assert grades[0].confianza is None
    assert grades[0].estado == CalificacionEstado.REQUIERE_REVISION.value
    assert grades[0].resultado_json["error_type"] == "RuntimeError"
    assert grades[0].resultado_json["motivo_revision"] == "online_pipeline_error"


def test_successful_online_submission_remains_a_teacher_reviewable_suggestion(monkeypatch) -> None:
    evaluation = _evaluation(EvaluacionModalidad.ONLINE.value)
    student = _student()
    db = FakeDB()
    _configure(monkeypatch, evaluation)

    async def successful_grader(*_args, **_kwargs):
        assert db.commits == 1
        return GradingResult(
            nota_sugerida=Decimal("4.2"),
            nota_maxima=Decimal("5"),
            confianza=0.91,
            feedback_estudiante="Revisa la justificación del segundo paso.",
            requiere_revision_docente=True,
            raw_model_output={"pipeline_status": "success"},
        )

    monkeypatch.setattr(router, "grade_submission", successful_grader)

    delivery = asyncio.run(
        router.crear_entrega_online(
            evaluation.id,
            EntregaOnlineCreate(respuesta_texto="P1: procedimiento completo"),
            current_user=student,
            db=db,
        )
    )

    grade = next(item for item in db.added if isinstance(item, Calificacion))
    assert delivery.estado == EntregaEstado.CALIFICADA.value
    assert grade.nota_sugerida == Decimal("4.2")
    assert grade.estado == CalificacionEstado.SUGERIDA.value
    assert grade.revisado_por_docente is False
    assert grade.nota_confirmada is None

def test_mixed_online_section_waits_for_physical_evidence(monkeypatch) -> None:
    evaluation = _evaluation(EvaluacionModalidad.MIXTA.value)
    evaluation.preguntas = [
        {"numero": 1, "modalidad_respuesta": "online"},
        {"numero": 2, "modalidad_respuesta": "fisica"},
    ]
    student = _student()
    db = FakeDB()
    _configure(monkeypatch, evaluation)

    async def should_not_grade(*_args, **_kwargs):
        raise AssertionError("La evaluacion mixta solo se califica al completar la foto")

    monkeypatch.setattr(router, "grade_submission", should_not_grade)

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
    assert not any(isinstance(item, Calificacion) for item in db.added)
