"""Fixtures sintéticos sin datos personales para calificación explicable."""


def multiplication_blueprint() -> dict:
    return {
        "nombre": "Multiplicación",
        "nota_maxima": 5,
        "dba": [{"enunciado": "Resuelve multiplicaciones"}],
        "preguntas": [
            {"numero": 1, "enunciado": "2 × 6", "respuesta_correcta": "12", "puntaje": 2},
            {"numero": 2, "enunciado": "3 × 6", "respuesta_correcta": "18", "puntaje": 3},
        ],
    }


def grader_components() -> list[dict]:
    return [
        {"clave": "pregunta:1", "puntaje": 2, "estado": "correcta", "explicacion": "Coincide con la clave.", "respuesta_estudiante": "12", "paginas": [1]},
        {"clave": "pregunta:2", "puntaje": 1.5, "estado": "parcial", "explicacion": "El procedimiento está incompleto.", "respuesta_estudiante": "16", "paginas": [2]},
    ]
