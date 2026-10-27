"""Synthetic source recovery in a dedicated random PostgreSQL test schema."""
from copy import deepcopy
import json
from uuid import UUID, uuid4
from unittest.mock import AsyncMock

from fastapi import HTTPException
import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from spec128_database import database128  # noqa: F401
from app.core.config import settings
from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.calificaciones.models import Entrega, Calificacion
from app.modules.evaluaciones import copy_service as copying, document_recovery as recovery
from app.modules.evaluaciones.copy_schemas import CopyRequest
from app.modules.evaluaciones.models import Evaluacion, EvaluacionContenidoVersion
from app.modules.jobs import service as jobs
from app.modules.materias.models import Materia
from app.modules.users.models import User


async def seed(db, monkeypatch):
    monkeypatch.setattr(settings, 'EVALUATION_DOCUMENT_STRUCTURE_ENABLED', True)
    monkeypatch.setattr(jobs, 'dispatch_persisted_job', lambda _: True)
    async def no_ai(*args, **kwargs):
        raise AssertionError('Document recovery never calls AI')
    monkeypatch.setattr(jobs, '_resolve_job_ai_config', no_ai)
    actor = User(nombre='Docente sintético', email=f'{uuid4()}@example.test', password_hash='no-login', rol='profesor')
    student = User(nombre='Alumno sintético', email=f'{uuid4()}@example.test', password_hash='no-login', rol='estudiante')
    db.add_all([actor, student]); await db.flush()
    actor._effective_permissions = default_permissions_for_role('profesor')
    subject = Materia(profesor_id=actor.id, nombre='Ciencias', codigo_matricula=uuid4().hex[:12])
    db.add(subject); await db.flush()
    evaluation = Evaluacion(materia_id=subject.id, profesor_id=actor.id, nombre='Semillas', estado='publicada', modalidad='fisica', nota_maxima=5,
        tipo_origen='externa_digitalizada', preguntas=[{'numero': 1, 'tipo': 'abierta', 'enunciado': '¿Qué necesita la semilla?', 'puntaje': 5}],
        respuestas_esperadas=[{'numero': 1, 'respuesta': 'Clave privada sintética'}], criterios=[])
    db.add(evaluation); await db.flush()
    delivery = Entrega(evaluacion_id=evaluation.id, materia_id=subject.id, estudiante_id=student.id, tipo='foto', estado='revisada', respuesta_texto='EVIDENCE_MUST_STAY')
    db.add(delivery); await db.flush()
    db.add(Calificacion(evaluacion_id=evaluation.id, entrega_id=delivery.id, materia_id=subject.id, profesor_id=actor.id,
        estudiante_id=student.id, estado='publicada', nota_confirmada=4))
    job_id = uuid4()
    await db.execute(text("INSERT INTO ai_jobs(id,user_id,tipo,estado,input_json,resultado_json) VALUES (:id,:actor,'evaluacion_digitalizacion','success',CAST(:input AS jsonb),CAST(:result AS jsonb))"),
        {'id': job_id, 'actor': actor.id, 'input': json.dumps({'materia_id': str(subject.id), '_private_secret': 'NEVER_RETURN'}),
         'result': json.dumps({'evaluacion_id': str(evaluation.id), 'materia_id': str(subject.id),
            'normalized_extraction': {'text': 'SECCIÓN 1: Observamos\nUna semilla crece con agua.\n1. ¿Qué necesita la semilla?\nSECCIÓN 2: Conversamos\nCompara tus ideas en grupo.'}})})
    await db.commit(); await db.refresh(evaluation)
    return actor, evaluation, job_id


def request(evaluation, proposal):
    document = deepcopy(proposal['documento'])
    document['revision'].update(estado='completa', confirmado=True, avisos=[])
    return CopyRequest(materia_destino_id=evaluation.materia_id, request_key=uuid4(),
        expected_updated_at=evaluation.updated_at, expected_content_version_id=evaluation.contenido_version_id,
        nombre='Copia organizada de semillas', recuperacion_documental={
            'source_job_id': proposal['source_job_id'], 'source_fingerprint': proposal['source_fingerprint'], 'documento': document})


