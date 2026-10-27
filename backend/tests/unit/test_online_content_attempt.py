"""A draft is pinned before answering, not when the worker eventually starts."""
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.modules.calificaciones import submission_content_service as attempts


def fake_db(evaluation, delivery=None):
    added = []
    return SimpleNamespace(scalar=AsyncMock(side_effect=[evaluation, delivery]), add=added.append,
        commit=AsyncMock(), refresh=AsyncMock(), added=added)


@pytest.mark.asyncio
async def test_start_pins_before_commit_without_consuming_an_attempt(monkeypatch):
    from app.db.base import import_models
    import_models()
    evaluation = SimpleNamespace(id=uuid4(), contenido_version_id=uuid4(), materia_id=uuid4(), modalidad='online', estado='publicada')
    student = uuid4()
    db = fake_db(evaluation)
    policy = AsyncMock()
    monkeypatch.setattr(attempts, 'ensure_student_can_submit_new_evidence', policy)
    async def pin(_db, _evaluation, delivery):
        assert db.commit.await_count == 0
        delivery.contenido_version_id = evaluation.contenido_version_id
    monkeypatch.setattr(attempts, 'pin_new_submission_content', pin)
    delivery = await attempts.start_online_content_attempt(db, evaluation, student)
    assert delivery in db.added and delivery.estado == 'en_progreso'
    assert delivery.contenido_version_id == evaluation.contenido_version_id
    assert delivery.respuesta_texto is None
    policy.assert_awaited_once()
    assert db.scalar.await_args_list[0].args[0]._for_update_arg is not None
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_resume_keeps_old_version_and_does_not_repin_or_add(monkeypatch):
    evaluation = SimpleNamespace(id=uuid4(), contenido_version_id=uuid4(), modalidad='online', estado='publicada')
    student = uuid4()
    old = SimpleNamespace(contenido_version_id=uuid4(), estudiante_id=student, evaluacion_id=evaluation.id)
    db = fake_db(evaluation, old)
    pin, policy = AsyncMock(), AsyncMock()
    monkeypatch.setattr(attempts, 'pin_new_submission_content', pin)
    monkeypatch.setattr(attempts, 'ensure_student_can_submit_new_evidence', policy)
    assert await attempts.start_online_content_attempt(db, evaluation, student) is old
    assert db.added == []
    pin.assert_not_called()
    policy.assert_not_called()


@pytest.mark.asyncio
async def test_submit_rejects_other_student_or_unpinned_attempt():
    evaluation = SimpleNamespace(id=uuid4(), contenido_version_id=uuid4())
    student = uuid4()
    for delivery in (None, SimpleNamespace(estudiante_id=uuid4(), evaluacion_id=evaluation.id),
                     SimpleNamespace(estudiante_id=student, evaluacion_id=evaluation.id, contenido_version_id=None)):
        db = SimpleNamespace(scalar=AsyncMock(return_value=delivery))
        with pytest.raises(HTTPException) as error:
            await attempts.get_online_content_attempt(db, evaluation, student, uuid4())
        assert error.value.status_code in {404, 409}


@pytest.mark.asyncio
async def test_submit_without_an_attempt_rejects_versioned_but_preserves_legacy():
    db = SimpleNamespace(scalar=AsyncMock())
    assert await attempts.get_online_content_attempt(db, SimpleNamespace(contenido_version_id=None), uuid4(), None) is None
    with pytest.raises(HTTPException) as error:
        await attempts.get_online_content_attempt(db, SimpleNamespace(contenido_version_id=uuid4()), uuid4(), None)
    assert error.value.status_code == 409
    db.scalar.assert_not_called()


@pytest.mark.asyncio
async def test_old_attempt_does_not_inherit_or_validate_new_live_document(monkeypatch):
    from app.modules.evaluaciones import service, visual_serialization
    live = SimpleNamespace(id=uuid4(), estructura_documento={'revision': {'confirmado': False}})
    revision = SimpleNamespace(id=uuid4(), snapshot_json={'modalidad': 'online',
        'preguntas': [{'numero': 7, 'tipo': 'abierta', 'enunciado': 'Versión anterior'}]})
    monkeypatch.setattr(attempts, 'get_content_revision', AsyncMock(return_value=revision))
    def base(value):
        assert value.estructura_documento is None
        return {'estado': 'publicada'}
    monkeypatch.setattr(service, '_student_safe_evaluation', base)
    fields = AsyncMock(return_value={'contenido_version_id': revision.id})
    monkeypatch.setattr(visual_serialization, 'visual_read_fields', fields)
    result = await attempts.student_attempt_evaluation(None, live, SimpleNamespace(contenido_version_id=revision.id))
    assert result['estructura_documento'] is None
    assert result['preguntas'][0]['numero'] == 7
    assert live.estructura_documento is not None
    fields.assert_awaited_once()
