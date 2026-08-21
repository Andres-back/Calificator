from app.modules.calificaciones.breakdown_policy import sanitize_component_payload, sanitize_valuation


def test_sanitizer_drops_private_and_unknown_provider_fields():
    clean = sanitize_valuation({
        "puntaje": 1,
        "estado": "correcta",
        "explicacion": "Coincide con la clave.",
        "_reasoning": "private",
        "system_prompt": "secret",
        "unknown": "value",
    })
    assert clean["puntaje"] == 1
    assert "_reasoning" not in clean
    assert "system_prompt" not in clean
    assert "unknown" not in clean

def test_component_payload_keeps_only_public_evidence():
    clean = sanitize_component_payload({
        "clave": "pregunta:1", "respuesta_estudiante": "24", "puntaje": 1,
        "estado": "correcta", "explicacion": "Coincide con la clave.", "paginas": [1],
        "_reasoning": "private chain", "prompt": "secret", "system_message": "hidden",
    })
    assert clean["clave"] == "pregunta:1"
    assert clean["respuesta_estudiante"] == "24"
    assert clean["paginas"] == [1]
    assert "_reasoning" not in clean
    assert "prompt" not in clean
    assert "system_message" not in clean