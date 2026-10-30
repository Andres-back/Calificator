"""Operation/migration contracts in a random, disposable PostgreSQL schema."""
import asyncio
import importlib.util
from pathlib import Path
from uuid import uuid4

import httpx
import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import FastAPI
from sqlalchemy import select, text

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.calificaciones.breakdown_models import CalificacionDesglose
from app.modules.calificaciones.breakdown_service import get_active_breakdown, serialize_breakdown
from app.modules.evaluaciones import score_service
from app.modules.evaluaciones.score_router import router
from app.modules.evaluaciones.score_models import EvaluationScoreOperation
from app.modules.evaluaciones.score_schemas import ScoreApplyRequest, ScorePlanUpdate
from app.modules.users.models import User
from tests.integration.test_score_allocation_persistence import scoring_scope, seed_legacy, seed_breakdown, by_type
from tests.integration.test_evaluation_visual_persistence import database, visual_scope, TEST_URL

pytestmark = pytest.mark.skipif(not TEST_URL, reason='Requiere PostgreSQL aislado SPEC101_TEST_DATABASE_URL')
assert scoring_scope and database and visual_scope


async def prepare(db, owner, subject, count):
    evaluation, actor, _, _ = await seed_legacy(db, owner, subject, count)
    for grade in await db.scalars(select(Calificacion).where(Calificacion.evaluacion_id == evaluation.id)):
        await seed_breakdown(db, evaluation, grade)
    await db.commit()
    info = await score_service.read_score_plan(db, evaluation.id, actor)
    await score_service.save_score_plan(db, evaluation.id, ScorePlanUpdate(plan=by_type(info), expected_updated_at=info['updated_at']), actor)
    preview = await score_service.preview_score_changes(db, evaluation.id, actor)
    request = ScoreApplyRequest(request_id=uuid4(), definition_fingerprint=preview['definition_fingerprint'], confirmar=True,
        selecciones=[{'calificacion_id': row['calificacion_id'], 'fingerprint': row['fingerprint']} for row in preview['resultados'] if row['elegible']])
    return evaluation.id, actor, request


@pytest.mark.asyncio
@pytest.mark.parametrize('count', [20, 100])
async def test_bounded_cohorts_and_lost_response_replay(scoring_scope, count):
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        identifier, actor, request = await prepare(db, owner, subject, count)
        assert len(request.selecciones) == count
        # Leave the last preview transaction before simulating two browsers.
        await db.commit()
    async def send():
        async with sessions() as db:
            current = await db.get(User, owner)
            current._effective_permissions = actor._effective_permissions
            return await score_service.apply_score_changes(db, identifier, request, current)
    first, second = await asyncio.wait_for(asyncio.gather(send(), send()), timeout=30)
    assert first == second
    assert len(first['resultados']) == count
    assert all(row['estado'] == 'applied' for row in first['resultados'])
    async with sessions() as db:
        assert len(list(await db.scalars(select(EvaluationScoreOperation)))) == 1
        assert len(list(await db.scalars(select(CalificacionDesglose).where(CalificacionDesglose.activo.is_(True))))) == count
        assert len(list(await db.scalars(select(CalificacionDesglose)))) == count * 2
        current = await db.get(User, owner)
        current._effective_permissions = actor._effective_permissions
        page1 = await score_service.preview_score_changes(db, identifier, current, limit=7)
        assert len(page1['resultados']) == 7 and page1['siguiente_cursor']
        page2 = await score_service.preview_score_changes(db, identifier, current, limit=7, cursor=page1['siguiente_cursor'])
        assert not {row['calificacion_id'] for row in page1['resultados']} & {row['calificacion_id'] for row in page2['resultados']}


