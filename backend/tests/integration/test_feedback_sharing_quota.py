import asyncio
import secrets
from datetime import timedelta
from uuid import uuid4

from fastapi import HTTPException
import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.config import settings
from app.modules.feedback_sharing import quota_service
from app.modules.feedback_sharing.access_policy import credential_digest
from app.modules.feedback_sharing.models import FeedbackChatRequest
from app.modules.feedback_sharing.schemas import QuestionInput
from app.modules.feedback_sharing.service import create_access, preview_grade


async def link(db, case, monkeypatch):
    monkeypatch.setattr(settings, "FEEDBACK_SHARING_ENABLED", True)
    teacher, _, _, evaluation, grade = case
    projection = await preview_grade(db, teacher, evaluation.id, grade.id)
    return await create_access(db, teacher, evaluation.id, grade.id, projection.fingerprint, uuid4(), 3, False)


@pytest.mark.asyncio
async def test_exactly_five_accepted_under_six_concurrent_requests(fb_db, fb_case, monkeypatch):
    _, token = await link(fb_db, fb_case, monkeypatch)
    await fb_db.commit()
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)

    async def ask():
        async with sessions() as db:
            try:
                request, _ = await quota_service.accept_question(db, token, QuestionInput(request_id=uuid4(), mensaje="¿Cómo practico?"))
                await db.commit()
                return request.status
            except HTTPException as exc:
                assert exc.status_code == 429
                assert int(exc.headers["Retry-After"]) > 0
                return "limited"

    results = await asyncio.wait_for(asyncio.gather(*(ask() for _ in range(6))), timeout=20)
    assert results.count("queued") == 5 and results.count("limited") == 1


@pytest.mark.asyncio
async def test_duplicate_and_multiple_links_share_budget_without_double_count(fb_db, fb_case, monkeypatch):
    _, first = await link(fb_db, fb_case, monkeypatch)
    _, second = await link(fb_db, fb_case, monkeypatch)
    payload = QuestionInput(request_id=uuid4(), mensaje="Explica mi nota")
    request, created = await quota_service.accept_question(fb_db, first, payload)
    duplicate, again = await quota_service.accept_question(fb_db, first, payload)
    assert created and not again and duplicate.id == request.id
    with pytest.raises(HTTPException) as conflict:
        await quota_service.accept_question(fb_db, first, QuestionInput(request_id=payload.request_id, mensaje="Otro contenido"))
    assert conflict.value.status_code == 409
    for _ in range(4):
        await quota_service.accept_question(fb_db, second, QuestionInput(request_id=uuid4(), mensaje="¿Qué mejoro?"))
    with pytest.raises(HTTPException) as limit:
        await quota_service.accept_question(fb_db, first, QuestionInput(request_id=uuid4(), mensaje="Sexta"))
    assert limit.value.status_code == 429
    assert await fb_db.scalar(select(func.count()).select_from(FeedbackChatRequest).where(FeedbackChatRequest.access_id == duplicate.access_id)) == 1


@pytest.mark.asyncio
async def test_rolling_window_boundary_and_failures_do_not_reset_budget(fb_db, fb_case, monkeypatch):
    _, token = await link(fb_db, fb_case, monkeypatch)
    now = await quota_service.db_now(fb_db)

    async def clock(db):
        return now

    monkeypatch.setattr(quota_service, "db_now", clock)
    requests = []
    for _ in range(5):
        request, _ = await quota_service.accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje="Pregunta"))
        requests.append(request)
    await fb_db.execute(update(FeedbackChatRequest).where(FeedbackChatRequest.id == requests[0].id).values(accepted_at=now - timedelta(seconds=599), status="failed"))
    with pytest.raises(HTTPException):
        await quota_service.accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje="Sexta"))
    await fb_db.execute(update(FeedbackChatRequest).where(FeedbackChatRequest.id == requests[0].id).values(accepted_at=now - timedelta(seconds=600)))
    assert (await quota_service.accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje="Lugar liberado")))[1]


@pytest.mark.asyncio
async def test_rotation_or_reactivation_cannot_reset_budget_and_closed_overrides_it(fb_db, fb_case, monkeypatch):
    access, token = await link(fb_db, fb_case, monkeypatch)
    for _ in range(5):
        await quota_service.accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje="Pregunta"))
    rotated = secrets.token_urlsafe(32)
    access.credential_digest = credential_digest(rotated)
    access.credential_generation += 1
    access.expires_at += timedelta(days=1)
    await fb_db.flush()
    with pytest.raises(HTTPException) as old:
        await quota_service.accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje="Antiguo"))
    assert old.value.status_code == 404
    with pytest.raises(HTTPException) as new:
        await quota_service.accept_question(fb_db, rotated, QuestionInput(request_id=uuid4(), mensaje="Sexta"))
    assert new.value.status_code == 429
    access.state = "disabled"
    await fb_db.flush()
    with pytest.raises(HTTPException) as closed:
        await quota_service.accept_question(fb_db, rotated, QuestionInput(request_id=uuid4(), mensaje="Cerrado"))
    assert closed.value.status_code == 404


@pytest.mark.asyncio
async def test_equal_surnames_in_same_evaluation_do_not_share_budget(fb_db, fb_case, monkeypatch):
    from app.modules.calificaciones.models import Calificacion
    from app.modules.matriculas.models import Matricula
    from app.modules.users.models import User

    _, token = await link(fb_db, fb_case, monkeypatch)
    for _ in range(5):
        await quota_service.accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje="Pregunta"))
    teacher, original, subject, evaluation, _ = fb_case
    other = User(nombre=original.nombre, email=f"{uuid4()}@example.test", password_hash="not-a-login", rol="estudiante")
    fb_db.add(other)
    await fb_db.flush()
    fb_db.add(Matricula(materia_id=subject.id, estudiante_id=other.id))
    grade = Calificacion(evaluacion_id=evaluation.id, materia_id=subject.id, estudiante_id=other.id, profesor_id=teacher.id, estado="confirmada", revisado_por_docente=True, nota_confirmada=4, feedback="Identificaste el tema. Practica explicarlo con tus palabras.")
    fb_db.add(grade)
    await fb_db.flush()
    _, own_token = await link(fb_db, (teacher, other, subject, evaluation, grade), monkeypatch)
    assert (await quota_service.accept_question(fb_db, own_token, QuestionInput(request_id=uuid4(), mensaje="Mi primera pregunta")))[1]
