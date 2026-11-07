"""Spec 156, PR 4: respuesta libre en preguntas abiertas, puesta solo por el docente."""

from __future__ import annotations

import asyncio
from copy import deepcopy
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.calificaciones import agents, grading_service
from app.modules.calificaciones.orchestrator import build_objective_validation
from app.modules.calificaciones.schemas import GradingResult
from app.modules.evaluaciones import service
from app.modules.evaluaciones.blueprint_service import (
    FREE_ANSWER_TEXT,
    evaluation_to_grading_blueprint,
    free_answer_numbers,
    grading_answer_key_status,
    normalize_free_answers,
)
from app.modules.evaluaciones.digitalize_service import normalize_detected_structure
from app.shared.enums import EvaluacionEstado, EvaluacionModalidad, EvaluacionTipoOrigen


QUESTIONS = [
    {"numero": 1, "tipo": "opcion_multiple", "enunciado": "¿Cuánto es 2 + 2?", "opciones": ["3", "4", "5"], "puntaje": 2},
    {"numero": 2, "tipo": "abierta", "enunciado": "¿Qué te gustó del cuento?", "puntaje": 2},
    {"numero": 3, "tipo": "abierta", "enunciado": "Explica por qué llueve.", "puntaje": 1},
]


def _answers(*, free_number: int | None = 2, third: str = "El agua se evapora y se condensa.") -> list[dict]:
    answers = [
        {"numero": 1, "respuesta": "4"},
        {"numero": 2, "respuesta": ""},
        {"numero": 3, "respuesta": third},
    ]
    if free_number is not None:
        answers[free_number - 1] = {
            "numero": free_number, "respuesta": FREE_ANSWER_TEXT, "respuesta_libre": True,
            "origen": "confirmacion_docente",
        }
    return answers


# ── Clave completa (FR-011) ─────────────────────────────────────────────────────

def test_free_answer_flag_completes_the_key_of_an_open_question() -> None:
    complete, missing = grading_answer_key_status({"preguntas": QUESTIONS, "respuestas_esperadas": _answers()})
    assert complete is True
    assert missing == []


def test_free_answer_counts_even_with_an_empty_text_when_the_flag_is_explicit() -> None:
    answers = _answers()
    answers[1]["respuesta"] = ""
    complete, _ = grading_answer_key_status({"preguntas": QUESTIONS, "respuestas_esperadas": answers})
    assert complete is True


def test_without_the_flag_an_open_question_still_needs_a_concrete_answer() -> None:
    complete, missing = grading_answer_key_status(
        {"preguntas": QUESTIONS, "respuestas_esperadas": _answers(free_number=None)},
    )
    assert complete is False
    assert missing == [2]


@pytest.mark.parametrize("value", ["true", 1, "si", None])
def test_only_a_boolean_true_flag_counts(value) -> None:
    answers = _answers()
    answers[1] = {"numero": 2, "respuesta": "", "respuesta_libre": value}
    complete, missing = grading_answer_key_status({"preguntas": QUESTIONS, "respuestas_esperadas": answers})
    assert complete is False
    assert missing == [2]


@pytest.mark.parametrize("question_type", ["opcion_multiple", "verdadero_falso", "completar"])
def test_the_flag_is_ignored_on_questions_that_are_not_open(question_type) -> None:
    questions = [{"numero": 1, "tipo": question_type, "enunciado": "Completa: el sol es una ____."}]
    answers = [{"numero": 1, "respuesta": "", "respuesta_libre": True}]
    complete, missing = grading_answer_key_status({"preguntas": questions, "respuestas_esperadas": answers})
    assert complete is False
    assert missing == [1]
    assert free_answer_numbers({"preguntas": questions, "respuestas_esperadas": answers}) == set()


