from __future__ import annotations

from decimal import Decimal
import asyncio
from copy import deepcopy
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.modules.herramientas.evaluation_adapter import (
    EVALUABLE_MATERIAL_TYPES,
    build_evaluation_structure,
    is_evaluable_material_type,
)
from app.shared.enums import EvaluacionModalidad, MaterialTipo
from app.modules.evaluaciones import service as evaluation_service


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
            {"nombre": "Procedimiento", "descripcion": "Explica los pasos matemáticos solicitados.", "peso_porcentaje": 60,
             "niveles": {"Logrado": "Pasos correctos y justificados", "En proceso": "Pasos incompletos"}},
            {"nombre": "Resultado", "descripcion": "Obtiene el resultado de la actividad solicitada.", "peso_porcentaje": 40,
             "niveles": {"Logrado": "Resultado correcto", "En proceso": "Resultado incorrecto"}},
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
    for criterion in structure["criterios"]:
        assert criterion["evidencia"] and criterion["regla_puntuacion"]
        assert criterion["preguntas_numeros"]
        assert criterion["descripcion"] not in {q["enunciado"] for q in questions}
    _assert_no_answer_leak(structure["criterios"])
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


@pytest.mark.parametrize("material_type", sorted(MATERIAL_CONTENTS))
def test_criteria_patch_preserves_all_material_question_keys_and_feedback(monkeypatch, material_type):
    structure = build_evaluation_structure(material_type, MATERIAL_CONTENTS[material_type], note_max=5, modality=EvaluacionModalidad.MIXTA)
    blueprint = SimpleNamespace(**deepcopy(structure), dba=[{"historical": True}])
    evaluation = SimpleNamespace(id=uuid4(), materia_id=uuid4(), profesor_id=uuid4(), criterios=[{"nombre": "Nuevo", "puntaje_maximo": 5}])
    before = deepcopy(blueprint.__dict__)
    class DB:
        async def scalar(self, _statement):
            return blueprint
        async def flush(self):
            pass
    async def no_references(*_args, **_kwargs):
        return []
    monkeypatch.setattr(evaluation_service, "get_dba_records", no_references)
    monkeypatch.setattr(evaluation_service, "get_dba_personalizado_records_for_evaluation", no_references)
    asyncio.run(evaluation_service._update_blueprint_criteria(DB(), evaluation, [], [], set()))
    for field, value in before.items():
        if field not in {"criterios", "dba"}:
            assert getattr(blueprint, field) == value
    assert blueprint.criterios == evaluation.criterios


@pytest.mark.parametrize("invalid", [
    {"nombre": "Punto 1", "descripcion": "Dos por cuatro"},
    {"nombre": "Conceptos", "descripcion": "Reconoce los conceptos", "peso_porcentaje": -10},
    {"nombre": "Conceptos", "descripcion": "Reconoce los conceptos", "peso_porcentaje": "NaN"},
    {"nombre": "Conceptos", "descripcion": "Reconoce los conceptos", "peso_porcentaje": 50},
    {"nombre": "Conceptos", "descripcion": "Reconoce los conceptos", "niveles": {"A": "Bien", "B": "Bien"}},
    {"nombre": "Conceptos", "descripcion": "Reconoce los conceptos", "preguntas_numeros": [99]},
    {"nombre": "Conceptos", "descripcion": "Reconoce los conceptos", "peso_porcentaje": 100, "puntaje_maximo": "NaN"},
])
def test_invalid_criteria_are_not_silently_repaired(invalid):
    content = deepcopy(MATERIAL_CONTENTS[MaterialTipo.CRUCIGRAMA.value])
    content["criterios"] = [invalid]
    with pytest.raises(ValueError, match="criterio|Criterio|pesos|niveles"):
        build_evaluation_structure("crucigrama", content, note_max=5, modality="online")


def test_teacher_criteria_change_neither_questions_nor_keys():
    content = deepcopy(MATERIAL_CONTENTS["crucigrama"])
    original = build_evaluation_structure("crucigrama", content, note_max=5, modality="online")
    result = build_evaluation_structure("crucigrama", content, note_max=5, modality="online",
                                        teacher_criteria=["Identificar conceptos a partir de las pistas"])
    assert result["preguntas"] == original["preguntas"]
    assert result["respuestas_esperadas"] == original["respuestas_esperadas"]
    assert result["criterios"][0]["nombre"] == "Identificar conceptos a partir de las pistas"
    assert content == MATERIAL_CONTENTS["crucigrama"]


def test_criteria_do_not_embed_a_reference_answer():
    content = deepcopy(MATERIAL_CONTENTS["taller"])
    content["criterios"] = [{"nombre": "Conceptos", "descripcion": "Debe escribir: El orden no altera el producto."}]
    with pytest.raises(ValueError, match="referencia"):
        build_evaluation_structure("taller", content, note_max=5, modality="online")


def test_dual_weight_scales_must_agree_and_percentages_can_change_grade_scale():
    content = deepcopy(MATERIAL_CONTENTS["crucigrama"])
    content["criterios"] = [
        {"nombre": "Identificación", "descripcion": "Identifica conceptos mediante pistas", "peso_porcentaje": 60, "puntaje_maximo": 3},
        {"nombre": "Registro", "descripcion": "Registra palabras para los conceptos identificados", "peso_porcentaje": 40, "puntaje_maximo": 2},
    ]
    result = build_evaluation_structure("crucigrama", content, note_max=10, modality="online")
    assert [criterion["puntaje_maximo"] for criterion in result["criterios"]] == [6, 4]
    content["criterios"][0]["puntaje_maximo"] = 1
    with pytest.raises(ValueError, match="contradicen"):
        build_evaluation_structure("crucigrama", content, note_max=5, modality="online")
