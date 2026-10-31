"""Synthetic PostgreSQL contracts for guarded creation and reauthorization."""
import asyncio
from datetime import timedelta
from uuid import uuid4

from fastapi import HTTPException
import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.modules.feedback_sharing.access_policy import db_now, guard_token
from app.modules.feedback_sharing.invalidations import suspend_grade_publications
from app.modules.feedback_sharing.link_service import copy_accesses
from app.modules.feedback_sharing.models import FeedbackAccess, FeedbackPublication
from app.modules.feedback_sharing.projection import digest
from app.modules.feedback_sharing.quota_service import accept_question
from app.modules.feedback_sharing.schemas import QuestionInput, ReactivateInput
from app.modules.feedback_sharing.service import create_access, manage_access, preview_grade
from app.modules.users.models import User


@pytest.fixture(autouse=True)
def feature_on(monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED', True)


async def issue(db, case, *, request=None, days=3, evidence=False, only=False):
    actor, _, _, evaluation, grade = case
    projection = await preview_grade(db, actor, evaluation.id, grade.id)
    access, token = await create_access(db, actor, evaluation.id, grade.id,
        projection.fingerprint, request or uuid4(), days, evidence, solo_si_falta=only)
    return access, token, projection


async def count_accesses(db, grade_id):
    return await db.scalar(select(func.count()).select_from(FeedbackAccess).where(FeedbackAccess.calificacion_id == grade_id))


@pytest.mark.asyncio
async def test_new_session_reuses_same_saved_link_and_receipt_preserves_options(fb_db, fb_case):
    access, token, projection = await issue(fb_db, fb_case, days=2)
    access_id, expiration, original_request = access.id, access.expires_at, access.creation_request_id
    grade_before = await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'), {'id': fb_case[-1].id})
    request = uuid4()
    actor_id, evaluation_id, grade_id = fb_case[0].id, fb_case[-2].id, fb_case[-1].id
    await fb_db.commit()
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)
    async with sessions() as other:
        actor = await other.get(User, actor_id)
        reused, secret = await create_access(other, actor, evaluation_id, grade_id, projection.fingerprint,
            request, 30, False, solo_si_falta=True)
        assert reused.id == access_id and reused.expires_at == expiration and secret is None
        assert reused.creation_request_id == original_request and reused.credential_generation == 1
        await other.commit()
    async with sessions() as reentered:
        actor = await reentered.get(User, actor_id)
        repeated, secret = await create_access(reentered, actor, evaluation_id, grade_id, projection.fingerprint,
            request, 30, False, solo_si_falta=True)
        assert repeated.id == access_id and secret is None
        for days, evidence, only in [(3, False, True), (30, True, True), (30, False, False)]:
            with pytest.raises(HTTPException) as exc:
                await create_access(reentered, actor, evaluation_id, grade_id, projection.fingerprint,
                    request, days, evidence, solo_si_falta=only)
            assert exc.value.status_code == 409
        copied = await copy_accesses(reentered, actor, evaluation_id, [access_id])
        assert copied['resultados'][0]['url'].endswith('#' + token)
        assert copied['resultados'][0]['expires_at'] == expiration.isoformat()
        assert await count_accesses(reentered, grade_id) == 1
        assert await reentered.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'), {'id': grade_id}) == grade_before


@pytest.mark.asyncio
async def test_concurrent_devices_create_only_one_access_with_different_requests(fb_db, fb_case):
    actor_id, evaluation_id, grade_id = fb_case[0].id, fb_case[-2].id, fb_case[-1].id
    projection = await preview_grade(fb_db, fb_case[0], evaluation_id, grade_id)
    await fb_db.commit()
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)

    async def generate():
        async with sessions() as db:
            actor = await db.get(User, actor_id)
            access, token = await create_access(db, actor, evaluation_id, grade_id, projection.fingerprint,
                uuid4(), 3, False, solo_si_falta=True)
            await db.commit()
            return access.id, access.expires_at, token is not None

    first, second = await asyncio.wait_for(asyncio.gather(generate(), generate()), timeout=10)
    assert first[:2] == second[:2]
    assert sorted([first[2], second[2]]) == [False, True]
    assert await count_accesses(fb_db, grade_id) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize('kind', ['disabled', 'expired', 'suspended', 'evidence', 'multiple'])
async def test_guard_never_creates_around_closed_incompatible_or_multiple_links(fb_db, fb_case, kind):
    access, _, _ = await issue(fb_db, fb_case)
    if kind == 'disabled':
        access.state = 'disabled'
        access.disabled_at = await db_now(fb_db)
    elif kind == 'expired':
        access.expires_at = await db_now(fb_db) - timedelta(seconds=1)
    elif kind == 'suspended':
        await suspend_grade_publications(fb_db, fb_case[-1].id)
    elif kind == 'multiple':
        await issue(fb_db, fb_case)
    before = await count_accesses(fb_db, fb_case[-1].id)
    with pytest.raises(HTTPException) as exc:
        await issue(fb_db, fb_case, only=True, evidence=kind == 'evidence')
    assert exc.value.status_code == 409
    assert await count_accesses(fb_db, fb_case[-1].id) == before


