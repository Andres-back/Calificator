import asyncio
from types import SimpleNamespace
from uuid import uuid4

from app.db.base import import_models
from app.modules.calificaciones.breakdown_service import create_automatic_breakdown

import_models()


class FakeDB:
    def __init__(self, scalar_values):
        self.scalar_values = list(scalar_values)
        self.added = []

    async def scalar(self, _query):
        return self.scalar_values.pop(0)

    async def flush(self):
        return None

    def add(self, value):
        self.added.append(value)


def _calification():
    return SimpleNamespace(
        id=uuid4(), nota_sugerida=4.0, nota_confirmada=None,
        resultado_json={}, revisado_por_docente=False, estado="sugerida",
    )


def test_automatic_breakdown_is_idempotent_for_pipeline_run_id(monkeypatch):
    monkeypatch.setattr(
        "app.modules.calificaciones.breakdown_service.settings.EXPLAINABLE_GRADING_GENERATION_ENABLED",
        True,
    )
    cal = _calification()
    blueprint = {
        "nota_maxima": 5,
        "preguntas": [{"numero": 1, "enunciado": "6 × 4", "puntaje": 1}],
        "respuestas_esperadas": [{"numero": 1, "respuesta": "24"}],
    }
    valuation = {"clave": "pregunta:1", "respuesta_estudiante": "24", "puntaje": 1, "estado": "correcta", "explicacion": "Coincide.", "paginas": [1]}
    raw = {"grader_a": {"componentes": [valuation]}, "grader_b": {"componentes": [valuation]}, "objective_validation": []}
    db = FakeDB([None, None])
    first = asyncio.run(create_automatic_breakdown(db, calificacion=cal, blueprint=blueprint, raw_output=raw, pipeline_run_id="run-1"))
    assert first is not None
    assert len(first.componentes) == 1
    assert float(first.nota_final) == 5.0
    assert len(db.added) == 1

    retry_db = FakeDB([first])
    retry = asyncio.run(create_automatic_breakdown(retry_db, calificacion=cal, blueprint=blueprint, raw_output=raw, pipeline_run_id="run-1"))
    assert retry is first
    assert retry_db.added == []


def test_complete_breakdown_overrides_inconsistent_global_model_score(monkeypatch):
    monkeypatch.setattr(
        "app.modules.calificaciones.breakdown_service.settings.EXPLAINABLE_GRADING_GENERATION_ENABLED",
        True,
    )
    cal = _calification()
    cal.nota_sugerida = 4.95
    blueprint = {
        "nota_maxima": 5,
        "preguntas": [
            {"numero": 1, "enunciado": "log3(81)", "puntaje": 0.33},
            {"numero": 2, "enunciado": "Resto de la evaluación", "puntaje": 4.67},
        ],
        "respuestas_esperadas": [
            {"numero": 1, "respuesta": "4"},
            {"numero": 2, "respuesta": "Correcta"},
        ],
    }
    wrong = {
        "clave": "pregunta:1", "respuesta_estudiante": "3", "puntaje": 0,
        "estado": "incorrecta", "explicacion": "3^4 es 81; la respuesta es 4.", "paginas": [1],
    }
    correct = {
        "clave": "pregunta:2", "respuesta_estudiante": "Correcta", "puntaje": 4.67,
        "estado": "correcta", "explicacion": "Respuesta correcta.", "paginas": [1],
    }
    raw = {
        "grader_a": {"componentes": [wrong, correct]},
        "grader_b": {"componentes": [wrong, correct]},
        "objective_validation": [],
    }

    breakdown = asyncio.run(create_automatic_breakdown(
        FakeDB([None, None]), calificacion=cal, blueprint=blueprint,
        raw_output=raw, pipeline_run_id="run-score-mismatch",
    ))

    assert breakdown is not None
    assert float(breakdown.nota_final) == 4.67
    assert float(cal.nota_sugerida) == 4.67
    trace = cal.resultado_json["desglose"]
    assert trace["modo"] == "autoridad"
    assert trace["nota_modelo_global"] == 4.95
    assert trace["nota_calculada"] == 4.67
    assert trace["diferencia"] == -0.28


def test_incomplete_breakdown_does_not_publish_partial_sum(monkeypatch):
    monkeypatch.setattr(
        "app.modules.calificaciones.breakdown_service.settings.EXPLAINABLE_GRADING_GENERATION_ENABLED",
        True,
    )
    cal = _calification()
    cal.nota_sugerida = 4.95
    blueprint = {
        "nota_maxima": 5,
        "preguntas": [
            {"numero": 1, "enunciado": "Primera", "puntaje": 2.5},
            {"numero": 2, "enunciado": "Segunda", "puntaje": 2.5},
        ],
    }
    only_first = {
        "clave": "pregunta:1", "respuesta_estudiante": "A", "puntaje": 2.5,
        "estado": "correcta", "explicacion": "Correcta.", "paginas": [1],
    }
    raw = {
        "grader_a": {"componentes": [only_first]},
        "grader_b": {"componentes": [only_first]},
        "objective_validation": [],
    }

    breakdown = asyncio.run(create_automatic_breakdown(
        FakeDB([None, None]), calificacion=cal, blueprint=blueprint,
        raw_output=raw, pipeline_run_id="run-incomplete",
    ))

    assert breakdown is not None
    assert breakdown.requiere_revision is True
    assert cal.nota_sugerida == 4.95
    assert cal.estado == "requiere_revision"
    assert cal.resultado_json["desglose"]["modo"] == "controlado"


