from __future__ import annotations

import asyncio
from decimal import Decimal
from io import BytesIO
from uuid import uuid4

from PIL import Image

from app.modules.calificaciones import agents, grading_service, orchestrator
from app.modules.calificaciones.schemas import GradingResult
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
        self.max_tokens = None
        self.stage = None

    async def chat(self, **kwargs):
        self.timeout = kwargs.get("timeout")
        self.max_tokens = kwargs.get("max_tokens")
        self.stage = kwargs.get("stage")
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
        orchestrator,
        "OpenCodeClient",
        lambda **_kwargs: FakeClient(),
    )

    async def no_context(*_args, **_kwargs):
        return []

    monkeypatch.setattr(orchestrator, "build_context_for_grading", no_context)
    monkeypatch.setattr(orchestrator, "format_context_as_text", lambda _chunks: "")

    async def default_fast_verifier(_ctx, primary, *, model: str, **_kwargs):
        return AgentResult(
            nota_sugerida=primary.nota_sugerida,
            confianza=max(float(primary.confianza), 0.9),
            feedback_estudiante="",
            componentes=primary.componentes,
            proveedor="opencode",
            modelo=model,
            requiere_revision_docente=False,
            raw_output={"requiere_arbitraje": False},
        )

    monkeypatch.setattr(
        orchestrator,
        "verification_agent",
        default_fast_verifier,
        raising=False,
    )


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


def test_text_grader_does_not_apply_an_inference_deadline() -> None:
    client = CapturingGraderClient()
    context = AgentContext(
        evaluacion_nombre="Prueba",
        nota_maxima=5,
        blueprint={},
        student_response_text="36",
    )

    result = asyncio.run(grader_agent(context, client=client))

    assert result.nota_sugerida == 4
    assert client.timeout is None
    assert client.max_tokens <= 3072
    assert client.stage == "grading_primary"


def test_fast_verifier_uses_compact_output_budget() -> None:
    client = CapturingGraderClient()
    context = AgentContext(
        evaluacion_nombre="Prueba",
        nota_maxima=5,
        blueprint={"preguntas": [{"id": "q1", "texto": "2 + 2"}]},
        student_response_text="1. 4",
    )
    primary = AgentResult(
        nota_sugerida=5,
        confianza=0.95,
        feedback_estudiante="Correcto.",
        componentes=[{"componente_id": "q1", "puntos_obtenidos": 5, "puntos_maximos": 5}],
        proveedor="opencode",
        modelo="deepseek-v4-flash",
    )

    result = asyncio.run(
        agents.verification_agent(
            context,
            primary,
            client=client,
            timeout=15,
        )
    )

    assert result.nota_sugerida == 4
    assert client.timeout == 15
    assert client.max_tokens <= 1536
    assert client.stage == "grading_secondary"

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


def test_photo_pipeline_uses_qwen_extraction_and_fast_flash_verifier(monkeypatch) -> None:
    _configure_orchestrator(monkeypatch)

    vision_models: list[str] = []
    grader_calls: list[tuple[str, bool]] = []

    async def open_code_vision(*_args, model: str, **_kwargs):
        vision_models.append(model)
        return AgentResult(
            nota_sugerida=None,
            confianza=0.95,
            feedback_estudiante="",
            proveedor="opencode",
            modelo=model,
            raw_output={
                "usable": True,
                "texto_extraido": "1. B) 36",
                "respuestas_detectadas": [
                    {"pregunta": 1, "respuesta": "B) 36"},
                ],
            },
            requiere_revision_docente=False,
        )

    async def open_code_grader(
        *_args,
        model: str,
        multimodal: bool,
        **_kwargs,
    ):
        grader_calls.append((model, multimodal))
        return AgentResult(
            nota_sugerida=5,
            confianza=0.95,
            feedback_estudiante="Correcto.",
            proveedor="opencode",
            modelo=model,
            requiere_revision_docente=False,
        )

    async def forbidden_external_router(*_args, **_kwargs):
        raise AssertionError("Groq/OpenAI no debe ejecutarse cuando OpenCode responde")

    monkeypatch.setattr(orchestrator, "vision_agent", open_code_vision)
    monkeypatch.setattr(orchestrator, "grader_agent", open_code_grader)
    monkeypatch.setattr(
        orchestrator,
        "vision_router_agent",
        forbidden_external_router,
    )
    monkeypatch.setattr(
        orchestrator,
        "router_grader_agent",
        forbidden_external_router,
    )

    result = asyncio.run(
        orchestrator.orchestrate_grading(
            object(),
            evaluacion_id=uuid4(),
            materia_id=uuid4(),
            blueprint={"nombre": "Prueba", "nota_maxima": 5},
            image_bytes=b"image",
        )
    )

    assert vision_models == ["qwen3.7-plus"]
    assert grader_calls == [
        ("deepseek-v4-flash", False),
    ]
    assert result.raw_model_output["strategy"]["secondary_mode"] == "fast_verifier"
    assert result.raw_model_output["strategy"]["arbiter_invoked"] is False
    assert result.raw_model_output["provider_policy"] == "opencode_go_primary"
    assert result.raw_model_output["vision"]["proveedor"] == "opencode"
    assert result.raw_model_output["grader_a"]["proveedor"] == "opencode"
    assert result.raw_model_output["grader_b"]["proveedor"] == "opencode"


