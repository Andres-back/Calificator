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
