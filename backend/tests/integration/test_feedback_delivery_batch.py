"""Synthetic PostgreSQL: one explicit decision, isolated students and retries."""
import asyncio
from decimal import Decimal
from pathlib import Path
import importlib.util
from uuid import uuid4
from time import perf_counter

from fastapi import HTTPException
import pytest
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.modules.feedback_sharing.batch_service import accept_publish_batch, read_batch
from app.modules.feedback_sharing.models import FeedbackDeliveryReview, FeedbackDeliveryBatch
from app.modules.feedback_sharing.schemas import BatchPublishInput
from app.modules.feedback_sharing.service import prepare_grade_preview


async def request_for(db, actor, evaluation, grade):
    preview = await prepare_grade_preview(db, actor, evaluation.id, grade.id)
    candidate = preview['batch_candidate']
    return BatchPublishInput(request_id=uuid4(), selecciones=[{
        'calificacion_id':grade.id, 'source_fingerprint':candidate['source_fingerprint'],
        'feedback_text':candidate['feedback_text'], 'scope':candidate['scope'],
    }])


@pytest.mark.asyncio
async def test_full_tanda_preserves_eight_adjustments_and_isolates_one_failure(fb_db, fb_case, monkeypatch):
    from sqlalchemy import event
    from app.modules.users.models import User
    from app.modules.matriculas.models import Matricula
    from app.modules.calificaciones.models import Calificacion

    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED', True)
    actor, _, subject, evaluation, first = fb_case
    first.estado = 'sugerida'
    first.revisado_por_docente = False
    first.nota_sugerida = 0
    first.nota_confirmada = None
    grades = [first]
    for index in range(24):
        student = User(nombre=f'Estudiante sintético {index}', email=f'{uuid4()}@example.test', password_hash='not-a-login', rol='estudiante')
        fb_db.add(student)
        await fb_db.flush()
        fb_db.info.setdefault('spec107_student_ids', []).append(student.id)
        adjusted = index < 8
        grade = Calificacion(evaluacion_id=evaluation.id, materia_id=subject.id, estudiante_id=student.id, profesor_id=actor.id,
            estado='ajustada' if adjusted else 'sugerida', revisado_por_docente=adjusted, nota_confirmada=Decimal('3.7') if adjusted else None,
            nota_sugerida=Decimal('4.9') if adjusted else Decimal('3.0'), feedback=first.feedback)
        fb_db.add_all([Matricula(materia_id=subject.id, estudiante_id=student.id), grade])
        grades.append(grade)
    await fb_db.commit()
    selections = [(await request_for(fb_db, actor, evaluation, grade)).selecciones[0] for grade in grades[:-1]]
    selections.append(selections[0].model_copy(update={'calificacion_id': grades[-1].id, 'source_fingerprint': '0' * 64}))
    original = await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'), {'id': grades[-1].id})
    payload = BatchPublishInput(request_id=uuid4(), selecciones=selections)
    queries = []
    def count_query(*_args):
        queries.append(1)
    event.listen(fb_db.bind.sync_engine, 'before_cursor_execute', count_query)
    start = perf_counter()
    try:
        result = await accept_publish_batch(fb_db, actor, evaluation.id, payload)
        await fb_db.commit()
    finally:
        event.remove(fb_db.bind.sync_engine, 'before_cursor_execute', count_query)
    print(f'\nSpec122 synthetic tanda: {perf_counter() - start:.2f}s, {len(queries)} SQL statements, 25 items')
    assert result['exitosos'] == 24 and result['fallidos'] == 1
    for grade in grades[:-1]:
        await fb_db.refresh(grade)
        assert grade.estado == 'publicada'
        assert grade.feedback == first.feedback
    assert first.nota_confirmada == 0
    assert all(grade.nota_confirmada == Decimal('3.7') for grade in grades[1:9])
    assert await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'), {'id': grades[-1].id}) == original
    assert await accept_publish_batch(fb_db, actor, evaluation.id, payload) == result


