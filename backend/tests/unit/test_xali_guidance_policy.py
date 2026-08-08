from __future__ import annotations

import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

import app.modules.xali.service as xali_service
from app.modules.xali.service import (
    DIRECT_ANSWER_REFUSAL,
    GENERAL_STUDENT_CHAT_BLOCKED_MESSAGE,
    GUIDED_RESPONSE_FALLBACK,
    XALI_VALIDATION_NOTICE,
    enforce_guided_response,
    enforce_post_delivery_response,
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


def test_post_delivery_review_keeps_specific_explanation() -> None:
    response = "En tu entrega ya revisada, la respuesta correcta era 36 porque 4 por 9 forma nueve grupos de cuatro."

    guarded = enforce_post_delivery_response(response)

    assert response in guarded
    assert XALI_VALIDATION_NOTICE in guarded


def test_refusal_is_pedagogical_and_does_not_expose_an_answer() -> None:
    assert "no puedo darte respuestas" in DIRECT_ANSWER_REFUSAL
    assert "pista" in DIRECT_ANSWER_REFUSAL
    assert XALI_VALIDATION_NOTICE in DIRECT_ANSWER_REFUSAL


def test_photo_evidence_context_uses_vision_extraction_and_criteria() -> None:
    delivery = SimpleNamespace(
        tipo="foto",
        respuesta_texto=None,
        archivo_url="/uploads/entregas/prueba.jpeg",
        visual_text_json={},
    )
    grade = SimpleNamespace(
        resultado_json={
            "objective_validation": [
                {
                    "numero": 1,
                    "correcta": False,
                    "respuesta_detectada": "C) 40",
                    "respuesta_esperada": "B) 36",
                }
            ],
            "criterios": [
                {
                    "nombre": "Multiplicación",
                    "puntaje": 1.4,
                    "maximo": 2,
                    "observacion": "Debe repasar la tabla del 4.",
                }
            ],
        }
    )

    context = xali_service._format_student_evidence(delivery, grade)

    assert "evidencia mediante fotografía" in context
    assert "sí fue recibida y procesada por visión" in context
    assert "INCORRECTA según la validación registrada" in context
    assert "transcripción auxiliar de visión" in context
    assert "C) 40" in context
    assert "tienen prioridad" in context
    assert "Multiplicación (1.4 de 2)" in context
    assert "no significa que no respondió" in context


def test_online_evidence_context_prefers_submitted_text() -> None:
    delivery = SimpleNamespace(
        tipo="online",
        respuesta_texto='{"1":"Mi explicación"}',
        archivo_url=None,
        visual_text_json={"objective_validation": [{"numero": 1}]},
    )
    grade = SimpleNamespace(resultado_json={})

    context = xali_service._format_student_evidence(delivery, grade)

    assert "respuestas escritas en la plataforma" in context
    assert "Mi explicación" in context
    assert "procesada por visión" not in context


def test_photo_context_hides_ambiguous_multiple_choice_transcription() -> None:
    delivery = SimpleNamespace(
        tipo="foto",
        respuesta_texto=None,
        archivo_url="/uploads/entregas/prueba.jpeg",
        visual_text_json={},
    )
    grade = SimpleNamespace(
        resultado_json={
            "objective_validation": [
                {
                    "numero": 1,
                    "correcta": False,
                    "respuesta_detectada": "A) 32, B) 36 (seleccionado), C) 40, D) 45",
                    "respuesta_esperada": "B) 36",
                }
            ],
            "criterios": [
                {
                    "nombre": "Multiplicación",
                    "observacion": "La respuesta registrada fue incorrecta.",
                }
            ],
        }
    )

    context = xali_service._format_student_evidence(delivery, grade)

    assert "lectura visual ambigua con varias opciones" in context
    assert "B) 36 (seleccionado)" not in context
    assert "La respuesta registrada fue incorrecta" in context


def test_general_student_chat_is_not_available_even_for_guided_requests(monkeypatch) -> None:
    events: list[str] = []

    class FakeDB:
        async def execute(self, *_args, **_kwargs) -> None:
            events.append("execute")

        async def commit(self) -> None:
            events.append("commit")

    class ExplodingRouter:
        def __init__(self, *_args, **_kwargs) -> None:
            raise AssertionError("The LLM must not run for general student chat")

    monkeypatch.setattr(xali_service, "LLMRouter", ExplodingRouter)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            xali_service.chat(
                FakeDB(),
                estudiante_id=uuid4(),
                materia_id=None,
                mensaje="Ayudame a estudiar fracciones",
            )
        )

    assert exc.value.status_code == 403
    assert exc.value.detail == GENERAL_STUDENT_CHAT_BLOCKED_MESSAGE
    assert events == []

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


def test_student_resource_uses_confirmed_evidence_and_creates_new_practice(monkeypatch) -> None:
    evaluation = SimpleNamespace(
        nombre="Multiplicación",
        nota_maxima=5,
        preguntas=["¿Cómo representarías cuatro grupos de seis?"],
        criterios=["Comprende la multiplicación como suma repetida"],
    )
    delivery = SimpleNamespace(
        tipo="foto",
        respuesta_texto=None,
        archivo_url="/uploads/entregas/prueba.jpeg",
        visual_text_json={},
    )
    grade = SimpleNamespace(
        nota_confirmada=3.8,
        feedback="Repasa cómo identificar los grupos y los elementos por grupo.",
        resultado_json={
            "criterios": [
                {
                    "nombre": "Representación de grupos",
                    "puntaje": 1.2,
                    "maximo": 2,
                    "observacion": "Confunde la cantidad de grupos con sus elementos.",
                }
            ]
        },
    )
    subject = SimpleNamespace(nombre="Matemáticas")

    async def fake_confirmed_context(*_args, **_kwargs):
        return evaluation, delivery, grade, subject

    async def fake_store_resource(_db, **kwargs):
        return SimpleNamespace(
            id=uuid4(),
            evaluacion_id=kwargs["evaluacion_id"],
            contenido=kwargs["content"],
            created_at="2026-08-08T12:00:00",
            updated_at="2026-08-08T12:00:00",
        )

    class ResourceRouter:
        def __init__(self, *_args, **_kwargs) -> None:
            pass

        async def generate_text(self, feature: str, prompt: str) -> str:
            assert feature == "xali_recurso_post_entrega"
            assert "Confunde la cantidad de grupos" in prompt
            assert "cinco ejercicios nuevos" in prompt.lower()
            return "# Práctica personalizada\n\n1. Representa tres grupos de cinco. Pista: dibuja los grupos."

    monkeypatch.setattr(xali_service, "_get_confirmed_context_for_student", fake_confirmed_context)
    monkeypatch.setattr(xali_service, "_store_student_resource", fake_store_resource)
    monkeypatch.setattr(xali_service, "LLMRouter", ResourceRouter)

    result = asyncio.run(
        xali_service.generate_student_resource(
            object(),
            estudiante_id=uuid4(),
            evaluacion_id=uuid4(),
            resource_type="practica",
        )
    )

    assert result["tipo"] == "practica"
    assert result["titulo"] == "Práctica personalizada"
    assert "Representa tres grupos de cinco" in result["contenido"]
    assert result["contexto_usado"]["calificacion_confirmada"] is True


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
