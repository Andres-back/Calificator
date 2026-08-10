from __future__ import annotations

import asyncio
from decimal import Decimal
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4
from zipfile import ZipFile

import httpx
import pytest
from fastapi import HTTPException

from app.modules.evaluaciones import digitalize_service
from app.modules.calificaciones.agents import AgentResult
from app.modules.evaluaciones.schemas import DigitalizarEvaluacionExternaRequest
from app.shared.enums import EvaluacionModalidad
from app.services.llm_router import LLMRouter
from app.services import llm_router as llm_router_module


def _structure(*, missing_answer: int | None = None) -> dict:
    scores = [1, 1.5, 1, 1, 1.5, 1, 1]
    questions = [
        {
            "numero": number,
            "tipo": "opcion_multiple" if number in {1, 4, 7} else "abierta",
            "enunciado": f"Pregunta {number}",
            "opciones": ["A) uno", "B) dos"] if number in {1, 4, 7} else [],
            "puntaje": scores[number - 1],
        }
        for number in range(1, 8)
    ]
    answers = [
        {"numero": number, "respuesta": "B" if number in {1, 4, 7} else f"Respuesta {number}"}
        for number in range(1, 8)
        if number != missing_answer
    ]
    return {
        "preguntas": questions,
        "respuestas_esperadas": answers,
        "criterios": [],
        "errores_comunes": ["Confundir los factores"],
        "reglas_feedback": {},
        "puntaje_total_declarado": 7,
    }


def test_digitalized_evaluation_defaults_to_physical_modality() -> None:
    request = DigitalizarEvaluacionExternaRequest(
        materia_id=uuid4(),
        nombre="Evaluación en papel",
    )

    assert request.modalidad == EvaluacionModalidad.FISICA

def test_normalization_requires_full_key_and_scales_inconsistent_points() -> None:
    result = digitalize_service.normalize_detected_structure(
        _structure(),
        nota_maxima=Decimal("5"),
    )

    assert len(result["preguntas"]) == 7
    assert len(result["respuestas_esperadas"]) == 7
    assert result["clave_completa"] is True
    assert sum(Decimal(item["puntaje"]) for item in result["preguntas"]) == Decimal("5")
    assert any("no coincide" in warning for warning in result["advertencias"])
    assert result["reglas_feedback"]["requiere_validacion_docente"] is True
    assert result["reglas_feedback"]["orientar_sin_dar_respuesta"] is True


def test_normalization_canonicalizes_objective_answers_to_existing_options() -> None:
    structure = {
        "preguntas": [
            {
                "numero": 7,
                "tipo": "opcion_multiple",
                "enunciado": "Cuanto es 6 por 6?",
                "opciones": ["A) 12", "B) 36", "C) 42"],
                "puntaje": 1,
            },
            {
                "numero": 9,
                "tipo": "verdadero_falso",
                "enunciado": "Seis por seis es treinta y seis.",
                "opciones": ["Verdadero", "Falso"],
                "puntaje": 1,
            },
        ],
        "respuestas_esperadas": [
            {"numero": 9, "respuesta": "true"},
            {"numero": 7, "respuesta": "B"},
        ],
    }

    result = digitalize_service.normalize_detected_structure(
        structure,
        nota_maxima=Decimal("5"),
    )

    assert result["respuestas_esperadas"] == [
        {"numero": 7, "respuesta": "B) 36"},
        {"numero": 9, "respuesta": "Verdadero"},
    ]


def test_normalization_rejects_generic_answer_markers() -> None:
    structure = {
        "preguntas": [
            {
                "numero": 1,
                "tipo": "abierta",
                "enunciado": "Explica la propiedad conmutativa.",
                "puntaje": 1,
            },
        ],
        "respuestas_esperadas": [
            {"numero": 1, "respuesta": "Respuesta de referencia pendiente de validacion docente."},
        ],
    }

    with pytest.raises(HTTPException) as exc:
        digitalize_service.normalize_detected_structure(
            structure,
            nota_maxima=Decimal("5"),
        )

    assert exc.value.status_code == 502
    assert "1" in str(exc.value.detail)


def test_normalization_rejects_incomplete_key() -> None:
    with pytest.raises(HTTPException) as exc:
        digitalize_service.normalize_detected_structure(
            _structure(missing_answer=5),
            nota_maxima=Decimal("5"),
        )

    assert exc.value.status_code == 502
    assert "5" in str(exc.value.detail)