@pytest.mark.asyncio
async def test_recovery_is_private_complete_idempotent_and_never_changes_original(database128, monkeypatch):
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, evaluation, _ = await seed(db, monkeypatch)
        before = deepcopy(evaluation.preguntas), deepcopy(evaluation.respuestas_esperadas), evaluation.updated_at
        proposal = await recovery.read_recovery(db, evaluation.id, actor)
        assert proposal['original_disponible'] is False
        assert 'Una semilla crece' in proposal['texto'] and 'NEVER_RETURN' not in str(proposal)
        payload = request(evaluation, proposal)
        operation = await copying.request_copy(db, evaluation.id, payload, actor)
        assert await jobs.claim_job_running(db, operation['job_id'], claim_token='recover')
        await db.commit()
        new_id = await copying.perform_copy(db, operation['job_id'], 'recover')
        copied = await db.get(Evaluacion, new_id)
        assert copied.materia_id == evaluation.materia_id and copied.estado == 'borrador'
        assert copied.preguntas[0]['enunciado'] == evaluation.preguntas[0]['enunciado']
        assert copied.respuestas_esperadas == evaluation.respuestas_esperadas
        assert copied.preguntas[0]['puntaje'] == 5 and copied.nota_maxima == 5
        assert copied.estructura_documento['revision']['confirmado']
        assert copied.contenido_version_id
        revision = await db.get(EvaluacionContenidoVersion, copied.contenido_version_id)
        assert revision.snapshot_json['estructura_documento'] == copied.estructura_documento
        again = await copying.request_copy(db, evaluation.id, payload, actor)
        assert UUID(str(again['evaluacion_id'])) == new_id
        await db.refresh(evaluation)
        assert (evaluation.preguntas, evaluation.respuestas_esperadas, evaluation.updated_at) == before
        assert evaluation.estructura_documento is None
        assert await db.scalar(select(func.count(Entrega.id))) == 1
        assert await db.scalar(select(func.count(Calificacion.id))) == 1
        assert await db.scalar(select(func.count(Evaluacion.id))) == 2


@pytest.mark.asyncio
async def test_recovery_rejects_foreign_actor_stale_source_and_unreviewed_content(database128, monkeypatch):
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, evaluation, _ = await seed(db, monkeypatch)
        outsider = User(id=uuid4(), rol='profesor'); outsider._effective_permissions = actor._effective_permissions
        with pytest.raises(HTTPException) as denied:
            await recovery.read_recovery(db, evaluation.id, outsider)
        assert denied.value.status_code in {403, 404}
        proposal = await recovery.read_recovery(db, evaluation.id, actor)
        payload = request(evaluation, proposal)
        document = payload.recuperacion_documental.documento.model_copy(deep=True)
        document.revision.confirmado = False; document.revision.estado = 'requiere_revision'
        invalid = payload.model_copy(update={'recuperacion_documental': payload.recuperacion_documental.model_copy(update={'documento': document})})
        with pytest.raises(HTTPException) as rejected:
            await copying.request_copy(db, evaluation.id, invalid, actor)
        assert rejected.value.status_code == 422
        stale = payload.model_copy(update={'recuperacion_documental': payload.recuperacion_documental.model_copy(update={'source_fingerprint': '0' * 64})})
        with pytest.raises(HTTPException) as rejected:
            await copying.request_copy(db, evaluation.id, stale, actor)
        assert rejected.value.status_code == 409
        normal = payload.model_copy(update={'recuperacion_documental': None})
        with pytest.raises(HTTPException) as rejected:
            await copying.request_copy(db, evaluation.id, normal, actor)
        assert rejected.value.status_code == 422


@pytest.mark.asyncio
async def test_recovery_revalidates_source_and_permissions_before_persistence(database128, monkeypatch):
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, evaluation, job_id = await seed(db, monkeypatch)
        proposal = await recovery.read_recovery(db, evaluation.id, actor)
        operation = await copying.request_copy(db, evaluation.id, request(evaluation, proposal), actor)
        await db.execute(text("UPDATE ai_jobs SET resultado_json=jsonb_set(resultado_json,'{normalized_extraction,text}',to_jsonb(CAST(:text AS text))) WHERE id=:id"),
            {'id': job_id, 'text': 'Fuente modificada'})
        await db.commit()
        assert await jobs.claim_job_running(db, operation['job_id'], claim_token='stale')
        await db.commit()
        with pytest.raises(HTTPException) as conflict:
            await copying.perform_copy(db, operation['job_id'], 'stale')
        assert conflict.value.status_code == 409
        await db.rollback()
        assert await db.scalar(select(func.count(Evaluacion.id))) == 1


