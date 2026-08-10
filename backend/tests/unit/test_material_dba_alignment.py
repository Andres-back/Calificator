from __future__ import annotations

import asyncio
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.herramientas import service
from app.modules.herramientas.generators.base import build_base_context
from app.modules.herramientas.schemas import GuiaRequest


def test_base_context_includes_private_dba_rag_evidence_but_dump_does_not() -> None:
    dba_id = uuid4()
    request = GuiaRequest(
        materia_id=uuid4(),
        titulo="Guia de ecosistemas",
        tema="Cadenas troficas",
        dba_ids=[dba_id],
    )
    request._contexto_dba_rag = "Contexto DBA/RAG: evidencia local"

    assert "Contexto DBA/RAG: evidencia local" in build_base_context(request)
    dumped = request.model_dump(mode="json")
    assert dumped["dba_ids"] == [str(dba_id)]
    assert "_contexto_dba_rag" not in dumped
    assert "_alineacion_esperada" not in dumped


def test_free_generation_needs_neither_dba_nor_rubric() -> None:
    request = GuiaRequest(
        titulo="Guía libre",
        tema="El agua",
    )

    service._attach_rubric_context(request)

    assert request.dba_ids == []
    assert request.dba_personalizado_ids == []
    assert request._contexto_dba_rag == ""
    assert request._contexto_rubrica == ""
    assert "El agua" in build_base_context(request)


def test_rubric_context_uses_teacher_criteria_without_dba() -> None:
    request = GuiaRequest(
        titulo="Guía por criterios",
        tema="El agua",
        usar_rubrica=True,
        criterios_rubrica=["Explica con claridad", "Aplica el concepto"],
    )

    service._attach_rubric_context(request)
    context = build_base_context(request)

    assert "Criterios de rúbrica definidos por el docente" in context
    assert "Explica con claridad" in context
    assert "Aplica el concepto" in context
    assert request.dba_ids == []


def test_rubric_context_can_be_generated_by_ai() -> None:
    request = GuiaRequest(
        titulo="Guía con rúbrica sugerida",
        tema="El agua",
        usar_rubrica=True,
    )

    service._attach_rubric_context(request)

    assert "Propón criterios observables" in build_base_context(request)


def test_material_alignment_adds_teacher_review_trace() -> None:
    dba_ids = [str(uuid4()), str(uuid4())]
    rag_id = str(uuid4())
    content = {
        "titulo": "Guia",
        "_alineacion": {
            "dba_ids": list(reversed(dba_ids)),
            "fuente_contexto_ids": [rag_id],
            "justificacion": "Las actividades desarrollan las evidencias seleccionadas.",
            "cobertura": [
                {
                    "dba_id": dba_id,
                    "evidencia_en_material": f"Actividad especifica para {dba_id}",
                }
                for dba_id in dba_ids
            ],
        },
    }

    result = service._validate_material_alignment(
        content,
        {"dba_ids": dba_ids, "fuente_contexto_ids": [rag_id]},
    )

    assert result["_xcalificator"]["generado_por_ia"] is True
    assert result["_xcalificator"]["requiere_validacion_docente"] is True
    assert result["_xcalificator"]["dba_seleccionados"] == sorted(dba_ids)


def test_server_rebuilds_alignment_lost_by_deterministic_builder() -> None:
    dba_id = str(uuid4())
    rag_id = str(uuid4())
    request = GuiaRequest(
        titulo="Guía",
        tema="Agua",
        dba_ids=[dba_id],
    )
    request._alineacion_esperada = {
        "dba_ids": [dba_id],
        "fuente_contexto_ids": [rag_id],
    }

    rebuilt = service._ensure_alignment_metadata(
        {"titulo": "Guía", "secciones": [{"titulo": "Explora"}]},
        request,
        service.MaterialTipo.GUIA,
    )
    validated = service._validate_material_alignment(
        rebuilt,
        request._alineacion_esperada,
    )

    assert rebuilt["_alineacion"]["dba_ids"] == [dba_id]
    assert rebuilt["_alineacion"]["fuente_contexto_ids"] == [rag_id]
    assert validated["_xcalificator"]["alineacion_reconstruida"] is True


