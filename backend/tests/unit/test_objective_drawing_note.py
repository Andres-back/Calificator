"""Spec 162: la nota del dibujo no impide reconocer la opción marcada."""
from decimal import Decimal

import pytest

from app.modules.calificaciones.orchestrator import (
    _truth_value,
    build_objective_validation,
    objective_score_floor,
)
from app.services.vision_extractor import ExtractedAnswer, _answer_with_visual_description


def reading(number: int, answer: str | None, drawing: str | None) -> dict:
    extracted = ExtractedAnswer(question_number=number, answer=answer, visual_description=drawing, page=1)
    return {"pregunta": number, "respuesta": _answer_with_visual_description(extracted), "descripcion_visual": drawing}


BLUEPRINT = {
    "nota_maxima": 5,
    "preguntas": [
        {"numero": 1, "tipo": "opcion_multiple", "puntaje": 1, "opciones": ["A) Casa", "B) Planta", "C) Sol", "D) Agua"]},
        {"numero": 2, "tipo": "opcion_multiple", "puntaje": 1, "opciones": ["A) Clavo", "B) Lavo", "C) Calor", "D) Lago"]},
        {"numero": 3, "tipo": "verdadero_falso", "puntaje": 1, "opciones": ["Verdadero", "Falso"]},
        {"numero": 4, "tipo": "verdadero_falso", "puntaje": 1, "opciones": ["Verdadero", "Falso"]},
        {"numero": 5, "tipo": "completar", "puntaje": 1},
    ],
    "respuestas_esperadas": [
        {"numero": 1, "respuesta": "B) Planta"},
        {"numero": 2, "respuesta": "A) Clavo"},
        {"numero": 3, "respuesta": "Verdadero"},
        {"numero": 4, "respuesta": "Falso"},
        {"numero": 5, "respuesta": "pl"},
    ],
}


def validate(*answers: dict) -> dict[int, bool]:
    return {item["numero"]: item["correcta"] for item in build_objective_validation(BLUEPRINT, list(answers))}


def test_marked_options_with_a_drawing_note_match_the_key():
    validation = build_objective_validation(BLUEPRINT, [
        reading(1, "B) Planta", "La opción B está marcada con un círculo y trazos oscuros."),
        reading(2, "A) Clavo", "La opción A tiene una marca azul; la combinación «cl» del enunciado está rodeada."),
        reading(3, "A) Verdadero", "La opción A tiene una marca azul."),
        reading(4, "B) Falso", "La opción B tiene una marca azul."),
        reading(5, "pl", "Escribió las letras sobre la línea."),
    ])
    assert {item["numero"]: item["correcta"] for item in validation} == {1: True, 2: True, 3: True, 4: True, 5: True}
    assert objective_score_floor(BLUEPRINT, validation) == Decimal("5.00")
    # La lectura completa se conserva para que el docente vea qué se observó.
    assert "[Dibujo observado:" in validation[0]["respuesta_detectada"]


def test_a_wrong_option_with_a_drawing_note_stays_wrong():
    assert validate(
        reading(2, "D) Lago", "La opción D está rodeada; A) Clavo no tiene marca."),
        reading(3, "B) Falso", "La opción B, «Falso», está rodeada; «Verdadero» no tiene marca."),
        reading(4, "A) Verdadero", "La opción A está rodeada."),
    ) == {2: False, 3: False, 4: False}


def test_a_drawing_without_a_read_answer_is_left_to_the_graders():
    assert validate(
        reading(1, None, "La opción B está marcada con un círculo."),
        reading(3, None, "La opción «Verdadero» está rodeada."),
    ) == {}


def test_a_double_true_false_mark_is_never_validated():
    assert validate(
        reading(3, "A) Verdadero; B) Falso", "Ambas opciones tienen marcas de color."),
        reading(4, "Verdadero y Falso", None),
    ) == {}


def test_a_true_false_option_letter_uses_the_printed_order():
    assert validate(
        reading(3, "A", "La opción A (Verdadero) está marcada con una X negra."),
        reading(4, "A", "Círculo relleno en la opción A) Verdadero."),
    ) == {3: True, 4: False}
    without_options = {**BLUEPRINT, "preguntas": [{"numero": 3, "tipo": "verdadero_falso", "puntaje": 1}]}
    assert build_objective_validation(without_options, [reading(3, "A", None)]) == []


@pytest.mark.parametrize(("answer", "expected"), [
    ("Verdadero", True), ("A) Verdadero", True), ("Verdadero (marcado)", True), ("si", True), ("Sí es igual", True),
    ("V", True), ("v\n[Dibujo observado: Escritura manuscrita de la letra V.]", True),
    ("Falso", False), ("B) Falso", False), ("no", False), ("No es igual", False), ("F", False),
    ("V F", None), ("A", None), ("B", None),
    ("Sin respuesta visible", None), ("Sin marca", None), ("No se observa una marca", None),
    ("Verdadero y Falso", None), ("A) Verdadero; B) Falso", None), ("", None), (None, None),
])
def test_truth_values_need_a_whole_word(answer, expected):
    assert _truth_value(answer) is expected