@pytest.mark.asyncio
async def test_failed_finalization_rolls_back_then_retries_same_copy_without_duplication(database128, monkeypatch):
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, evaluation, _ = await seed(db, monkeypatch)
        actor_id, evaluation_id = actor.id, evaluation.id
        payload = request(evaluation, await recovery.read_recovery(db, evaluation.id, actor))
        operation = await copying.request_copy(db, evaluation.id, payload, actor)
        assert await jobs.claim_job_running(db, operation['job_id'], claim_token='lost')
        await db.commit()
        finish = jobs.finish_job
        monkeypatch.setattr(jobs, 'finish_job', AsyncMock(return_value=False))
        with pytest.raises(jobs.JobOwnershipLost):
            await copying.perform_copy(db, operation['job_id'], 'lost')
        await db.rollback()
        assert await db.scalar(select(func.count(Evaluacion.id))) == 1
        monkeypatch.setattr(jobs, 'finish_job', finish)
        await finish(db, operation['job_id'], estado='requires_review', resultado_json={'claim_token': 'lost'}, error='Fallo sintético')
        await db.commit()
        actor = await db.get(User, actor_id); actor._effective_permissions = default_permissions_for_role('profesor')
        again = await copying.request_copy(db, evaluation_id, payload, actor)
        assert again['job_id'] == operation['job_id']
        assert await jobs.claim_job_running(db, operation['job_id'], claim_token='retry')
        await db.commit()
        await copying.perform_copy(db, operation['job_id'], 'retry')
        assert await db.scalar(select(func.count(Evaluacion.id))) == 2


@pytest.mark.asyncio
async def test_deactivated_actor_cannot_finalize_admitted_recovery(database128, monkeypatch):
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, evaluation, _ = await seed(db, monkeypatch)
        operation = await copying.request_copy(db, evaluation.id, request(evaluation, await recovery.read_recovery(db, evaluation.id, actor)), actor)
        actor.estado = 'inactivo'; await db.commit()
        assert await jobs.claim_job_running(db, operation['job_id'], claim_token='revoked')
        await db.commit()
        with pytest.raises(HTTPException) as denied:
            await copying.perform_copy(db, operation['job_id'], 'revoked')
        assert denied.value.status_code == 403
        await db.rollback()
        assert await db.scalar(select(func.count(Evaluacion.id))) == 1


@pytest.mark.asyncio
async def test_normal_copy_remaps_document_and_scoring_ids_without_reweighting(database128, monkeypatch):
    from app.modules.evaluaciones.visual_service import _snapshot, content_hash
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, evaluation, _ = await seed(db, monkeypatch)
        proposal = await recovery.read_recovery(db, evaluation.id, actor)
        document = proposal['documento']
        document['revision'].update(confirmado=True, estado='completa', avisos=[])
        evaluation.preguntas = proposal['preguntas']
        question_id = evaluation.preguntas[0]['contenido_id']
        section_id = next(node['padre_id'] for node in document['nodos'] if node['tipo'] == 'pregunta')
        document['puntuacion_secciones'] = {'modo': 'por_seccion', 'presupuestos': {section_id: '5'},
            'pesos_base': {question_id: '5'}, 'ajustes': {}, 'confirmado': True}
        evaluation.estructura_documento = document
        snapshot = _snapshot(evaluation); snapshot['contenido_visual'] = None
        revision = EvaluacionContenidoVersion(evaluacion_id=evaluation.id, numero_version=1, autor_id=actor.id,
            content_hash=content_hash(snapshot), snapshot_json=snapshot, coverage_json={'estado': 'completa'},
            recurso_ids=[], motivo='Fixture sintético', origen='edicion')
        db.add(revision); await db.flush(); evaluation.contenido_version_id = revision.id
        target = Materia(profesor_id=actor.id, nombre='Otra materia', codigo_matricula=uuid4().hex[:12])
        db.add(target); await db.commit(); await db.refresh(evaluation)
        operation = await copying.request_copy(db, evaluation.id, CopyRequest(materia_destino_id=target.id,
            request_key=uuid4(), expected_updated_at=evaluation.updated_at, expected_content_version_id=revision.id), actor)
        assert await jobs.claim_job_running(db, operation['job_id'], claim_token='normal')
        await db.commit()
        copied = await db.get(Evaluacion, await copying.perform_copy(db, operation['job_id'], 'normal'))
        assert copied.preguntas[0]['contenido_id'] != question_id
        assert copied.preguntas[0]['puntaje'] == 5
        scoring = copied.estructura_documento['puntuacion_secciones']
        assert set(scoring['pesos_base']) == {copied.preguntas[0]['contenido_id']}
        assert section_id not in scoring['presupuestos']
        assert set(scoring['presupuestos']).issubset({node['id'] for node in copied.estructura_documento['nodos']})
        assert evaluation.estructura_documento == document
