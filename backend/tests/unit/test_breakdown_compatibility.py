import asyncio
from types import SimpleNamespace
from uuid import uuid4

from app.modules.calificaciones.breakdown_service import create_automatic_breakdown, student_breakdown_is_publishable


class NoWriteDB:
    async def flush(self):
        raise AssertionError("No debe escribir con generación desactivada")


def test_controlled_rollout_can_disable_generation_without_touching_legacy_grade(monkeypatch):
    monkeypatch.setattr(
        "app.modules.calificaciones.breakdown_service.settings.EXPLAINABLE_GRADING_GENERATION_ENABLED",
        False,
    )
    cal = SimpleNamespace(id=uuid4(), nota_sugerida=3.7, resultado_json={"legacy": True})
    result = asyncio.run(create_automatic_breakdown(
        NoWriteDB(), calificacion=cal, blueprint={"nota_maxima": 5}, raw_output={}, pipeline_run_id="run-disabled",
    ))
    assert result is None
    assert cal.nota_sugerida == 3.7
    assert cal.resultado_json == {"legacy": True}


def test_controlled_rollout_hides_a_formula_that_differs_from_official_grade(monkeypatch):
    monkeypatch.setattr(
        "app.modules.calificaciones.breakdown_service.settings.EXPLAINABLE_GRADING_AUTHORITY_ENABLED",
        False,
    )
    grade = SimpleNamespace(nota_confirmada=4.5, nota_sugerida=4.5)
    assert student_breakdown_is_publishable(grade, SimpleNamespace(nota_final=4.25)) is False
    assert student_breakdown_is_publishable(grade, SimpleNamespace(nota_final=4.5)) is True


def test_authority_mode_can_publish_its_own_formula(monkeypatch):
    monkeypatch.setattr(
        "app.modules.calificaciones.breakdown_service.settings.EXPLAINABLE_GRADING_AUTHORITY_ENABLED",
        True,
    )
    grade = SimpleNamespace(nota_confirmada=4.5, nota_sugerida=4.5)
    assert student_breakdown_is_publishable(grade, SimpleNamespace(nota_final=4.25)) is True