@pytest.mark.parametrize("alignment", [None, {"dba_ids": [], "fuente_contexto_ids": []}])
def test_material_alignment_rejects_missing_selected_dba(alignment) -> None:
    content = {"titulo": "Guia"}
    if alignment is not None:
        content["_alineacion"] = alignment

    with pytest.raises(HTTPException) as exc:
        service._validate_material_alignment(
            content,
            {"dba_ids": [str(uuid4())], "fuente_contexto_ids": []},
        )

    assert exc.value.status_code == 502


def test_material_alignment_rejects_invented_rag_source() -> None:
    dba_id = str(uuid4())
    with pytest.raises(HTTPException) as exc:
        service._validate_material_alignment(
            {
                "_alineacion": {
                    "dba_ids": [dba_id],
                    "fuente_contexto_ids": [str(uuid4())],
                }
            },
            {"dba_ids": [dba_id], "fuente_contexto_ids": [str(uuid4())]},
        )
    assert exc.value.status_code == 502


def test_material_alignment_rejects_coverage_without_evidence() -> None:
    dba_id = str(uuid4())
    with pytest.raises(HTTPException) as exc:
        service._validate_material_alignment(
            {
                "_alineacion": {
                    "dba_ids": [dba_id],
                    "fuente_contexto_ids": [],
                    "cobertura": [
                        {"dba_id": dba_id, "evidencia_en_material": "vaga"}
                    ],
                }
            },
            {"dba_ids": [dba_id], "fuente_contexto_ids": []},
        )
    assert exc.value.status_code == 502


def test_attach_context_uses_official_custom_dba_and_rag(monkeypatch) -> None:
    official_id = uuid4()
    custom_id = uuid4()
    rag_id = uuid4()
    materia = SimpleNamespace(id=uuid4(), profesor_id=uuid4())
    request = GuiaRequest(
        materia_id=materia.id,
        titulo="Guia mixta",
        tema="Ecosistemas",
        dba_ids=[official_id],
        dba_personalizado_ids=[custom_id],
    )
    official = SimpleNamespace(
        id=official_id,
        area="Ciencias",
        grado="7",
        codigo="DBA-1",
        descripcion="Explica relaciones ecologicas",
    )
    custom = SimpleNamespace(
        id=custom_id,
        area="Ciencias",
        grado="7",
        enunciado="Analiza el ecosistema local",
        evidencias_aprendizaje=["Usa evidencia"],
        ejemplo=None,
    )

    async def get_official(_db, ids):
        assert ids == [official_id]
        return [official]

    async def get_custom(_db, ids, **kwargs):
        assert ids == [custom_id]
        assert kwargs["materia_id"] == materia.id
        return [custom]

    async def get_context(_db, materia_id, dba_text, metas):
        assert materia_id == materia.id
        assert "relaciones ecologicas" in dba_text
        assert metas == ["Ecosistemas"]
        return [
            {
                "id": str(rag_id),
                "tipo": "material",
                "chunk_text": "Caso del humedal",
            }
        ]

    monkeypatch.setattr(service, "get_dba_records", get_official)
    monkeypatch.setattr(
        service,
        "get_dba_personalizado_records_for_evaluation",
        get_custom,
    )
    monkeypatch.setattr(
        service,
        "build_context_for_evaluation_creation",
        get_context,
    )

    asyncio.run(service._attach_dba_rag_context(object(), request, materia))

    assert str(official_id) in request._contexto_dba_rag
    assert str(custom_id) in request._contexto_dba_rag
    assert str(rag_id) in request._contexto_dba_rag
    assert request._alineacion_esperada == {
        "dba_ids": sorted([str(official_id), str(custom_id)]),
        "fuente_contexto_ids": [str(rag_id)],
    }
