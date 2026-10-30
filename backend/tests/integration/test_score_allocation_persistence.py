"""Synthetic grading-only database. Never falls back to the application DSN."""
from copy import deepcopy
from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException
import pytest
import pytest_asyncio
from sqlalchemy import select, text

from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.calificaciones.breakdown_models import CalificacionComponente, CalificacionDesglose, CalificacionAjuste
from app.modules.calificaciones.breakdown_policy import build_component_scaffold, calculate_formula
from app.modules.calificaciones.breakdown_service import get_active_breakdown, serialize_breakdown
from app.modules.evaluaciones import service
from app.modules.evaluaciones.models import EvaluacionContenidoVersion
from app.modules.evaluaciones.score_models import EvaluationScoreOperation
from app.modules.evaluaciones.score_schemas import ScorePlanUpdate
from app.modules.evaluaciones.schemas import EvaluacionUpdate
from app.modules.evaluaciones.score_service import read_score_plan, save_score_plan
from app.modules.evaluaciones import score_service
from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.evaluaciones.score_schemas import ScoreApplyRequest
from app.modules.users.models import User
from tests.fixtures.document_structure import sample_document
from tests.integration.test_evaluation_visual_persistence import database, visual_scope, legacy_evaluation, TEST_URL

pytestmark = pytest.mark.skipif(not TEST_URL, reason='Requiere PostgreSQL sintético aislado SPEC101_TEST_DATABASE_URL')
assert database and visual_scope


@pytest_asyncio.fixture
async def scoring_scope(visual_scope):
    sessions, owner, subject, root = visual_scope
    async with sessions() as db:
        connection = await db.connection()
        await connection.run_sync(lambda sync: EvaluationScoreOperation.__table__.create(sync, checkfirst=True))
        await db.commit()
    yield sessions, owner, subject, root


async def seed_legacy(db, owner, subject, count=24):
    identifier, delivery_id, grade_id = await legacy_evaluation(db, owner, subject)
    evaluation = await service.get_evaluation_or_404(db, identifier)
    document, questions = sample_document()
    questions = questions[:9]
    for index, question in enumerate(questions):
        question.update(puntaje='0.52' if index == 8 else '0.56', tipo='opcion_multiple' if index < 7 else 'abierta')
    valid_ids = {question['contenido_id'] for question in questions}
    document['nodos'] = [node for node in document['nodos'] if node['tipo'] != 'pregunta' or node['pregunta_id'] in valid_ids]
    sources = list(dict.fromkeys(source for node in document['nodos'] for source in node.get('fuente_ids', [])))
    document['revision'].update(detectados=sources, conservados=sources)
    evaluation.preguntas = questions
    evaluation.respuestas_esperadas = [{'numero': question['numero'], 'respuesta': 'B' if index < 7 else 'Una explicación sintética.'} for index, question in enumerate(questions)]
    evaluation.estructura_documento = document
    evaluation.blueprint.preguntas = deepcopy(questions)
    evaluation.blueprint.respuestas_esperadas = deepcopy(evaluation.respuestas_esperadas)
    for _ in range(count - 1):
        student = User(nombre='Estudiante sintético', email=f'{uuid4()}@example.test', password_hash='no-login', rol='estudiante')
        db.add(student)
        await db.flush()
        delivery = Entrega(evaluacion_id=identifier, estudiante_id=student.id, materia_id=subject, tipo='foto', estado='calificada', archivo_url='fixture/no-real-file.png', visual_text_json={'keep': True})
        db.add(delivery)
        await db.flush()
        db.add(Calificacion(evaluacion_id=identifier, estudiante_id=student.id, profesor_id=owner, materia_id=subject, entrega_id=delivery.id,
            estado='sugerida', nota_sugerida=Decimal('3.34'), feedback='Mensaje que se conserva.', resultado_json={'keep': True}))
    await db.commit()
    await db.refresh(evaluation)
    actor = await db.get(User, owner)
    actor._effective_permissions = {'evaluations.read', 'evaluations.update', 'grading.read', 'grading.grade'}
    return evaluation, actor, delivery_id, grade_id


