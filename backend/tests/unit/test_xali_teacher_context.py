import asyncio
from contextlib import asynccontextmanager
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.xali import teacher_context as context


def test_authorization_happens_before_context_access(monkeypatch):
    called = []

    async def manage(db, materia_id, user):
        called.append(materia_id)
        raise HTTPException(403, 'No access')

    monkeypatch.setattr(context, 'ensure_can_manage_materia', manage)
    teacher = SimpleNamespace(rol='profesor')
    with pytest.raises(HTTPException) as failure:
        asyncio.run(context.authorize_context(None, SimpleNamespace(rol='estudiante'), uuid4()))
    assert failure.value.status_code == 403 and not called
    with pytest.raises(HTTPException):
        asyncio.run(context.authorize_context(None, teacher, uuid4()))
    assert len(called) == 1


def test_context_and_general_filter_are_explicit():
    materia = SimpleNamespace(nombre='Matemáticas', area='Matemáticas', grado='6')
    assert 'Matemáticas' in context.subject_facts(materia) and '6' in context.subject_facts(materia)
    assert 'general' in context.subject_facts(None).lower()
    assert 'IS NULL' in context.conversation_filter(None)[0]
    assert 'CAST(:m' in context.conversation_filter(uuid4())[0]


def test_nonblocking_lock_uses_stable_scoped_keys():
    calls = []

    class DB:
        async def execute(self, statement, params):
            calls.append(params['key'])
            return SimpleNamespace(scalar_one=lambda: False)

    user = uuid4()
    with pytest.raises(HTTPException) as error:
        asyncio.run(context.lock_conversation(DB(), user, None))
    assert error.value.status_code == 409
    with pytest.raises(HTTPException):
        asyncio.run(context.lock_conversation(DB(), user, None))
    assert calls[0] == calls[1]
    with pytest.raises(HTTPException):
        asyncio.run(context.lock_conversation(DB(), user, uuid4()))
    assert calls[-1] != calls[0]


def test_rag_failure_degrades_without_lying_about_sources(monkeypatch):
    class DB:
        @asynccontextmanager
        async def begin_nested(self):
            yield

    async def unavailable(*args, **kwargs):
        assert kwargs['profesor_id']
        assert kwargs['include_global_catalog'] is False
        raise RuntimeError('simulated')

    monkeypatch.setattr(context, 'build_context_for_xali', unavailable)
    subject = SimpleNamespace(id=uuid4(), profesor_id=uuid4())
    text, sources = asyncio.run(context.retrieve_context(DB(), subject, 'Fracciones'))
    assert sources == [] and 'sin consultar' in text.lower()


@pytest.mark.parametrize('role,allowed', [('profesor', True), ('admin', True), ('estudiante', False)])
@pytest.mark.parametrize('method,path', [('POST', '/xali/chat'), ('GET', '/xali/history'), ('DELETE', '/xali/history')])
def test_routes_authorize_before_service(monkeypatch, role, allowed, method, path):
    from app.modules.xali import router as routes
    app = FastAPI()
    app.include_router(routes.router)
    subject_id = uuid4()
    user = SimpleNamespace(id=uuid4(), rol=role, _effective_permissions={'xali.use'})
    app.dependency_overrides[routes.get_current_user] = lambda: user
    app.dependency_overrides[routes.get_db] = lambda: None
    calls = []

    async def manage(db, mid, current_user):
        if not allowed:
            raise HTTPException(403, 'No access')
        return SimpleNamespace(id=mid)

    async def action(*args, **kwargs):
        calls.append(kwargs)
        return 'Docente' if method == 'POST' else []

    monkeypatch.setattr(context, 'ensure_can_manage_materia', manage)
    monkeypatch.setattr(routes.service, {'POST': 'chat', 'GET': 'get_history', 'DELETE': 'clear_history'}[method], action)
    with TestClient(app) as client:
        response = client.request(method, path, **({'json': {'mensaje': 'Consulta', 'materia_id': str(subject_id)}} if method == 'POST' else {'params': {'materia_id': str(subject_id)}}))
    expected = (204 if method == 'DELETE' else 200) if allowed else 403
    assert response.status_code == expected
    assert bool(calls) == allowed


def test_teacher_cannot_read_write_or_delete_another_subject(monkeypatch):
    from app.modules.xali import router as routes
    app = FastAPI(); app.include_router(routes.router)
    app.dependency_overrides[routes.get_current_user] = lambda: SimpleNamespace(id=uuid4(), rol='profesor', _effective_permissions={'xali.use'})
    app.dependency_overrides[routes.get_db] = lambda: None
    async def denied(*args):
        raise HTTPException(403, 'Materia no autorizada')
    async def must_not_run(*args, **kwargs):
        pytest.fail('Una materia ajena no puede llegar al servicio')
    monkeypatch.setattr(context, 'ensure_can_manage_materia', denied)
    for name in ['chat', 'get_history', 'clear_history']:
        monkeypatch.setattr(routes.service, name, must_not_run)
    with TestClient(app) as client:
        mid = str(uuid4())
        assert client.post('/xali/chat', json={'mensaje': 'Consulta', 'materia_id': mid}).status_code == 403
        assert client.get('/xali/history', params={'materia_id': mid}).status_code == 403
        assert client.delete('/xali/history', params={'materia_id': mid}).status_code == 403


def test_rag_scope_preserves_other_consumers_defaults(monkeypatch):
    from app.modules.rag import retrieval_service as retrieval
    statements = []
    class DB:
        @asynccontextmanager
        async def begin_nested(self):
            yield
        async def execute(self, statement, params):
            statements.append((str(statement), params))
            return SimpleNamespace(scalar_one=lambda: False)
    mid, owner = uuid4(), uuid4()
    asyncio.run(retrieval.search_chunks(DB(), 'Ejemplo', materia_id=mid, profesor_id=owner))
    asyncio.run(retrieval.search_chunks(DB(), 'Ejemplo', materia_id=mid, profesor_id=owner, include_global_catalog=False))
    assert "OR (c.tipo = 'dba'" in statements[0][0]
    assert 'AND c.materia_id = CAST(:materia_id AS uuid) AND s.materia_id' not in statements[0][0]
    assert 'AND c.materia_id = CAST(:materia_id AS uuid) AND s.materia_id' in statements[1][0]
    assert statements[1][1] == {'materia_id': str(mid), 'profesor_id': str(owner)}


def test_retrieved_sources_are_bounded_and_identified(monkeypatch):
    class DB:
        @asynccontextmanager
        async def begin_nested(self):
            yield
    async def retrieve(*args, **kwargs):
        return [{'source_id': str(i), 'source_title': 'Libro', 'chunk_text': 'Texto ' * 500, 'source_version': 'v1'} for i in range(10)]
    monkeypatch.setattr(context, 'build_context_for_xali', retrieve)
    text, sources = asyncio.run(context.retrieve_context(DB(), SimpleNamespace(id=uuid4(), profesor_id=uuid4()), 'Ejercicio'))
    assert len(text) <= 8000 and len(sources) == 6
    assert sources[0]['titulo'] == 'Libro' and 'Fuente 1' in context.sources_note(sources)