@pytest.mark.asyncio
async def test_a_second_explicit_repartition_is_not_misclassified_as_manual(scoring_scope):
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        identifier, actor, request = await prepare(db, owner, subject, 1)
        await score_service.apply_score_changes(db, identifier, request, actor)
        info = await score_service.read_score_plan(db, identifier, actor)
        keys = [q['clave'] for q in info['preguntas']]
        plan = {'schema_version': 1, 'modo': 'bloques', 'grupos': [
            {'id': 'a', 'titulo': '1–5', 'claves': keys[:5], 'presupuesto': '2', 'fijados': {}},
            {'id': 'b', 'titulo': '6–9', 'claves': keys[5:], 'presupuesto': '3', 'fijados': {}},
        ]}
        await score_service.save_score_plan(db, identifier, ScorePlanUpdate(plan=plan, expected_updated_at=info['updated_at'], expected_content_version_id=info['contenido_version_id']), actor)
        preview = await score_service.preview_score_changes(db, identifier, actor)
        assert preview['resultados'][0]['elegible']
        row = preview['resultados'][0]
        request2 = ScoreApplyRequest(request_id=uuid4(), definition_fingerprint=preview['definition_fingerprint'], confirmar=True,
            selecciones=[{'calificacion_id': row['calificacion_id'], 'fingerprint': row['fingerprint']}])
        result = await score_service.apply_score_changes(db, identifier, request2, actor)
        assert result['resultados'][0]['estado'] == 'applied'
        active = await get_active_breakdown(db, request2.selecciones[0].calificacion_id)
        assert active.version == 3
        assert serialize_breakdown(active)['componentes'][0]['valoraciones'][0]['puntaje'] == .4
        assert active.componentes[0].valoraciones_json[0]['puntaje'] == '0.56'


@pytest.mark.asyncio
async def test_editing_breakdown_is_skipped_instead_of_deadlocking(scoring_scope):
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        identifier, actor, request = await prepare(db, owner, subject, 1)
        permissions = set(actor._effective_permissions)
        await db.commit()
    async with sessions() as editing, sessions() as applying:
        await editing.scalar(select(CalificacionDesglose).where(CalificacionDesglose.calificacion_id == request.selecciones[0].calificacion_id).with_for_update())
        current = await applying.get(User, owner)
        current._effective_permissions = permissions
        result = await asyncio.wait_for(score_service.apply_score_changes(applying, identifier, request, current), timeout=5)
        assert result['resultados'][0]['estado'] == 'excluded'
        await editing.rollback()


@pytest.mark.asyncio
async def test_partial_failure_rolls_back_only_its_case_and_the_receipt_can_be_recovered(scoring_scope, monkeypatch):
    from app.modules.evaluaciones import score_notes
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        identifier, actor, request = await prepare(db, owner, subject, 3)
        failed_id = request.selecciones[1].calificacion_id
        original = score_notes._apply_one
        async def fail_after_staging(session, evaluation, grade, *args):
            affected = grade.id
            result = await original(session, evaluation, grade, *args)
            if affected == failed_id:
                raise ValueError('Fallo sintético después de escribir dentro del savepoint')
            return result
        monkeypatch.setattr(score_notes, '_apply_one', fail_after_staging)
        receipt = await score_service.apply_score_changes(db, identifier, request, actor)
        assert [row['estado'] for row in receipt['resultados']] == ['applied', 'failed', 'applied']
        for selection in request.selecciones:
            active = await get_active_breakdown(db, selection.calificacion_id)
            assert active.version == (1 if selection.calificacion_id == failed_id else 2)
        assert await score_service.read_score_operation(db, identifier, request.request_id, actor) == receipt
        assert await score_service.apply_score_changes(db, identifier, request, actor) == receipt
        assert len(list(await db.scalars(select(CalificacionDesglose)))) == 5


@pytest.mark.asyncio
async def test_multiple_attempts_are_preserved_instead_of_changing_the_official_selection(scoring_scope):
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        evaluation, actor, _, grade_id = await seed_legacy(db, owner, subject, 1)
        first = await db.get(Calificacion, grade_id)
        await seed_breakdown(db, evaluation, first)
        delivery = Entrega(evaluacion_id=evaluation.id, estudiante_id=first.estudiante_id, materia_id=subject, tipo='online', estado='calificada', visual_text_json={})
        db.add(delivery); await db.flush()
        second = Calificacion(evaluacion_id=evaluation.id, estudiante_id=first.estudiante_id, materia_id=subject, profesor_id=owner, entrega_id=delivery.id)
        db.add(second); await db.flush()
        await seed_breakdown(db, evaluation, second)
        await db.commit()
        info = await score_service.read_score_plan(db, evaluation.id, actor)
        await score_service.save_score_plan(db, evaluation.id, ScorePlanUpdate(plan=by_type(info), expected_updated_at=info['updated_at']), actor)
        preview = await score_service.preview_score_changes(db, evaluation.id, actor)
        assert len(preview['resultados']) == 2 and all(not row['elegible'] and 'varios intentos' in row['motivo'] for row in preview['resultados'])
        request = ScoreApplyRequest(request_id=uuid4(), definition_fingerprint=preview['definition_fingerprint'], confirmar=True,
            selecciones=[{'calificacion_id': str(grade.id), 'fingerprint': '0' * 64} for grade in [first, second]])
        receipt = await score_service.apply_score_changes(db, evaluation.id, request, actor)
        assert all(row['estado'] == 'excluded' for row in receipt['resultados'])
        for grade in [first, second]:
            assert (await get_active_breakdown(db, grade.id)).version == 1