def by_type(info):
    keys = [question['clave'] for question in info['preguntas']]
    return {'schema_version': 1, 'modo': 'tipo', 'grupos': [
        {'id': 'abcd', 'titulo': 'ABCD', 'claves': keys[:7], 'presupuesto': '2.5', 'fijados': {}},
        {'id': 'abiertas', 'titulo': 'Abiertas', 'claves': keys[7:], 'presupuesto': '2.5', 'fijados': {}},
    ]}


@pytest.mark.asyncio
async def test_legacy_24_preserves_notes_evidence_and_baseline_when_only_weights_change(scoring_scope):
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        evaluation, actor, _, _ = await seed_legacy(db, owner, subject)
        identifier = evaluation.id
        before_questions = deepcopy(evaluation.preguntas)
        before_document = deepcopy(evaluation.estructura_documento)
        grades = list(await db.scalars(select(Calificacion).where(Calificacion.evaluacion_id == identifier)))
        before = {grade.id: (grade.nota_sugerida, grade.nota_confirmada, grade.estado, grade.feedback, deepcopy(grade.resultado_json)) for grade in grades}
        info = await read_score_plan(db, identifier, actor)
        updated = await save_score_plan(db, identifier, ScorePlanUpdate(plan=by_type(info), expected_updated_at=info['updated_at'], expected_content_version_id=None), actor)
        revisions = list(await db.scalars(select(EvaluacionContenidoVersion).where(EvaluacionContenidoVersion.evaluacion_id == identifier).order_by(EvaluacionContenidoVersion.numero_version)))
        assert len(revisions) == 2 and revisions[0].legacy_baseline
        assert revisions[0].snapshot_json['preguntas'] == before_questions
        assert revisions[0].snapshot_json['estructura_documento'] == before_document
        assert updated.contenido_version_id == revisions[1].id
        assert revisions[1].previous_version_id == revisions[0].id
        assert [Decimal(str(question['puntaje'])) for question in updated.preguntas[-2:]] == [Decimal('1.25')] * 2
        assert sum(Decimal(str(question['puntaje'])) for question in updated.preguntas) == 5
        assert updated.estructura_documento == before_document
        for grade in await db.scalars(select(Calificacion).where(Calificacion.evaluacion_id == identifier)):
            assert (grade.nota_sugerida, grade.nota_confirmada, grade.estado, grade.feedback, grade.resultado_json) == before[grade.id]
        deliveries = list(await db.scalars(select(Entrega).where(Entrega.evaluacion_id == identifier)))
        assert len(deliveries) == 24
        assert all(delivery.contenido_version_id == revisions[0].id for delivery in deliveries)
        assert all(delivery.archivo_url == 'fixture/no-real-file.png' and delivery.visual_text_json == {'keep': True} for delivery in deliveries)


@pytest.mark.asyncio
async def test_stale_save_or_running_job_cannot_rewrite_weights(scoring_scope):
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        evaluation, actor, _, _ = await seed_legacy(db, owner, subject, 1)
        identifier = evaluation.id
        info = await read_score_plan(db, identifier, actor)
        request = ScorePlanUpdate(plan=by_type(info), expected_updated_at=info['updated_at'])
        await db.execute(text("INSERT INTO ai_jobs(id,estado,input_json) VALUES (:id,'running',jsonb_build_object('evaluacion_id',CAST(:evaluation AS text)))"), {'id': uuid4(), 'evaluation': str(identifier)})
        await db.commit()
        with pytest.raises(HTTPException) as blocked:
            await save_score_plan(db, identifier, request, actor)
        assert blocked.value.status_code == 409
        await db.rollback()
        await db.refresh(actor)
        assert not list(await db.scalars(select(EvaluacionContenidoVersion)))
        await db.execute(text('DELETE FROM ai_jobs'))
        await db.commit()
        await save_score_plan(db, identifier, request, actor)
        with pytest.raises(HTTPException) as stale:
            await save_score_plan(db, identifier, request, actor)
        assert stale.value.status_code == 409
        await db.rollback()
        assert len(list(await db.scalars(select(EvaluacionContenidoVersion)))) == 2


