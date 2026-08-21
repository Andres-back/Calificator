import asyncio
from decimal import Decimal
from types import SimpleNamespace


from app.modules.calificaciones.breakdown_policy import build_component_scaffold
from app.modules.calificaciones.breakdown_service import answers_released


def test_dba_is_context_only_and_does_not_create_points():
    scaffold = build_component_scaffold({"nota_maxima": 5, "dba": [{"id": "D1", "texto": "Contexto"}]})
    assert scaffold == []


def test_scored_rubric_is_used_once_when_there_are_no_questions():
    scaffold = build_component_scaffold({
        "nota_maxima": 5,
        "criterios": [
            {"id": "r1", "nombre": "Procedimiento", "peso": 3},
            {"id": "r2", "nombre": "Resultado", "peso": 2},
        ],
    })
    assert [item["clave"] for item in scaffold] == ["rubrica:r1", "rubrica:r2"]
    assert sum((item["puntos_maximos"] for item in scaffold), Decimal("0")) == Decimal("5")


def test_separate_answer_key_is_mapped_to_the_matching_question():
    scaffold = build_component_scaffold({
        "nota_maxima": 5,
        "preguntas": [{"numero": 1, "enunciado": "6 × 4"}],
        "respuestas_esperadas": [{"numero": 1, "respuesta": "24"}],
    })
    assert scaffold[0]["respuesta_referencia"] == "24"


def test_teacher_can_explicitly_hide_keys_even_after_closing_deliveries():
    evaluation = SimpleNamespace(
        recepcion_habilitada=False,
        blueprint=SimpleNamespace(reglas_feedback={"respuestas_liberadas": False}),
    )
    assert answers_released(evaluation) is False


def test_salon_mode_persists_explainable_breakdown_before_commit(monkeypatch):
    from uuid import uuid4
    from app.modules.calificaciones import salon_mode_service

    calls: list[tuple[str, object]] = []

    class FakeDB:
        def add(self, value):
            calls.append(("add", value))

        async def flush(self):
            calls.append(("flush", None))

        async def commit(self):
            calls.append(("commit", None))

        async def refresh(self, value):
            calls.append(("refresh", value))

    async def enrolled(*_args, **_kwargs):
        return True

    async def allowed(*_args, **_kwargs):
        return None

    async def grading(*_args, **_kwargs):
        return SimpleNamespace(
            nota_sugerida=Decimal("4.5"),
            confianza=Decimal("0.9"),
            feedback_estudiante="Explicación verificable",
            raw_model_output={"grader_a": {}, "grader_b": {}},
        )

    async def persist(*_args, **kwargs):
        calls.append(("breakdown", kwargs["calificacion"]))

    monkeypatch.setattr(salon_mode_service, "is_student_enrolled", enrolled)
    monkeypatch.setattr(salon_mode_service.calificaciones_service, "ensure_student_can_submit_new_evidence", allowed)
    monkeypatch.setattr(salon_mode_service.calificaciones_service, "ensure_evaluation_accepts_grading", lambda _evaluation: None)
    monkeypatch.setattr(salon_mode_service.calificaciones_service, "validate_score_within_evaluation", lambda *_args: None)
    monkeypatch.setattr(salon_mode_service.calificaciones_service, "transition_to_grading_if_needed", lambda _evaluation: None)
    monkeypatch.setattr(salon_mode_service, "grade_submission", grading)
    monkeypatch.setattr(salon_mode_service, "create_automatic_breakdown", persist)
    monkeypatch.setattr(salon_mode_service, "evaluation_to_grading_blueprint", lambda _evaluation: {"nota_maxima": 5, "preguntas": [{"numero": 1, "puntaje": 1}]})

    evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4())
    asyncio.run(salon_mode_service.grade_student_photo(
        FakeDB(),
        evaluacion=evaluation,
        estudiante_id=uuid4(),
        image_bytes=b"image",
        image_mime="image/jpeg",
        profesor_id=uuid4(),
    ))

    breakdown_index = next(index for index, item in enumerate(calls) if item[0] == "breakdown")
    commit_index = next(index for index, item in enumerate(calls) if item[0] == "commit")
    assert breakdown_index < commit_index