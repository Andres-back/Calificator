from __future__ import annotations

import asyncio
from decimal import Decimal
from uuid import uuid4

from app.modules.calificaciones import orchestrator
from app.modules.calificaciones.agents import (
    AgentContext,
    AgentResult,
    grader_agent,
    vision_agent,
)


class FakeClient:
    async def close(self) -> None:
        return None


class ExplodingGraderClient:
    async def chat(self, **_kwargs):
        raise RuntimeError("provider secret must not become a score")


def _configure_orchestrator(monkeypatch) -> None:
    monkeypatch.setattr(
        orchestrator,
        "OpenCodeClient",
        lambda **_kwargs: FakeClient(),
    )

    async def no_context(*_args, **_kwargs):
        return []

    monkeypatch.setattr(orchestrator, "build_context_for_grading", no_context)
    monkeypatch.setattr(orchestrator, "format_context_as_text", lambda _chunks: "")


def _run(monkeypatch, **kwargs):
    _configure_orchestrator(monkeypatch)
    return asyncio.run(
        orchestrator.orchestrate_grading(
            object(),
            evaluacion_id=uuid4(),
            materia_id=uuid4(),
            blueprint={"nombre": "Multiplicación", "nota_maxima": 5},
            **kwargs,
        )
    )


def test_unusable_image_returns_no_score_and_stops_graders(monkeypatch) -> None:
    async def unusable_vision(*_args, **_kwargs):
        return AgentResult(
            nota_sugerida=None,
            confianza=0,
            feedback_estudiante="",
            alertas=["Imagen borrosa"],
            raw_output={"usable": False, "texto_extraido": ""},
            requiere_revision_docente=True,
        )

    async def exploding_grader(*_args, **_kwargs):
        raise AssertionError("Los graders no deben ejecutarse")

    monkeypatch.setattr(orchestrator, "vision_agent", unusable_vision)
    monkeypatch.setattr(orchestrator, "grader_agent", exploding_grader)

    result = _run(monkeypatch, image_bytes=b"image")

    assert result.nota_sugerida is None
    assert result.requiere_revision_docente is True
    assert result.motivo_revision == "image_not_usable"


def test_empty_extraction_never_grades_artificial_no_response(monkeypatch) -> None:
    async def empty_vision(*_args, **_kwargs):
        return AgentResult(
            nota_sugerida=None,
            confianza=1,
            feedback_estudiante="",
            raw_output={"usable": True, "texto_extraido": "   "},
            requiere_revision_docente=False,
        )

    async def exploding_grader(*_args, **_kwargs):
        raise AssertionError('No debe calificarse "(sin respuesta)"')

    monkeypatch.setattr(orchestrator, "vision_agent", empty_vision)
    monkeypatch.setattr(orchestrator, "grader_agent", exploding_grader)

    result = _run(monkeypatch, image_bytes=b"image")

    assert result.nota_sugerida is None
    assert result.motivo_revision == "vision_failed"


def test_both_failed_graders_return_no_score(monkeypatch) -> None:
    async def failed_grader(*_args, **_kwargs):
        return AgentResult(
            nota_sugerida=None,
            confianza=0,
            feedback_estudiante="",
            error="provider_failed",
        )

    async def exploding_comparator(*_args, **_kwargs):
        raise AssertionError("No se compara cuando ambos graders fallan")

    monkeypatch.setattr(orchestrator, "grader_agent", failed_grader)
    monkeypatch.setattr(orchestrator, "comparator_agent", exploding_comparator)

    result = _run(monkeypatch, student_response_text="Respuesta válida")

    assert result.nota_sugerida is None
    assert result.motivo_revision == "all_graders_failed"
    assert result.raw_model_output["grader_a_failed"] is True


def test_pipeline_exception_returns_sanitized_failure(monkeypatch) -> None:
    _configure_orchestrator(monkeypatch)

    async def exploding_context(*_args, **_kwargs):
        raise RuntimeError("sensitive prompt content")

    monkeypatch.setattr(
        orchestrator,
        "build_context_for_grading",
        exploding_context,
    )

    result = asyncio.run(
        orchestrator.orchestrate_grading(
            object(),
            evaluacion_id=uuid4(),
            materia_id=uuid4(),
            blueprint={"nota_maxima": 5},
            student_response_text="respuesta",
        )
    )

    assert result.nota_sugerida is None
    assert result.motivo_revision == "pipeline_error"
    assert result.raw_model_output["error_type"] == "RuntimeError"
    assert "sensitive prompt content" not in str(result.raw_model_output)


class CapturingVisionClient:
    def __init__(self) -> None:
        self.prompt = ""

    async def chat_multimodal(self, **kwargs):
        self.prompt = kwargs["text"]
        return {
            "choices": [
                {
                    "message": {
                        "content": {
                            "texto_extraido": "1. B) 36",
                            "usable": True,
                            "alertas": [],
                        }
                    }
                }
            ]
        }


def test_vision_prompt_keeps_json_example_literal() -> None:
    client = CapturingVisionClient()
    context = AgentContext(
        evaluacion_nombre="Multiplicación",
        nota_maxima=5,
        blueprint={
            "preguntas": [
                {"numero": 1, "texto": "¿Cuánto es 4 por 9?"},
            ]
        },
        image_bytes=b"image",
        image_mime="image/jpeg",
    )

    result = asyncio.run(vision_agent(context, client=client))

    assert result.error is None
    assert result.raw_output["texto_extraido"] == "1. B) 36"
    assert '"texto_extraido"' in client.prompt
    assert "¿Cuánto es 4 por 9?" in client.prompt

def test_grader_exception_uses_none_instead_of_zero() -> None:
    context = AgentContext(
        evaluacion_nombre="Prueba",
        nota_maxima=5,
        blueprint={},
        student_response_text="36",
    )

    result = asyncio.run(
        grader_agent(context, client=ExplodingGraderClient())
    )

    assert result.nota_sugerida is None
    assert result.error is not None


def test_legitimate_zero_remains_an_academic_score(monkeypatch) -> None:
    async def zero_grader(*_args, **_kwargs):
        return AgentResult(
            nota_sugerida=0,
            confianza=0.9,
            feedback_estudiante="La respuesta es incorrecta.",
            requiere_revision_docente=False,
        )

    monkeypatch.setattr(orchestrator, "grader_agent", zero_grader)

    result = _run(monkeypatch, student_response_text="respuesta incorrecta")

    assert result.nota_sugerida == Decimal("0.0")
    assert result.motivo_revision is None
    assert result.requiere_revision_docente is False