@pytest.mark.asyncio
async def test_real_migration_preserves_legacy_credentials_and_academic_rows(fb_db):
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    name = 'spec122_migration_' + uuid4().hex
    path = Path(__file__).resolve().parents[2]/'alembic/versions/202610240001_feedback_batch_copy.py'
    spec = importlib.util.spec_from_file_location('batch_copy_migration',path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    async with fb_db.bind.begin() as connection:
        await connection.execute(text(f'CREATE SCHEMA "{name}"'))
        await connection.execute(text(f'SET LOCAL search_path TO "{name}"'))
        for table in ('users','evaluaciones'):
            await connection.execute(text(f'CREATE TABLE {table} (id uuid PRIMARY KEY)'))
        await connection.execute(text('CREATE TABLE feedback_accesses (id uuid PRIMARY KEY, credential_digest text)'))
        await connection.execute(text("INSERT INTO feedback_accesses VALUES (:id,'legacy-digest-unchanged')"),{'id':uuid4()})
        def run(sync,action):
            migration.op=Operations(MigrationContext.configure(sync))
            getattr(migration,action)()
        await connection.run_sync(lambda sync:run(sync,'upgrade'))
        row=(await connection.execute(text('SELECT credential_digest,credential_encrypted FROM feedback_accesses'))).one()
        assert row == ('legacy-digest-unchanged',None)
        assert await connection.scalar(text("SELECT to_regclass('feedback_delivery_batches')"))
        await connection.run_sync(lambda sync:run(sync,'downgrade'))
        assert await connection.scalar(text('SELECT credential_digest FROM feedback_accesses'))=='legacy-digest-unchanged'
        assert name.startswith('spec122_migration_') and len(name)==50
        await connection.execute(text('SET LOCAL search_path TO public'))
        await connection.execute(text(f'DROP SCHEMA "{name}" CASCADE'))


@pytest.mark.asyncio
async def test_accept_publish_is_recoverable_preserves_zero_and_source_feedback(fb_db,fb_case,monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED',True)
    actor,_,_,evaluation,grade=fb_case
    grade.estado='requiere_revision'
    grade.nota_sugerida=0
    grade.nota_confirmada=None
    grade.revisado_por_docente=False
    message=grade.feedback
    await fb_db.commit()
    payload=await request_for(fb_db,actor,evaluation,grade)
    result=await accept_publish_batch(fb_db,actor,evaluation.id,payload)
    await fb_db.commit()
    assert result['exitosos']==1 and result['fallidos']==0
    await fb_db.refresh(grade)
    assert grade.estado=='publicada' and grade.nota_confirmada==0 and grade.feedback==message
    before=await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'),{'id':grade.id})
    again=await accept_publish_batch(fb_db,actor,evaluation.id,payload)
    await fb_db.commit()
    assert again==result
    assert await read_batch(fb_db,actor,evaluation.id,payload.request_id)==result
    assert await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'),{'id':grade.id})==before
    assert await fb_db.scalar(select(func.count()).select_from(FeedbackDeliveryReview).where(FeedbackDeliveryReview.calificacion_id==grade.id))==1
    assert await fb_db.scalar(select(func.count()).select_from(FeedbackDeliveryBatch).where(FeedbackDeliveryBatch.request_id==payload.request_id))==1


@pytest.mark.asyncio
async def test_adjusted_and_already_published_values_do_not_revert_to_suggestion(fb_db,fb_case,monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED',True)
    actor,_,_,evaluation,grade=fb_case
    grade.estado='ajustada'
    grade.nota_sugerida=1
    grade.nota_confirmada=Decimal('4.2')
    await fb_db.commit()
    payload=await request_for(fb_db,actor,evaluation,grade)
    result=await accept_publish_batch(fb_db,actor,evaluation.id,payload)
    await fb_db.commit()
    await fb_db.refresh(grade)
    assert result['exitosos']==1 and grade.nota_confirmada==Decimal('4.2')
    before=await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'),{'id':grade.id})
    next_payload=await request_for(fb_db,actor,evaluation,grade)
    repeated=await accept_publish_batch(fb_db,actor,evaluation.id,next_payload)
    await fb_db.commit()
    assert repeated['resultados'][0]['estado']=='already_published'
    assert await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'),{'id':grade.id})==before


@pytest.mark.asyncio
async def test_changed_source_is_not_overwritten_and_request_payload_cannot_be_reused(fb_db,fb_case,monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED',True)
    actor,_,_,evaluation,grade=fb_case
    await fb_db.commit()
    payload=await request_for(fb_db,actor,evaluation,grade)
    grade.feedback+=' Añade una razón propia.'
    await fb_db.commit()
    result=await accept_publish_batch(fb_db,actor,evaluation.id,payload)
    await fb_db.commit()
    assert result['fallidos']==1 and result['resultados'][0]['code']=='source_changed'
    await fb_db.refresh(grade)
    assert grade.estado=='confirmada'
    altered=payload.model_copy(update={'selecciones':[payload.selecciones[0].model_copy(update={'feedback_text':'Otro mensaje para el mismo pedido.'})]})
    with pytest.raises(HTTPException) as exc:
        await accept_publish_batch(fb_db,actor,evaluation.id,altered)
    assert exc.value.status_code==409


@pytest.mark.asyncio
async def test_routes_enforce_roles_and_batch_limits(fb_client):
    client,identity,case=fb_client
    actor,student,_,evaluation,grade=case
    preview=(await client.post(f'/api/evaluaciones/{evaluation.id}/devoluciones/previsualizar',json={'calificacion_ids':[str(grade.id)]})).json()['resultados'][0]
    payload={'request_id':str(uuid4()),'selecciones':[{'calificacion_id':str(grade.id), **{key:preview['batch_candidate'][key] for key in ('source_fingerprint','feedback_text','scope')}}]}
    route=f'/api/evaluaciones/{evaluation.id}/devoluciones/aceptar-publicar'
    identity['user']=student
    assert (await client.post(route,json=payload)).status_code==403
    identity['user']=None
    assert (await client.post(route,json=payload)).status_code==401
    identity['user']=actor
    assert (await client.post(route,json={**payload,'selecciones':payload['selecciones']*26})).status_code==422
    response=await client.post(route,json=payload)
    assert response.status_code==200 and response.json()['exitosos']==1


@pytest.mark.asyncio
async def test_concurrent_identical_requests_have_one_academic_decision(fb_db,fb_case,monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED',True)
    actor,_,_,evaluation,grade=fb_case
    await fb_db.commit()
    payload=await request_for(fb_db,actor,evaluation,grade)
    actor_id,evaluation_id,grade_id=actor.id,evaluation.id,grade.id
    await fb_db.rollback()
    sessions=async_sessionmaker(fb_db.bind,expire_on_commit=False)
    async def run():
        from app.modules.users.models import User
        async with sessions() as db:
            actor=await db.get(User,actor_id)
            result=await accept_publish_batch(db,actor,evaluation_id,payload)
            await db.commit()
            return result
    results=await asyncio.gather(run(),run())
    assert results[0]==results[1] and results[0]['exitosos']==1
    assert await fb_db.scalar(select(func.count()).select_from(FeedbackDeliveryReview).where(FeedbackDeliveryReview.calificacion_id==grade_id))==1


@pytest.mark.asyncio
async def test_late_failure_isolated_to_one_student_and_rolls_back_its_academic_changes(fb_db,fb_case,fb_case_factory,monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED',True)
    actor,_,subject,evaluation,first=fb_case
    _,second_student,_,_,second=await fb_case_factory(fb_db)
    from app.modules.matriculas.models import Matricula
    second.evaluacion_id=evaluation.id
    second.materia_id=subject.id
    second.profesor_id=actor.id
    fb_db.add(Matricula(materia_id=subject.id,estudiante_id=second_student.id))
    await fb_db.commit()
    first_request=await request_for(fb_db,actor,evaluation,first)
    second_request=await request_for(fb_db,actor,evaluation,second)
    payload=first_request.model_copy(update={'selecciones':first_request.selecciones+second_request.selecciones})
    second_id=second.id
    before=await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'),{'id':second_id})
    from app.modules.feedback_sharing import batch_service
    actual=batch_service.approve_delivery_review
    async def fail_one(db,actor,evaluation_id,item):
        if item.calificacion_id==second_id:
            raise HTTPException(422,'Mensaje pendiente de corrección.')
        return await actual(db,actor,evaluation_id,item)
    monkeypatch.setattr(batch_service,'approve_delivery_review',fail_one)
    result=await accept_publish_batch(fb_db,actor,evaluation.id,payload)
    await fb_db.commit()
    assert result['exitosos']==1 and result['fallidos']==1
    assert await fb_db.scalar(text('SELECT estado FROM calificaciones WHERE id=:id'),{'id':first.id})=='publicada'
    assert await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'),{'id':second_id})==before
    assert await fb_db.scalar(select(func.count()).select_from(FeedbackDeliveryReview).where(FeedbackDeliveryReview.calificacion_id==second_id))==0