def test_photo_pipeline_reuses_the_orientation_that_restored_readability(monkeypatch) -> None:
    _configure_orchestrator(monkeypatch)
    source = Image.new("RGB", (320, 180), "white")
    buffer = BytesIO()
    source.save(buffer, format="PNG")
    vision_sizes: list[tuple[int, int]] = []
    grader_texts: list[str] = []

    async def orientation_sensitive_vision(context, model: str, **_kwargs):
        size = Image.open(BytesIO(context.image_bytes)).size
        vision_sizes.append(size)
        if size == (320, 180):
            return AgentResult(
                nota_sugerida=None,
                confianza=0,
                feedback_estudiante="",
                proveedor="opencode",
                modelo=model,
                raw_output={"usable": False, "texto_extraido": ""},
            )
        return AgentResult(
            nota_sugerida=None,
            confianza=0.94,
            feedback_estudiante="",
            proveedor="opencode",
            modelo=model,
            raw_output={
                "usable": True,
                "texto_extraido": "1. 32,37 + 41,32 = 73,69",
                "respuestas_detectadas": [
                    {"pregunta": 1, "respuesta": "73,69"},
                ],
            },
            requiere_revision_docente=False,
        )

    async def successful_grader(context, model: str, **_kwargs):
        assert context.image_bytes is None
        grader_texts.append(context.student_response_text)
        return AgentResult(
            nota_sugerida=5,
            confianza=0.94,
            feedback_estudiante="Correcto.",
            proveedor="opencode",
            modelo=model,
            requiere_revision_docente=False,
        )

    async def comparator(first, _second, **_kwargs):
        return first

    monkeypatch.setattr(orchestrator, "vision_agent", orientation_sensitive_vision)
    monkeypatch.setattr(orchestrator, "grader_agent", successful_grader)
    monkeypatch.setattr(orchestrator, "comparator_agent", comparator)

    result = asyncio.run(
        orchestrator.orchestrate_grading(
            object(),
            evaluacion_id=uuid4(),
            materia_id=uuid4(),
            blueprint={"nombre": "Decimales", "nota_maxima": 5},
            image_bytes=buffer.getvalue(),
            image_mime="image/png",
        )
    )

    assert vision_sizes == [(320, 180), (180, 320)]
    assert grader_texts == [
        "1. 32,37 + 41,32 = 73,69",
    ]
    assert result.nota_sugerida == Decimal("5")
    assert result.raw_model_output["vision"]["rotation_applied"] == 90

def test_online_pipeline_uses_deepseek_without_vision(monkeypatch) -> None:
    _configure_orchestrator(monkeypatch)
    grader_calls: list[tuple[str, bool]] = []

    async def forbidden_vision(*_args, **_kwargs):
        raise AssertionError("Una entrega online no debe enviar imagen")

    async def open_code_grader(
        *_args,
        model: str,
        multimodal: bool,
        **_kwargs,
    ):
        grader_calls.append((model, multimodal))
        return AgentResult(
            nota_sugerida=4.5,
            confianza=0.9,
            feedback_estudiante="Buen trabajo.",
            proveedor="opencode",
            modelo=model,
            requiere_revision_docente=False,
        )

    monkeypatch.setattr(orchestrator, "vision_agent", forbidden_vision)
    monkeypatch.setattr(orchestrator, "grader_agent", open_code_grader)

    result = asyncio.run(
        orchestrator.orchestrate_grading(
            object(),
            evaluacion_id=uuid4(),
            materia_id=uuid4(),
            blueprint={"nombre": "Prueba online", "nota_maxima": 5},
            student_response_text="1. 36",
        )
    )

    assert grader_calls == [
        ("deepseek-v4-flash", False),
    ]
    assert result.raw_model_output["strategy"]["secondary_mode"] == "fast_verifier"
    assert result.raw_model_output["strategy"]["arbiter_invoked"] is False
    assert result.raw_model_output["evidence_mode"] == "digital_text"
    assert result.raw_model_output["vision"] is None


