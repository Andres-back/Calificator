"""Fixtures opt-in de Spec107: nunca usan DATABASE_URL de la aplicación."""
from __future__ import annotations

import os
from urllib.parse import urlparse
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import import_models
from app.core.config import settings
from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.calificaciones.models import Calificacion
from app.modules.evaluaciones.models import Evaluacion
from app.modules.materias.models import Materia
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User


@pytest_asyncio.fixture
async def fb_db():
    url = os.getenv("SPEC107_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Requiere SPEC107_TEST_DATABASE_URL sintética y aislada")
    parsed = urlparse(url)
    assert parsed.hostname in {"127.0.0.1", "localhost"}
    assert parsed.path == "/spec107" and parsed.port == 55417
    import_models()
    engine = create_async_engine(url)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as db:
        yield db
        await db.rollback()
        # Solo conversaciones sintéticas de alumnos creados por esta prueba.
        # Sus timestamps no deben contaminar el límite global de otro test.
        student_ids = db.info.get("spec107_student_ids", [])
        if student_ids:
            from app.modules.feedback_sharing.models import FeedbackChatQuota, FeedbackChatRequest
            await db.execute(delete(FeedbackChatRequest).where(FeedbackChatRequest.quota_id.in_(select(FeedbackChatQuota.id).where(FeedbackChatQuota.estudiante_id.in_(student_ids)))))
            await db.commit()
    await engine.dispose()


async def make_case(fb_db):
    teacher = User(nombre="Docente sintético", email=f"{uuid4()}@example.test", password_hash="not-a-login", rol="profesor")
    student = User(nombre="Estudiante Pérez", email=f"{uuid4()}@example.test", password_hash="not-a-login", rol="estudiante")
    fb_db.add_all([teacher, student])
    await fb_db.flush()
    subject = Materia(profesor_id=teacher.id, nombre="Lectura sintética", codigo_matricula=uuid4().hex[:20])
    fb_db.add(subject)
    await fb_db.flush()
    evaluation = Evaluacion(materia_id=subject.id, profesor_id=teacher.id, nombre="Actividad sintética", tipo_origen="nativa", estado="publicada", nota_maxima=5)
    fb_db.add_all([evaluation, Matricula(materia_id=subject.id, estudiante_id=student.id)])
    await fb_db.flush()
    grade = Calificacion(evaluacion_id=evaluation.id, materia_id=subject.id, estudiante_id=student.id, profesor_id=teacher.id, estado="confirmada", revisado_por_docente=True, nota_confirmada=3, feedback="Identificaste al personaje. Relee el segundo párrafo y explica su emoción.")
    fb_db.add(grade)
    await fb_db.flush()
    fb_db.info.setdefault("spec107_student_ids", []).append(student.id)
    return teacher, student, subject, evaluation, grade


@pytest.fixture
def fb_case_factory():
    return make_case


@pytest_asyncio.fixture
async def fb_case(fb_db):
    return await make_case(fb_db)


@pytest_asyncio.fixture
async def fb_client(fb_db, fb_case, monkeypatch):
    from app.modules.feedback_sharing.router import router
    from app.modules.feedback_sharing.public_router import router as public_router

    monkeypatch.setattr(settings, 'FEEDBACK_SHARING_ENABLED', True)
    app = FastAPI()
    app.include_router(router, prefix='/api')
    app.include_router(public_router, prefix='/api')
    actor = {'user': fb_case[0]}

    async def current():
        if actor['user'] is None:
            raise HTTPException(401, 'Sin sesión')
        return actor['user']

    async def database():
        yield fb_db

    app.dependency_overrides[get_current_user] = current
    app.dependency_overrides[get_db] = database
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://testserver') as client:
        yield client, actor, fb_case