def test_normalize_keeps_the_flag_only_on_open_questions_and_fixes_its_text() -> None:
    questions = [*QUESTIONS, {"numero": 4, "tipo": "completar", "enunciado": "El sol es una ____."}]
    answers = [
        *_answers(),
        {"numero": 4, "respuesta": "estrella", "respuesta_libre": True},
    ]
    answers[1]["respuesta"] = "otro texto"
    normalized = normalize_free_answers(questions, answers)
    assert normalized[1] == {
        "numero": 2, "respuesta": FREE_ANSWER_TEXT, "respuesta_libre": True, "origen": "confirmacion_docente",
    }
    assert normalized[3] == {"numero": 4, "respuesta": "estrella"}
    assert normalized[0] is answers[0]  # Items without the flag are untouched.


# ── Publicar (FR-011, FR-013) ───────────────────────────────────────────────────

def _evaluation(answers: list[dict]) -> SimpleNamespace:
    questions = deepcopy(QUESTIONS)
    return SimpleNamespace(
        id=uuid4(), materia_id=uuid4(), estado=EvaluacionEstado.BORRADOR.value,
        recepcion_habilitada=False, fecha_publicacion=None,
        modalidad=EvaluacionModalidad.FISICA.value, nota_maxima=5,
        tipo_origen=EvaluacionTipoOrigen.EXTERNA_DIGITALIZADA.value,
        criterios=[{"nombre": "Dominio", "puntaje_maximo": 5}],
        preguntas=questions, respuestas_esperadas=answers,
        dba_ids=[], dba_personalizado_ids=[],
        blueprint=SimpleNamespace(
            criterios=[{"nombre": "Dominio", "puntaje_maximo": 5}], preguntas=questions,
            respuestas_esperadas=answers, reglas_feedback={"estrategia_calificacion": "ia_asistida"},
        ),
    )


def test_a_digitalized_evaluation_with_a_free_answer_can_be_published() -> None:
    service.validate_publication_structure(_evaluation(_answers()))


def test_a_digitalized_evaluation_without_the_mark_still_blocks_publication() -> None:
    with pytest.raises(HTTPException) as exc:
        service.validate_publication_structure(_evaluation(_answers(free_number=None)))
    assert exc.value.status_code == 409
    assert "[2]" in exc.value.detail


# ── La marca sobrevive y solo la pone el docente ────────────────────────────────

def test_the_flag_reaches_the_grading_blueprint() -> None:
    evaluation = _evaluation(_answers())
    evaluation.nombre = "Lectura"
    evaluation.estructura_documento = None
    evaluation.blueprint.dba, evaluation.blueprint.metas = [], []
    evaluation.blueprint.errores_comunes, evaluation.blueprint.contexto_rag = [], []
    blueprint = evaluation_to_grading_blueprint(evaluation)
    assert blueprint["respuestas_esperadas"][1]["respuesta_libre"] is True
    assert free_answer_numbers(blueprint) == {"2"}


def test_the_flag_survives_the_version_snapshot() -> None:
    from app.modules.evaluaciones.visual_service import _snapshot

    evaluation = _evaluation(_answers())
    evaluation.nombre, evaluation.descripcion = "Lectura", None
    evaluation.metas_profesor = []
    evaluation.blueprint.nivel_contexto, evaluation.blueprint.dba = "reconstruido", []
    evaluation.blueprint.metas, evaluation.blueprint.errores_comunes, evaluation.blueprint.contexto_rag = [], [], []
    snapshot = _snapshot(evaluation)
    assert snapshot["respuestas_esperadas"][1]["respuesta_libre"] is True
    assert snapshot["blueprint"]["respuestas_esperadas"][1]["respuesta_libre"] is True


