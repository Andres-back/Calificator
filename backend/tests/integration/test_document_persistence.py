"""Document contracts in an explicitly isolated PostgreSQL database only."""
from copy import deepcopy
from decimal import Decimal
import importlib.util
import json
from pathlib import Path
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import HTTPException
import pytest
from sqlalchemy import select, text

from app.core.config import settings
from app.modules.evaluaciones import service
from app.modules.evaluaciones.models import Evaluacion, EvaluacionContenidoVersion
from app.modules.evaluaciones.schemas import EvaluacionCreate, EvaluacionUpdate
from app.modules.evaluaciones.visual_service import content_hash
from app.modules.users.models import User
from tests.fixtures.document_structure import sample_document
from tests.integration.test_evaluation_visual_persistence import (
    database, visual_scope, legacy_evaluation, TEST_URL,
)

pytestmark = pytest.mark.skipif(not TEST_URL, reason='Requiere PostgreSQL aislado SPEC101_TEST_DATABASE_URL')
assert database and visual_scope


def document_payload(subject):
    document, questions = sample_document()
    return EvaluacionCreate(materia_id=subject, nombre='Jardín de preguntas', modalidad='fisica',
        criterios=[{'nombre': 'Comprensión', 'descripcion': 'Explica lo observado', 'peso': 100}],
        preguntas=questions, estructura_documento=document,
        respuestas_esperadas=[{'numero': q['numero'], 'respuesta': f'Referencia sintética {q["numero"]}'} for q in questions])


