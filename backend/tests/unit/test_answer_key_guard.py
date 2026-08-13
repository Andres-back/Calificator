from __future__ import annotations

import asyncio
from decimal import Decimal
from uuid import uuid4

from app.modules.calificaciones import grading_service
from app.modules.calificaciones.schemas import GradingResult
from app.modules.evaluaciones.blueprint_service import grading_answer_key_status


def test_answer_key_rejects_generic_legacy_placeholders() -> None:
    complete, missing = grading_answer_key_status(
        {
            "preguntas": [
                {"numero": 1, "enunciado": "Cuanto es 6 x 7?"},
                {"numero": 2, "enunciado": "Explica tu procedimiento."},
            ],
            "respuestas_esperadas": [
                {"numero": 1, "respuesta": "42"},
                {
                    "numero": 2,
                    "respuesta": "Respuesta de referencia pendiente de validacion docente.",
                },
            ],
        }
    )

    assert complete is False
    assert missing == [2]


def test_grading_with_incomplete_legacy_key_never_reports_high_confidence(
    monkeypatch,
) -> None:
    async def fake_orchestrator(*_args, **_kwargs):
        return GradingResult(
            nota_sugerida=Decimal("4.5"),
            nota_maxima=Decimal("5"),
            confianza=0.95,
            criterios=[],
            feedback_estudiante="Buen trabajo.",
            alertas=[],
            requiere_revision_docente=False,
            raw_model_output={"orchestrator": "test"},
        )

    monkeypatch.setattr(grading_service, "orchestrate_grading", fake_orchestrator)
    result = asyncio.run(
        grading_service.grade_submission(
            object(),
            evaluacion_id=uuid4(),
            materia_id=uuid4(),
            blueprint={
                "nota_maxima": 5,
                "preguntas": [{"numero": 1, "enunciado": "Explica."}],
                "respuestas_esperadas": [],
            },
            student_response_text="Mi respuesta",
        )
    )

    assert result.confianza == 0.39
    assert result.requiere_revision_docente is True
    assert result.raw_model_output["answer_key"] == {
        "complete": False,
        "missing_questions": [1],
    }
    assert any("clave completa" in alert for alert in result.alertas)