def test_saving_the_structure_keeps_the_flag_and_drops_it_from_non_open_questions(monkeypatch) -> None:
    from app.modules.evaluaciones.schemas import EvaluacionEstructuraValidacion

    evaluation = _evaluation(_answers(free_number=None))
    evaluation.contenido_version_id = None
    saved: dict = {}

    async def rebuild(_db, selected, _dba, _custom, payload=None):
        saved["blueprint_answers"] = payload.respuestas_esperadas
        return selected.blueprint

    async def reload(_db, _evaluation_id):
        return evaluation

    monkeypatch.setattr(service, "_build_or_update_blueprint", rebuild)
    monkeypatch.setattr(service, "get_evaluation_or_404", reload)
    answers = _answers()
    answers[0]["respuesta_libre"] = True  # Opción múltiple: la marca no aplica.
    db = SimpleNamespace(commit=AsyncMock())
    asyncio.run(service.validate_structure(db, evaluation, EvaluacionEstructuraValidacion(respuestas_esperadas=answers)))

    assert evaluation.respuestas_esperadas[1]["respuesta_libre"] is True
    assert evaluation.respuestas_esperadas[1]["respuesta"] == FREE_ANSWER_TEXT
    assert "respuesta_libre" not in evaluation.respuestas_esperadas[0]
    assert saved["blueprint_answers"] == evaluation.respuestas_esperadas


def test_digitalization_never_sets_the_flag_by_itself() -> None:
    structure = normalize_detected_structure(
        {
            "preguntas": [{"numero": 1, "tipo": "abierta", "enunciado": "¿Qué aprendiste?"}],
            "respuestas_esperadas": [{
                "numero": 1, "respuesta": FREE_ANSWER_TEXT, "respuesta_libre": True,
                "origen": "resolucion_independiente", "confianza": 0.9, "explicacion": "Pregunta de opinión.",
            }],
        },
        nota_maxima=Decimal("5"),
    )
    assert all("respuesta_libre" not in item for item in structure["respuestas_esperadas"])


def test_students_never_receive_the_expected_answers_or_the_flag() -> None:
    evaluation = _evaluation(_answers())
    evaluation.profesor_id = uuid4()
    evaluation.nombre, evaluation.descripcion = "Lectura", None
    evaluation.estado = EvaluacionEstado.PUBLICADA.value
    for field in ("material_origen_id", "tipo_actividad", "fecha_limite_entrega", "contenido_version_id",
                  "estructura_documento", "created_at", "updated_at"):
        setattr(evaluation, field, None)
    evaluation.politica_intento, evaluation.intentos_permitidos, evaluation.tiempo_limite_minutos = "unico", 1, None
    evaluation.metas_profesor = []
    evaluation.blueprint.reglas_feedback = {}
    evaluation.preguntas[1]["respuesta_libre"] = True  # Defensa: tampoco si llegara a la pregunta.
    payload = service._student_safe_evaluation(evaluation)
    assert payload["respuestas_esperadas"] == []
    assert "respuesta_libre" not in str(payload)
    assert FREE_ANSWER_TEXT not in str(payload)


# ── Calificador (FR-012) ────────────────────────────────────────────────────────

def _ctx(answers: list[dict], student: str = "P2: Me gustó que la tortuga no se rindió.") -> agents.AgentContext:
    return agents.AgentContext(
        evaluacion_nombre="Lectura", nota_maxima=5,
        blueprint={"nota_maxima": 5, "preguntas": deepcopy(QUESTIONS), "respuestas_esperadas": answers},
        student_response_text=student,
    )


def test_grader_prompt_has_the_free_answer_rule_only_for_marked_questions() -> None:
    prompt = agents.render_grader_prompt(_ctx(_answers()))
    assert "## Preguntas de respuesta libre" in prompt
    assert "Preguntas: 2." in prompt
    assert "puntaje completo" in prompt
    assert "no compares" in prompt.lower()
    assert "en blanco, no tiene relación con la pregunta o es ilegible" in prompt


def test_grader_prompt_without_free_answers_is_unchanged() -> None:
    prompt = agents.render_grader_prompt(_ctx(_answers(free_number=None)))
    assert "respuesta libre" not in prompt.lower()


def test_grader_prompt_ignores_a_flag_on_a_question_that_is_not_open() -> None:
    answers = _answers(free_number=None)
    answers[0]["respuesta_libre"] = True
    assert "## Preguntas de respuesta libre" not in agents.render_grader_prompt(_ctx(answers))


