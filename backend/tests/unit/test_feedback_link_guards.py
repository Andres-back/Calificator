"""Optional reentry guards preserve old receipts without using a database."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app.modules.feedback_sharing import service
from app.modules.feedback_sharing.projection import digest
from app.modules.feedback_sharing.schemas import AccessCreate, ReactivateInput


def inputs():
    return dict(request_id=uuid4(), selecciones=[dict(calificacion_id=uuid4(), fingerprint='a' * 64)])


def test_optional_flags_default_to_false_and_accept_only_real_booleans():
    creation = inputs()
    reactivation = dict(request_id=uuid4(), expected_version=1, fingerprint='a' * 64)
    assert AccessCreate(**creation).solo_si_falta is False
    assert ReactivateInput(**reactivation).mantener_vencimiento is False
    assert AccessCreate(**creation, solo_si_falta=True).solo_si_falta is True
    assert ReactivateInput(**reactivation, mantener_vencimiento=True).mantener_vencimiento is True
    for value in ('true', 'false', 0, 1, None):
        with pytest.raises(ValueError):
            AccessCreate(**creation, solo_si_falta=value)
        with pytest.raises(ValueError):
            ReactivateInput(**reactivation, mantener_vencimiento=value)


@pytest.fixture
def guarded(monkeypatch):
    now = datetime(2026, 10, 31, tzinfo=timezone.utc)
    actor = NS(id=uuid4())
    grade = NS(id=uuid4())
    source = NS(grade=grade, evaluation=NS(id=uuid4()), projection=NS(fingerprint='a' * 64))
    publication = NS(id=uuid4(), revision=1, state='authorized', evidence_enabled=False)
    access = NS(id=uuid4(), calificacion_id=grade.id, publication_id=publication.id,
        state='active', disabled_at=None, expires_at=now + timedelta(days=2),
        version=1, credential_generation=1, credential_digest='unchanged',
        credential_encrypted='synthetic-copy', operations_json={})
    db = NS(scalar=AsyncMock(return_value=None),
        scalars=AsyncMock(return_value=NS(all=lambda: [access])),
        flush=AsyncMock(), add=lambda value: None)
    monkeypatch.setattr(service, 'enabled', lambda: None)
    monkeypatch.setattr(service, 'load_source', AsyncMock(return_value=source))
    monkeypatch.setattr(service, 'authorize_teacher', AsyncMock())
    monkeypatch.setattr(service, 'db_now', AsyncMock(return_value=now))
    monkeypatch.setattr(service, 'guard_access', AsyncMock(return_value=NS(publication=publication)), raising=False)
    monkeypatch.setattr(service, 'new_publication', AsyncMock(return_value=NS(id=uuid4(), revision=2)))
    monkeypatch.setattr(service, 'audit_control', AsyncMock())
    monkeypatch.setattr(service, '_lock_managed_access', AsyncMock(return_value=(access, publication)))
    monkeypatch.setattr(service, 'seal_credential', lambda value: 'synthetic-encrypted')
    return db, actor, source, access, publication, now


async def create(case, request_id, *, days=3, evidence=False, only=True):
    db, actor, source, *_ = case
    return await service.create_access(db, actor, source.evaluation.id, source.grade.id,
        source.projection.fingerprint, request_id, days, evidence, solo_si_falta=only)


@pytest.mark.asyncio
async def test_reentry_reuses_unique_access_and_records_request_without_extending(guarded):
    db, actor, source, access, _, _ = guarded
    original = deepcopy(vars(access))
    request = uuid4()
    result, token = await create(guarded, request, days=10)
    assert result is access and token is None
    assert access.expires_at == original['expires_at']
    assert access.version == original['version'] and access.credential_generation == original['credential_generation']
    assert access.credential_encrypted == original['credential_encrypted']
    assert access.operations_json
    service.new_publication.assert_not_awaited()
    service.load_source.assert_awaited_once_with(db, source.grade.id, lock=True)
    again, token = await create(guarded, request, days=10)
    assert again is access and token is None
    assert str(request) in str(access.operations_json) and str(actor.id) in str(access.operations_json)


@pytest.mark.asyncio
@pytest.mark.parametrize('change', ['days', 'evidence', 'flag'])
async def test_reused_request_receipt_rejects_different_options(guarded, change):
    request = uuid4()
    await create(guarded, request)
    kwargs = {'days': 4} if change == 'days' else {'evidence': True} if change == 'evidence' else {'only': False}
    with pytest.raises(HTTPException) as exc:
        await create(guarded, request, **kwargs)
    assert exc.value.status_code == 409
    service.new_publication.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize('kind', ['disabled', 'revoked', 'expired', 'suspended', 'evidence', 'multiple'])
async def test_reentry_never_creates_around_an_existing_conflict(guarded, kind):
    db, _, _, access, publication, now = guarded
    if kind == 'disabled':
        access.state = 'disabled'
    elif kind == 'revoked':
        access.disabled_at = now
    elif kind == 'expired':
        access.expires_at = now
    elif kind == 'suspended':
        service.guard_access.side_effect = HTTPException(404, 'Unavailable')
    elif kind == 'evidence':
        publication.evidence_enabled = True
    elif kind == 'multiple':
        second = NS(**{**vars(access), 'id': uuid4()})
        db.scalars.return_value = NS(all=lambda: [access, second])
    with pytest.raises(HTTPException) as exc:
        await create(guarded, uuid4())
    assert exc.value.status_code == 409
    service.new_publication.assert_not_awaited()
    assert not access.operations_json


@pytest.mark.asyncio
async def test_no_access_creates_with_flag_bound_to_new_receipt(guarded):
    from app.db.base import import_models
    import_models()
    db, _, source, _, _, _ = guarded
    db.scalars.return_value = NS(all=lambda: [])
    created, token = await create(guarded, uuid4())
    assert token and created.operations_json['creation'] == digest([str(source.grade.id), 'a' * 64, 3, False, True])
    assert created.expires_at == guarded[-1] + timedelta(days=3)
    service.new_publication.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize('explicit_false', [False, True])
async def test_legacy_creation_receipt_keeps_exact_old_digest(guarded, explicit_false):
    db, actor, source, access, _, _ = guarded
    access.operations_json = {'creation': digest([str(source.grade.id), 'a' * 64, 3, False])}
    db.scalar.return_value = access
    args = (db, actor, source.evaluation.id, source.grade.id, 'a' * 64, uuid4(), 3, False)
    result, token = await service.create_access(*args, **({'solo_si_falta': False} if explicit_false else {}))
    assert result is access and token is None
    service.new_publication.assert_not_awaited()
    with pytest.raises(HTTPException) as exc:
        await service.create_access(*args, solo_si_falta=True)
    assert exc.value.status_code == 409


def reactivate_payload(**kwargs):
    return ReactivateInput(request_id=uuid4(), expected_version=1, fingerprint='a' * 64, **kwargs)


@pytest.mark.asyncio
async def test_preserve_expiration_requires_real_suspension_and_keeps_credential(guarded):
    _, _, _, access, publication, _ = guarded
    publication.state = 'suspended'
    before = deepcopy(vars(access))
    payload = reactivate_payload(mantener_vencimiento=True, duracion_dias=30)
    result, token = await service.manage_access(guarded[0], guarded[1], access.id, 'reactivate', payload)
    assert result is access and token is None
    for key in ('expires_at', 'credential_digest', 'credential_encrypted', 'credential_generation'):
        assert getattr(access, key) == before[key]
    assert access.version == 2 and access.publication_id != before['publication_id']
    await service.manage_access(guarded[0], guarded[1], access.id, 'reactivate', payload)
    assert access.version == 2 and access.expires_at == before['expires_at']
    service.new_publication.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize('kind', ['authorized', 'disabled', 'revoked', 'expired', 'suspended_access', 'fingerprint', 'version', 'permission'])
async def test_preserve_expiration_rejects_closed_or_not_actually_suspended(guarded, kind):
    db, actor, source, access, publication, now = guarded
    publication.state = 'suspended'
    if kind == 'authorized':
        publication.state = 'authorized'
    elif kind == 'disabled':
        access.state = 'disabled'
    elif kind == 'revoked':
        access.disabled_at = now
    elif kind == 'expired':
        access.expires_at = now
    elif kind == 'suspended_access':
        access.state = 'suspended'
    elif kind == 'fingerprint':
        source.projection.fingerprint = 'b' * 64
    elif kind == 'version':
        access.version = 2
    elif kind == 'permission':
        service.authorize_teacher.side_effect = HTTPException(403, 'No permission')
    before = deepcopy(vars(access))
    with pytest.raises(HTTPException) as exc:
        await service.manage_access(db, actor, access.id, 'reactivate', reactivate_payload(mantener_vencimiento=True))
    assert exc.value.status_code in {403, 409}
    assert vars(access) == before
    service.new_publication.assert_not_awaited()


@pytest.mark.asyncio
async def test_legacy_reactivation_receipt_does_not_gain_default_field(guarded):
    db, actor, _, access, _, _ = guarded
    old_body = dict(expected_version=1, request_id=str(uuid4()), duracion_dias=3, fingerprint='a' * 64, evidencia=False)
    payload = ReactivateInput(**old_body)
    access.operations_json = {old_body['request_id']: digest(['reactivate', old_body])}
    original = deepcopy(vars(access))
    result, token = await service.manage_access(db, actor, access.id, 'reactivate', payload)
    assert result is access and token is None and vars(access) == original
    different = ReactivateInput(**old_body, mantener_vencimiento=True)
    with pytest.raises(HTTPException) as exc:
        await service.manage_access(db, actor, access.id, 'reactivate', different)
    assert exc.value.status_code == 409
