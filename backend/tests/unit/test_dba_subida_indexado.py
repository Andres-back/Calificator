"""Spec 203: las sugerencias de criterios no dependen de la indexación del documento."""
from __future__ import annotations

import asyncio
from types import SimpleNamespace
from uuid import uuid4

from app.db.base import import_models
from app.modules.dba import router as dba_router
from app.services import embedding_service
from app.services.embedding_service import EmbeddingUnavailableError


import_models()


class FakeSession:
    def __init__(self) -> None:
        self.added: list[object] = []

    def add(self, item: object) -> None:
        self.added.append(item)


def source() -> SimpleNamespace:
    return SimpleNamespace(id=uuid4(), profesor_id=uuid4(), materia_id=uuid4())


def test_sin_servicio_de_busqueda_el_documento_queda_sin_indexar(monkeypatch):
    async def unavailable(*_args, **_kwargs):
        raise EmbeddingUnavailableError("sin servicio")

    monkeypatch.setattr(embedding_service, "embed_texts_with_metadata", unavailable)
    db = FakeSession()

    indexed = asyncio.run(dba_router._index_document_chunks(db, source(), ["uno", "dos"]))

    assert indexed is False
    assert db.added == []


def test_con_servicio_se_guarda_un_fragmento_por_texto(monkeypatch):
    seen: dict[str, object] = {}

    async def embed(texts, *, db, teacher_id):
        seen["teacher_id"] = teacher_id
        space = SimpleNamespace(provider="prueba", model="modelo", dimensions=3, version="v1")
        return SimpleNamespace(vectors=[[0.1, 0.2, 0.3] for _ in texts], space=space)

    monkeypatch.setattr(embedding_service, "embed_texts_with_metadata", embed)
    db = FakeSession()
    fuente = source()

    indexed = asyncio.run(dba_router._index_document_chunks(db, fuente, ["uno", "dos"]))

    assert indexed is True
    assert [chunk.chunk_text for chunk in db.added] == ["uno", "dos"]
    assert {chunk.source_id for chunk in db.added} == {fuente.id}
    assert seen["teacher_id"] == fuente.profesor_id
    assert db.added[1].metadata_json == {"indice": 1, "total_chunks": 2}


def test_documento_sin_fragmentos_no_consulta_el_servicio(monkeypatch):
    async def never(*_args, **_kwargs):
        raise AssertionError("no debe pedir vectores")

    monkeypatch.setattr(embedding_service, "embed_texts_with_metadata", never)

    assert asyncio.run(dba_router._index_document_chunks(FakeSession(), source(), [])) is True


def test_respuesta_con_lista_o_con_clave_conocida_se_acepta():
    from app.modules.dba.document_service import suggestions_from_result

    item = {"enunciado": "Explica las fases del ciclo del agua"}
    assert suggestions_from_result([item]) == [item]
    assert suggestions_from_result({"sugerencias": [item]}) == [item]
    assert suggestions_from_result({"criterios": [item]}) == [item]
    assert suggestions_from_result(item) == [item]
    assert suggestions_from_result({"sugerencias": []}) == []


def test_plantilla_de_respaldo_no_se_confunde_con_documento_sin_contenido():
    import pytest

    from app.modules.dba.document_service import SuggestionsUnavailable, suggestions_from_result

    plantilla = {"titulo": "Material educativo", "contenido": "Actividad base", "actividades": ["Observar"]}
    with pytest.raises(SuggestionsUnavailable):
        suggestions_from_result(plantilla)


def test_si_la_ia_no_responde_se_informa_como_servicio_no_disponible(monkeypatch):
    import pytest

    from app.modules.dba import document_service

    class Router:
        def __init__(self, **_kwargs):
            pass

        async def generate_json(self, *_args):
            raise RuntimeError("Los proveedores configurados no pudieron responder")

    monkeypatch.setattr(document_service, "LLMRouter", Router)
    with pytest.raises(document_service.SuggestionsUnavailable):
        asyncio.run(
            document_service.generar_sugerencias_dba(
                user_id=uuid4(), materia_id=uuid4(), area="Ciencias", grado="5", texto_completo="El ciclo del agua"
            )
        )


def test_sugerencias_validas_se_limpian_y_se_limitan_a_cinco(monkeypatch):
    from app.modules.dba import document_service

    class Router:
        def __init__(self, **_kwargs):
            pass

        async def generate_json(self, task, _prompt):
            assert task == "dba_sugerencias"
            return {"sugerencias": [{"enunciado": f"  Explica el ciclo del agua, parte {n}  ", "ejemplo": ""} for n in range(7)] + [{"enunciado": "corto"}]}

    monkeypatch.setattr(document_service, "LLMRouter", Router)
    result = asyncio.run(
        document_service.generar_sugerencias_dba(
            user_id=uuid4(), materia_id=uuid4(), area="Ciencias", grado="5", texto_completo="El ciclo del agua"
        )
    )

    assert len(result) == 5
    assert result[0] == {"enunciado": "Explica el ciclo del agua, parte 0", "evidencias_aprendizaje": None, "ejemplo": None}


def test_las_sugerencias_usan_la_ruta_de_las_herramientas_del_docente():
    from app.services.ai_config_service import _feature_candidates, uses_managed_text_routing

    assert _feature_candidates("dba_sugerencias") == ("dba_sugerencias", "herramientas_educativas")
    assert uses_managed_text_routing("dba_sugerencias") is True


def test_evidencias_en_lista_se_unen_en_un_texto(monkeypatch):
    from app.modules.dba import document_service

    class Router:
        def __init__(self, **_kwargs):
            pass

        async def generate_json(self, *_args):
            return [{"enunciado": "Explica las fases del ciclo del agua", "evidencias_aprendizaje": ["Nombra las fases", " Dibuja el ciclo "], "ejemplo": 7}]

    monkeypatch.setattr(document_service, "LLMRouter", Router)
    result = asyncio.run(
        document_service.generar_sugerencias_dba(
            user_id=uuid4(), materia_id=uuid4(), area="Ciencias", grado="5", texto_completo="El ciclo del agua"
        )
    )

    assert result == [
        {"enunciado": "Explica las fases del ciclo del agua", "evidencias_aprendizaje": "Nombra las fases\nDibuja el ciclo", "ejemplo": None}
    ]