def test_each_partition_keeps_its_own_free_answer_rule() -> None:
    ctx = _ctx(_answers())
    partitions = agents.partition_grading_context(ctx, [{"pregunta": 2, "respuesta": "Que no se rindió."}], max_chars=1000)
    prompts = {part.blueprint["preguntas"][0]["numero"]: agents.render_grader_prompt(part) for part in partitions}
    assert "## Preguntas de respuesta libre" in prompts[2]
    assert "## Preguntas de respuesta libre" not in prompts[1]
    assert "## Preguntas de respuesta libre" not in prompts[3]


def _model_reply(score: float) -> dict:
    content = (
        '{"nota_sugerida": %s, "nota_maxima": 5, "confianza": 0.9, "criterios": [], '
        '"componentes": [{"clave": "pregunta:2", "respuesta_estudiante": "Que no se rindió.", "puntaje": %s, '
        '"estado": "correcta", "explicacion": "Responde a la pregunta.", "confianza": 0.9}], '
        '"feedback_estudiante": "Contaste qué te gustó.", "alertas": [], "requiere_revision_docente": false}'
    ) % (score, score)
    return {"choices": [{"message": {"content": content}}]}


def test_grader_sends_the_rule_to_the_simulated_model_and_keeps_the_full_score() -> None:
    client = SimpleNamespace(chat=AsyncMock(return_value=_model_reply(2)))
    result = asyncio.run(agents.grader_agent(_ctx(_answers()), client=client))
    sent = client.chat.await_args.kwargs["messages"][0]["content"]
    assert "## Preguntas de respuesta libre" in sent and "Preguntas: 2." in sent
    assert result.nota_sugerida == 2
    assert result.componentes[0]["estado"] == "correcta"


def test_verifier_also_receives_the_free_answer_rule() -> None:
    client = SimpleNamespace(chat=AsyncMock(return_value={"choices": [{"message": {"content":
        '{"nota_sugerida": 2, "confianza": 0.9, "componentes_verificados": [], "requiere_arbitraje": false, "alertas": []}'}}]}))
    primary = agents.AgentResult(nota_sugerida=2, confianza=0.9, feedback_estudiante="Bien.")
    asyncio.run(agents.verification_agent(_ctx(_answers()), primary, client=client))
    sent = client.chat.await_args.kwargs["messages"][0]["content"]
    assert "## Preguntas de respuesta libre" in sent


def test_a_free_answer_is_never_judged_by_literal_comparison() -> None:
    blueprint = {"preguntas": deepcopy(QUESTIONS), "respuestas_esperadas": _answers()}
    detected = [
        {"pregunta": 1, "respuesta": "4"},
        {"pregunta": 2, "respuesta": FREE_ANSWER_TEXT},
    ]
    validation = build_objective_validation(blueprint, detected)
    assert [item["numero"] for item in validation] == [1]


def test_grading_with_a_free_answer_key_is_not_flagged_as_incomplete(monkeypatch) -> None:
    async def fake_orchestrator(*_args, **_kwargs):
        return GradingResult(
            nota_sugerida=Decimal("5"), nota_maxima=Decimal("5"), confianza=0.9, criterios=[],
            feedback_estudiante="Bien.", alertas=[], requiere_revision_docente=False,
            raw_model_output={"orchestrator": "test"},
        )

    monkeypatch.setattr(grading_service, "orchestrate_grading", fake_orchestrator)
    result = asyncio.run(grading_service.grade_submission(
        object(), evaluacion_id=uuid4(), materia_id=uuid4(),
        blueprint={"nota_maxima": 5, "preguntas": deepcopy(QUESTIONS), "respuestas_esperadas": _answers()},
        student_response_text="Respuestas",
    ))
    assert result.confianza == 0.9
    assert result.requiere_revision_docente is False
    assert not any("clave completa" in alert for alert in result.alertas)
