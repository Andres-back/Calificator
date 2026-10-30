"""Real PostgreSQL delivery decisions, synthetic records and no inference."""
import asyncio
import importlib.util
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
import pytest
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.modules.calificaciones.breakdown_models import CalificacionDesglose
from app.modules.feedback_sharing.access_policy import guard_token
from app.modules.feedback_sharing.models import FeedbackAccess, FeedbackDeliveryReview
from app.modules.feedback_sharing.schemas import DeliveryReviewInput
from app.modules.feedback_sharing.service import approve_delivery_review, create_access, prepare_grade_preview

MESSAGE = 'Aciertos: identificaste el personaje. Qué mejorar: explica su emoción. Siguiente paso: relee el segundo párrafo y escribe una razón.'


def payload(preview):
    return DeliveryReviewInput(calificacion_id=preview['calificacion_id'],
        source_fingerprint=preview['revision_docente']['source_fingerprint'],
        scope='summary', feedback_text=MESSAGE, request_id=uuid4())


@pytest.mark.asyncio
async def test_135_known_system_envelope_can_be_approved_as_offered_without_editing_academic_source(fb_db, fb_case, monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED', True)
    teacher, _, _, evaluation, grade = fb_case
    grade.estado = 'publicada'
    grade.feedback = ('Retroalimentación provisional: requiere revisión docente porque la evidencia, '
                      'las valoraciones, la suma o el mensaje no coinciden por completo. Borrador basado en el desglose: ' + MESSAGE)
    breakdown = CalificacionDesglose(calificacion_id=grade.id, version=1, cobertura_estado='incompleta',
        puntos_obtenidos=3, puntos_posibles=5, nota_maxima=5, nota_base=3, nota_antes_redondeo=3,
        nota_final=3, requiere_revision=True, bloqueos_json=['verificador_ia:timeout'])
    fb_db.add(breakdown)
    await fb_db.commit()
    academic = text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id')
    before = await fb_db.scalar(academic, {'id': grade.id})
    preview = await prepare_grade_preview(fb_db, teacher, evaluation.id, grade.id)
    assert preview['revision_docente']['feedback_text'] == preview['batch_candidate']['feedback_text'] == MESSAGE
    request = payload(preview).model_copy(update={'feedback_text': preview['revision_docente']['feedback_text']})
    approved = await approve_delivery_review(fb_db, teacher, evaluation.id, request)
    access, token = await create_access(fb_db, teacher, evaluation.id, grade.id, approved.fingerprint, uuid4(), 3, False)
    await fb_db.commit()
    shared = (await guard_token(fb_db, token)).publication.payload_json
    assert shared['retroalimentacion'] == MESSAGE and shared['respuestas'] == []
    assert await fb_db.scalar(academic, {'id': grade.id}) == before
    assert access.id and breakdown.requiere_revision


def test_migration_only_adds_its_new_table():
    source=(Path(__file__).resolve().parents[2]/'alembic/versions/202610230002_feedback_delivery_reviews.py').read_text(encoding='utf-8')
    assert "down_revision = '202610230001'" in source
    upgrade=source.split('def upgrade()',1)[1].split('def downgrade()',1)[0]
    assert 'feedback_delivery_reviews' in upgrade
    for statement in ('DELETE FROM', 'UPDATE CALIFICACIONES', 'ALTER TABLE', 'DROP TABLE', 'TRUNCATE'):
        assert statement not in upgrade.upper()


@pytest.mark.asyncio
async def test_real_upgrade_and_downgrade_leave_existing_rows_intact(fb_db):
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    schema='spec120_migration_'+uuid4().hex
    migration_path=Path(__file__).resolve().parents[2]/'alembic/versions/202610230002_feedback_delivery_reviews.py'
    spec=importlib.util.spec_from_file_location('delivery_review_migration',migration_path)
    migration=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    async with fb_db.bind.begin() as connection:
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        await connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        await connection.execute(text('CREATE TABLE users (id uuid PRIMARY KEY)'))
        await connection.execute(text('CREATE TABLE calificaciones (id uuid PRIMARY KEY, nota numeric, evidencia text)'))
        await connection.execute(text("INSERT INTO calificaciones VALUES (:id, 3, 'synthetic-evidence-unchanged')"),{'id':uuid4()})
        before=(await connection.execute(text('SELECT to_jsonb(c) FROM calificaciones c'))).scalar_one()
        def migrate(sync_connection,operation):
            migration.op=Operations(MigrationContext.configure(sync_connection))
            getattr(migration,operation)()
        await connection.run_sync(lambda sync:migrate(sync,'upgrade'))
        assert await connection.scalar(text("SELECT to_regclass('feedback_delivery_reviews')")) is not None
        await connection.run_sync(lambda sync:migrate(sync,'downgrade'))
        assert await connection.scalar(text("SELECT to_regclass('feedback_delivery_reviews')")) is None
        assert (await connection.execute(text('SELECT to_jsonb(c) FROM calificaciones c'))).scalar_one()==before
        # Only the explicitly-created unique schema; never the base/workspace.
        assert schema.startswith('spec120_migration_') and len(schema)==50
        await connection.execute(text('SET LOCAL search_path TO public'))
        await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


@pytest.mark.asyncio
async def test_published_pending_grade_can_authorize_summary_without_changing_academic_rows(fb_db,fb_case,monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED',True)
    teacher,_,_,evaluation,grade=fb_case
    grade.estado='publicada'
    grade.feedback='Retroalimentación provisional: el análisis requiere revisión.'
    breakdown=CalificacionDesglose(calificacion_id=grade.id,version=1,cobertura_estado='incompleta',
        puntos_obtenidos=3,puntos_posibles=5,nota_maxima=5,nota_base=3,nota_antes_redondeo=3,
        nota_final=3,requiere_revision=True,bloqueos_json=['verificador_ia:timeout'])
    fb_db.add(breakdown)
    await fb_db.commit()
    academic=text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id')
    before=await fb_db.scalar(academic,{'id':grade.id})
    preview=await prepare_grade_preview(fb_db,teacher,evaluation.id,grade.id)
    assert not preview['elegible'] and preview['seleccionable']
    assert not preview['revision_docente']['detail_available']
    request=payload(preview)
    result=await approve_delivery_review(fb_db,teacher,evaluation.id,request)
    await fb_db.commit()
    again=await approve_delivery_review(fb_db,teacher,evaluation.id,request)
    assert again.fingerprint==result.fingerprint
    assert await fb_db.scalar(select(func.count()).select_from(FeedbackDeliveryReview).where(FeedbackDeliveryReview.calificacion_id==grade.id))==1
    access,token=await create_access(fb_db,teacher,evaluation.id,grade.id,result.fingerprint,uuid4(),3,False)
    await fb_db.commit()
    assert (await guard_token(fb_db,token)).publication.payload_json['respuestas']==[]
    assert access.id and await fb_db.scalar(academic,{'id':grade.id})==before
    assert breakdown.requiere_revision
    # An academic source change cannot reuse the reviewed summary or old link.
    grade.feedback='Fuente modificada por el docente.'
    await fb_db.commit()
    with pytest.raises(HTTPException) as exc:
        await guard_token(fb_db,token)
    assert exc.value.status_code==404


@pytest.mark.asyncio
async def test_concurrent_retries_are_one_review_and_replacement_suspends_old_link(fb_db,fb_case,monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED',True)
    teacher,_,_,evaluation,grade=fb_case
    await fb_db.commit()
    preview=await prepare_grade_preview(fb_db,teacher,evaluation.id,grade.id)
    request=payload(preview)
    teacher_id,evaluation_id,grade_id=teacher.id,evaluation.id,grade.id
    await fb_db.rollback()
    sessions=async_sessionmaker(fb_db.bind,expire_on_commit=False)
    async def approve():
        from app.modules.users.models import User
        async with sessions() as db:
            actor=await db.get(User,teacher_id)
            result=await approve_delivery_review(db,actor,evaluation_id,request)
            await db.commit()
            return result
    results=await asyncio.gather(approve(),approve())
    assert results[0].fingerprint==results[1].fingerprint
    assert await fb_db.scalar(select(func.count()).select_from(FeedbackDeliveryReview).where(FeedbackDeliveryReview.calificacion_id==grade_id))==1
    teacher=await fb_db.get(type(teacher),teacher_id)
    old_access,token=await create_access(fb_db,teacher,evaluation_id,grade_id,results[0].fingerprint,uuid4(),3,False)
    await fb_db.commit()
    await approve_delivery_review(fb_db,teacher,evaluation_id,request.model_copy(update={'request_id':uuid4(),'feedback_text':MESSAGE+' Escribe tu explicación con tus palabras.'}))
    await fb_db.commit()
    with pytest.raises(HTTPException):await guard_token(fb_db,token)
    # Approval creates no additional access and does not reactivate one.
    assert await fb_db.scalar(select(func.count()).select_from(FeedbackAccess).where(FeedbackAccess.calificacion_id==grade_id))==1
    assert old_access.id


@pytest.mark.asyncio
async def test_approval_route_preview_print_and_public_scope(fb_client):
    client,actor,case=fb_client
    prefix=f'/api/evaluaciones/{case[-2].id}/devoluciones'
    preview=(await client.post(prefix+'/previsualizar',json={'calificacion_ids':[str(case[-1].id)]})).json()['resultados'][0]
    body=payload(preview).model_dump(mode='json')
    actor['user']=case[1]
    assert (await client.post(prefix+'/revisar',json=body)).status_code==403
    actor['user']=None
    assert (await client.post(prefix+'/revisar',json=body)).status_code==401
    actor['user']=case[0]
    bad={**body,'source_fingerprint':'0'*64}
    assert (await client.post(prefix+'/revisar',json=bad)).status_code==409
    response=await client.post(prefix+'/revisar',json=body)
    assert response.status_code==200
    approved=response.json()
    selected={'calificacion_id':body['calificacion_id'],'fingerprint':approved['fingerprint']}
    printed=await client.post(prefix+'/fichas',json={'selecciones':[selected]})
    assert printed.status_code==200 and printed.json()['resultados'][0]['resultado']['retroalimentacion']==MESSAGE
    assert (await client.get(prefix+'/accesos')).json()['resultados']==[]
    issued=await client.post(prefix+'/accesos',json={'request_id':str(uuid4()),'selecciones':[selected]})
    token=issued.json()['resultados'][0]['url'].split('#')[-1]
    actor['user']=None
    public=await client.get('/api/public/devolucion',headers={'Authorization':'Bearer '+token})
    assert public.status_code==200
    assert public.json()['resultado']['alcance']=='summary'
    assert public.json()['resultado']['respuestas']==[]


@pytest.mark.asyncio
async def test_foreign_teacher_and_withdrawn_enrollment_cannot_authorize(fb_db,fb_case,fb_case_factory,monkeypatch):
    from sqlalchemy import delete
    from app.modules.matriculas.models import Matricula
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED',True)
    teacher,student,subject,evaluation,grade=fb_case
    foreign=(await fb_case_factory(fb_db))[0]
    await fb_db.commit()
    request=payload(await prepare_grade_preview(fb_db,teacher,evaluation.id,grade.id))
    with pytest.raises(HTTPException) as exc:
        await approve_delivery_review(fb_db,foreign,evaluation.id,request)
    assert exc.value.status_code==403
    await fb_db.execute(delete(Matricula).where(Matricula.materia_id==subject.id,Matricula.estudiante_id==student.id))
    await fb_db.commit()
    with pytest.raises(HTTPException) as exc:
        await approve_delivery_review(fb_db,teacher,evaluation.id,request)
    assert exc.value.status_code==409
    assert await fb_db.scalar(select(func.count()).select_from(FeedbackDeliveryReview).where(FeedbackDeliveryReview.calificacion_id==grade.id))==0