def test_detect_mime_accepts_pdf_and_real_docx_container() -> None:
    assert digitalize_service.detect_digitalization_mime(
        b"%PDF-1.7\ncontent",
        "evaluacion.pdf",
    ) == "application/pdf"

    buffer = BytesIO()
    with ZipFile(buffer, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("word/document.xml", "<document />")
    assert digitalize_service.detect_digitalization_mime(
        buffer.getvalue(),
        "evaluacion.docx",
    ) == digitalize_service.DOCX_MIME


def test_detect_mime_rejects_empty_and_unknown_files() -> None:
    with pytest.raises(ValueError, match="vacío"):
        digitalize_service.detect_digitalization_mime(b"", "empty.pdf")
    with pytest.raises(ValueError, match="no soportado"):
        digitalize_service.detect_digitalization_mime(b"plain text", "fake.pdf")


class _FakeVisionClient:
    async def close(self) -> None:
        return None


def test_image_extraction_accepts_meaningful_text_when_flagged_unusable(monkeypatch) -> None:
    captured: dict[str, str] = {}

    async def fake_vision(context, model, client, prompt_override=None, timeout=None):
        captured["prompt"] = prompt_override
        captured["model"] = model
        captured["timeout"] = timeout
        return AgentResult(
            nota_sugerida=None,
            confianza=0.4,
            feedback_estudiante="",
            raw_output={
                "usable": False,
                "texto_extraido": (
                    "Evaluación grado 5. 1. ¿Cuánto es 1+2-3×4÷5? "
                    "2. Seleccione el número más grande."
                ),
                "alertas": ["Texto manuscrito"],
            },
        )

    monkeypatch.setattr(digitalize_service, "OpenCodeClient", _FakeVisionClient)
    monkeypatch.setattr(digitalize_service, "vision_agent", fake_vision)

    text, warnings = asyncio.run(
        digitalize_service._extract_image_text(
            b"image",
            "image/png",
            "evaluacion.png",
        )
    )

    assert "Seleccione el número" in text
    assert "HOJA DE PREGUNTAS" in captured["prompt"]
    assert captured["model"] == "mimo-v2.5"
    assert captured["timeout"] == 60
    assert any("parcialmente legible" in warning for warning in warnings)


def test_image_extraction_uses_document_fallback_on_provider_error(monkeypatch) -> None:
    async def failed_primary(context, model, client, prompt_override=None, timeout=None):
        return AgentResult(
            nota_sugerida=None,
            confianza=0,
            feedback_estudiante="",
            error="HTTP 500",
        )

    async def successful_fallback(content, mime_type, context_hint, purpose):
        assert purpose == "evaluation_document"
        return {
            "text_or_visual_content": "1. Calcule 8+4. 2. Escriba los decimales de pi.",
            "image_quality": {"is_usable": True},
            "warnings": [],
        }

    monkeypatch.setattr(digitalize_service, "OpenCodeClient", _FakeVisionClient)
    monkeypatch.setattr(digitalize_service, "vision_agent", failed_primary)
    monkeypatch.setattr(digitalize_service, "interpret_image", successful_fallback)

    text, warnings = asyncio.run(
        digitalize_service._extract_image_text(
            b"image",
            "image/png",
            "evaluacion.png",
        )
    )

    assert "Calcule 8+4" in text
    assert any("proveedor alternativo" in warning for warning in warnings)


def test_image_extraction_reports_provider_outage_without_blaming_photo(monkeypatch) -> None:
    async def failed_primary(context, model, client, prompt_override=None, timeout=None):
        return AgentResult(
            nota_sugerida=None,
            confianza=0,
            feedback_estudiante="",
            error="provider timeout",
        )

    async def failed_fallback(content, mime_type, context_hint, purpose):
        return {
            "text_or_visual_content": "",
            "image_quality": {"is_usable": False},
            "warnings": [
                "No se pudo interpretar la imagen con ningún proveedor de visión."
            ],
        }

    monkeypatch.setattr(digitalize_service, "OpenCodeClient", _FakeVisionClient)
    monkeypatch.setattr(digitalize_service, "vision_agent", failed_primary)
    monkeypatch.setattr(digitalize_service, "interpret_image", failed_fallback)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            digitalize_service._extract_image_text(
                b"image",
                "image/png",
                "evaluacion.png",
            )
        )

    assert exc.value.status_code == 503
    assert "no fue rechazada por su calidad" in str(exc.value.detail)


def test_detector_repairs_missing_answers_before_normalizing(monkeypatch) -> None:
    first = _structure(missing_answer=5)
    calls: list[str] = []

    class FakeRouter:
        def __init__(self, user_id=None) -> None:
            assert user_id is not None

        async def generate_json(self, task_type, prompt):
            calls.append(task_type)
            if len(calls) == 1:
                return first
            return {"respuestas_esperadas": [{"numero": 5, "respuesta": "24 lápices"}]}

    monkeypatch.setattr(digitalize_service, "LLMRouter", FakeRouter)
    result = asyncio.run(
        digitalize_service.detectar_estructura_evaluacion(
            uuid4(),
            "Evaluación de siete preguntas",
            nota_maxima=Decimal("5"),
        )
    )

    assert calls == ["evaluacion_digitalizar", "evaluacion_digitalizar"]
    assert len(result["respuestas_esperadas"]) == 7
    assert result["respuestas_esperadas"][4]["respuesta"] == "24 lápices"


