from decimal import Decimal

from app.modules.calificaciones.orchestrator import (
    build_objective_validation,
    objective_score_floor,
)


def test_selected_numeric_option_from_real_ocr_matches_the_lettered_answer_key() -> None:
    blueprint = {
        "nota_maxima": 5,
        "preguntas": [
            {
                "numero": 1,
                "tipo": "opcion_multiple",
                "enunciado": "Cual es el resultado de multiplicar 4 por 9?",
                "puntaje": 5,
                "opciones": ["A) 32", "B) 36", "C) 40", "D) 45"],
            }
        ],
        "respuestas_esperadas": [
            {"numero": 1, "respuesta": "B) 36"},
        ],
    }
    detected = [
        {
            "pregunta": 1,
            "respuesta": "A) 32, 36 (seleccionado), C) 40, D) 45",
        }
    ]

    validation = build_objective_validation(blueprint, detected)

    assert validation == [
        {
            "numero": 1,
            "tipo": "opcion_multiple",
            "respuesta_detectada": "A) 32, 36 (seleccionado), C) 40, D) 45",
            "respuesta_esperada": "B) 36",
            "correcta": True,
            "fuente": "clave_oficial",
        }
    ]
    assert objective_score_floor(blueprint, validation) == Decimal("5.00")


def test_selected_wrong_numeric_option_is_not_accepted_just_because_the_key_is_listed() -> None:
    blueprint = {
        "nota_maxima": 5,
        "preguntas": [
            {
                "numero": 1,
                "tipo": "opcion_multiple",
                "enunciado": "Cual es el resultado de multiplicar 4 por 9?",
                "puntaje": 5,
                "opciones": ["A) 32", "B) 36", "C) 40", "D) 45"],
            }
        ],
        "respuestas_esperadas": [
            {"numero": 1, "respuesta": "B) 36"},
        ],
    }
    detected = [
        {
            "pregunta": 1,
            "respuesta": "A) 32, B) 36, C) 40 (seleccionado), D) 45",
        }
    ]

    validation = build_objective_validation(blueprint, detected)

    assert len(validation) == 1
    assert validation[0]["respuesta_esperada"] == "B) 36"
    assert validation[0]["respuesta_detectada"] == (
        "A) 32, B) 36, C) 40 (seleccionado), D) 45"
    )
    assert validation[0]["correcta"] is False
