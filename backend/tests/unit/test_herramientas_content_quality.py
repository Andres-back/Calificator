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
            "secciones": [
                {"titulo": "Explora", "contenido": "Observa.", "actividades": ["Explica."]}
            ],
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
