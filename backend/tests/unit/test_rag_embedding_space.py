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
    def fetchall(self):
        return []


class _DB:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail
        self.params = None
        self.statement = ""

    def begin_nested(self):
        return _Transaction()

    async def execute(self, _statement, params):
        self.statement = str(_statement)
        self.params = params
        if self.fail:
            raise RuntimeError("database detail")
        return _Result()


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