@pytest.mark.asyncio
async def test_another_teacher_and_student_cannot_read_or_save_scores(scoring_scope):
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        evaluation, actor, _, _ = await seed_legacy(db, owner, subject, 1)
        for role in ['profesor', 'estudiante']:
            other = User(id=uuid4(), nombre='Otro actor sintético', email=f'{uuid4()}@example.test', password_hash='no-login', rol=role)
            other._effective_permissions = actor._effective_permissions
            with pytest.raises(HTTPException) as denied:
                await read_score_plan(db, evaluation.id, other)
            assert denied.value.status_code == 403


@pytest.mark.asyncio
async def test_existing_patch_can_change_only_maxima_without_bypassing_document_guard(scoring_scope, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, 'EVALUATION_DOCUMENT_STRUCTURE_ENABLED', True)
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        evaluation, actor, _, grade_id = await seed_legacy(db, owner, subject, 1)
        identifier = evaluation.id
        questions = deepcopy(evaluation.preguntas)
        for index, question in enumerate(questions):
            question['puntaje'] = '1.25' if index >= 7 else ('0.3572' if index < 3 else '0.3571')
        old_score = (await db.get(Calificacion, grade_id)).nota_confirmada
        updated = await service.update_evaluation(db, evaluation, EvaluacionUpdate(preguntas=questions,
            estructura_documento=deepcopy(evaluation.estructura_documento), expected_updated_at=evaluation.updated_at), actor_id=actor.id)
        assert updated.preguntas == questions
        assert (await db.get(Calificacion, grade_id)).nota_confirmada == old_score
        assert len(list(await db.scalars(select(EvaluacionContenidoVersion)))) == 2
        changed = deepcopy(updated.preguntas)
        changed[0]['enunciado'] = 'Contenido cambiado por otra vía.'
        # Missing current version cannot be smuggled through the maximum-only path.
        with pytest.raises(HTTPException) as refused:
            await service.update_evaluation(db, updated, EvaluacionUpdate(preguntas=changed,
                estructura_documento=deepcopy(updated.estructura_documento), expected_updated_at=updated.updated_at), actor_id=actor.id)
        assert refused.value.status_code == 409
        await db.rollback()
        assert (await service.get_evaluation_or_404(db, identifier)).preguntas == questions


@pytest.mark.asyncio
async def test_legacy_point_editor_preserves_saved_block_budgets(scoring_scope):
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        evaluation, actor, _, _ = await seed_legacy(db, owner, subject, 1)
        info = await read_score_plan(db, evaluation.id, actor)
        updated = await save_score_plan(db, evaluation.id, ScorePlanUpdate(plan=by_type(info), expected_updated_at=info['updated_at']), actor)
        questions = deepcopy(updated.preguntas)
        questions[0]['puntaje'] = '0.4572'
        questions[1]['puntaje'] = '0.2572'
        plan = score_service.score_only_plan(updated, {'preguntas': questions})
        assert plan.modo == 'tipo' and [group.presupuesto for group in plan.grupos] == [Decimal('2.5')] * 2
        questions[0]['puntaje'] = '0.5572'
        questions[7]['puntaje'] = '1.15'
        with pytest.raises(ValueError):
            score_service.score_only_plan(updated, {'preguntas': questions})


