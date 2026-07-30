from __future__ import annotations

import asyncio
from decimal import Decimal
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4
from zipfile import ZipFile

import pytest
from fastapi import HTTPException

from app.modules.evaluaciones import digitalize_service
from app.modules.evaluaciones.schemas import DigitalizarEvaluacionExternaRequest
from app.shared.enums import EvaluacionModalidad
from app.services.llm_router import LLMRouter


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
        {"numero": number, "respuesta": f"Respuesta {number}"}
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
    assert router._provider_configs["open_code"]["model"] == "qwen3.6-plus"
    assert router._provider_configs["open_code"]["timeout_seconds"] == 180