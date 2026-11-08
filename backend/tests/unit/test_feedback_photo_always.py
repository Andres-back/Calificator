"""Spec 160: la foto acompaña la devolución sin que el docente marque nada."""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.modules.feedback_sharing import link_service, public_router, service


class Nested:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False


NOW = datetime(2026, 11, 8, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_new_publication_always_allows_the_photo():
    from app.db.base import import_models
    import_models()
    db = NS(scalar=AsyncMock(return_value=0), add=lambda value: None, flush=AsyncMock())
    grade = NS(id=uuid4(), estudiante_id=uuid4(), evaluacion_id=uuid4(), materia_id=uuid4())
    source = NS(grade=grade, breakdown=None, projection=NS(fingerprint='a' * 64, payload={}))
    publication = await service.new_publication(db, source, NS(id=uuid4()))
    assert publication.evidence_enabled is True


def copy_case(monkeypatch, *, enabled=False):
    access = NS(id=uuid4(), calificacion_id=uuid4(), state='active', expires_at=NOW + timedelta(days=2),
        credential_encrypted='sealed', credential_digest='digest')
    evaluation_id = uuid4()
    publication = NS(evaluacion_id=evaluation_id, evidence_enabled=enabled, revision=3, payload_json={'estudiante': 'Sintético'})
    db = NS(execute=AsyncMock(return_value=NS(all=lambda: [(access.id, access.calificacion_id)])), begin_nested=Nested)
    monkeypatch.setattr(link_service, 'authorize_evaluation', AsyncMock())
    monkeypatch.setattr(link_service, '_lock_managed_access', AsyncMock(return_value=(access, publication)))
    monkeypatch.setattr(link_service, 'db_now', AsyncMock(return_value=NOW))
    monkeypatch.setattr(link_service, 'guard_access', AsyncMock())
    monkeypatch.setattr(link_service, 'open_credential', lambda *_: 'token')
    audit = AsyncMock()
    monkeypatch.setattr(link_service, 'audit_control', audit)
    monkeypatch.setattr(service, 'audit_control', audit)
    return db, evaluation_id, access, publication


@pytest.mark.asyncio
async def test_copying_on_a_teacher_gesture_attaches_the_photo(monkeypatch):
    db, evaluation_id, access, publication = copy_case(monkeypatch)
    result = await link_service.copy_accesses(db, NS(id=uuid4()), evaluation_id, [access.id], adjuntar_evidencia=True)
    assert result['resultados'][0]['url'].endswith('#token')
    assert publication.evidence_enabled is True
    events = [call.args[1] for call in link_service.audit_control.await_args_list]
    assert 'evidence_attached' in events


@pytest.mark.asyncio
async def test_opening_the_panel_recovers_the_link_without_changing_it(monkeypatch):
    db, evaluation_id, access, publication = copy_case(monkeypatch)
    await link_service.copy_accesses(db, NS(id=uuid4()), evaluation_id, [access.id])
    assert publication.evidence_enabled is False


@pytest.mark.asyncio
async def test_copying_a_link_with_photo_does_not_record_it_again(monkeypatch):
    db, evaluation_id, access, _ = copy_case(monkeypatch, enabled=True)
    await link_service.copy_accesses(db, NS(id=uuid4()), evaluation_id, [access.id], adjuntar_evidencia=True)
    events = [call.args[1] for call in link_service.audit_control.await_args_list]
    assert 'evidence_attached' not in events


@pytest.mark.asyncio
async def test_a_closed_link_does_not_change_when_copied(monkeypatch):
    db, evaluation_id, access, publication = copy_case(monkeypatch)
    access.state = 'disabled'
    await link_service.copy_accesses(db, NS(id=uuid4()), evaluation_id, [access.id], adjuntar_evidencia=True)
    assert publication.evidence_enabled is False


@pytest.mark.asyncio
@pytest.mark.parametrize(('delivery', 'expected'), [
    (None, False),
    (NS(archivo_url=None), False),
    (NS(archivo_url=''), False),
    (NS(archivo_url='/uploads/foto.png'), True),
])
async def test_student_only_sees_the_photo_option_when_there_is_a_file(monkeypatch, delivery, expected):
    context = NS(publication=NS(payload_json={}, evidence_enabled=True), access=NS(expires_at=NOW), source=NS(delivery=delivery))
    monkeypatch.setattr(public_router, 'guard_token', AsyncMock(return_value=context))
    monkeypatch.setattr(public_router, 'quota_snapshot', AsyncMock(return_value={}))
    monkeypatch.setattr(public_router, 'db_now', AsyncMock(return_value=NOW))
    monkeypatch.setattr(public_router, 'conversation_scope', lambda _: 'scope')
    result = await public_router.read_feedback('credential', NS())
    assert result['evidencia_disponible'] is expected
