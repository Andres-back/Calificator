from __future__ import annotations

from decimal import Decimal

import pytest

from app.modules.herramientas.evaluation_adapter import (
    EVALUABLE_MATERIAL_TYPES,
    build_evaluation_structure,
    is_evaluable_material_type,
)
from app.shared.enums import EvaluacionModalidad, MaterialTipo


MATERIAL_CONTENTS: dict[str, dict] = {
    MaterialTipo.SOPA_LETRAS.value: {
        "objetivo": "Reconocer vocabulario del tema.",
        "banco": [
            {"palabra": "factor", "pista": "Numero que se multiplica"},
            {"palabra": "producto", "pista": "Resultado de multiplicar"},
        ],
    },
    MaterialTipo.CRUCIGRAMA.value: {
        "preguntas_horizontales": [
            {"pista": "Dos por cuatro", "respuesta": "ocho"},
        ],
        "preguntas_verticales": [
            {"pista": "Tres por tres", "respuesta": "nueve"},
        ],
    },
    MaterialTipo.UNIR_COLUMNAS.value: {
        "columna_izquierda": [
            {"numero": 1, "texto": "4 x 9"},
            {"numero": 2, "texto": "6 x 8"},
        ],
        "columna_derecha": [
            {"letra": "A", "texto": "48"},
            {"letra": "B", "texto": "36"},
        ],
        "soluciones": [
            {"numero": 1, "letra": "B"},
            {"numero": 2, "letra": "A"},
        ],
    },
    MaterialTipo.EMPAREJAR.value: {
        "pares": [
            {"izquierda": "4 x 9", "derecha": "36"},
            {"izquierda": "6 x 8", "derecha": "48"},
        ],
    },
    MaterialTipo.CUENTO.value: {
        "texto": "Ana organizo lapices en grupos iguales.",
        "preguntas_comprension": [
            {"pregunta": "Que hizo Ana?", "respuesta_esperada": "Organizo lapices."},
            {"pregunta": "Como eran los grupos?", "respuesta": "Iguales."},
        ],
    },
    MaterialTipo.PARA_COLOREAR.value: {
        "descripcion": "Colorea cuatro grupos de nueve elementos.",
        "instrucciones": ["Usa un color diferente para cada grupo."],
    },
    MaterialTipo.GUIA.value: {
        "objetivo": "Aplicar la multiplicacion.",
        "evaluacion_formativa": ["Explica 4 x 9.", "Representa 6 x 8."],
    },
    MaterialTipo.TALLER.value: {
        "preguntas": [
            {
                "enunciado": "Cuanto es 4 x 9?",
                "tipo": "opcion_multiple",
                "opciones": [
                    {"texto": "32", "correcta": False},
                    {"texto": "36", "correcta": True},
                ],
                "respuesta_correcta": "36",
            },
            {
                "enunciado": "Explica la propiedad conmutativa.",
                "tipo": "abierta",
                "respuesta_esperada": "El orden no altera el producto.",
            },
        ],
    },
    MaterialTipo.EXAMEN.value: {
        "preguntas": [
            {"enunciado": "4 x 9", "respuesta_correcta": "36"},
            {"enunciado": "6 x 8", "respuesta_correcta": "48"},
        ],
    },
    MaterialTipo.RUBRICA.value: {
        "descripcion": "Valora el procedimiento del estudiante.",
        "criterios": [
            {"nombre": "Procedimiento", "peso_porcentaje": 60},
            {"nombre": "Resultado", "peso_porcentaje": 40},
        ],
    },
    MaterialTipo.PLAN_REFUERZO.value: {
        "objetivo_general": "Reforzar las tablas de multiplicar.",
        "semanas": [
            {"semana": 1, "actividades": ["Resuelve cinco productos."]},
            {"semana": 2, "actividades": ["Explica una estrategia."]},
        ],
    },
    MaterialTipo.FICHA.value: {
        "ejercicios": [
            {"instruccion": "Completa 4 x 9", "respuesta": "36"},
            {"instruccion": "Completa 6 x 8", "respuesta": "48"},
        ],
    },
    MaterialTipo.QUIZ_RAPIDO.value: {
        "preguntas": [
            {"pregunta": "4 x 9", "respuesta": "36"},
            {"pregunta": "6 x 8", "respuesta": "48"},
        ],
    },
    MaterialTipo.LECTURA_COMPRENSIVA.value: {
        "texto": "Multiplicar permite sumar grupos iguales.",
        "preguntas": [
            {"pregunta": "Que representa multiplicar?", "respuesta": "Sumar grupos iguales."},
            {"pregunta": "Da un ejemplo.", "respuesta_esperada": "4 x 9."},
        ],
    },
    MaterialTipo.MAPA_CONCEPTUAL.value: {
        "nodos": [
            {"id": "a", "concepto": "Multiplicacion"},
            {"id": "b", "concepto": "Suma repetida"},
            {"id": "c", "concepto": "Producto"},
        ],
        "relaciones": [
            {"origen": "a", "destino": "b", "etiqueta": "representa"},
            {"origen": "a", "destino": "c", "etiqueta": "produce"},
        ],
    },
    MaterialTipo.FLASHCARDS.value: {
        "tarjetas": [
            {"anverso": "4 x 9", "reverso": "36"},
            {"anverso": "6 x 8", "reverso": "48"},
        ],
    },
}


