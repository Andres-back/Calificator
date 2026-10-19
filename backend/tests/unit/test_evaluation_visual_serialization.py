"""Private originals and drafts never enter the student read contract."""
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from app.modules.evaluaciones import visual_serialization
from app.modules.evaluaciones.schemas import EvaluacionRead
from tests.unit.test_evaluation_visual_contract import manifest_payload


@pytest.mark.asyncio
async def test_teacher_reads_full_revision_but_student_only_confirmed_ready_material(monkeypatch):
    payload = manifest_payload()
    private = deepcopy(payload['bloques'][0])
    private.update(id=str(uuid4()), orden=1, seguridad_contenido='privado_original')
    payload['bloques'].append(private)
    revision = SimpleNamespace(snapshot_json={'contenido_visual': payload})
    monkeypatch.setattr(visual_serialization, 'get_content_revision', AsyncMock(return_value=revision))
    evaluation = SimpleNamespace(id=uuid4(), contenido_version_id=uuid4())
    before = deepcopy(payload)
    db = SimpleNamespace(scalars=AsyncMock(return_value=[SimpleNamespace(
        id=UUID(payload['recurso_ids'][0]), evaluacion_id=evaluation.id, estado='ready',
        clase='tabla', seguridad_contenido='publicable_confirmado',
    )]))
    teacher = await visual_serialization.visual_read_fields(db, evaluation, student=False)
    student = await visual_serialization.visual_read_fields(db, evaluation, student=True)
    assert teacher['contenido_visual']['original_recurso_id'] == payload['original_recurso_id']
    assert len(student['contenido_visual']['bloques']) == 1
    assert set(student['contenido_visual']) == {'schema_version', 'bloques'}
    assert 'procedencia' not in student['contenido_visual']['bloques'][0]
    assert payload == before
    db.scalars.return_value[0].seguridad_contenido = 'privado_original'
    assert not (await visual_serialization.visual_read_fields(db, evaluation, student=True))['contenido_visual']['bloques']


@pytest.mark.asyncio
async def test_text_only_evaluation_needs_no_visual_query():
    db = SimpleNamespace(scalars=AsyncMock())
    assert await visual_serialization.visual_read_fields(db, SimpleNamespace(contenido_version_id=None), student=False) == {}
    db.scalars.assert_not_called()


def test_response_schema_keeps_visual_version_and_rejects_private_student_projection():
    assert 'contenido_visual' in EvaluacionRead.model_fields
    assert 'contenido_version_id' in EvaluacionRead.model_fields
