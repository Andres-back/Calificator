from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import text

from app.modules.feedback_sharing.access_policy import db_now
from app.modules.feedback_sharing.models import FeedbackChatQuota, FeedbackChatRequest
from app.modules.feedback_sharing.retention import purge_expired_conversations
from app.modules.feedback_sharing.service import create_access, preview_grade


@pytest.mark.asyncio
async def test_cleanup_only_removes_expired_temporary_text_not_grade_or_quota(fb_db, fb_case, monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED', True)
    teacher, student, _, evaluation, grade = fb_case
    projection = await preview_grade(fb_db, teacher, evaluation.id, grade.id)
    access, _ = await create_access(fb_db, teacher, evaluation.id, grade.id, projection.fingerprint, uuid4(), 3, False)
    now = await db_now(fb_db)
    access.expires_at = now - timedelta(days=31)
    quota = FeedbackChatQuota(estudiante_id=student.id, evaluacion_id=evaluation.id)
    fb_db.add(quota)
    await fb_db.flush()
    request = FeedbackChatRequest(access_id=access.id, publication_id=access.publication_id, quota_id=quota.id, credential_generation=1, client_request_id=uuid4(), request_fingerprint='f' * 64, message='Texto privado', response='Respuesta privada', status='succeeded', dispatch_pending=False, accepted_at=now - timedelta(days=34))
    fb_db.add(request)
    await fb_db.flush()
    before = await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'), {'id': grade.id})
    assert await purge_expired_conversations(fb_db, now=now) >= 1
    await fb_db.refresh(request)
    assert request.message is None and request.response is None
    assert request.accepted_at == now - timedelta(days=34)
    assert await fb_db.get(FeedbackChatQuota, quota.id) is not None
    assert await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'), {'id': grade.id}) == before
    assert await purge_expired_conversations(fb_db, now=now) == 0


@pytest.mark.asyncio
async def test_reactivated_or_recently_closed_access_is_not_purged(fb_db, fb_case, monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED', True)
    teacher, student, _, evaluation, grade = fb_case
    projection = await preview_grade(fb_db, teacher, evaluation.id, grade.id)
    access, _ = await create_access(fb_db, teacher, evaluation.id, grade.id, projection.fingerprint, uuid4(), 3, False)
    now = await db_now(fb_db)
    quota = FeedbackChatQuota(estudiante_id=student.id, evaluacion_id=evaluation.id)
    fb_db.add(quota)
    await fb_db.flush()
    request = FeedbackChatRequest(access_id=access.id, publication_id=access.publication_id, quota_id=quota.id, credential_generation=1, client_request_id=uuid4(), request_fingerprint='f' * 64, message='Pregunta conservada', status='succeeded', dispatch_pending=False)
    fb_db.add(request)
    await fb_db.flush()
    await purge_expired_conversations(fb_db, now=now + timedelta(days=29))
    await fb_db.refresh(request)
    assert request.message == 'Pregunta conservada'
    access.expires_at = now + timedelta(days=90)
    await fb_db.flush()
    await purge_expired_conversations(fb_db, now=now + timedelta(days=40))
    await fb_db.refresh(request)
    assert request.message == 'Pregunta conservada'