def test_detector_uses_local_math_fallback_when_opencode_is_limited(monkeypatch) -> None:
    class FailingRouter:
        def __init__(self, user_id=None) -> None:
            pass

        async def generate_json(self, task_type, prompt):
            raise RuntimeError("rate limited")

    monkeypatch.setattr(digitalize_service, "LLMRouter", FailingRouter)
    extracted_text = """Evaluación Grado 5.º
1. ¿Cuánto es 1+2-3x4÷5?
2. Seleccione el número más grande
A) 1+30-15x2÷3
B) 30-1+15÷9
C) 10+10-10
D) 1+50-20x3÷2
3. Escriba los primeros 3 decimales de pi (3...)
"""

    result = asyncio.run(
        digitalize_service.detectar_estructura_evaluacion(
            uuid4(),
            extracted_text,
            nota_maxima=Decimal("5"),
        )
    )

    answers = {
        item["numero"]: item["respuesta"]
        for item in result["respuestas_esperadas"]
    }
    assert len(result["preguntas"]) == 3
    assert answers[1] == "0.6"
    assert answers[2].startswith("B)")
    assert answers[3] == "3.141"
    assert any("recuperación local" in warning for warning in result["advertencias"])


def test_local_verification_corrects_objective_math_answers() -> None:
    structure = {
        "preguntas": [
            {"numero": 1, "enunciado": "Cuanto es 6 x 7?"},
            {"numero": 2, "enunciado": "Resuelve 18 / 3 + 4."},
            {"numero": 3, "enunciado": "Escribe los primeros tres decimales de pi."},
        ],
        "respuestas_esperadas": [
            {"numero": 1, "respuesta": "41"},
            {"numero": 2, "respuesta": "9"},
            {"numero": 3, "respuesta": "141"},
        ],
    }
    content = """1. Cuanto es 6 x 7?
2. Resuelve 18 / 3 + 4.
3. Escribe los primeros tres decimales de pi.
"""

    verified = digitalize_service._apply_locally_verified_answers(structure, content)
    answers = {
        item["numero"]: item["respuesta"]
        for item in verified["respuestas_esperadas"]
    }

    assert answers == {1: "42", 2: "10", 3: "3.141"}


def test_document_routing_never_falls_through_to_other_providers(monkeypatch) -> None:
    class FakeSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

    class FakeConfigService:
        def __init__(self, db):
            pass

        async def init(self):
            pass

        async def get_feature_config(self, task_type):
            return {
                "primary_provider": "groq",
                "fallback_provider": "template",
            }

        async def get_text_providers(self):
            return [
                {"id": "groq", "active": True},
                {"id": "open_code", "active": True},
                {"id": "template", "active": True},
            ]

    async def fake_credentials(_db):
        return SimpleNamespace(open_code_key="test", groq_key="should-not-be-used")

    monkeypatch.setattr("app.db.session.AsyncSessionLocal", lambda: FakeSession())
    monkeypatch.setattr("app.services.ai_config_service.AIConfigService", FakeConfigService)
    monkeypatch.setattr("app.services.llm_router.get_effective_ai_credentials", fake_credentials)

    router = LLMRouter()
    providers = asyncio.run(router._load_providers("evaluacion_digitalizar"))

    assert [provider for provider, _call in providers] == ["open_code"]
    assert router._provider_configs["open_code"]["model"] == "mimo-v2.5"
    assert router._provider_configs["open_code"]["timeout_seconds"] == 180


def test_digitalization_defaults_to_mimo_fast_path() -> None:
    assert digitalize_service.settings.OPEN_CODE_DIGITALIZATION_VISION_MODEL == "mimo-v2.5"
    assert digitalize_service.settings.OPEN_CODE_DIGITALIZATION_MODEL == "mimo-v2.5"

def test_opencode_text_router_retries_rate_limit(monkeypatch) -> None:
    request = httpx.Request("POST", "https://example.test/messages")
    responses = [
        httpx.Response(
            429,
            headers={"Retry-After": "0"},
            request=request,
        ),
        httpx.Response(
            200,
            json={
                "content": [{"type": "text", "text": "{\"preguntas\": []}"}],
                "usage": {},
            },
            request=request,
        ),
    ]

    class FakeHTTPClient:
        calls = 0
        last_url = ""
        last_headers: dict = {}
        last_json: dict = {}

        def __init__(self, timeout):
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return False

        async def post(self, url, headers, json):
            type(self).calls += 1
            type(self).last_url = url
            type(self).last_headers = headers
            type(self).last_json = json
            return responses.pop(0)

    async def fake_usage_log(**kwargs):
        return None

    monkeypatch.setattr(llm_router_module.httpx, "AsyncClient", FakeHTTPClient)
    monkeypatch.setattr(llm_router_module, "log_ai_usage", fake_usage_log)

    router = LLMRouter()
    router._credentials["open_code"] = "test-key"
    router._provider_configs["open_code"] = {
        "base_url": "https://example.test",
        "model": "qwen3.6-plus",
        "timeout_seconds": 5,
    }

    result = asyncio.run(router._call_open_code("Digitaliza", json_mode=True))

    assert result == "{\"preguntas\": []}"
    assert FakeHTTPClient.calls == 2
    assert FakeHTTPClient.last_url.endswith("/messages")
    assert FakeHTTPClient.last_headers["x-api-key"] == "test-key"
    assert "response_format" not in FakeHTTPClient.last_json
    assert FakeHTTPClient.last_json["max_tokens"] == 3072
