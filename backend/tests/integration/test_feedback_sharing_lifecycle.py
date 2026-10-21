"""Ciclo de vida con PostgreSQL sintético; ningún cambio académico."""
import asyncio
from datetime import timedelta
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.calificaciones.models import Calificacion
from app.modules.feedback_sharing import access_policy
from app.modules.feedback_sharing.access_policy import db_now, guard_token
from app.modules.feedback_sharing.models import FeedbackAccess, FeedbackPublication
from app.modules.feedback_sharing.quota_service import accept_question
from app.modules.feedback_sharing.router import router
from app.modules.feedback_sharing.schemas import AccessAction, QuestionInput, ReactivateInput, RenewInput
from app.modules.feedback_sharing.service import create_access, manage_access, preview_grade
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User


@pytest.fixture(autouse=True)
def feature_on(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.FEEDBACK_SHARING_ENABLED", True)


async def issued(db, case):
    teacher, _, _, evaluation, grade = case
    projection = await preview_grade(db, teacher, evaluation.id, grade.id)
    access, token = await create_access(db, teacher, evaluation.id, grade.id, projection.fingerprint, uuid4(), 3, False)
    return access, token, projection


def action(version=1):
    return AccessAction(expected_version=version, request_id=uuid4())


@pytest.mark.asyncio
async def test_deactivate_is_idempotent_audited_and_preserves_grade(fb_db, fb_case):
    access, token, _ = await issued(fb_db, fb_case)
    before = await fb_db.scalar(text("SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id"), {"id": fb_case[-1].id})
    payload = action()
    result, secret = await manage_access(fb_db, fb_case[0], access.id, "disable", payload)
    assert result.state == "disabled" and result.version == 2 and secret is None
    assert result.disabled_at is not None
    again, secret = await manage_access(fb_db, fb_case[0], access.id, "disable", payload)
    assert again.version == 2 and secret is None
    with pytest.raises(HTTPException) as exc:
        await guard_token(fb_db, token)
    assert exc.value.status_code == 404
    assert await fb_db.scalar(text("SELECT count(*) FROM audit_events WHERE entity_id=:id AND event='feedback_disabled'"), {"id": str(access.id)}) == 1
    assert await fb_db.scalar(text("SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id"), {"id": fb_case[-1].id}) == before


@pytest.mark.asyncio
async def test_stale_version_or_reused_operation_id_cannot_mutate(fb_db, fb_case):
    access, _, _ = await issued(fb_db, fb_case)
    payload = action()
    await manage_access(fb_db, fb_case[0], access.id, "disable", payload)
    for operation, value in [
        ("disable", action()),
        ("renew", RenewInput(expected_version=2, request_id=payload.request_id, confirmar_reemplazo=True)),
    ]:
        with pytest.raises(HTTPException) as exc:
            await manage_access(fb_db, fb_case[0], access.id, operation, value)
        assert exc.value.status_code == 409
    assert access.version == 2 and access.credential_generation == 1


@pytest.mark.asyncio
async def test_renew_requires_confirmation_and_never_reactivates_or_extends(fb_db, fb_case):
    access, old_token, _ = await issued(fb_db, fb_case)
    await manage_access(fb_db, fb_case[0], access.id, "disable", action())
    expiration = access.expires_at
    with pytest.raises(HTTPException) as exc:
        await manage_access(fb_db, fb_case[0], access.id, "renew", RenewInput(expected_version=2, request_id=uuid4(), confirmar_reemplazo=False))
    assert exc.value.status_code == 422
    payload = RenewInput(expected_version=2, request_id=uuid4(), confirmar_reemplazo=True)
    renewed, token = await manage_access(fb_db, fb_case[0], access.id, "renew", payload)
    assert token and token != old_token and renewed.credential_digest != token
    assert renewed.credential_generation == 2 and renewed.version == 3
    assert renewed.state == "disabled" and renewed.expires_at == expiration
    _, retry_token = await manage_access(fb_db, fb_case[0], access.id, "renew", payload)
    assert retry_token is None and renewed.credential_generation == 2
    for value in (old_token, token):
        with pytest.raises(HTTPException):
            await guard_token(fb_db, value)
    assert old_token not in str(renewed.operations_json) and token not in str(renewed.operations_json)


@pytest.mark.asyncio
async def test_reactivate_expired_with_new_window_and_repeat_does_not_extend(fb_db, fb_case):
    access, token, projection = await issued(fb_db, fb_case)
    access.expires_at = await db_now(fb_db) - timedelta(seconds=1)
    await fb_db.flush()
    payload = ReactivateInput(expected_version=1, request_id=uuid4(), fingerprint=projection.fingerprint, duracion_dias=2)
    now = await db_now(fb_db)
    restored, secret = await manage_access(fb_db, fb_case[0], access.id, "reactivate", payload)
    assert secret is None and restored.state == "active" and restored.version == 2
    assert now + timedelta(days=2) <= restored.expires_at <= await db_now(fb_db) + timedelta(days=2)
    expiration = restored.expires_at
    await manage_access(fb_db, fb_case[0], access.id, "reactivate", payload)
    assert restored.expires_at == expiration
    assert (await guard_token(fb_db, token)).publication.id == restored.publication_id


@pytest.mark.asyncio
async def test_changed_content_requires_new_preview_and_immutable_new_revision(fb_db, fb_case):
    access, token, original = await issued(fb_db, fb_case)
    old_publication_id = access.publication_id
    fb_case[-1].feedback = "Nueva orientación docente: explica tu respuesta con una frase del texto."
    await fb_db.flush()
    with pytest.raises(HTTPException) as exc:
        await manage_access(fb_db, fb_case[0], access.id, "reactivate", ReactivateInput(expected_version=1, request_id=uuid4(), fingerprint=original.fingerprint))
    assert exc.value.status_code == 409 and access.version == 1
    fresh = await preview_grade(fb_db, fb_case[0], fb_case[-2].id, fb_case[-1].id)
    await manage_access(fb_db, fb_case[0], access.id, "reactivate", ReactivateInput(expected_version=1, request_id=uuid4(), fingerprint=fresh.fingerprint, evidencia=True))
    context = await guard_token(fb_db, token)
    old = await fb_db.get(FeedbackPublication, old_publication_id)
    assert context.publication.id != old.id and context.publication.revision == 2
    assert old.state == "suspended" and old.payload_json == original.payload
    assert context.publication.payload_json == fresh.payload and context.publication.evidence_enabled


@pytest.mark.asyncio
async def test_suspended_or_invalid_source_can_be_disabled_but_not_reauthorized(fb_db, fb_case):
    access, _, projection = await issued(fb_db, fb_case)
    await fb_db.execute(update(Matricula).where(Matricula.estudiante_id == fb_case[1].id).values(estado="retirado"))
    await manage_access(fb_db, fb_case[0], access.id, "disable", action())
    with pytest.raises(HTTPException) as exc:
        await manage_access(fb_db, fb_case[0], access.id, "reactivate", ReactivateInput(expected_version=2, request_id=uuid4(), fingerprint=projection.fingerprint))
    assert exc.value.status_code == 409 and access.state == "disabled"


@pytest.mark.asyncio
async def test_lifecycle_checks_current_owner_permission_and_flag(fb_db, fb_case, monkeypatch):
    access, _, _ = await issued(fb_db, fb_case)
    other = User(nombre="Otro docente", email=f"{uuid4()}@example.test", password_hash="not-login", rol="profesor")
    fb_db.add(other)
    await fb_db.flush()
    for actor in (other, fb_case[1]):
        with pytest.raises(HTTPException) as exc:
            await manage_access(fb_db, actor, access.id, "disable", action())
        assert exc.value.status_code == 403

    async def no_permissions(*args):
        return frozenset()

    monkeypatch.setattr(access_policy, "effective_permissions", no_permissions)
    with pytest.raises(HTTPException) as exc:
        await manage_access(fb_db, fb_case[0], access.id, "disable", action())
    assert exc.value.status_code == 403
    monkeypatch.setattr("app.core.config.settings.FEEDBACK_SHARING_ENABLED", False)
    with pytest.raises(HTTPException) as exc:
        await manage_access(fb_db, fb_case[0], access.id, "disable", action())
    assert exc.value.status_code == 404
    assert access.version == 1


@pytest.mark.asyncio
async def test_lifecycle_does_not_reset_quota_or_restore_old_credential(fb_db, fb_case):
    access, token, projection = await issued(fb_db, fb_case)
    for _ in range(5):
        await accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje="¿Cómo puedo mejorar?"))
    await manage_access(fb_db, fb_case[0], access.id, "disable", action())
    await manage_access(fb_db, fb_case[0], access.id, "reactivate", ReactivateInput(expected_version=2, request_id=uuid4(), fingerprint=projection.fingerprint))
    _, new_token = await manage_access(fb_db, fb_case[0], access.id, "renew", RenewInput(expected_version=3, request_id=uuid4(), confirmar_reemplazo=True))
    with pytest.raises(HTTPException) as old:
        await guard_token(fb_db, token)
    assert old.value.status_code == 404
    with pytest.raises(HTTPException) as full:
        await accept_question(fb_db, new_token, QuestionInput(request_id=uuid4(), mensaje="Sexta pregunta"))
    assert full.value.status_code == 429


