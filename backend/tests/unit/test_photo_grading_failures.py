from __future__ import annotations

import asyncio
from decimal import Decimal
from uuid import uuid4

from app.modules.calificaciones import agents, orchestrator
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


class CapturingGraderClient:
    def __init__(self) -> None:
        self.timeout = None

    async def chat(self, **kwargs):
        self.timeout = kwargs.get("timeout")
        return {
            "choices": [
                {
                    "message": {
                        "content": {
                            "nota_sugerida": 4,
                            "confianza": 0.9,
                            "feedback_estudiante": "Bien.",
                        }
                    }
                }
            ]
        }


def _configure_orchestrator(monkeypatch) -> None:
    monkeypatch.setattr(
        orchestrator.settings,
        "PHOTO_GRADING_FAST_VISION_ENABLED",
        False,
    )
    monkeypatch.setattr(
        orchestrator.settings,
        "PHOTO_GRADING_FAST_GRADERS_ENABLED",
        False,
    )
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


def test_objective_validation_accepts_equivalent_answers() -> None:
    blueprint = {
        "nota_maxima": 5,
        "preguntas": [
            {"numero": 1, "tipo": "opcion_multiple"},
            {"numero": 2, "tipo": "abierta"},
            {"numero": 3, "tipo": "verdadero_falso"},
            {"numero": 4, "tipo": "opcion_multiple"},
            {"numero": 5, "tipo": "abierta"},
            {"numero": 6, "tipo": "verdadero_falso"},
            {"numero": 7, "tipo": "opcion_multiple"},
        ],
        "respuestas_esperadas": [
            {"numero": 1, "respuesta": "B) 36"},
            {"numero": 3, "respuesta": "Verdadero"},
            {"numero": 4, "respuesta": "B) 48"},
            {"numero": 5, "respuesta": "24 lápices"},
            {"numero": 6, "respuesta": "Verdadero"},
            {"numero": 7, "respuesta": "C) 27"},
        ],
    }
    detected = [
        {
            "pregunta": 1,
            "respuesta": "¿Cuál es 4 por 9? A) 32, 36 (seleccionado), C) 40, D) 45",
        },
        {"pregunta": 3, "respuesta": "Sí es igual"},
        {"pregunta": 4, "respuesta": "B 48"},
        {"pregunta": 5, "respuesta": "24 lapices"},
        {"pregunta": 6, "respuesta": "si"},
        {"pregunta": 7, "respuesta": "C 27"},
    ]

    validation = orchestrator.build_objective_validation(blueprint, detected)

    assert len(validation) == 6
    assert all(item["correcta"] is True for item in validation)
    assert orchestrator.objective_score_floor(blueprint, validation) == Decimal("4.29")

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
    monkeypatch.setattr(orchestrator, "router_grader_agent", failed_grader)
    monkeypatch.setattr(orchestrator, "comparator_agent", exploding_comparator)

    result = _run(monkeypatch, student_response_text="Respuesta válida")

    assert result.nota_sugerida is None
    assert result.motivo_revision == "all_graders_failed"
    assert result.raw_model_output["grader_a_failed"] is True


def test_configured_grader_router_recovers_when_opencode_fails(monkeypatch) -> None:
    monkeypatch.setattr(
        orchestrator.settings,
        "PHOTO_GRADING_CROSS_PROVIDER_FALLBACK_ENABLED",
        True,
    )

    async def failed_grader(*_args, **_kwargs):
        return AgentResult(
            nota_sugerida=None,
            confianza=0,
            feedback_estudiante="",
            error="provider_failed",
        )

    async def configured_grader(*_args, **_kwargs):
        return AgentResult(
            nota_sugerida=4,
            confianza=0.85,
            feedback_estudiante="Buen trabajo; revisa la respuesta incompleta.",
            proveedor="llm_router",
            modelo="configured_cascade",
        )

    monkeypatch.setattr(orchestrator, "grader_agent", failed_grader)
    monkeypatch.setattr(orchestrator, "router_grader_agent", configured_grader)

    result = _run(monkeypatch, student_response_text="Respuesta válida")

    assert result.nota_sugerida == Decimal("4.0")
    assert result.motivo_revision is None