def test_opencode_vision_fallback_keeps_provider_boundary(monkeypatch) -> None:
    _configure_orchestrator(monkeypatch)
    vision_models: list[str] = []

    async def open_code_vision(*_args, model: str, **_kwargs):
        vision_models.append(model)
        if model == "qwen3.7-plus":
            return AgentResult(
                nota_sugerida=None,
                confianza=0,
                feedback_estudiante="",
                proveedor="opencode",
                modelo=model,
                error="temporary_failure",
            )
        return AgentResult(
            nota_sugerida=None,
            confianza=0.9,
            feedback_estudiante="",
            proveedor="opencode",
            modelo=model,
            raw_output={"usable": True, "texto_extraido": "1. 36"},
            requiere_revision_docente=False,
        )

    async def successful_grader(*_args, model: str, **_kwargs):
        return AgentResult(
            nota_sugerida=5,
            confianza=0.9,
            feedback_estudiante="Correcto.",
            proveedor="opencode",
            modelo=model,
            requiere_revision_docente=False,
        )

    monkeypatch.setattr(orchestrator, "vision_agent", open_code_vision)
    monkeypatch.setattr(orchestrator, "grader_agent", successful_grader)

    result = asyncio.run(
        orchestrator.orchestrate_grading(
            object(),
            evaluacion_id=uuid4(),
            materia_id=uuid4(),
            blueprint={"nombre": "Prueba", "nota_maxima": 5},
            image_bytes=b"image",
        )
    )

    assert vision_models == ["qwen3.7-plus", "qwen3.6-plus"]
    assert result.raw_model_output["vision"]["modelo"] == "qwen3.6-plus"


def test_discrepancy_invokes_pro_arbiter_once(monkeypatch) -> None:
    _configure_orchestrator(monkeypatch)
    comparator_calls: list[tuple[str, bool]] = []

    async def primary_grader(*_args, model: str, **_kwargs):
        return AgentResult(
            nota_sugerida=4.8,
            confianza=0.94,
            feedback_estudiante="Desglose principal.",
            componentes=[{"componente_id": "q1", "puntos_obtenidos": 4.8, "puntos_maximos": 5}],
            proveedor="opencode",
            modelo=model,
            requiere_revision_docente=False,
        )

    async def disagreeing_verifier(_ctx, _primary, *, model: str, **_kwargs):
        return AgentResult(
            nota_sugerida=3.6,
            confianza=0.9,
            feedback_estudiante="",
            proveedor="opencode",
            modelo=model,
            requiere_revision_docente=True,
            raw_output={"requiere_arbitraje": True},
        )

    async def pro_comparator(first, _second, *, model: str, force_arbitration: bool = False, **_kwargs):
        comparator_calls.append((model, force_arbitration))
        return AgentResult(
            nota_sugerida=4.2,
            confianza=0.9,
            feedback_estudiante=first.feedback_estudiante,
            componentes=first.componentes,
            proveedor="comparator",
            modelo=model,
            requiere_revision_docente=True,
            raw_output={"discrepancia": True},
        )

    monkeypatch.setattr(orchestrator, "grader_agent", primary_grader)
    monkeypatch.setattr(orchestrator, "verification_agent", disagreeing_verifier, raising=False)
    monkeypatch.setattr(orchestrator, "comparator_agent", pro_comparator)

    result = asyncio.run(
        orchestrator.orchestrate_grading(
            object(),
            evaluacion_id=uuid4(),
            materia_id=uuid4(),
            blueprint={"nombre": "Prueba", "nota_maxima": 5},
            student_response_text="1. Respuesta",
        )
    )

    assert comparator_calls == [("deepseek-v4-pro", True)]
    assert result.raw_model_output["strategy"]["arbiter_invoked"] is True
    assert result.raw_model_output["strategy"]["arbiter_reason"] == "score_discrepancy"


