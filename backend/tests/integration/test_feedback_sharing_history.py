"""Synthetic PostgreSQL cases: no broker or paid inference."""
from datetime import timedelta
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.modules.feedback_sharing import chat_service
from app.modules.feedback_sharing.models import FeedbackChatRequest
from app.modules.feedback_sharing.quota_service import accept_question
from app.modules.feedback_sharing.schemas import FeedbackMessageInput, QuestionInput
from app.modules.feedback_sharing.service import create_access, prepare_grade_preview, preview_grade, save_feedback_message


@pytest.fixture(autouse=True)
def feature_on(monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED', True)


async def access(db, case):
    preview = await preview_grade(db, case[0], case[-2].id, case[-1].id)
    return await create_access(db, case[0], case[-2].id, case[-1].id, preview.fingerprint, uuid4(), 3, False)


@pytest.mark.asyncio
async def test_readers_poll_replay_legacy_and_shared_quota(fb_db, fb_case):
    _, token = await access(fb_db, fb_case)
    first, other = str(uuid4()), str(uuid4())
    payload = QuestionInput(request_id=uuid4(), mensaje='¿Cómo practico?')
    saved, _ = await accept_question(fb_db, token, payload, visitor=first)
    legacy, _ = await accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje='Mensaje anterior'))
    await fb_db.commit()
    assert (await chat_service.read_conversation(fb_db, token, first))['items'][0]['pregunta'] == payload.mensaje
    assert (await chat_service.read_conversation(fb_db, token, other))['items'] == []
    for visitor in (other, None):
        with pytest.raises(HTTPException) as error:
            await chat_service.read_request(fb_db, token, saved.id, visitor=visitor)
        assert error.value.status_code == 404
        with pytest.raises(HTTPException) as error:
            await accept_question(fb_db, token, payload, visitor=visitor)
        assert error.value.status_code == 409
    assert (await chat_service.read_request(fb_db, token, legacy.id))['request_id'] == legacy.id
    repeated, created = await accept_question(fb_db, token, payload, visitor=first)
    assert repeated.id == saved.id and not created
    for _ in range(3):
        await accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje='Otra pregunta'), visitor=other)
    assert (await chat_service.read_conversation(fb_db, token, first))['cupo']['restantes'] == 0
    with pytest.raises(HTTPException) as error:
        await accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje='Sexta'), visitor=first)
    assert error.value.status_code == 429


@pytest.mark.asyncio
async def test_history_pagination_pending_revocation_and_cursor_isolation(fb_db, fb_case):
    entry, token = await access(fb_db, fb_case)
    visitor, other = str(uuid4()), str(uuid4())
    first, _ = await accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje='Pendiente'), visitor=visitor)
    for index in range(25):
        fb_db.add(FeedbackChatRequest(access_id=first.access_id, publication_id=first.publication_id, quota_id=first.quota_id,
            credential_generation=first.credential_generation, client_request_id=uuid4(), request_fingerprint='f'*64,
            conversation_digest=first.conversation_digest, message=f'Pregunta {index:02}', response=f'Orientación {index:02}', status='succeeded',
            accepted_at=first.accepted_at-timedelta(hours=1, seconds=25-index)))
    await fb_db.commit()
    recent = await chat_service.read_conversation(fb_db, token, visitor)
    older = await chat_service.read_conversation(fb_db, token, visitor, cursor=recent['next_cursor'])
    assert len(recent['items']) == 20 and len(older['items']) == 6 and older['next_cursor'] is None
    all_items = older['items'] + recent['items']
    assert len({item['request_id'] for item in all_items}) == 26
    assert all_items[-1]['status'] == 'queued' and all_items[0]['pregunta'] == 'Pregunta 00'
    with pytest.raises(HTTPException):
        await chat_service.read_conversation(fb_db, token, other, cursor=recent['next_cursor'])
    entry.state = 'disabled'
    await fb_db.commit()
    with pytest.raises(HTTPException) as error:
        await chat_service.read_conversation(fb_db, token, visitor)
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_message_save_changes_no_grade_and_is_idempotent(fb_db, fb_case):
    teacher, _, _, evaluation, grade = fb_case
    grade.estado, grade.nota_sugerida, grade.nota_confirmada, grade.revisado_por_docente = 'sugerida', 3, None, False
    await fb_db.commit()
    original = grade.feedback
    preview = await prepare_grade_preview(fb_db, teacher, evaluation.id, grade.id)
    payload = FeedbackMessageInput(calificacion_id=grade.id, source_fingerprint=preview['mensaje_editable']['source_fingerprint'], feedback_text='Aciertos: reconociste el tema. Siguiente paso: explica una razón del texto.', request_id=uuid4())
    await save_feedback_message(fb_db, teacher, evaluation.id, payload)
    await fb_db.commit()
    await save_feedback_message(fb_db, teacher, evaluation.id, payload)
    await fb_db.commit()
    assert grade.nota_confirmada is None and grade.estado == 'sugerida' and not grade.revisado_por_docente
    timeline = grade.resultado_json['_timeline']
    assert len(timeline) == 2 and timeline[0]['feedback'] == original
    assert grade.feedback == payload.feedback_text
    with pytest.raises(HTTPException):
        await save_feedback_message(fb_db, teacher, evaluation.id, payload.model_copy(update={'request_id': uuid4()}))


@pytest.mark.asyncio
async def test_revalidation_rejects_revision_changed_during_history(fb_db, fb_case, monkeypatch):
    entry, token = await access(fb_db, fb_case)
    original = chat_service.guard_token
    calls = 0

    async def changing_guard(db, credential):
        nonlocal calls
        calls += 1
        if calls == 2:
            entry.credential_generation += 1
            await db.flush()
        return await original(db, credential)

    monkeypatch.setattr(chat_service, 'guard_token', changing_guard)
    with pytest.raises(HTTPException) as error:
        await chat_service.read_conversation(fb_db, token, str(uuid4()))
    assert error.value.status_code == 404 and calls == 2


@pytest.mark.asyncio
async def test_http_history_headers_and_message_save_permissions(fb_client, fb_db):
    client, actor, case = fb_client
    _, token = await access(fb_db, case)
    await fb_db.commit()
    headers = {'Authorization': f'Bearer {token}', 'X-Feedback-Conversation': str(uuid4())}
    history = await client.get('/api/public/devolucion/conversacion', headers=headers)
    assert history.status_code == 200 and history.json()['items'] == []
    assert 'no-store' in history.headers['cache-control']
    assert (await client.get('/api/public/devolucion/conversacion', headers={'Authorization': f'Bearer {token}'})).status_code == 400
    preview = await prepare_grade_preview(fb_db, case[0], case[-2].id, case[-1].id)
    payload = {'calificacion_id': str(case[-1].id), 'source_fingerprint': preview['mensaje_editable']['source_fingerprint'], 'feedback_text': 'Un mensaje sintético.', 'request_id': str(uuid4())}
    actor['user'] = case[1]
    assert (await client.post(f'/api/evaluaciones/{case[-2].id}/devoluciones/mensaje', json=payload)).status_code == 403
    assert case[-1].feedback != payload['feedback_text']
