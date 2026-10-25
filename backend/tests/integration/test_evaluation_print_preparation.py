"""Private jobs with real PostgreSQL, fake renderer and no inference."""
from copy import deepcopy
from unittest.mock import AsyncMock

from fastapi import HTTPException
import pytest
from sqlalchemy import text

from tests.integration.test_evaluation_print_settings import TEST_URL
from tests.integration import test_evaluation_print_settings as fixtures
from app.modules.evaluaciones import print_preparation as printing
from app.modules.jobs import service as jobs

database = fixtures.database
print_scope = fixtures.print_scope
pytestmark = pytest.mark.skipif(not TEST_URL, reason='Requires isolated PostgreSQL')


@pytest.mark.asyncio
async def test_deduplication_bounded_render_no_saves_and_private_download(print_scope, monkeypatch, tmp_path):
    from app.core.config import settings
    from app.modules.authorization import service as authorization
    db, teacher, student, subject, evaluation = print_scope
    monkeypatch.setattr(settings, 'UPLOADS_DIR', str(tmp_path))
    teacher._effective_permissions = frozenset({'evaluations.update'})
    monkeypatch.setattr(authorization, 'effective_permissions', AsyncMock(return_value=teacher._effective_permissions))
    dispatched = []
    monkeypatch.setattr(jobs, 'dispatch_persisted_job', lambda value: dispatched.append(value))
    render_calls = []
    def render(material):
        render_calls.append(deepcopy(material))
        return b'%PDF-1.4 synthetic test only', 3
    monkeypatch.setattr(printing, 'render_candidate', render)
    request = printing.PrintPreparationRequest(evaluacion_id=evaluation.id, expected_updated_at=evaluation.updated_at,
        configuracion={'distribucion': 'amplia', 'meta_paginas': 1},
        borrador={'preguntas': evaluation.preguntas, 'lectura': 'Draft reading stays private.'})
    first = await printing.create_preparation(db, teacher, request)
    assert await printing.create_preparation(db, teacher, request) == first
    assert len(dispatched) == 1
    job = first['job_id']
    await db.execute(text("UPDATE ai_jobs SET estado='running',claim_token='test-owner' WHERE id=:id"), {'id': job})
    await db.commit()
    await printing.prepare_job(db, job, 'test-owner')
    assert 1 <= len(render_calls) <= 4
    assert all(value['contenido_json']['texto'] == 'Draft reading stays private.' for value in render_calls)
    assert all('respuesta_correcta' not in question for value in render_calls for question in value['contenido_json']['preguntas'])
    result = await jobs.get_job_result(db, job)
    assert result['paginas_reales'] == 3 and result['meta_alcanzada'] is False and result['advertencias']
    from app.modules.jobs.router import _public_result
    assert '_file_key' not in _public_result(result) and '_print_renders' not in _public_result(result)
    assert await printing.download_preparation(db, teacher, job) == b'%PDF-1.4 synthetic test only'
    with pytest.raises(HTTPException) as denied:
        await printing.download_preparation(db, student, job)
    assert denied.value.status_code == 404
    await db.refresh(evaluation)
    assert evaluation.configuracion_impresion is None and evaluation.contenido_version_id is None
    assert evaluation.lectura is None
    # A subsequent academic edit invalidates the proposal instead of mixing bases.
    evaluation.nombre = 'Changed by another tab'
    await db.commit()
    with pytest.raises(HTTPException) as stale:
        await printing.download_preparation(db, teacher, job)
    assert stale.value.status_code == 409


@pytest.mark.asyncio
async def test_cancel_expiry_and_restart_budget(print_scope, monkeypatch, tmp_path):
    from app.core.config import settings
    db, teacher, student, subject, evaluation = print_scope
    monkeypatch.setattr(settings, 'UPLOADS_DIR', str(tmp_path))
    teacher._effective_permissions = frozenset({'evaluations.update'})
    request = printing.PrintPreparationRequest(evaluacion_id=evaluation.id, expected_updated_at=evaluation.updated_at, configuracion={})
    job = await jobs.create_job(db, user_id=teacher.id, tipo=printing.JOB_TYPE, input_json={'request': request.model_dump(mode='json')})
    await db.execute(text("UPDATE ai_jobs SET estado='running',claim_token='first' WHERE id=:id"), {'id': job})
    await db.commit()
    for _ in range(3):
        await printing.reserve_render(db, job, 'first')
    await db.execute(text("UPDATE ai_jobs SET claim_token='second' WHERE id=:id"), {'id': job})
    await db.commit()
    await printing.reserve_render(db, job, 'second')
    with pytest.raises(ValueError):
        await printing.reserve_render(db, job, 'second')
    assert (await jobs.get_job_result(db, job))['_print_renders'] == 4
    await db.execute(text("UPDATE ai_jobs SET estado='cancelled' WHERE id=:id"), {'id': job})
    await db.commit()
    with pytest.raises(ValueError):
        await printing.reserve_render(db, job, 'second')
    with pytest.raises(HTTPException) as cancelled:
        await printing.download_preparation(db, teacher, job)
    assert cancelled.value.status_code == 409
    await db.execute(text("UPDATE ai_jobs SET created_at=NOW()-INTERVAL '25 hours' WHERE id=:id"), {'id': job})
    await db.commit()
    with pytest.raises(HTTPException) as expired:
        await printing.download_preparation(db, teacher, job)
    assert expired.value.status_code == 410
    from app.services.storage_service import resolve_private_upload_path
    from datetime import datetime, timedelta, timezone
    import os
    folder = resolve_private_upload_path('.private/impresion')
    folder.mkdir(parents=True, exist_ok=True)
    orphan = folder / ('a' * 32 + '.pdf')
    recent = folder / ('b' * 32 + '.pdf')
    other = tmp_path / 'public-original.png'
    for path in (orphan, recent, other):
        path.write_bytes(b'synthetic')
    before = (datetime.now(timezone.utc) - timedelta(hours=25)).timestamp()
    os.utime(orphan, (before, before))
    await printing.cleanup(db)
    assert not orphan.exists() and recent.exists() and other.exists()
