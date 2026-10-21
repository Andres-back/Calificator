"""Synthetic load and exact academic-row preservation; no provider calls."""
import asyncio
import json
import platform
import time
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.modules.calificaciones.models import Calificacion
from app.modules.feedback_sharing.access_policy import guard_token
from app.modules.feedback_sharing.models import FeedbackChatQuota, FeedbackChatRequest
from app.modules.feedback_sharing.quota_service import accept_question
from app.modules.feedback_sharing.schemas import QuestionInput
from app.modules.feedback_sharing.service import create_access, preview_grade
from app.modules.users.models import User


@pytest.mark.asyncio
async def test_thirty_parallel_reads_and_admissions_preserve_academic_rows(fb_db, fb_case_factory, monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED', True)
    cases, tokens = [], []
    for _ in range(30):
        case = await fb_case_factory(fb_db)
        cases.append(case)
        projection = await preview_grade(fb_db, case[0], case[-2].id, case[-1].id)
        _, token = await create_access(fb_db, case[0], case[-2].id, case[-1].id, projection.fingerprint, uuid4(), 3, False)
        tokens.append(token)
    await fb_db.commit()
    ids = [case[-1].id for case in cases]
    user_ids = [item.id for case in cases for item in case[:2]]

    async def snapshot():
        grades = (await fb_db.execute(select(Calificacion).where(Calificacion.id.in_(ids)))).scalars().all()
        accounts = (await fb_db.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()
        return json.dumps([
            sorted([{column.key: str(getattr(grade, column.key)) for column in Calificacion.__table__.columns} for grade in grades], key=lambda row: row['id']),
            sorted([{column.key: str(getattr(user, column.key)) for column in User.__table__.columns} for user in accounts], key=lambda row: row['id']),
        ], sort_keys=True)

    before = await snapshot()
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)
    async def query(token):
        async with sessions() as db:
            start = time.perf_counter()
            context = await guard_token(db, token)
            read_ms = (time.perf_counter() - start) * 1000
            start = time.perf_counter()
            request, created = await accept_question(db, token, QuestionInput(request_id=uuid4(), mensaje='¿Cómo puedo practicar lo que debo mejorar?'))
            await db.commit()
            assert created and request.quota_id and context.source.grade.nota_confirmada == 3
            return read_ms, (time.perf_counter() - start) * 1000

    results = await asyncio.gather(*(query(token) for token in tokens))
    await fb_db.rollback()
    assert await snapshot() == before
    accepted = await fb_db.scalar(text('SELECT count(*) FROM feedback_chat_requests r JOIN feedback_chat_quotas q ON q.id=r.quota_id WHERE q.estudiante_id = ANY(:ids)'), {'ids': [case[1].id for case in cases]})
    assert accepted == 30
    for position, label in enumerate(('read_ms', 'accept_ms')):
        values = sorted(item[position] for item in results)
        print(json.dumps({'metric': label, 'concurrency': 30, 'p50': round(values[14], 2), 'p95': round(values[28], 2), 'python': platform.python_version(), 'machine': platform.machine(), 'provider': 'not_called'}))
    # Requests stay durable and unexecuted, on the dedicated feedback queue.
    requests = (await fb_db.scalars(select(FeedbackChatRequest).join(FeedbackChatQuota).where(FeedbackChatQuota.estudiante_id.in_([case[1].id for case in cases])))).all()
    assert all(request.status == 'queued' and request.dispatch_pending for request in requests)