@pytest.mark.asyncio
async def test_admin_reauthorization_uses_new_emitter_without_widening_scope(fb_db, fb_case, monkeypatch):
    access, token, projection = await issued(fb_db, fb_case)
    admin = User(nombre="Administrador sintético", email=f"{uuid4()}@example.test", password_hash="not-login", rol="admin")
    fb_db.add(admin)
    await fb_db.flush()
    permissions = access_policy.effective_permissions

    async def current_permissions(db, actor):
        return frozenset() if actor.id == fb_case[0].id else await permissions(db, actor)

    monkeypatch.setattr(access_policy, "effective_permissions", current_permissions)
    with pytest.raises(HTTPException):
        await guard_token(fb_db, token)
    await manage_access(fb_db, admin, access.id, "reactivate", ReactivateInput(expected_version=1, request_id=uuid4(), fingerprint=projection.fingerprint))
    context = await guard_token(fb_db, token)
    assert context.publication.authorized_by == admin.id
    assert context.publication.estudiante_id == fb_case[1].id
    assert context.publication.evaluacion_id == fb_case[-2].id


@pytest.mark.asyncio
async def test_audit_failure_rolls_back_access_change(fb_db, fb_case, monkeypatch):
    from app.modules.feedback_sharing import service

    access, token, _ = await issued(fb_db, fb_case)
    access_id = access.id
    await fb_db.commit()

    async def unavailable_audit(*args, **kwargs):
        raise RuntimeError("Synthetic audit unavailable")

    monkeypatch.setattr(service, "audit_control", unavailable_audit)
    with pytest.raises(RuntimeError):
        await manage_access(fb_db, fb_case[0], access_id, "disable", action())
    await fb_db.rollback()
    persisted = await fb_db.get(FeedbackAccess, access_id)
    assert persisted.state == "active" and persisted.version == 1
    assert (await guard_token(fb_db, token)).access.id == access_id