def _assert_no_answer_leak(value: object) -> None:
    forbidden = {
        "correcta",
        "es_correcta",
        "respuesta_correcta",
        "respuesta_esperada",
        "solucion",
        "soluciones",
    }
    if isinstance(value, dict):
        assert forbidden.isdisjoint(value)
        for nested in value.values():
            _assert_no_answer_leak(nested)
    elif isinstance(value, list):
        for nested in value:
            _assert_no_answer_leak(nested)


def test_adapter_declares_exactly_the_generated_types_that_can_be_assigned() -> None:
    assert EVALUABLE_MATERIAL_TYPES == frozenset(MATERIAL_CONTENTS)
    assert not is_evaluable_material_type(MaterialTipo.PRESENTACION.value)
    assert not is_evaluable_material_type(MaterialTipo.INFORME_ESTUDIANTE.value)
    assert not is_evaluable_material_type(MaterialTipo.INFORME_ACUDIENTE.value)


@pytest.mark.parametrize("material_type", sorted(MATERIAL_CONTENTS))
@pytest.mark.parametrize(
    "modality, expected_response_mode",
    [
        (EvaluacionModalidad.ONLINE, "online"),
        (EvaluacionModalidad.FISICA, "fisica"),
    ],
)
def test_every_evaluable_generated_material_uses_the_canonical_grading_contract(
    material_type: str,
    modality: EvaluacionModalidad,
    expected_response_mode: str,
) -> None:
    structure = build_evaluation_structure(
        material_type,
        MATERIAL_CONTENTS[material_type],
        note_max=Decimal("5"),
        modality=modality,
    )

    questions = structure["preguntas"]
    assert questions
    assert [item["numero"] for item in questions] == list(range(1, len(questions) + 1))
    assert {item["modalidad_respuesta"] for item in questions} == {expected_response_mode}
    assert sum(Decimal(str(item["puntaje"])) for item in questions) == Decimal("5")
    assert all(item["material_tipo"] == material_type for item in questions)
    assert all(set(item) >= {"numero", "tipo", "enunciado", "puntaje"} for item in questions)
    assert all(set(item) == {"numero", "respuesta"} for item in structure["respuestas_esperadas"])
    assert {
        item["numero"] for item in structure["respuestas_esperadas"]
    }.issubset({item["numero"] for item in questions})
    assert structure["criterios"]
    assert structure["reglas_feedback"]["requiere_confirmacion_docente"] is True
    assert structure["reglas_feedback"]["orientar_sin_dar_respuesta"] is True
    _assert_no_answer_leak(questions)


@pytest.mark.parametrize("material_type", sorted(MATERIAL_CONTENTS))
def test_mixed_materials_always_create_online_and_physical_sections(material_type: str) -> None:
    structure = build_evaluation_structure(
        material_type,
        MATERIAL_CONTENTS[material_type],
        note_max=5,
        modality=EvaluacionModalidad.MIXTA,
    )

    assert {item["modalidad_respuesta"] for item in structure["preguntas"]} == {
        "online",
        "fisica",
    }
    assert structure["reglas_feedback"]["estrategia_calificacion"] == "mixta"


@pytest.mark.parametrize(
    "material_type, content, note_max, error",
    [
        (MaterialTipo.PRESENTACION.value, {"diapositivas": []}, 5, "no admite"),
        (MaterialTipo.EXAMEN.value, {}, 5, "estructura v.lida"),
        (MaterialTipo.EXAMEN.value, {"preguntas": ["Responde"]}, 0, "mayor que cero"),
    ],
)
def test_adapter_rejects_non_evaluable_or_invalid_materials(
    material_type: str,
    content: dict,
    note_max: float,
    error: str,
) -> None:
    with pytest.raises(ValueError, match=error):
        build_evaluation_structure(
            material_type,
            content,
            note_max=note_max,
            modality=EvaluacionModalidad.ONLINE,
        )
