from __future__ import annotations


import pytest
from uuid import uuid4

from app.modules.rag import retrieval_service
from app.modules.rag.context_builder import build_context_for_evaluation_creation
from app.services.embedding_service import (
    EmbeddedVector,
    EmbeddingSpace,
    EmbeddingUnavailableError,
)


class _Transaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False


class _Result:
    def __init__(self, candidates: bool = True):
        self.candidates = candidates

    def scalar_one(self):
        return self.candidates

    def fetchall(self):
        return []


class _DB:
    def __init__(self, fail: bool = False, *, candidates: bool = True, fail_on: int | None = None) -> None:
        self.fail = fail
        self.candidates = candidates
        self.fail_on = fail_on
        self.params = None
        self.statement = ""
        self.calls = []

    def begin_nested(self):
        return _Transaction()

    async def execute(self, _statement, params):
        self.statement = str(_statement)
        self.params = params
        self.calls.append((self.statement, dict(params)))
        if self.fail or len(self.calls) == self.fail_on:
            raise RuntimeError("database detail")
        return _Result(self.candidates)


@pytest.mark.asyncio
async def test_search_filters_the_exact_embedding_space(monkeypatch) -> None:
    space = EmbeddingSpace("ollama_internal", "qwen3-embedding:0.6b", 1024, "space-v1")

    async def fake_embed(*_, **__):
        return EmbeddedVector([0.0] * 1024, space)

    monkeypatch.setattr(retrieval_service, "embed_single_with_metadata", fake_embed)
    db = _DB()
    assert await retrieval_service.search_chunks(db, "fracciones") == []
    assert db.params["embedding_provider"] == "ollama_internal"
    assert db.params["embedding_model"] == "qwen3-embedding:0.6b"
    assert db.params["embedding_dimensions"] == 1024
    assert db.params["embedding_space_version"] == "space-v1"
    assert len(db.calls) == 2
    assert "SELECT EXISTS" in db.calls[0][0]
    assert "embedding_provider" not in db.calls[0][1]


@pytest.mark.asyncio
async def test_evaluation_context_excludes_unselected_catalog_and_scopes_teacher(monkeypatch):
    teacher_id, materia_id = uuid4(), uuid4()
    space = EmbeddingSpace("ollama_internal", "qwen3-embedding:0.6b", 1024, "space-v1")

    async def fake_embed(query, **kwargs):
        assert "criterio elegido" in query
        assert kwargs["teacher_id"] == teacher_id
        return EmbeddedVector([0.0] * 1024, space)

    monkeypatch.setattr(retrieval_service, "embed_single_with_metadata", fake_embed)
    db = _DB()
    assert await build_context_for_evaluation_creation(
        db, materia_id, "criterio elegido", [], profesor_id=teacher_id,
    ) == []
    assert db.params["excluded_type_0"] == "dba"
    assert "c.tipo <> :excluded_type_0" in db.statement
    assert db.params["materia_id"] == str(materia_id)
    assert db.params["profesor_id"] == str(teacher_id)
    assert "s.profesor_id" in db.statement and "s.materia_id" in db.statement


@pytest.mark.asyncio
async def test_search_does_not_fabricate_context_on_vector_failure(monkeypatch) -> None:
    space = EmbeddingSpace("ollama_internal", "qwen3-embedding:0.6b", 1024, "space-v1")

    async def fake_embed(*_, **__):
        return EmbeddedVector([0.0] * 1024, space)

    monkeypatch.setattr(retrieval_service, "embed_single_with_metadata", fake_embed)
    with pytest.raises(EmbeddingUnavailableError):
        await retrieval_service.search_chunks(_DB(fail=True), "fracciones")


@pytest.mark.asyncio
@pytest.mark.parametrize("scope", [
    {},
    {"materia_id": uuid4(), "profesor_id": uuid4()},
    {"tipo": "dba", "exclude_types": ("dba", "recurso")},
])
async def test_no_accessible_candidates_skips_embedding(monkeypatch, scope):
    async def forbidden_embed(*_, **__):
        pytest.fail("No debe consultar el proveedor sin fragmentos accesibles")

    monkeypatch.setattr(retrieval_service, "embed_single_with_metadata", forbidden_embed)
    db = _DB(candidates=False)
    assert await retrieval_service.search_chunks(db, "texto privado", **scope) == []
    assert len(db.calls) == 1
    assert "SELECT EXISTS" in db.statement
    assert "JOIN rag_sources s ON s.id = c.source_id" in db.statement
    assert "c.embedding_vec IS NOT NULL" in db.statement
    assert "texto privado" not in str(db.params)


@pytest.mark.asyncio
async def test_preflight_and_retrieval_share_all_scope_filters(monkeypatch):
    space = EmbeddingSpace("ollama_internal", "qwen3-embedding:0.6b", 1024, "space-v1")

    async def fake_embed(*_, **__):
        return EmbeddedVector([0.0] * 1024, space)

    monkeypatch.setattr(retrieval_service, "embed_single_with_metadata", fake_embed)
    db = _DB()
    teacher, subject = uuid4(), uuid4()
    await retrieval_service.search_chunks(
        db, "pregunta", materia_id=subject, profesor_id=teacher,
        tipo="documento", exclude_types=("dba", "recurso"),
    )
    assert len(db.calls) == 2
    preflight, retrieval = db.calls
    for predicate in [
        "c.embedding_vec IS NOT NULL",
        "c.materia_id = CAST(:materia_id AS uuid)",
        "s.materia_id = CAST(:materia_id AS uuid)",
        "c.profesor_id = CAST(:profesor_id AS uuid)",
        "s.profesor_id = CAST(:profesor_id AS uuid)",
        "c.tipo = 'dba' AND c.profesor_id IS NULL AND s.profesor_id IS NULL",
        "c.tipo = :tipo", "c.tipo <> :excluded_type_0", "c.tipo <> :excluded_type_1",
    ]:
        assert predicate in preflight[0] and predicate in retrieval[0]
    for key, value in preflight[1].items():
        assert retrieval[1][key] == value
    assert preflight[1]["materia_id"] == str(subject)
    assert preflight[1]["profesor_id"] == str(teacher)


@pytest.mark.asyncio
@pytest.mark.parametrize("fail_on", [1, 2])
async def test_query_failure_is_unavailable_not_empty_context(monkeypatch, fail_on):
    space = EmbeddingSpace("ollama_internal", "qwen3-embedding:0.6b", 1024, "space-v1")
    embedding_calls = []

    async def fake_embed(*_, **__):
        embedding_calls.append(True)
        return EmbeddedVector([0.0] * 1024, space)

    monkeypatch.setattr(retrieval_service, "embed_single_with_metadata", fake_embed)
    with pytest.raises(EmbeddingUnavailableError, match="búsqueda semántica"):
        await retrieval_service.search_chunks(_DB(fail_on=fail_on), "pregunta")
    assert len(embedding_calls) == fail_on - 1


@pytest.mark.asyncio
async def test_provider_failure_with_candidates_keeps_error_contract(monkeypatch):
    async def unavailable(*_, **__):
        raise EmbeddingUnavailableError("proveedor no disponible")

    monkeypatch.setattr(retrieval_service, "embed_single_with_metadata", unavailable)
    db = _DB()
    with pytest.raises(EmbeddingUnavailableError, match="proveedor no disponible"):
        await retrieval_service.search_chunks(db, "pregunta")
    assert len(db.calls) == 1