@pytest.mark.asyncio
async def test_http_permissions_and_strict_confirmation(scoring_scope):
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        evaluation, actor, _, grade_id = await seed_legacy(db, owner, subject, 1)
        await seed_breakdown(db, evaluation, await db.get(Calificacion, grade_id))
        await db.commit()
        app = FastAPI()
        app.include_router(router)
        async def session():
            yield db
        app.dependency_overrides[get_db] = session
        app.dependency_overrides[get_current_user] = lambda: actor
        path = f'/evaluaciones/{evaluation.id}/reparto'
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://synthetic') as client:
            assert (await client.get(path)).status_code == 200
            actor._effective_permissions.remove('evaluations.update')
            payload = {'plan': by_type(await score_service.read_score_plan(db, evaluation.id, actor)), 'expected_updated_at': evaluation.updated_at.isoformat()}
            assert (await client.put(path, json=payload)).status_code == 403
            actor._effective_permissions.add('evaluations.update')
            assert (await client.put(path, json=payload)).status_code == 200
            actor._effective_permissions.remove('grading.read')
            assert (await client.post(path + '/notas/previsualizar')).status_code == 403
            assert (await client.post(path + '/notas/aplicar', json={'request_id': str(uuid4()), 'definition_fingerprint': 'a' * 64,
                'confirmar': 1, 'selecciones': [{'calificacion_id': str(uuid4()), 'fingerprint': 'b' * 64}]})).status_code == 422
            actor._effective_permissions.add('grading.read')
            preview = (await client.post(path + '/notas/previsualizar')).json()
            row = preview['resultados'][0]
            request = {'request_id': str(uuid4()), 'definition_fingerprint': preview['definition_fingerprint'], 'confirmar': True,
                'selecciones': [{'calificacion_id': row['calificacion_id'], 'fingerprint': row['fingerprint']}]}
            actor._effective_permissions.remove('grading.grade')
            assert (await client.post(path + '/notas/aplicar', json=request)).status_code == 403
            actor._effective_permissions.add('grading.grade')
            result = await client.post(path + '/notas/aplicar', json=request)
            assert result.status_code == 200 and result.json()['resultados'][0]['estado'] == 'applied'
            receipt_path = path + '/notas/operaciones/' + request['request_id']
            assert (await client.get(receipt_path)).json() == result.json()
            actor.rol = 'estudiante'
            assert (await client.get(path)).status_code == 403
            assert (await client.put(path, json=payload)).status_code == 403
            assert (await client.post(path + '/notas/previsualizar')).status_code == 403
            assert (await client.post(path + '/notas/aplicar', json=request)).status_code == 403
            assert (await client.get(receipt_path)).status_code == 403


@pytest.mark.asyncio
async def test_additive_receipt_migration_preserves_prior_adjustment_rows(database):
    def migrate(connection):
        path = Path(__file__).parents[2] / 'alembic/versions/202610300001_evaluation_score_operations.py'
        spec = importlib.util.spec_from_file_location('score_migration', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with Operations.context(MigrationContext.configure(connection)):
            module.upgrade()
    async with database.begin() as connection:
        await connection.execute(text('CREATE TABLE users (id uuid PRIMARY KEY)'))
        await connection.execute(text('CREATE TABLE evaluaciones (id uuid PRIMARY KEY)'))
        await connection.execute(text("CREATE TABLE calificacion_ajustes (id uuid PRIMARY KEY, tipo text NOT NULL, original jsonb, CONSTRAINT ck_ajuste_tipo CHECK (tipo IN ('componente','global','explicacion','resolucion')))"))
        await connection.execute(text("INSERT INTO calificacion_ajustes VALUES (:id,'global',CAST(:original AS jsonb))"), {'id': uuid4(), 'original': '{"preservar":true}'})
        before = (await connection.execute(text('SELECT * FROM calificacion_ajustes'))).mappings().all()
        await connection.run_sync(migrate)
        assert (await connection.execute(text('SELECT * FROM calificacion_ajustes'))).mappings().all() == before
        await connection.execute(text("INSERT INTO calificacion_ajustes VALUES (:id,'reparto','{}')"), {'id': uuid4()})
        assert await connection.scalar(text('SELECT count(*) FROM evaluacion_reparto_operaciones')) == 0