async def seed_breakdown(db, evaluation, grade, *, manual=False, pending=False, published=False):
    components = []
    for index, item in enumerate(build_component_scaffold(evaluation_to_grading_blueprint(evaluation))):
        fraction = Decimal('.5') if index == 7 else Decimal('0') if index in [1, 3, 5] else Decimal('1')
        obtained = None if pending and index == 7 else item['puntos_maximos'] * fraction
        state = 'revision_pendiente' if obtained is None else 'parcial' if fraction == Decimal('.5') else 'correcta' if fraction == 1 else 'incorrecta'
        components.append({**item, 'respuesta_referencia': str(item['respuesta_referencia']), 'respuesta_estudiante': 'Respuesta sintética.',
            'puntos_obtenidos': obtained, 'estado': state, 'origen': 'objetivo' if index < 7 else 'consenso_ia',
            'explicacion_verificable': 'Valoración basada en la respuesta.', 'explicacion_estudiante': 'Valoración basada en la respuesta.',
            'requiere_revision': obtained is None, 'evidencia_json': {'paginas': [1], 'orientacion_mejora': 'Explica una razón.'},
            'valoraciones_json': [{'evaluador': tag, 'puntaje': str(obtained) if obtained is not None else None, 'estado': state, 'confianza': .9} for tag in ['a', 'b']]})
    formula = calculate_formula(components, evaluation.nota_maxima)
    breakdown = CalificacionDesglose(calificacion_id=grade.id, version=1, origen='automatico', activo=True,
        cobertura_estado='incompleta' if pending else 'completa', requiere_revision=pending, bloqueos_json=[], procedencia_json={}, **formula)
    breakdown.componentes = [CalificacionComponente(**item) for item in components]
    db.add(breakdown)
    grade.nota_sugerida = formula['nota_final']
    grade.nota_confirmada = Decimal('4.8') if manual else formula['nota_final'] if published else None
    grade.estado = 'ajustada' if manual else 'publicada' if published else 'requiere_revision' if pending else 'sugerida'
    grade.revisado_por_docente = manual or published
    grade.resultado_json = {'keep': True, **({'origen_nota': 'manual_docente'} if manual else {})}
    await db.flush()
    return breakdown


