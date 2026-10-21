from datetime import timedelta
import asyncio
from uuid import uuid4

from fastapi import HTTPException
import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.modules.feedback_sharing.access_policy import guard_token
from app.modules.feedback_sharing.models import FeedbackAccess, FeedbackPublication
from app.modules.feedback_sharing.service import create_access, preview_grade
from app.modules.users.models import User


@pytest.fixture(autouse=True)
def feature_on(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.FEEDBACK_SHARING_ENABLED", True)


async def make_link(db, case):
    teacher, _, _, evaluation, grade = case
    preview = await preview_grade(db, teacher, evaluation.id, grade.id)
    return await create_access(db, teacher, evaluation.id, grade.id, preview.fingerprint, uuid4(), 3, False)


@pytest.mark.asyncio
async def test_manual_result_scope_and_hashed_credential(fb_db, fb_case):
    access, credential = await make_link(fb_db, fb_case)
    guarded = await guard_token(fb_db, credential)
    assert guarded.publication.payload_json["estudiante"] == "Estudiante Pérez"
    assert access.credential_digest != credential
    assert guarded.publication.calificacion_id == fb_case[-1].id
    assert access.expires_at - access.created_at == timedelta(days=3)
    assert await fb_db.scalar(text("SELECT count(*) FROM audit_events WHERE entity_id=:id"), {"id": str(access.id)}) >= 1


@pytest.mark.asyncio
async def test_other_teacher_and_student_cannot_emit(fb_db, fb_case):
    teacher, student, _, evaluation, grade = fb_case
    other = User(nombre="Otro docente", email=f"{uuid4()}@example.test", password_hash="no-login", rol="profesor")
    fb_db.add(other)
    await fb_db.flush()
    for actor in (other, student):
        with pytest.raises(HTTPException) as exc:
            await preview_grade(fb_db, actor, evaluation.id, grade.id)
        assert exc.value.status_code == 403
    assert (await preview_grade(fb_db, teacher, evaluation.id, grade.id)).payload["nota"] == "3.00"


@pytest.mark.asyncio
async def test_unknown_jwt_expired_and_disabled_are_indistinguishable(fb_db, fb_case):
    access, credential = await make_link(fb_db, fb_case)
    messages = []
    for token in ("unknown", "eyJhbGciOiJIUzI1NiJ9.body.signature"):
        with pytest.raises(HTTPException) as exc:
            await guard_token(fb_db, token)
        messages.append((exc.value.status_code, exc.value.detail))
    access.expires_at = access.created_at
    await fb_db.flush()
    with pytest.raises(HTTPException) as expired:
        await guard_token(fb_db, credential)
    access.state = "disabled"
    with pytest.raises(HTTPException) as disabled:
        await guard_token(fb_db, credential)
    assert len(set([*messages, (expired.value.status_code, expired.value.detail), (disabled.value.status_code, disabled.value.detail)])) == 1


@pytest.mark.asyncio
async def test_edit_or_withdrawal_blocks_existing_link_without_regrading(fb_db, fb_case):
    _, _, _, _, grade = fb_case
    access, credential = await make_link(fb_db, fb_case)
    grade.feedback = "Orientación nueva, aún no autorizada para este enlace."
    await fb_db.flush()
    with pytest.raises(HTTPException) as exc:
        await guard_token(fb_db, credential)
    assert exc.value.status_code == 404
    assert grade.nota_confirmada == 3
    assert (await fb_db.get(FeedbackPublication, access.publication_id)).payload_json["retroalimentacion"] != grade.feedback


@pytest.mark.asyncio
async def test_preview_conflict_does_not_create_access(fb_db, fb_case):
    teacher, _, _, evaluation, grade = fb_case
    before = await fb_db.scalar(select(text("count(*)")).select_from(FeedbackAccess))
    with pytest.raises(HTTPException) as exc:
        await create_access(fb_db, teacher, evaluation.id, grade.id, "0" * 64, uuid4(), 3, False)
    assert exc.value.status_code == 409
    assert await fb_db.scalar(select(text("count(*)")).select_from(FeedbackAccess)) == before


@pytest.mark.asyncio
async def test_repeated_emission_keeps_one_access_without_returning_secret_again(fb_db, fb_case):
    teacher, _, _, evaluation, grade = fb_case
    projection = await preview_grade(fb_db, teacher, evaluation.id, grade.id)
    operation = uuid4()
    first, token = await create_access(fb_db, teacher, evaluation.id, grade.id, projection.fingerprint, operation, 3, False)
    repeated, no_token = await create_access(fb_db, teacher, evaluation.id, grade.id, projection.fingerprint, operation, 3, False)
    assert repeated.id == first.id and token and no_token is None


@pytest.mark.asyncio
async def test_existing_adjustment_suspends_in_same_transaction(fb_db, fb_case):
    from app.modules.calificaciones.schemas import AjustarNota
    from app.modules.calificaciones.service import ajustar_nota

    access, _ = await make_link(fb_db, fb_case)
    publication_id = access.publication_id
    await ajustar_nota(fb_db, fb_case[-1], AjustarNota(nota_confirmada=2, feedback="Nueva devolución docente."))
    publication = await fb_db.get(FeedbackPublication, publication_id, populate_existing=True)
    assert publication.state == "suspended"


@pytest.mark.asyncio
async def test_removed_enrollment_or_emitter_permission_blocks_read(fb_db, fb_case, monkeypatch):
    from app.modules.feedback_sharing import access_policy

    _, token = await make_link(fb_db, fb_case)

    async def denied(*args):
        return frozenset()

    monkeypatch.setattr(access_policy, "effective_permissions", denied)
    with pytest.raises(HTTPException) as exc:
        await guard_token(fb_db, token)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_removed_enrollment_blocks_read(fb_db, fb_case):
    from sqlalchemy import update
    from app.modules.matriculas.models import Matricula

    _, token = await make_link(fb_db, fb_case)
    await fb_db.execute(update(Matricula).where(Matricula.estudiante_id == fb_case[1].id).values(estado="retirado"))
    with pytest.raises(HTTPException) as exc:
        await guard_token(fb_db, token)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_emission_and_edit_serialize_on_grade_and_never_mix_revisions(fb_db, fb_case):
    from app.modules.calificaciones.models import Calificacion
    from app.modules.calificaciones.schemas import AjustarNota
    from app.modules.calificaciones.service import ajustar_nota

    teacher, _, _, evaluation, grade = fb_case
    grade_id = grade.id
    await fb_db.commit()
    access, token = await make_link(fb_db, fb_case)
    publication_id = access.publication_id
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)

    async def edit_in_other_transaction():
        async with sessions() as db:
            other_grade = await db.scalar(select(Calificacion).where(Calificacion.id == grade_id))
            # Cargar relación explícitamente evita lazy IO en el servicio actual.
            await db.refresh(other_grade, ["entrega"])
            await ajustar_nota(db, other_grade, AjustarNota(nota_confirmada=2, feedback="Corrección concurrente docente."))

    pending = asyncio.create_task(edit_in_other_transaction())
    try:
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(asyncio.shield(pending), timeout=0.2)
        await fb_db.commit()
        await asyncio.wait_for(pending, timeout=10)
        publication = await fb_db.get(FeedbackPublication, publication_id, populate_existing=True)
        assert publication.state == "suspended"
        with pytest.raises(HTTPException):
            await guard_token(fb_db, token)
        projection = await preview_grade(fb_db, teacher, evaluation.id, grade_id)
        assert projection.payload["nota"] == "2.00"
        assert publication.payload_json["nota"] == "3.00"
    finally:
        if not pending.done():
            pending.cancel()
            await asyncio.gather(pending, return_exceptions=True)
