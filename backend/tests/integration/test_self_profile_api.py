"""Perfil propio: PostgreSQL aislado y HTTP real sin usuarios ni SMTP externos."""
import os
from datetime import timedelta
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from starlette.requests import Request

from app.core.permissions import get_current_user
from app.core.security import create_access_token, create_refresh_token, get_password_hash, verify_password
from app.db.base import import_models
from app.db.session import get_db
from app.modules.auth.models import PasswordResetRequest
from app.modules.auth.password_recovery_service import build_reset_token, consume_password_reset_token, hash_reset_token, utcnow
from app.modules.auth.service import authenticate_user, refresh_session
from app.modules.materias.models import Materia
from app.modules.users.models import User
from app.modules.users.router import router
from app.shared.constants import COOKIE_ACCESS_NAME, COOKIE_CSRF_NAME, COOKIE_REFRESH_NAME

TEST_URL = os.getenv("SPEC084_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="Requiere SPEC084_TEST_DATABASE_URL aislada")
import_models()


@pytest_asyncio.fixture
async def profile(monkeypatch):
    async def audit_without_external_session(_db, **kwargs):
        assert "Original-Ficticia!" not in str(kwargs)
        assert "Nueva-Ficticia!" not in str(kwargs)
    monkeypatch.setattr("app.modules.users.service.audit", audit_without_external_session)
    engine = create_async_engine(TEST_URL)
    async with engine.connect() as connection:
        transaction = await connection.begin()
        db = AsyncSession(bind=connection, expire_on_commit=False)
        teacher = User(nombre="Docente sintético", email=f"{uuid4()}@example.com", password_hash=get_password_hash("Original-Ficticia!"), rol="profesor")
        other = User(nombre="Otro sintético", email=f"{uuid4()}@example.com", password_hash="no-login", rol="estudiante")
        db.add_all([teacher, other])
        await db.flush()
        subject = Materia(profesor_id=teacher.id, nombre="Materia intacta", codigo_matricula=uuid4().hex[:12])
        request_id = uuid4()
        reset_token = build_reset_token(request_id)
        recovery = PasswordResetRequest(id=request_id, user_id=teacher.id, token_hash=hash_reset_token(reset_token), expires_at=utcnow() + timedelta(minutes=10))
        db.add_all([subject, recovery])
        await db.flush()
        app = FastAPI()
        app.include_router(router, prefix="/api")
        async def session():
            yield db
        app.dependency_overrides[get_db] = session
        access = create_access_token(teacher.id, teacher.auth_version)
        refresh = create_refresh_token(teacher.id, teacher.auth_version)
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test", cookies={COOKIE_ACCESS_NAME: access}) as client:
            yield db, client, teacher, other, subject, recovery, reset_token, access, refresh
        await db.close()
        await transaction.rollback()
    await engine.dispose()


@pytest.mark.asyncio
async def test_name_update_preserves_access_subjects_and_private_response(profile):
    db, client, teacher, _, subject, recovery, *_ = profile
    response = await client.patch("/api/users/me", json={"nombre": "  Nombre actualizado  "})
    assert response.status_code == 200
    assert response.json()["nombre"] == "Nombre actualizado"
    assert response.json()["rol"] == "profesor"
    assert "password_hash" not in response.json()
    assert response.headers["cache-control"] == "private, no-store"
    assert (await db.get(Materia, subject.id)).profesor_id == teacher.id
    assert recovery.invalidated_at is None
    assert (await client.get("/api/users/me")).status_code == 200


@pytest.mark.asyncio
async def test_sensitive_update_errors_do_not_change_fields_or_log_out(profile):
    db, client, teacher, other, _, recovery, *_ = profile
    original = teacher.nombre, teacher.email, teacher.password_hash, teacher.auth_version
    for body, status in [
        ({"rol": "admin"}, 422), ({"nombre": None}, 422), ({"email": None}, 422),
        ({"nombre": "  "}, 422), ({"password": "Corta"}, 422),
        ({"nombre": "No guardar", "email": other.email, "current_password": "Original-Ficticia!"}, 409),
        ({"email": f"{uuid4()}@example.com"}, 422),
        ({"password": "Nueva-Ficticia!", "current_password": "Incorrecta"}, 422),
    ]:
        response = await client.patch("/api/users/me", json=body)
        assert response.status_code == status, response.text
        await db.refresh(teacher)
        assert (teacher.nombre, teacher.email, teacher.password_hash, teacher.auth_version) == original
        assert not response.headers.get_list("set-cookie")
        assert (await client.get("/api/users/me")).status_code == 200
    await db.refresh(recovery)
    assert recovery.invalidated_at is None


@pytest.mark.asyncio
async def test_email_update_invalidates_old_recovery_without_revoking_session(profile):
    db, client, teacher, _, _, recovery, reset_token, _, refresh = profile
    email = f"{uuid4()}@example.com"
    response = await client.patch("/api/users/me", json={"email": email, "current_password": "Original-Ficticia!"})
    assert response.status_code == 200
    assert teacher.email == email
    await db.refresh(recovery)
    assert recovery.invalidated_at is not None
    with pytest.raises(ValueError):
        await consume_password_reset_token(db, token=reset_token, password="Otra-Ficticia!")
    assert (await client.get("/api/users/me")).status_code == 200
    assert (await refresh_session(db, refresh)).id == teacher.id


@pytest.mark.asyncio
async def test_password_update_clears_cookies_revokes_tokens_and_allows_new_login(profile):
    db, client, teacher, _, subject, recovery, reset_token, access, refresh = profile
    version = teacher.auth_version
    response = await client.patch("/api/users/me", json={"password": "Nueva-Ficticia!", "current_password": "Original-Ficticia!"})
    assert response.status_code == 200
    cookies = response.headers.get_list("set-cookie")
    for name in (COOKIE_ACCESS_NAME, COOKIE_REFRESH_NAME, COOKIE_CSRF_NAME):
        assert any(cookie.startswith(name + "=") and "Max-Age=0" in cookie for cookie in cookies)
    assert teacher.auth_version == version + 1
    assert verify_password("Nueva-Ficticia!", teacher.password_hash)
    with pytest.raises(HTTPException) as error:
        await get_current_user(Request({"type": "http", "path": "/api/users/me", "headers": []}), authorization=f"Bearer {access}", db=db)
    assert error.value.status_code == 401
    with pytest.raises(HTTPException):
        await refresh_session(db, refresh)
    await db.refresh(recovery)
    assert recovery.invalidated_at is not None
    with pytest.raises(ValueError):
        await consume_password_reset_token(db, token=reset_token, password="Otra-Ficticia!")
    assert await authenticate_user(db, teacher.email, "Original-Ficticia!") is None
    assert (await authenticate_user(db, teacher.email, "Nueva-Ficticia!")).id == teacher.id
    assert (await db.get(Materia, subject.id)).profesor_id == teacher.id