def test_configured_vision_router_recovers_when_opencode_fails(monkeypatch) -> None:
    monkeypatch.setattr(
        orchestrator.settings,
        "PHOTO_GRADING_CROSS_PROVIDER_FALLBACK_ENABLED",
        True,
    )

    async def failed_vision(*_args, **_kwargs):
        return AgentResult(
            nota_sugerida=None,
            confianza=0,
            feedback_estudiante="",
            error="provider_failed",
        )

    async def configured_vision(*_args, **_kwargs):
        return AgentResult(
            nota_sugerida=None,
            confianza=0.9,
            feedback_estudiante="",
            raw_output={
                "usable": True,
                "texto_extraido": "1. B) 36",
                "alertas": [],
            },
            proveedor="vision_router",
            modelo="openai_groq_cascade",
        )

    async def successful_grader(*_args, **_kwargs):
        return AgentResult(
            nota_sugerida=5,
            confianza=0.95,
            feedback_estudiante="Respuesta correcta.",
        )

    monkeypatch.setattr(orchestrator, "vision_agent", failed_vision)
    monkeypatch.setattr(orchestrator, "vision_router_agent", configured_vision)
    monkeypatch.setattr(orchestrator, "grader_agent", successful_grader)

    result = _run(monkeypatch, image_bytes=b"image")

    assert result.nota_sugerida == Decimal("5.0")
    assert result.motivo_revision is None


def test_vision_router_normalizes_text_answers(monkeypatch) -> None:
    async def interpreted_image(*_args, **_kwargs):
        return {
            "text_or_visual_content": "1. B) 36\n2. 24 lápices",
            "detected_questions": [1, 2],
            "detected_answers": ["1. B) 36", "2: 24 lápices"],
            "image_quality": {"is_usable": True},
            "confidence": 0.9,
        }

    monkeypatch.setattr(agents, "interpret_image", interpreted_image)
    context = AgentContext(
        evaluacion_nombre="Multiplicación",
        nota_maxima=5,
        blueprint={},
        image_bytes=b"image",
    )

    result = asyncio.run(agents.vision_router_agent(context))

    assert result.error is None
    assert result.raw_output["respuestas_detectadas"] == [
        {"pregunta": 1, "respuesta": "B) 36"},
        {"pregunta": 2, "respuesta": "24 lápices"},
    ]


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


def test_text_grader_uses_extended_timeout() -> None:
    client = CapturingGraderClient()
    context = AgentContext(
        evaluacion_nombre="Prueba",
        nota_maxima=5,
        blueprint={},
        student_response_text="36",
    )

    result = asyncio.run(grader_agent(context, client=client))

    assert result.nota_sugerida == 4
    assert client.timeout is not None
    assert client.timeout >= 120


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


def test_vision_prompt_requires_numbered_structured_answers() -> None:
    assert '"pregunta": 1' in agents.VISION_PROMPT
    assert "por cada respuesta numerada visible" in agents.VISION_PROMPT


def test_comparator_failure_preserves_grader_confidence_and_trace(monkeypatch) -> None:
    async def successful_grader(*_args, **_kwargs):
        return AgentResult(
            nota_sugerida=4.0,
            confianza=0.92,
            feedback_estudiante="Buen trabajo.",
            criterios=[{"nombre": "Exactitud", "puntaje": 4, "maximo": 5}],
            requiere_revision_docente=False,
            modelo="qwen",
        )

    async def failed_comparator(*_args, **_kwargs):
        return AgentResult(
            nota_sugerida=4.0,
            confianza=0,
            feedback_estudiante="",
            proveedor="comparator",
            modelo="fallback",
            error="invalid_json",
        )

    monkeypatch.setattr(orchestrator, "grader_agent", successful_grader)
    monkeypatch.setattr(orchestrator, "comparator_agent", failed_comparator)

    result = _run(monkeypatch, student_response_text="Respuesta válida")

    assert result.nota_sugerida == Decimal("4.0")
    assert result.confianza == 0.92
    assert result.requiere_revision_docente is True
    assert result.feedback_estudiante == "Buen trabajo."
    assert result.raw_model_output["comparator"]["fallback_applied"] is True
    assert result.raw_model_output["comparator"]["error_type"] == "comparator_error"