@pytest.mark.asyncio
async def test_creation_legacy_digest_retries_and_flag_changes_are_not_equivalent(fb_db, fb_case):
    request = uuid4()
    access, _, projection = await issue(fb_db, fb_case, request=request)
    assert access.operations_json['creation'] == digest([str(fb_case[-1].id), projection.fingerprint, 3, False])
    repeated, token, _ = await issue(fb_db, fb_case, request=request)
    assert repeated.id == access.id and token is None
    with pytest.raises(HTTPException) as exc:
        await issue(fb_db, fb_case, request=request, only=True)
    assert exc.value.status_code == 409 and await count_accesses(fb_db, fb_case[-1].id) == 1


@pytest.mark.asyncio
async def test_actual_suspension_reapproval_preserves_link_expiration_and_quota(fb_db, fb_case):
    access, token, _ = await issue(fb_db, fb_case)
    original_publication = access.publication_id
    expiration, credential, generation = access.expires_at, access.credential_digest, access.credential_generation
    for _ in range(5):
        await accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje='¿Cómo puedo mejorar?'))
    fb_case[-1].feedback = 'Revisa el segundo párrafo y explica la emoción del personaje con una frase del texto.'
    await suspend_grade_publications(fb_db, fb_case[-1].id)
    await fb_db.flush()
    projection = await preview_grade(fb_db, fb_case[0], fb_case[-2].id, fb_case[-1].id)
    grade_before = await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'), {'id': fb_case[-1].id})
    payload = ReactivateInput(expected_version=1, request_id=uuid4(), fingerprint=projection.fingerprint,
        mantener_vencimiento=True, duracion_dias=30)
    restored, secret = await manage_access(fb_db, fb_case[0], access.id, 'reactivate', payload)
    assert secret is None and restored.publication_id != original_publication
    assert (restored.expires_at, restored.credential_digest, restored.credential_generation) == (expiration, credential, generation)
    assert (await guard_token(fb_db, token)).publication.content_fingerprint == projection.fingerprint
    assert (await fb_db.get(FeedbackPublication, original_publication)).state == 'suspended'
    await manage_access(fb_db, fb_case[0], access.id, 'reactivate', payload)
    assert restored.version == 2 and restored.expires_at == expiration
    with pytest.raises(HTTPException) as full:
        await accept_question(fb_db, token, QuestionInput(request_id=uuid4(), mensaje='Sexta pregunta'))
    assert full.value.status_code == 429
    assert await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'), {'id': fb_case[-1].id}) == grade_before


@pytest.mark.asyncio
@pytest.mark.parametrize('kind', ['authorized', 'disabled', 'expired', 'suspended_access'])
async def test_preserve_expiration_cannot_reopen_closed_or_projected_suspension(fb_db, fb_case, kind):
    access, token, projection = await issue(fb_db, fb_case)
    if kind != 'authorized':
        await suspend_grade_publications(fb_db, fb_case[-1].id)
    if kind == 'disabled':
        access.state = 'disabled'
        access.disabled_at = await db_now(fb_db)
    elif kind == 'expired':
        access.expires_at = await db_now(fb_db) - timedelta(seconds=1)
    elif kind == 'suspended_access':
        access.state = 'suspended'
    await fb_db.flush()
    original = (access.version, access.publication_id, access.expires_at, access.state)
    with pytest.raises(HTTPException) as exc:
        await manage_access(fb_db, fb_case[0], access.id, 'reactivate', ReactivateInput(
            expected_version=1, request_id=uuid4(), fingerprint=projection.fingerprint, mantener_vencimiento=True))
    assert exc.value.status_code == 409
    assert (access.version, access.publication_id, access.expires_at, access.state) == original
    if kind != 'authorized':
        with pytest.raises(HTTPException):
            await guard_token(fb_db, token)


@pytest.mark.asyncio
async def test_http_guard_option_reuses_and_copy_still_uses_authorized_endpoint(fb_client):
    client, identity, case = fb_client
    prefix = f'/api/evaluaciones/{case[-2].id}/devoluciones'
    projection = (await client.post(prefix + '/previsualizar', json={'calificacion_ids': [str(case[-1].id)]})).json()['resultados'][0]
    body = {'request_id': str(uuid4()), 'selecciones': [{'calificacion_id': str(case[-1].id), 'fingerprint': projection['fingerprint']}],
        'duracion_dias': 2, 'solo_si_falta': True}
    first = (await client.post(prefix + '/accesos', json=body)).json()['resultados'][0]
    body.update(request_id=str(uuid4()), duracion_dias=30)
    reused = (await client.post(prefix + '/accesos', json=body)).json()['resultados'][0]
    assert reused['id'] == first['id'] and reused['expires_at'] == first['expires_at']
    assert reused['url'] is None and reused['credential_available'] is False
    copied = (await client.post(prefix + '/accesos/copiar', json={'access_ids': [reused['id']]})).json()['resultados'][0]
    assert copied['url'] == first['url']
    identity['user'] = case[1]
    assert (await client.post(prefix + '/accesos', json=body)).status_code == 403