def migration():
    path = Path(__file__).parents[2] / 'alembic/versions/202610260001_evaluation_document_structure.py'
    spec = importlib.util.spec_from_file_location('spec130_migration', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.asyncio
async def test_additive_migration_keeps_legacy_records_and_snapshots(database):
    marker = [{'numero': 1, 'enunciado': 'Pregunta anterior', 'puntaje': '5'}]
    snapshot = {'preguntas': marker, 'nota_maxima': '5'}
    async with database.begin() as connection:
        await connection.execute(text('CREATE TABLE evaluaciones (id uuid PRIMARY KEY, preguntas jsonb)'))
        await connection.execute(text('CREATE TABLE evaluacion_contenido_versiones (snapshot_json jsonb, content_hash text)'))
        await connection.execute(text('INSERT INTO evaluaciones VALUES (:id,CAST(:q AS jsonb))'), {'id': uuid4(), 'q': json.dumps(marker)})
        await connection.execute(text('INSERT INTO evaluacion_contenido_versiones VALUES (CAST(:s AS jsonb),:h)'), {'s': json.dumps(snapshot), 'h': content_hash(snapshot)})
        def upgrade(sync):
            with Operations.context(MigrationContext.configure(sync)):
                migration().upgrade()
        await connection.run_sync(upgrade)
        row = (await connection.execute(text('SELECT preguntas,estructura_documento FROM evaluaciones'))).one()
        assert row.preguntas == marker and row.estructura_documento is None
        previous = (await connection.execute(text('SELECT snapshot_json,content_hash FROM evaluacion_contenido_versiones'))).one()
        assert previous.snapshot_json == snapshot and previous.content_hash == content_hash(snapshot)
    with pytest.raises(RuntimeError, match='Conservar'):
        migration().downgrade()


@pytest.mark.asyncio
async def test_text_document_has_initial_revision_without_fake_visual_manifest(visual_scope, monkeypatch):
    monkeypatch.setattr(settings, 'EVALUATION_DOCUMENT_STRUCTURE_ENABLED', True, raising=False)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        teacher = await db.get(User, owner)
        payload = document_payload(subject)
        evaluation = await service.create_evaluation(db, payload, teacher)
        assert evaluation.estructura_documento == payload.estructura_documento.model_dump(mode='json')
        revision = await db.get(EvaluacionContenidoVersion, evaluation.contenido_version_id)
        assert revision.numero_version == 1 and not revision.legacy_baseline
        assert revision.snapshot_json['estructura_documento'] == evaluation.estructura_documento
        assert revision.snapshot_json['contenido_visual'] is None
        assert revision.source_resource_id is None and revision.recurso_ids == []
        assert content_hash(revision.snapshot_json) == revision.content_hash
        identifier = evaluation.id
    async with sessions() as db:
        evaluation = await service.get_evaluation_or_404(db, identifier)
        public = service._student_safe_evaluation(evaluation)
        assert len(public['estructura_documento']['nodos']) == len(evaluation.estructura_documento['nodos'])
        assert 'revision' not in public['estructura_documento']
        assert 'Referencia sintética' not in str(public)


@pytest.mark.asyncio
async def test_text_edit_versions_content_and_never_mutates_previous_snapshot(visual_scope, monkeypatch):
    monkeypatch.setattr(settings, 'EVALUATION_DOCUMENT_STRUCTURE_ENABLED', True, raising=False)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        teacher = await db.get(User, owner)
        evaluation = await service.create_evaluation(db, document_payload(subject), teacher)
        previous = await db.get(EvaluacionContenidoVersion, evaluation.contenido_version_id)
        old_snapshot, old_hash = deepcopy(previous.snapshot_json), previous.content_hash
        document = deepcopy(evaluation.estructura_documento)
        document['nodos'][0]['titulo'] = 'Inicio corregido'
        updated = await service.update_evaluation(db, evaluation, EvaluacionUpdate(estructura_documento=document,
            expected_updated_at=evaluation.updated_at, expected_content_version_id=previous.id))
        current = await db.get(EvaluacionContenidoVersion, updated.contenido_version_id)
        assert current.id != previous.id and current.previous_version_id == previous.id
        assert current.snapshot_json['estructura_documento']['nodos'][0]['titulo'] == 'Inicio corregido'
        assert previous.snapshot_json == old_snapshot and previous.content_hash == old_hash
        assert updated.preguntas == old_snapshot['preguntas']
        assert updated.nota_maxima == Decimal('5')
        with pytest.raises(HTTPException) as conflict:
            await service.update_evaluation(db, updated, EvaluacionUpdate(estructura_documento=document,
                expected_updated_at=previous.created_at, expected_content_version_id=previous.id))
        assert conflict.value.status_code == 409
        await db.rollback()


@pytest.mark.asyncio
async def test_document_cannot_rewrite_legacy_evaluation_with_existing_delivery(visual_scope, monkeypatch):
    monkeypatch.setattr(settings, 'EVALUATION_DOCUMENT_STRUCTURE_ENABLED', True, raising=False)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        identifier, _, _ = await legacy_evaluation(db, owner, subject)
        evaluation = await service.get_evaluation_or_404(db, identifier)
        before = deepcopy(evaluation.preguntas)
        with pytest.raises(HTTPException) as rejected:
            await service.update_evaluation(db, evaluation, EvaluacionUpdate(
                estructura_documento=sample_document()[0], expected_updated_at=evaluation.updated_at))
        assert rejected.value.status_code == 409
        await db.rollback()
        preserved = await db.get(Evaluacion, identifier)
        assert preserved.estructura_documento is None and preserved.preguntas == before
        assert len(list(await db.scalars(select(EvaluacionContenidoVersion)))) == 0


@pytest.mark.asyncio
async def test_old_client_cannot_clear_or_orphan_document_references(visual_scope, monkeypatch):
    monkeypatch.setattr(settings, 'EVALUATION_DOCUMENT_STRUCTURE_ENABLED', True, raising=False)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        teacher = await db.get(User, owner)
        evaluation = await service.create_evaluation(db, document_payload(subject), teacher)
        identity, revision_id = evaluation.id, evaluation.contenido_version_id
        with pytest.raises(HTTPException) as rejected:
            await service.update_evaluation(db, evaluation, EvaluacionUpdate(estructura_documento=None,
                expected_updated_at=evaluation.updated_at, expected_content_version_id=revision_id))
        assert rejected.value.status_code == 422
        await db.rollback()
        evaluation = await service.get_evaluation_or_404(db, identity)
        with pytest.raises(HTTPException) as rejected:
            await service.update_evaluation(db, evaluation, EvaluacionUpdate(preguntas=evaluation.preguntas[:-1],
                expected_updated_at=evaluation.updated_at, expected_content_version_id=revision_id))
        assert rejected.value.status_code == 422
        await db.rollback()
        evaluation = await service.get_evaluation_or_404(db, identity)
        assert evaluation.contenido_version_id == revision_id and len(evaluation.preguntas) == 16


@pytest.mark.asyncio
async def test_section_budgets_compile_and_restore_in_new_immutable_versions(visual_scope, monkeypatch):
    from app.modules.evaluaciones.document_structure import compile_section_scores
    from app.modules.evaluaciones.document_schemas import EvaluationDocument
    from tests.unit.test_section_scoring import example
    monkeypatch.setattr(settings, 'EVALUATION_DOCUMENT_STRUCTURE_ENABLED', True)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        actor = await db.get(User, owner)
        document, questions, _ = example()
        raw = document.model_dump(mode='json'); raw['puntuacion_secciones'] = None
        raw['revision'].update(estado='completa', confirmado=True)
        evaluation = await service.create_evaluation(db, EvaluacionCreate(materia_id=subject, nombre='Reparto sintético',
            preguntas=questions, estructura_documento=raw, modalidad='fisica'), actor)
        old_id = evaluation.contenido_version_id
        original = deepcopy((await db.get(EvaluacionContenidoVersion, old_id)).snapshot_json)
        raw['puntuacion_secciones'] = document.model_dump(mode='json')['puntuacion_secciones']
        updated = await service.update_evaluation(db, evaluation, EvaluacionUpdate(estructura_documento=raw,
            confirmar_puntuacion_secciones=True, expected_updated_at=evaluation.updated_at, expected_content_version_id=old_id))
        assert [q['puntaje'] for q in updated.preguntas] == ['0.67', '0.67', '0.66', '1.00', '1.00', '1.00']
        assert updated.blueprint.preguntas == updated.preguntas
        assert (await db.get(EvaluacionContenidoVersion, old_id)).snapshot_json == original
        current = updated.contenido_version_id
        same_document = deepcopy(updated.estructura_documento)
        # A pure title edit requires document review, not a new arithmetic confirmation.
        same_document['nodos'][0]['titulo'] = 'Título corregido'
        updated = await service.update_evaluation(db, updated, EvaluacionUpdate(estructura_documento=same_document,
            expected_updated_at=updated.updated_at, expected_content_version_id=current))
        assert compile_section_scores(EvaluationDocument.model_validate(updated.estructura_documento), updated.preguntas, 5) == updated.preguntas
        raw = deepcopy(updated.estructura_documento); raw['puntuacion_secciones'] = None
        restored = await service.update_evaluation(db, updated, EvaluacionUpdate(estructura_documento=raw,
            confirmar_puntuacion_secciones=True, expected_updated_at=updated.updated_at, expected_content_version_id=updated.contenido_version_id))
        assert [Decimal(str(q['puntaje'])) for q in restored.preguntas] == [Decimal(str(q['puntaje'])) for q in questions]
