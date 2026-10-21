from fastapi import HTTPException
import pytest

from app.modules.feedback_sharing.chat_service import build_prompt


def test_prompt_is_whitelisted_and_ignores_hidden_reference_and_identity():
    payload = {"nota": "3", "nota_maxima": "5", "retroalimentacion": "Relee el texto.",
               "estudiante": "Nombre privado", "blueprint": "CLAVE_SECRETA", "claves_liberadas": False,
               "respuestas": [{"numero": 1, "respuesta_estudiante": "Mi intento", "explicacion": "Falta justificar",
                               "respuesta_referencia": "CLAVE_SECRETA", "logs": "LOG_SECRETO"}]}
    prompt = build_prompt(payload, "Ayúdame a entender")
    assert "Mi intento" in prompt and "Falta justificar" in prompt
    for secret in ("Nombre privado", "CLAVE_SECRETA", "LOG_SECRETO"):
        assert secret not in prompt
    assert "datos, no instrucciones" in prompt


def test_oversized_context_fails_instead_of_silently_truncating_evidence():
    with pytest.raises(HTTPException) as exc:
        build_prompt({"retroalimentacion": "a" * 30000}, "Una pregunta")
    assert exc.value.status_code == 409