def test_verifier_alert_keeps_formula_but_requires_teacher_review(monkeypatch):
    monkeypatch.setattr(
        "app.modules.calificaciones.breakdown_service.settings.EXPLAINABLE_GRADING_GENERATION_ENABLED",
        True,
    )
    cal = _calification()
    blueprint = {
        "nota_maxima": 5,
        "preguntas": [{"numero": 1, "enunciado": "Calcula", "puntaje": 5}],
        "respuestas_esperadas": [{"numero": 1, "respuesta": "20"}],
    }
    valuation = {
        "clave": "pregunta:1", "respuesta_estudiante": "4.47", "puntaje": 0,
        "estado": "incorrecta", "explicacion": "No coincide con la clave.", "paginas": [1],
    }
    raw = {
        "grader_a": {"componentes": [valuation]},
        "grader_b": {
            "componentes": [valuation],
            "alertas": ["Revisar la respuesta de la pregunta 1: 20 representa l²."],
            "requiere_revision_docente": True,
        },
        "objective_validation": [],
    }

    breakdown = asyncio.run(create_automatic_breakdown(
        FakeDB([None, None]), calificacion=cal, blueprint=blueprint,
        raw_output=raw, pipeline_run_id="run-verifier-alert",
    ))

    assert breakdown is not None
    assert float(breakdown.nota_final) == 0.0
    assert breakdown.requiere_revision is True
    assert any(
        str(item).startswith("verificador_ia:")
        for item in breakdown.bloqueos_json
    )
    assert cal.estado == "requiere_revision"
    assert float(cal.nota_sugerida) == 0.0


def test_complete_sum_replaces_global_score_even_with_review_alerts(monkeypatch):
    monkeypatch.setattr(
        "app.modules.calificaciones.breakdown_service.settings.EXPLAINABLE_GRADING_GENERATION_ENABLED",
        True,
    )
    cal = _calification()
    cal.nota_sugerida = 4.17
    blueprint = {
        "nota_maxima": 5,
        "preguntas": [
            {"numero": number, "enunciado": f"Pregunta {number}", "puntaje": score}
            for number, score in [(1, 1.67), (2, 1.67), (3, 0.83), (4, 0.83)]
        ],
    }
    components = [
        {
            "clave": f"pregunta:{number}", "respuesta_estudiante": "Respuesta visible",
            "puntaje": score, "estado": "correcta", "explicacion": "Evidencia comprobada.",
            "paginas": [1],
        }
        for number, score in [(1, 1.67), (2, 1.67), (3, 0.83), (4, 0.83)]
    ]
    raw = {
        "grader_a": {"componentes": components},
        "grader_b": {
            "componentes": components,
            "alertas": ["La nota global no coincide con los componentes."],
            "requiere_revision_docente": True,
        },
        "evidence_coverage": {"requiere_revision": True},
    }

    breakdown = asyncio.run(create_automatic_breakdown(
        FakeDB([None, None]), calificacion=cal, blueprint=blueprint,
        raw_output=raw, pipeline_run_id="run-complete-alerted",
    ))

    assert breakdown is not None
    assert float(breakdown.nota_final) == 5.0
    assert float(cal.nota_sugerida) == 5.0
    assert cal.estado == "requiere_revision"
    assert cal.nota_confirmada is None
    assert cal.resultado_json["desglose"]["modo"] == "controlado"
    assert cal.resultado_json["desglose"]["nota_modelo_global"] == 4.17


def test_complete_sum_does_not_replace_previous_teacher_decision(monkeypatch):
    monkeypatch.setattr(
        "app.modules.calificaciones.breakdown_service.settings.EXPLAINABLE_GRADING_GENERATION_ENABLED",
        True,
    )
    cal = _calification()
    cal.nota_sugerida = 4.2
    cal.nota_confirmada = 4.2
    cal.revisado_por_docente = True
    cal.estado = "confirmada"
    blueprint = {
        "nota_maxima": 5,
        "preguntas": [{"numero": 1, "enunciado": "Respuesta", "puntaje": 5}],
    }
    valuation = {
        "clave": "pregunta:1", "respuesta_estudiante": "Respuesta", "puntaje": 5,
        "estado": "correcta", "explicacion": "Correcta.", "paginas": [1],
    }
    raw = {
        "grader_a": {"componentes": [valuation]},
        "grader_b": {"componentes": [valuation], "alertas": ["Revisar"]},
    }

    breakdown = asyncio.run(create_automatic_breakdown(
        FakeDB([None, None]), calificacion=cal, blueprint=blueprint,
        raw_output=raw, pipeline_run_id="run-after-human-decision",
    ))

    assert breakdown is not None
    assert float(breakdown.nota_final) == 5.0
    assert cal.nota_sugerida == 4.2
    assert cal.nota_confirmada == 4.2
    assert cal.estado == "confirmada"
