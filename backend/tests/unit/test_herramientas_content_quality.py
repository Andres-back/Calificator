from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

from app.modules.herramientas import service
from app.modules.herramientas.content_quality import normalize_material_content
from app.modules.herramientas.schemas import GuiaRequest
from app.shared.enums import MaterialTipo


def test_quality_contract_removes_duplicate_sections_and_renumbers() -> None:
    normalized, issues = normalize_material_content(
        MaterialTipo.FICHA,
        {
            "titulo": "Ficha",
            "ejercicios": [
                {"numero": 8, "enunciado": "Explica el ciclo."},
                {"numero": 9, "enunciado": "Explica el ciclo."},
                {"numero": 10, "enunciado": "Da un ejemplo."},
            ],
        },
        fallback_title="Ficha del agua",
    )

    assert issues == []
    assert [item["enunciado"] for item in normalized["ejercicios"]] == [
        "Explica el ciclo.",
        "Da un ejemplo.",
    ]
    assert [item["numero"] for item in normalized["ejercicios"]] == [1, 2]


@pytest.mark.parametrize(
    ("tipo", "content", "expected_issue"),
    [
        (MaterialTipo.GUIA, {"secciones": []}, "secciones"),
        (MaterialTipo.LECTURA_COMPRENSIVA, {"preguntas": [{}]}, "texto"),
        (MaterialTipo.MAPA_CONCEPTUAL, {"nodos": [{"concepto": "Agua"}]}, "concepto principal"),
        (MaterialTipo.RUBRICA, {"criterios": [{"nombre": "Claridad"}]}, "escala"),
    ],
)
def test_quality_contract_detects_incomplete_materials(tipo, content, expected_issue) -> None:
    _, issues = normalize_material_content(tipo, content, fallback_title="Material")

    assert any(expected_issue in issue for issue in issues)


def test_generation_retries_once_and_keeps_only_complete_result() -> None:
    request = GuiaRequest(titulo="Guía", tema="Agua")
    attempts = 0

    async def generator():
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            return {"titulo": "Guía", "secciones": []}
        return {
            "titulo": "Guía",
            "objetivos": ["Comprender el ciclo del agua"],
            "saberes_previos": ["Estados del agua"],
            "introduccion": "Activa lo que sabes y prepárate para aprender.",
            "secciones": [
                {
                    "titulo": "Explora",
                    "explicacion": "Observa cómo cambia el agua.",
                    "ejemplo_guiado": "Sigue el cambio de un cubo de hielo.",
                    "actividades": ["Describe el cambio.", "Ordena los estados del agua."],
                    "verificacion": "Explica qué cambió.",
                },
                {
                    "titulo": "Aplica",
                    "explicacion": "Relaciona cada cambio con su nombre.",
                    "ejemplo_guiado": "El agua líquida se evapora con calor.",
                    "actividades": ["Da un ejemplo de evaporación.", "Compara evaporación y condensación.", "Explica un cambio de estado cotidiano."],
                    "verificacion": "Compara tu ejemplo con la definición.",
                },
            ],
            "cierre": "Resume el aprendizaje en una frase.",
            "evaluacion_formativa": ["Diferencia dos cambios de estado."],
        }

    result = asyncio.run(
        service._generate_with_quality(
            tipo=MaterialTipo.GUIA,
            req=request,
            generator=generator,
        )
    )

    assert attempts == 2
    assert result["secciones"][0]["titulo"] == "Explora"
    assert request.instrucciones_adicionales is None


def test_reading_contract_respects_quantity_and_progressive_distribution() -> None:
    content = {
        "titulo": "Lectura",
        "instrucciones": "Lee y responde con evidencia del texto.",
        "texto": "Lina observó cómo el agua del patio desapareció con el sol.",
        "estrategia_lectora": "Subraya las pistas antes de responder.",
        "preguntas": [
            {"tipo": "literal", "enunciado": "¿Quién observó?", "respuesta_esperada": "Lina", "evidencia_textual": "Lina observó", "dificultad": "baja"},
            {"tipo": "inferencial", "enunciado": "¿Qué ocurrió?", "respuesta_esperada": "Evaporación", "justificacion": "El sol calentó el agua.", "dificultad": "media"},
            {"tipo": "vocabulario", "enunciado": "¿Qué significa desapareció?", "respuesta_esperada": "Dejó de verse", "evidencia_textual": "desapareció con el sol", "dificultad": "media"},
            {"tipo": "critica", "enunciado": "¿Fue clara la explicación?", "respuesta_esperada": "Sí, pero faltó nombrar el proceso", "justificacion": "Describe el efecto, no el concepto.", "dificultad": "alta"},
        ],
    }

    normalized, issues = normalize_material_content(
        MaterialTipo.LECTURA_COMPRENSIVA,
        content,
        fallback_title="Lectura",
        expected_count=4,
    )

    assert issues == []
    assert [question["tipo"] for question in normalized["preguntas"]] == [
        "literal", "inferencial", "vocabulario", "critica",
    ]
    assert [question["numero"] for question in normalized["preguntas"]] == [1, 2, 3, 4]


def test_priority_formats_report_actionable_missing_sections() -> None:
    cases = [
        (MaterialTipo.GUIA, {"objetivos": ["Aprender"], "secciones": [{"titulo": "Tema", "actividades": ["Practica"]}]}, "ejemplo guiado"),
        (MaterialTipo.TALLER, {"instrucciones": "Responde", "puntos": [{"enunciado": "Explica", "puntaje": 1}]}, "respuesta esperada o criterio"),
        (MaterialTipo.PLAN_REFUERZO, {"semanas": [{"tema": "Inicio", "actividades": ["Leer"]}]}, "diagnóstico inicial"),
    ]

    for tipo, content, expected in cases:
        _, issues = normalize_material_content(tipo, content, fallback_title="Material")
        assert any(expected in issue for issue in issues)


def test_generation_rejects_two_incomplete_responses() -> None:
    request = GuiaRequest(titulo="Guía", tema="Agua")

    async def generator():
        return {"titulo": "Guía", "secciones": []}

    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            service._generate_with_quality(
                tipo=MaterialTipo.GUIA,
                req=request,
                generator=generator,
            )
        )

    assert exc.value.status_code == 502
    assert "dos intentos" in exc.value.detail