@pytest.mark.asyncio
async def test_competing_actions_have_one_winner_and_one_version_conflict(fb_db, fb_case):
    access, _, _ = await issued(fb_db, fb_case)
    access_id, teacher_id = access.id, fb_case[0].id
    await fb_db.commit()
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)

    async def disable():
        async with sessions() as db:
            actor = await db.get(User, teacher_id)
            try:
                result, _ = await manage_access(db, actor, access_id, "disable", action())
                await db.commit()
                return result.version
            except HTTPException as exc:
                await db.rollback()
                return exc.status_code

    assert sorted(await asyncio.wait_for(asyncio.gather(disable(), disable()), timeout=10)) == [2, 409]


@pytest.mark.asyncio
async def test_reauthorization_and_academic_edit_serialize_without_mixing(fb_db, fb_case):
    access, token, projection = await issued(fb_db, fb_case)
    grade_id, access_id = fb_case[-1].id, access.id
    await fb_db.commit()
    await manage_access(fb_db, fb_case[0], access_id, "reactivate", ReactivateInput(expected_version=1, request_id=uuid4(), fingerprint=projection.fingerprint))
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)

    async def edit():
        async with sessions() as db:
            grade = await db.scalar(select(Calificacion).where(Calificacion.id == grade_id).with_for_update())
            grade.feedback = "Edición concurrente que requiere nueva autorización."
            await db.commit()

    pending = asyncio.create_task(edit())
    try:
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(asyncio.shield(pending), timeout=0.2)
        await fb_db.commit()
        await asyncio.wait_for(pending, timeout=10)
        with pytest.raises(HTTPException):
            await guard_token(fb_db, token)
    finally:
        if not pending.done():
            pending.cancel()
            await asyncio.gather(pending, return_exceptions=True)


@pytest.mark.asyncio
async def test_http_lifecycle_commits_and_only_renew_returns_secret_once(fb_db, fb_case):
    access, _, projection = await issued(fb_db, fb_case)
    app = FastAPI()
    app.include_router(router, prefix="/api")

    async def actor():
        return fb_case[0]

    async def database():
        yield fb_db

    app.dependency_overrides[get_current_user] = actor
    app.dependency_overrides[get_db] = database
    prefix = f"/api/devoluciones/accesos/{access.id}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        disabled = await client.post(prefix + "/desactivar", json=action().model_dump(mode="json"))
        assert disabled.status_code == 200 and disabled.json()["estado"] == "disabled"
        assert "no-store" in disabled.headers["cache-control"]
        restored = await client.post(prefix + "/reactivar", json=ReactivateInput(expected_version=2, request_id=uuid4(), fingerprint=projection.fingerprint).model_dump(mode="json"))
        assert restored.status_code == 200 and restored.json()["version"] == 3
        payload = RenewInput(expected_version=3, request_id=uuid4(), confirmar_reemplazo=True).model_dump(mode="json")
        rotated = await client.post(prefix + "/renovar", json=payload)
        assert rotated.status_code == 200 and "/devolucion#" in rotated.json()["url"]
        duplicate = await client.post(prefix + "/renovar", json=payload)
        assert duplicate.json()["url"] is None and not duplicate.json()["credential_available"]
        assert "credential_digest" not in rotated.text