@pytest.mark.asyncio
async def test_confirmed_previous_notes_only_update_eligible_preserve_manual_pending_and_replay(scoring_scope):
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        evaluation, actor, _, _ = await seed_legacy(db, owner, subject, 3)
        actor._effective_permissions.add('grading.publish')
        identifier = evaluation.id
        grades = list(await db.scalars(select(Calificacion).where(Calificacion.evaluacion_id == identifier).order_by(Calificacion.id)))
        old = await seed_breakdown(db, evaluation, grades[0], published=True)
        await seed_breakdown(db, evaluation, grades[1], manual=True)
        await seed_breakdown(db, evaluation, grades[2], pending=True)
        original_values = deepcopy(old.componentes[0].valoraciones_json)
        old_id, old_final = old.id, old.nota_final
        selected_id, manual_id, pending_id = [grade.id for grade in grades]
        await db.commit()
        info = await read_score_plan(db, identifier, actor)
        await save_score_plan(db, identifier, ScorePlanUpdate(plan=by_type(info), expected_updated_at=info['updated_at']), actor)
        preview = await score_service.preview_score_changes(db, identifier, actor)
        by_id = {item['calificacion_id']: item for item in preview['resultados']}
        assert by_id[str(selected_id)]['elegible']
        assert by_id[str(selected_id)]['nota_actual'] == '3.04'
        assert by_id[str(selected_id)]['nota_propuesta'] == '3.30'
        assert not by_id[str(manual_id)]['elegible'] and not by_id[str(pending_id)]['elegible']
        assert (await db.get(Calificacion, selected_id)).nota_confirmada == old_final
        request = ScoreApplyRequest(request_id=uuid4(), definition_fingerprint=preview['definition_fingerprint'], confirmar=True,
            selecciones=[{'calificacion_id': selected_id, 'fingerprint': by_id[str(selected_id)]['fingerprint']}])
        receipt = await score_service.apply_score_changes(db, identifier, request, actor)
        assert receipt['resultados'][0]['estado'] == 'applied'
        grade = await db.get(Calificacion, selected_id)
        assert grade.nota_confirmada == Decimal('3.30') and grade.estado == 'publicada'
        active = await get_active_breakdown(db, selected_id)
        assert active.version == 2 and active.id != old_id
        assert (await db.get(CalificacionDesglose, old_id)).nota_final == old_final
        assert active.componentes[0].valoraciones_json == original_values
        assert active.componentes[0].evidencia_json['paginas'] == [1]
        assert serialize_breakdown(active)['componentes'][0]['valoraciones'][0]['puntaje'] == .3572
        assert (await db.get(Calificacion, manual_id)).nota_confirmada == Decimal('4.80')
        assert (await get_active_breakdown(db, pending_id)).componentes[7].puntos_obtenidos is None
        repeated = await score_service.apply_score_changes(db, identifier, request, actor)
        assert repeated == receipt
        assert await score_service.read_score_operation(db, identifier, request.request_id, actor) == receipt
        versions = list(await db.scalars(select(CalificacionDesglose).where(CalificacionDesglose.calificacion_id == selected_id)))
        assert len(versions) == 2
        assert len(list(await db.scalars(select(CalificacionAjuste).where(CalificacionAjuste.calificacion_id == selected_id)))) == 1
        from app.modules.evaluaciones.grading_visual_context import read_grading_definition
        delivery = await db.get(Entrega, grade.entrega_id)
        current = await service.get_evaluation_or_404(db, identifier)
        context = await read_grading_definition(db, current, delivery)
        assert context.version_id == current.contenido_version_id
        assert Decimal(str(context.blueprint['preguntas'][7]['puntaje'])) == Decimal('1.25')
        # A legacy manual decision is preserved even if its historical JSON did
        # not record the newer manual-origin marker.
        pending_grade = await db.get(Calificacion, pending_id)
        pending_grade.estado = 'ajustada'
        await db.commit()
        again = await score_service.preview_score_changes(db, identifier, actor)
        assert 'ajuste manual' in next(row for row in again['resultados'] if row['calificacion_id'] == str(pending_id))['motivo']


@pytest.mark.asyncio
async def test_previous_notes_reject_changed_fingerprint_and_cannot_reuse_operation_for_other_selection(scoring_scope):
    sessions, owner, subject, _ = scoring_scope
    async with sessions() as db:
        evaluation, actor, _, grade_id = await seed_legacy(db, owner, subject, 1)
        await seed_breakdown(db, evaluation, await db.get(Calificacion, grade_id))
        await db.commit()
        identifier = evaluation.id
        info = await read_score_plan(db, identifier, actor)
        await save_score_plan(db, identifier, ScorePlanUpdate(plan=by_type(info), expected_updated_at=info['updated_at']), actor)
        preview = await score_service.preview_score_changes(db, identifier, actor)
        request = ScoreApplyRequest(request_id=uuid4(), definition_fingerprint=preview['definition_fingerprint'], confirmar=True,
            selecciones=[{'calificacion_id': grade_id, 'fingerprint': preview['resultados'][0]['fingerprint']}])
        grade = await db.get(Calificacion, grade_id)
        grade.feedback = 'Una edición posterior que se conserva.'
        await db.commit()
        result = await score_service.apply_score_changes(db, identifier, request, actor)
        assert result['resultados'][0]['estado'] == 'conflict'
        assert (await get_active_breakdown(db, grade_id)).version == 1
        assert grade.feedback == 'Una edición posterior que se conserva.'
        changed = request.model_copy(update={'definition_fingerprint': '0' * 64})
        with pytest.raises(HTTPException) as rejected:
            await score_service.apply_score_changes(db, identifier, changed, actor)
        assert rejected.value.status_code == 409
