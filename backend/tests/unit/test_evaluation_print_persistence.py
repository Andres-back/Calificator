from copy import deepcopy
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.evaluaciones import print_service
from app.modules.evaluaciones.print_settings import PrintSettings
from app.db.base import import_models

import_models()


@pytest.mark.asyncio
async def test_legacy_print_save_never_creates_content_or_changes_questions():
    timestamp = datetime.now(timezone.utc)
    item = SimpleNamespace(id=uuid4(), profesor_id=uuid4(), updated_at=timestamp,
        contenido_version_id=None, configuracion_impresion=None, preguntas=[{'numero': 1}])
    before = deepcopy(item.preguntas)
    db = SimpleNamespace(scalar=AsyncMock(return_value=item), add=lambda _: pytest.fail('No legacy revision'), flush=AsyncMock())
    await print_service.set_print_settings(db, item.id, PrintSettings(),
        expected_updated_at=timestamp, expected_version_id=None, actor_id=item.profesor_id)
    assert item.contenido_version_id is None and item.preguntas == before
    assert item.configuracion_impresion['distribucion'] == 'compacta'


@pytest.mark.asyncio
async def test_stale_print_edit_is_rejected_before_any_write():
    timestamp = datetime.now(timezone.utc)
    item = SimpleNamespace(id=uuid4(), updated_at=timestamp, contenido_version_id=uuid4(), configuracion_impresion=None)
    db = SimpleNamespace(scalar=AsyncMock(return_value=item), add=lambda _: pytest.fail('Stale write'), flush=AsyncMock())
    with pytest.raises(HTTPException) as failure:
        await print_service.set_print_settings(db, item.id, PrintSettings(),
            expected_updated_at=timestamp, expected_version_id=None, actor_id=uuid4())
    assert failure.value.status_code == 409
    assert item.configuracion_impresion is None


@pytest.mark.asyncio
async def test_versioned_print_save_copies_snapshot_including_legacy_without_manifest(monkeypatch):
    timestamp = datetime.now(timezone.utc)
    owner = uuid4()
    snapshot = {'preguntas': [{'numero': 1}], 'respuestas_esperadas': [{'numero': 1, 'respuesta': 'A'}],
        'claves_pendientes_revision': ['keep'], 'contenido_visual': None}
    previous = SimpleNamespace(id=uuid4(), numero_version=2, snapshot_json=snapshot,
        source_resource_id=None, recurso_ids=[], coverage_json={}, legacy_baseline=True)
    original = deepcopy(snapshot)
    item = SimpleNamespace(id=uuid4(), profesor_id=owner, updated_at=timestamp,
        contenido_version_id=previous.id, configuracion_impresion=None, preguntas=snapshot['preguntas'])
    revisions = []
    async def flush():
        for revision in revisions:
            revision.id = revision.id or uuid4()
    db = SimpleNamespace(scalar=AsyncMock(return_value=item), add=revisions.append, flush=flush)
    monkeypatch.setattr(print_service, 'get_content_revision', AsyncMock(return_value=previous))
    await print_service.set_print_settings(db, item.id, PrintSettings(distribucion='amplia'),
        expected_updated_at=timestamp, expected_version_id=previous.id, actor_id=owner)
    assert snapshot == original
    assert len(revisions) == 1
    current = deepcopy(revisions[0].snapshot_json)
    assert current.pop('configuracion_impresion')['distribucion'] == 'amplia'
    assert current == original
    assert revisions[0].recurso_ids == []
