from __future__ import annotations

import asyncio
from uuid import uuid4

import app.modules.xali.service as xali_service
from app.modules.xali.service import (
    DIRECT_ANSWER_REFUSAL,
    GUIDED_RESPONSE_FALLBACK,
    XALI_VALIDATION_NOTICE,
    enforce_guided_response,
    is_direct_answer_request,
)


def test_detects_direct_answer_requests_in_natural_spanish() -> None:
    blocked = [
        "Dame la respuesta correcta de la pregunta 3.",
        "Cual es la solucion exacta?",
        "Resuelveme el examen completo por favor.",
        "Solo dime que opcion marcar.",
        "Hazme la evaluacion.",
    ]

    assert all(is_direct_answer_request(message) for message in blocked)


def test_allows_requests_for_guided_learning() -> None:
    allowed = [
        "En que me equivoque?",
        "Como podia responder mejor?",
        "Ayudame a entender el primer paso sin darme la respuesta.",
        "Dame una pista sobre el concepto que debo repasar.",
    ]

    assert not any(is_direct_answer_request(message) for message in allowed)


def test_replaces_model_output_that_reveals_a_final_answer() -> None:
    response = "La respuesta correcta es la opcion C. Marcala en tu evaluacion."

    assert enforce_guided_response(response) == GUIDED_RESPONSE_FALLBACK
    assert "opcion C" not in enforce_guided_response(response)


def test_keeps_guided_output_and_adds_teacher_validation_notice() -> None:
    response = "Revisa que operacion representa el cambio y compara ese paso con tu procedimiento."

    guarded = enforce_guided_response(response)

    assert response in guarded
    assert XALI_VALIDATION_NOTICE in guarded


def test_refusal_is_pedagogical_and_does_not_expose_an_answer() -> None:
    assert "no puedo darte respuestas" in DIRECT_ANSWER_REFUSAL
    assert "pista" in DIRECT_ANSWER_REFUSAL
    assert XALI_VALIDATION_NOTICE in DIRECT_ANSWER_REFUSAL


def test_general_student_chat_blocks_direct_answer_before_calling_llm(monkeypatch) -> None:
    events: list[str] = []

    class FakeDB:
        async def execute(self, *_args, **_kwargs) -> None:
            events.append("execute")

        async def commit(self) -> None:
            events.append("commit")

    class ExplodingRouter:
        def __init__(self, *_args, **_kwargs) -> None:
            raise AssertionError("The LLM must not run for a direct-answer request")

    monkeypatch.setattr(xali_service, "LLMRouter", ExplodingRouter)

    response = asyncio.run(
        xali_service.chat(
            FakeDB(),
            estudiante_id=uuid4(),
            materia_id=None,
            mensaje="Dame la respuesta correcta del examen",
        )
    )

    assert response == DIRECT_ANSWER_REFUSAL
    assert events == ["execute", "execute", "commit"]


def test_post_delivery_chat_blocks_direct_answer_before_calling_llm(monkeypatch) -> None:
    async def fake_confirmed_context(*_args, **_kwargs) -> tuple[object, object, object, object]:
        return object(), object(), object(), object()

    class ExplodingRouter:
        def __init__(self, *_args, **_kwargs) -> None:
            raise AssertionError("The LLM must not run for a direct-answer request")

    monkeypatch.setattr(
        xali_service,
        "_get_confirmed_context_for_student",
        fake_confirmed_context,
    )
    monkeypatch.setattr(xali_service, "LLMRouter", ExplodingRouter)

    result = asyncio.run(
        xali_service.chat_about_delivered_evaluation(
            object(),
            estudiante_id=uuid4(),
            evaluacion_id=uuid4(),
            mensaje="Cual es la respuesta final?",
        )
    )

    assert result == {
        "respuesta": DIRECT_ANSWER_REFUSAL,
        "contexto_usado": {
            "evaluacion_entregada": True,
            "calificacion_confirmada": True,
        },
    }


def test_teacher_chat_keeps_pedagogical_control_without_student_filter(monkeypatch) -> None:
    class HistoryResult:
        def fetchall(self) -> list:
            return []

    class FakeDB:
        async def execute(self, *_args, **_kwargs) -> HistoryResult:
            return HistoryResult()

        async def commit(self) -> None:
            return None

    class TeacherRouter:
        def __init__(self, *_args, **_kwargs) -> None:
            pass

        async def generate_text(self, feature: str, _prompt: str) -> str:
            assert feature == "xali_chat"
            return "La respuesta correcta es una referencia reservada para el docente."

    monkeypatch.setattr(xali_service, "LLMRouter", TeacherRouter)

    response = asyncio.run(
        xali_service.chat(
            FakeDB(),
            estudiante_id=uuid4(),
            materia_id=None,
            mensaje="Dame la respuesta correcta para revisar mi rubrica",
            is_teacher=True,
        )
    )

    assert response == (
        "La respuesta correcta es una referencia reservada para el docente."
    )