def test_low_confidence_invokes_pro_arbiter(monkeypatch) -> None:
    _configure_orchestrator(monkeypatch)
    comparator_calls: list[tuple[str, bool]] = []

    async def uncertain_grader(*_args, model: str, **_kwargs):
        return AgentResult(
            nota_sugerida=4.0,
            confianza=0.55,
            feedback_estudiante="Revisar procedimiento.",
            proveedor="opencode",
            modelo=model,
            requiere_revision_docente=True,
        )

    async def close_verifier(_ctx, _primary, *, model: str, **_kwargs):
        return AgentResult(
            nota_sugerida=4.1,
            confianza=0.9,
            feedback_estudiante="",
            proveedor="opencode",
            modelo=model,
            requiere_revision_docente=False,
            raw_output={"requiere_arbitraje": False},
        )

    async def pro_comparator(first, _second, *, model: str, force_arbitration: bool = False, **_kwargs):
        comparator_calls.append((model, force_arbitration))
        return AgentResult(
            nota_sugerida=4.0,
            confianza=0.85,
            feedback_estudiante=first.feedback_estudiante,
            componentes=first.componentes,
            proveedor="comparator",
            modelo=model,
            requiere_revision_docente=True,
            raw_output={"discrepancia": False},
        )

    monkeypatch.setattr(orchestrator, "grader_agent", uncertain_grader)
    monkeypatch.setattr(orchestrator, "verification_agent", close_verifier, raising=False)
    monkeypatch.setattr(orchestrator, "comparator_agent", pro_comparator)

    result = asyncio.run(
        orchestrator.orchestrate_grading(
            object(),
            evaluacion_id=uuid4(),
            materia_id=uuid4(),
            blueprint={"nombre": "Prueba", "nota_maxima": 5},
            student_response_text="1. Respuesta",
        )
    )

    assert comparator_calls == [("deepseek-v4-pro", True)]
    assert result.raw_model_output["strategy"]["arbiter_invoked"] is True
    assert result.raw_model_output["strategy"]["arbiter_reason"] == "low_confidence"

def test_delayed_provider_response_is_not_discarded_by_elapsed_time(monkeypatch) -> None:
    async def delayed_result(*_args, **_kwargs):
        await asyncio.sleep(0.01)
        return GradingResult(
            nota_sugerida=Decimal("4.5"),
            nota_maxima=Decimal("5"),
            confianza=0.9,
            criterios=[],
            componentes=[],
            feedback_estudiante="Resultado recibido.",
            alertas=[],
            requiere_revision_docente=False,
            raw_model_output={"terminal_reason": "success"},
        )

    def forbidden_pipeline_timeout(*_args, **_kwargs):
        raise AssertionError("La duración no debe cancelar una inferencia aceptada")

    monkeypatch.setattr(asyncio, "timeout", forbidden_pipeline_timeout)
    monkeypatch.setattr(grading_service, "orchestrate_grading", delayed_result)
    result = asyncio.run(
        grading_service.grade_submission(
            object(),
            evaluacion_id=uuid4(),
            materia_id=uuid4(),
            blueprint={
                "nombre": "Prueba",
                "nota_maxima": 5,
                "preguntas": [{"numero": 1, "texto": "2 + 2"}],
                "respuestas_esperadas": [{"numero": 1, "respuesta": "4"}],
            },
            image_bytes=b"image",
        )
    )

    assert result.nota_sugerida == Decimal("4.5")
    assert result.requiere_revision_docente is False
    assert result.raw_model_output["terminal_reason"] == "success"


def test_opencode_inference_waits_for_response_but_bounds_transport() -> None:
    request = agents.httpx.Request("POST", "https://example.test/chat/completions")

    class CapturingHTTPClient:
        def __init__(self) -> None:
            self.timeout = None

        async def post(self, *_args, **kwargs):
            self.timeout = kwargs.get("timeout")
            return agents.httpx.Response(
                200,
                request=request,
                json={"choices": [{"message": {"content": {"ok": True}}}], "usage": {}},
            )

        async def aclose(self):
            return None

    client = agents.OpenCodeClient()
    transport = CapturingHTTPClient()
    client._client = transport
    result = asyncio.run(
        client.chat(
            model="deepseek-v4-flash",
            messages=[{"role": "user", "content": "califica"}],
            max_attempts=1,
        )
    )
    asyncio.run(client.close())

    assert result["choices"][0]["message"]["content"] == {"ok": True}
    assert isinstance(transport.timeout, agents.httpx.Timeout)
    assert transport.timeout.read is None
    assert transport.timeout.connect is not None
    assert transport.timeout.write is not None
    assert transport.timeout.pool is not None