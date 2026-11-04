import asyncio
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.modules.calificaciones import orchestrator
from app.modules.calificaciones.agents import AgentResult
from app.modules.calificaciones.breakdown_service import create_automatic_breakdown
from tests.unit.test_breakdown_persistence import FakeDB
from tests.unit.test_photo_grading_failures import _configure_orchestrator


BLUEPRINT = {
    "nota_maxima": 5, "preguntas": [
        {"id": "q1", "numero": 1, "tipo": "opcion_multiple", "puntaje": "0.625"},
    ], "respuestas_esperadas": [{"numero": 1, "respuesta": "A"}],
}


@pytest.mark.parametrize(("enabled", "breakdown"), [(False, True), (True, True), (True, False)])
def test_gate_only_adds_resolution_to_opted_in_runs(monkeypatch, enabled, breakdown):
    _configure_orchestrator(monkeypatch)
    monkeypatch.setattr(orchestrator.settings, "GRADING_SAFE_OBJECTIVE_ENABLED", enabled)
    monkeypatch.setattr(orchestrator.settings, "EXPLAINABLE_GRADING_GENERATION_ENABLED", breakdown)
    calls = []

    async def primary(*_args, **_kwargs):
        calls.append("primary")
        return AgentResult(nota_sugerida=2, confianza=0.95, feedback_estudiante="Explica el procedimiento.",
            componentes=[{"clave": "pregunta:q1", "puntaje": 0.25, "estado": "parcial"}],
            requiere_revision_docente=False)

    async def verifier(_ctx, result, **_kwargs):
        calls.append("verifier")
        return result

    async def comparator(first, _second, **_kwargs):
        return first

    monkeypatch.setattr(orchestrator, "grader_agent", primary)
    monkeypatch.setattr(orchestrator, "verification_agent", verifier)
    monkeypatch.setattr(orchestrator, "comparator_agent", comparator)
    result = asyncio.run(orchestrator.orchestrate_grading(object(), evaluacion_id=uuid4(),
        materia_id=uuid4(), blueprint=BLUEPRINT, student_response_text="1. B"))
    assert calls == ["primary", "verifier"]
    raw = result.raw_model_output
    if enabled and breakdown:
        assert raw["objective_resolution_v1"][0]["correcta"] is False
        assert raw["objective_resolution_v1"][0]["clave"] == "pregunta:q1"
        assert raw["objective_validation"] == []
    else:
        assert "objective_resolution_v1" not in raw
        assert raw["objective_validation"][0]["correcta"] is False


@pytest.mark.parametrize("human", [False, True])
def test_saved_manual_decision_survives_new_breakdown(monkeypatch, human):
    monkeypatch.setattr(orchestrator.settings, "EXPLAINABLE_GRADING_GENERATION_ENABLED", True)
    cal = SimpleNamespace(id=uuid4(), nota_sugerida=4, nota_confirmada=Decimal("3.75") if human else None,
        feedback="Comentario docente conservado.", resultado_json={}, revisado_por_docente=human,
        estado="publicada" if human else "sugerida")
    raw = {"grader_a": {"componentes": []}, "grader_b": {"componentes": []},
           "objective_resolution_v1": [{"clave": "pregunta:q1", "numero": 1, "correcta": False,
                "motivo": "no_coincide_clave", "respuesta_detectada": "B", "respuesta_esperada": "A",
                "paginas": [1]}]}
    db = FakeDB([None, None])
    new = asyncio.run(create_automatic_breakdown(db, calificacion=cal, blueprint=BLUEPRINT,
        raw_output=raw, pipeline_run_id="synthetic-safe-objective"))
    assert new.componentes[0].puntos_obtenidos == Decimal("0")
    if human:
        assert cal.nota_confirmada == Decimal("3.75")
        assert cal.nota_sugerida == 4
        assert cal.estado == "publicada"
        assert cal.feedback == "Comentario docente conservado."
    else:
        assert cal.nota_sugerida == Decimal("0.00")
    # Reusing the same execution does not replace it or append another breakdown.
    replay = FakeDB([new])
    again = asyncio.run(create_automatic_breakdown(replay, calificacion=cal, blueprint=BLUEPRINT,
        raw_output=raw, pipeline_run_id="synthetic-safe-objective"))
    assert again is new
    assert replay.added == []


def test_safe_legacy_filter_preserves_open_answers_and_never_overrides_objectives():
    blueprint = {"preguntas": [
        {"numero": 1, "tipo": "opcion_multiple"},
        {"numero": 2, "tipo": "abierta", "enunciado": "Escribe el nombre."},
    ], "respuestas_esperadas": [{"numero": 1, "respuesta": "A"}, {"numero": 2, "respuesta": "María"}]}
    values = orchestrator.build_objective_validation(blueprint,
        [{"pregunta": 1, "respuesta": "A"}, {"pregunta": 2, "respuesta": "María"}], exclude_safe_types=True)
    assert [item["numero"] for item in values] == [2]


def test_checkpoint_without_page_list_keeps_typed_correction_flags():
    rows = orchestrator.objective_reading_candidates([], {"vision_extraction": {"answers": [
        {"question_id": "q1", "question_number": 1, "answer": "B", "page": 1,
         "legible": True, "confidence": 0.99, "correction_detected": True},
    ]}, "respuestas_detectadas": [{"pregunta": 1, "respuesta": "B", "pagina": 1}]})
    assert len(rows) == 1
    assert rows[0]["correction_detected"] is True
