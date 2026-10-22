"""HTTP allow/deny contracts, using synthetic local resources and accounts."""
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.calificaciones.models import Entrega
from app.modules.evaluaciones.schemas import EvaluacionUpdate
from app.modules.evaluaciones.service import get_evaluation_or_404, update_evaluation
from app.modules.evaluaciones.visual_router import router
from app.modules.evaluaciones.visual_schemas import VisualUploadRequest
from app.modules.evaluaciones.visual_service import stage_resource
from app.modules.matriculas.models import Matricula
from tests.integration import test_evaluation_visual_persistence as persistence

# Reuse the isolated fixtures, not the application database configuration.
TEST_URL = persistence.TEST_URL
database = persistence.database
visual_scope = persistence.visual_scope
image_manifest = persistence.image_manifest
legacy_evaluation = persistence.legacy_evaluation
synthetic_png = persistence.synthetic_png

pytestmark = pytest.mark.skipif(not TEST_URL, reason="Requiere PostgreSQL aislado SPEC101_TEST_DATABASE_URL")


@pytest.mark.asyncio
async def test_independent_write_flags_keep_saved_readers_and_reject_new_work(visual_http, monkeypatch):
    from app.core.config import settings
    from app.modules.jobs import service as jobs
    from unittest.mock import AsyncMock
    app_for, owner, _, ids = visual_http
    resolver = AsyncMock()
    monkeypatch.setattr(jobs, '_resolve_job_ai_config', resolver)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_for('profesor', owner)), base_url='http://testserver') as client:
        for imported, edited, generated in ((False, False, False), (True, False, False), (False, True, False), (False, True, True)):
            monkeypatch.setattr(settings, 'EVALUATION_VISUAL_IMPORT_ENABLED', imported)
            monkeypatch.setattr(settings, 'EVALUATION_VISUAL_EDITOR_ENABLED', edited)
            monkeypatch.setattr(settings, 'EVALUATION_VISUAL_GENERATION_ENABLED', generated)
            capabilities = (await client.get('/api/evaluaciones/contenido-visual/capacidades')).json()
            assert (capabilities['importacion'], capabilities['editor'], capabilities['generacion']) == (imported, edited, edited and generated)
            assert (await client.get(f"/api/evaluaciones/{ids['evaluation']}/recursos/{ids['image']}")).status_code == 200
            if not edited or not generated:
                response = await client.post('/api/evaluaciones/recursos/generar', json={
                    'materia_id': str(ids['subject']), 'evaluacion_id': str(ids['evaluation']), 'expected_version_id': str(ids['version']),
                    'pregunta_id': str(uuid4()), 'tipo': 'imagen', 'descripcion': 'Dibujo de prueba', 'request_key': str(uuid4())})
                assert response.status_code == 409
        resolver.assert_not_called()


@pytest.mark.asyncio
async def test_cleanup_retires_unaccepted_bound_proposal_but_keeps_originals_and_revisions(visual_http, visual_scope):
    from datetime import datetime, timedelta, timezone
    from app.modules.evaluaciones.visual_service import cleanup_staged_resources, read_resource_bytes
    from app.modules.evaluaciones.models import EvaluacionRecurso
    sessions, _, _, _ = visual_scope
    _, owner, _, ids = visual_http
    async with sessions() as db:
        proposal = await stage_resource(db, propietario_id=owner,
            request=VisualUploadRequest(materia_id=ids['subject'], evaluacion_id=ids['evaluation'], request_key=uuid4()),
            content=synthetic_png(), clase='imagen', origen='subido')
        proposal.created_at = datetime.now(timezone.utc) - timedelta(days=9)
        await db.commit()
        count = await cleanup_staged_resources(db, before=datetime.now(timezone.utc) - timedelta(days=7))
        assert count == 1 and proposal.estado == 'retired'
        assert await read_resource_bytes(await db.get(EvaluacionRecurso, ids['original'])) == synthetic_png()
        assert await read_resource_bytes(await db.get(EvaluacionRecurso, ids['image'])) == synthetic_png()
        assert (await get_evaluation_or_404(db, ids['evaluation'])).contenido_version_id == ids['version']


@pytest.mark.asyncio
async def test_proposals_three_origins_manual_and_ai_persist_without_implicit_acceptance(visual_http, visual_scope, monkeypatch):
    import base64
    from unittest.mock import AsyncMock
    from sqlalchemy import text
    from app.core.config import settings
    from app.modules.evaluaciones import visual_generation as generation
    from app.modules.evaluaciones.models import EvaluacionContenidoVersion, EvaluacionRecurso
    from app.modules.jobs import service as jobs
    from app.modules.authorization import service as authorization
    from app.workers import tasks_evaluation_visuals as worker
    sessions, _, _, _ = visual_scope
    app_for, owner, student, ids = visual_http
    monkeypatch.setattr(settings, 'EVALUATION_VISUAL_GENERATION_ENABLED', True)
    monkeypatch.setattr(worker, 'AsyncSessionLocal', sessions)
    monkeypatch.setattr(worker, '_heartbeat', AsyncMock())
    monkeypatch.setattr(authorization, 'effective_permissions', AsyncMock(return_value=default_permissions_for_role('profesor')))
    monkeypatch.setattr(jobs, '_resolve_job_ai_config', AsyncMock(return_value={'image': {}, 'content': {}}))
    monkeypatch.setattr(jobs, 'dispatch_persisted_job', lambda row: True)
    image = AsyncMock(return_value=SimpleNamespace(is_placeholder=False, b64_data=base64.b64encode(synthetic_png()).decode()))
    monkeypatch.setattr(generation, 'generate_image', image)
    table = {'encabezados': ['Número', 'Cantidad'], 'filas': [['A', '12']]}
    chart = {'tipo': 'barras', 'categorias': ['A'], 'series': [{'nombre': 'Cantidad', 'valores': [12]}]}
    text_model = SimpleNamespace(generate_json=AsyncMock(return_value={'tabla': table, 'grafica': chart}))
    monkeypatch.setattr(generation, 'LLMRouter', lambda **kwargs: text_model)
    async with sessions() as db:
        for column in ('user_id uuid', 'tipo text', 'progreso int DEFAULT 0', "resultado_json jsonb DEFAULT '{}'",
                       'parent_job_id uuid', 'stage text', 'attempt_count int DEFAULT 0', 'claim_token text',
                       'heartbeat_at timestamptz', 'lease_expires_at timestamptz', 'started_at timestamptz',
                       'finished_at timestamptz', 'error text', 'created_at timestamptz DEFAULT NOW()'):
            await db.execute(text('ALTER TABLE ai_jobs ADD COLUMN ' + column))
        evaluation = await get_evaluation_or_404(db, ids['evaluation'])
        evaluation.estado = 'borrador'
        await db.commit()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_for('profesor', owner)), base_url='http://testserver') as client:
        for origin in ('nativa', 'externa_digitalizada', 'sorpresa'):
            async with sessions() as db:
                evaluation = await get_evaluation_or_404(db, ids['evaluation'])
                evaluation.tipo_origen = origin
                await db.commit()
            for kind in ('imagen', 'dibujo', 'tabla', 'grafica'):
                for source in ('manual', 'ia'):
                    async with sessions() as db:
                        evaluation = await get_evaluation_or_404(db, ids['evaluation'])
                        version_before = evaluation.contenido_version_id
                        question = evaluation.preguntas[0]['contenido_id']
                    request = {'materia_id': str(ids['subject']), 'evaluacion_id': str(ids['evaluation']),
                        'expected_version_id': str(version_before), 'request_key': str(uuid4()),
                        'pregunta_id': question, 'tipo': kind, 'descripcion': f'Material {origin} {kind} {source}'}
                    if source == 'ia':
                        response = await client.post('/api/evaluaciones/recursos/generar', json=request)
                        assert response.status_code == 202, response.text
                        job_id = response.json()['job_id']
                        assert (await client.post('/api/evaluaciones/recursos/generar', json=request)).json()['job_id'] == job_id
                        assert (await worker._generate(__import__('uuid').UUID(job_id), 'synthetic-token'))['status'] == 'success'
                        async with sessions() as db:
                            result = await jobs.get_job_result(db, __import__('uuid').UUID(job_id))
                            block = result['bloque']
                    elif kind in {'tabla', 'grafica'}:
                        response = await client.post('/api/evaluaciones/recursos/estructurado', json={**request, kind: table if kind == 'tabla' else chart})
                        assert response.status_code == 201, response.text
                        block = response.json()['bloque']
                    else:
                        response = await client.post('/api/evaluaciones/recursos', data={key: request[key] for key in ('materia_id', 'evaluacion_id', 'request_key')},
                            files={'file': ('synthetic.png', synthetic_png(), 'image/png')})
                        assert response.status_code == 201, response.text
                        block = {'id': str(uuid4()), 'tipo': kind, 'orden': 0, 'pregunta_ids': [question],
                            'recurso_id': response.json()['id'], 'seguridad_contenido': 'pendiente_revision'}
                    async with sessions() as db:
                        evaluation = await get_evaluation_or_404(db, ids['evaluation'])
                        assert evaluation.contenido_version_id == version_before  # A proposal never edits.
                        block['seguridad_contenido'] = 'publicable_confirmado'
                        manifest = {'pregunta_ids': [question], 'bloques': [block], 'recurso_ids': [block['recurso_id']], 'cobertura': {}}
                        evaluation = await update_evaluation(db, evaluation, EvaluacionUpdate(expected_updated_at=evaluation.updated_at,
                            expected_content_version_id=version_before, contenido_visual=manifest,
                            claves_visuales_revisadas=[question]))
                        revision = await db.get(EvaluacionContenidoVersion, evaluation.contenido_version_id)
                        assert not revision.snapshot_json['claves_pendientes_revision']
                        assert revision.snapshot_json['contenido_visual']['bloques'][0]['recurso_id'] == block['recurso_id']
                        assert (await db.get(EvaluacionRecurso, __import__('uuid').UUID(block['recurso_id']))).estado == 'ready'
                        from app.modules.evaluaciones.visual_render import resolve_visual_material
                        from app.modules.evaluaciones.export_service import build_evaluation_material, render_evaluation_docx
                        from app.modules.herramientas.pdf_render import render_material_pdf
                        material = build_evaluation_material(evaluation, soluciones=False,
                            visual_blocks=await resolve_visual_material(db, evaluation.id, revision))
                        assert render_evaluation_docx(material, soluciones=False).startswith(b'PK')
                        assert render_material_pdf(material, soluciones=False).startswith(b'%PDF')
        assert image.await_count == 6 and text_model.generate_json.await_count == 6
        forbidden = await client.post('/api/evaluaciones/recursos/recortar', json={**request, 'tipo': 'imagen',
            'source_resource_id': str(ids['original']), 'region': [-1, 0, 1, 1]})
        assert forbidden.status_code == 422
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_for('estudiante', student)), base_url='http://testserver') as client:
        assert (await client.post('/api/evaluaciones/recursos/generar', json=request)).status_code == 403


@pytest.mark.asyncio
async def test_saved_grade_details_reports_and_manual_adjustment_keep_historical_scale(visual_http, visual_scope, monkeypatch):
    from decimal import Decimal
    from app.modules.calificaciones import service as grading
    from app.modules.calificaciones.models import Calificacion
    from app.modules.calificaciones.schemas import CalificacionManualCreate
    from app.modules.evaluaciones.models import EvaluacionRecurso
    from app.modules.users.models import User
    from app.services.storage_service import resolve_private_upload_path
    sessions, _, _, _ = visual_scope
    _, owner, student, ids = visual_http
    async with sessions() as db:
        evaluation = await get_evaluation_or_404(db, ids['evaluation'])
        delivery = Entrega(evaluacion_id=evaluation.id, estudiante_id=student, materia_id=evaluation.materia_id,
            contenido_version_id=ids['version'], tipo='foto', estado='revisada', visual_text_json={})
        db.add(delivery)
        await db.flush()
        grade = Calificacion(evaluacion_id=evaluation.id, estudiante_id=student, materia_id=evaluation.materia_id,
            profesor_id=owner, entrega_id=delivery.id, nota_confirmada=4, nota_sugerida=4,
            revisado_por_docente=True, estado='confirmada', resultado_json={})
        db.add(grade)
        await db.commit()
        old_name = evaluation.nombre
        evaluation = await update_evaluation(db, evaluation, EvaluacionUpdate(expected_updated_at=evaluation.updated_at,
            expected_content_version_id=ids['version'], nombre='Nueva versión', nota_maxima=1,
            preguntas=[{**evaluation.preguntas[0], 'puntaje': 1}]))
        # Storage outage must not hide the old note, key, evidence or denominator.
        resource = await db.get(EvaluacionRecurso, ids['image'])
        resolve_private_upload_path(resource.storage_key).unlink()
        detail = await grading.get_calificacion_detalle(db, grade.id)
        assert detail['nota_maxima'] == 5 and detail['evaluacion_nombre'] == old_name
        boletin = await grading.get_boletin(db, student, evaluation.materia_id)
        assert boletin[-1]['nota_maxima'] == 5
        summary = await grading.get_resumen_academico(db, student)
        assert summary['promedio_general'] <= 5
        actor = await db.get(User, owner)
        revised = await grading.set_manual_grade(db, evaluation,
            CalificacionManualCreate(estudiante_id=student, nota_confirmada=Decimal('4.5'), motivo='Revisé la evidencia original.'), actor)
        assert revised.nota_confirmada == Decimal('4.5') and evaluation.nota_maxima == 1


@pytest_asyncio.fixture
async def visual_http(visual_scope, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "EVALUATION_VISUAL_EDITOR_ENABLED", True)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        evaluation_id, submission_id, _ = await legacy_evaluation(db, owner, subject)
        student_id = (await db.get(Entrega, submission_id)).estudiante_id
        db.add(Matricula(materia_id=subject, estudiante_id=student_id, estado="activo"))
        original, image = [await stage_resource(db, propietario_id=owner,
            request=VisualUploadRequest(materia_id=subject, evaluacion_id=evaluation_id, request_key=uuid4()),
            content=synthetic_png(), clase=kind, origen="subido") for kind in ("original", "imagen")]
        evaluation = await get_evaluation_or_404(db, evaluation_id)
        question_id = uuid4()
        manifest = image_manifest(question_id, image.id)
        manifest.original_recurso_id = original.id
        evaluation = await update_evaluation(db, evaluation, EvaluacionUpdate(
            expected_updated_at=evaluation.updated_at,
            preguntas=[{**evaluation.preguntas[0], "contenido_id": str(question_id)}], contenido_visual=manifest))
        # Permission fixture deliberately has a published document; publication
        # checks themselves are tested separately in persistence contracts.
        evaluation.estado = "publicada"
        await db.commit()
        draft = await stage_resource(db, propietario_id=owner,
            request=VisualUploadRequest(materia_id=subject, borrador_id=uuid4(), request_key=uuid4()),
            content=synthetic_png(), clase="imagen", origen="subido")
        await db.commit()
        ids = dict(evaluation=evaluation_id, image=image.id, original=original.id, draft=draft.id,
                   version=evaluation.contenido_version_id, storage_key=original.storage_key, subject=subject)

    def app_for(role, user_id):
        app = FastAPI()
        app.include_router(router, prefix="/api")
        from app.modules.evaluaciones.router import router as evaluation_router
        app.include_router(evaluation_router, prefix="/api")
        from app.modules.calificaciones.router import router as grading_router
        app.include_router(grading_router, prefix="/api")

        async def user_override():
            return SimpleNamespace(id=user_id, rol=role, _effective_permissions=default_permissions_for_role(role))

        async def db_override():
            async with sessions() as db:
                yield db

        app.dependency_overrides[get_current_user] = user_override
        app.dependency_overrides[get_db] = db_override
        return app

    return app_for, owner, student_id, ids


@pytest.mark.asyncio
@pytest.mark.parametrize('pages', [1, 2])
@pytest.mark.parametrize('role', ['profesor', 'estudiante'])
async def test_first_photo_with_content_revision_survives_autoflush(
    visual_http, visual_scope, monkeypatch, pages, role,
):
    """Exercise the real revision query and PostgreSQL NOT NULL constraint.

    A mock session cannot reproduce the autoflush between adding the delivery
    and storing its photo. No external model or broker is used in this test.
    """
    from copy import deepcopy
    from sqlalchemy import select
    from app.modules.calificaciones import router as grading_router
    from app.modules.calificaciones.models import Calificacion
    from app.modules.users.models import User
    from app.services.storage_service import resolve_upload_path

    sessions, _, _, _ = visual_scope
    app_for, owner, _, ids = visual_http
    async with sessions() as db:
        evaluation = await get_evaluation_or_404(db, ids['evaluation'])
        evaluation.recepcion_habilitada = True
        student = User(nombre='Nuevo alumno sintético', email=f'{uuid4()}@example.test',
                       password_hash='no-login', rol='estudiante')
        db.add(student)
        await db.flush()
        student_id = student.id
        db.add(Matricula(materia_id=ids['subject'], estudiante_id=student_id, estado='activo'))
        await db.commit()
        old_grades = [(item.id, item.nota_confirmada, deepcopy(item.resultado_json))
                      for item in await db.scalars(select(Calificacion))]

    queued = []

    async def enqueue(db, **kwargs):
        delivery = kwargs['entrega']
        assert delivery.tipo == ('foto' if pages == 1 else 'pdf')
        assert delivery.contenido_version_id == ids['version']
        assert delivery.estado == 'recibida'
        assert resolve_upload_path(delivery.archivo_url).is_file()
        assert kwargs['evidence_metadata']['paginas'] == pages
        await db.commit()
        await db.refresh(delivery)
        queued.append(delivery.id)
        # Return the same public shape as the real queue, without calling AI.
        return {'id': str(uuid4()), 'evaluacion_id': str(ids['evaluation']),
                'entrega_id': str(delivery.id), 'estudiante_id': str(student_id),
                'materia_id': str(ids['subject']), 'profesor_id': str(owner),
                'nota_sugerida': None, 'nota_confirmada': None, 'confianza': None,
                'feedback': None, 'estado': 'procesando', 'resultado_json': {},
                'revisado_por_docente': False, 'created_at': delivery.created_at,
                'updated_at': delivery.updated_at}

    monkeypatch.setattr(grading_router, '_enqueue_persisted_grading', enqueue)
    field = 'foto' if role == 'profesor' else 'archivo'
    files = [(field, (f'hoja-{page}.png', synthetic_png(), 'image/png')) for page in range(pages)]
    actor = owner if role == 'profesor' else student_id
    path = '/api/calificaciones/foto' if role == 'profesor' else f"/api/evaluaciones/{ids['evaluation']}/entregas/archivo"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_for(role, actor)), base_url='http://testserver') as client:
        response = await client.post(path, files=files,
            data={'evaluacion_id': str(ids['evaluation']), 'estudiante_id': str(student_id)})
        assert response.status_code == 202, response.text
        assert response.json()['estado'] == ('procesando' if role == 'profesor' else 'recibida')
        assert response.json().get('nota_sugerida') is None
    async with sessions() as db:
        deliveries = list(await db.scalars(select(Entrega).where(Entrega.estudiante_id == student_id)))
        assert len(deliveries) == len(queued) == 1
        assert deliveries[0].id == queued[0]
        assert deliveries[0].contenido_version_id == ids['version']
        assert resolve_upload_path(deliveries[0].archivo_url).is_file()
        assert [(item.id, item.nota_confirmada, item.resultado_json)
                for item in await db.scalars(select(Calificacion))] == old_grades


@pytest.mark.asyncio
async def test_online_start_is_idempotent_private_and_submit_keeps_old_content(visual_http, visual_scope, monkeypatch):
    import asyncio
    from app.modules.calificaciones import router as grading_router
    from unittest.mock import AsyncMock
    sessions, _, _, _ = visual_scope
    app_for, _, student, ids = visual_http
    async with sessions() as db:
        evaluation = await get_evaluation_or_404(db, ids['evaluation'])
        evaluation = await update_evaluation(db, evaluation, EvaluacionUpdate(
            expected_updated_at=evaluation.updated_at, expected_content_version_id=evaluation.contenido_version_id,
            nombre='Contenido A', modalidad='online', politica_intento='practica_libre'))
        evaluation.recepcion_habilitada = True
        await db.commit()
        version_a = evaluation.contenido_version_id
    queued = AsyncMock()
    monkeypatch.setattr(grading_router, '_enqueue_persisted_grading', queued)
    path = f"/api/evaluaciones/{ids['evaluation']}"
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_for('estudiante', student)), base_url='http://testserver') as client:
        first, simultaneous = await asyncio.gather(client.post(path + '/iniciar-entrega'), client.post(path + '/iniciar-entrega'))
        assert first.status_code == 200, first.text
        attempt = first.json()
        assert simultaneous.status_code == 200, simultaneous.text
        assert simultaneous.json()['entrega_id'] == attempt['entrega_id']
        assert attempt['evaluacion']['contenido_version_id'] == str(version_a)
        assert attempt['evaluacion']['respuestas_esperadas'] == []
        assert str(ids['original']) not in first.text
        assert attempt['evaluacion']['blueprint'] is None
        second = await client.post(path + '/iniciar-entrega')
        assert second.status_code == 200, second.text
        assert second.json()['entrega_id'] == attempt['entrega_id']
        assert (await client.get(path + '/mi-entrega')).json()['id'] != attempt['entrega_id']
        async with sessions() as db:
            evaluation = await get_evaluation_or_404(db, ids['evaluation'])
            await update_evaluation(db, evaluation, EvaluacionUpdate(
                expected_updated_at=evaluation.updated_at, expected_content_version_id=version_a, nombre='Contenido B'))
            await db.commit()
        resumed = await client.post(path + '/iniciar-entrega')
        assert resumed.json()['evaluacion']['nombre'] == 'Contenido A'
        payload = {'entrega_id': attempt['entrega_id'], 'respuesta_texto': 'P1: Respuesta A'}
        submitted = await client.post(path + '/entregas', json=payload)
        assert submitted.status_code == 201, submitted.text
        assert submitted.json()['id'] == attempt['entrega_id']
        assert queued.await_count == 1
        assert queued.await_args.kwargs['entrega'].contenido_version_id == version_a
        repeated = await client.post(path + '/entregas', json=payload)
        assert repeated.status_code == 201, repeated.text
        assert queued.await_count == 1
        changed = await client.post(path + '/entregas', json={**payload, 'respuesta_texto': 'Otra respuesta'})
        assert changed.status_code == 409
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_for('estudiante', uuid4())), base_url='http://testserver') as client:
        assert (await client.post(path + '/iniciar-entrega')).status_code == 403


@pytest.mark.asyncio
async def test_evaluation_and_list_response_keep_teacher_original_private_from_students(visual_http):
    app_for, owner, student, ids = visual_http
    for role, user in (("profesor", owner), ("estudiante", student)):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_for(role, user)), base_url="http://testserver") as client:
            detail = await client.get(f"/api/evaluaciones/{ids['evaluation']}")
            assert detail.status_code == 200, detail.text
            value = detail.json()
            assert value['contenido_version_id'] == str(ids['version'])
            if role == 'estudiante':
                assert set(value['contenido_visual']) == {'schema_version', 'bloques'}
                assert value['respuestas_esperadas'] == []
                assert 'procedencia' not in value['contenido_visual']['bloques'][0]
                assert str(ids['original']) not in detail.text
            else:
                assert value['contenido_visual']['original_recurso_id'] == str(ids['original'])
            listing = await client.get(f"/api/materias/{ids['subject']}/evaluaciones")
            assert listing.status_code == 200, listing.text
            assert listing.json()[0]['contenido_visual'] == value['contenido_visual']


@pytest.mark.asyncio
@pytest.mark.parametrize('delivery_state,delivery_type', [('en_progreso', 'online'), ('recibida', 'foto')])
async def test_attempt_or_photo_pinned_before_queue_keeps_a_after_evaluation_changes_to_b(
    visual_http, visual_scope, delivery_state, delivery_type,
):
    from copy import deepcopy
    from sqlalchemy import select
    from app.modules.calificaciones.models import Calificacion
    from app.modules.evaluaciones.grading_visual_context import load_grading_context, pin_new_submission_content
    sessions, _, _, _ = visual_scope
    _, _, student, ids = visual_http
    async with sessions() as db:
        evaluation = await get_evaluation_or_404(db, ids['evaluation'])
        old_name = evaluation.nombre
        grades = list(await db.scalars(select(Calificacion).where(Calificacion.evaluacion_id == evaluation.id)))
        notes_before = [(grade.id, grade.nota_confirmada, deepcopy(grade.resultado_json)) for grade in grades]
        delivery = Entrega(evaluacion_id=evaluation.id, estudiante_id=student, materia_id=evaluation.materia_id,
            tipo=delivery_type, estado=delivery_state, visual_text_json={})
        reference = await pin_new_submission_content(db, evaluation, delivery)
        assert reference['contenido_version_id'] == str(ids['version'])
        db.add(delivery)
        await db.commit()
        evaluation = await get_evaluation_or_404(db, evaluation.id)
        updated = await update_evaluation(db, evaluation, EvaluacionUpdate(
            expected_updated_at=evaluation.updated_at, expected_content_version_id=ids['version'], nombre='Versión B',
        ))
        assert updated.contenido_version_id != delivery.contenido_version_id
        context = await load_grading_context(db, updated, delivery)
        assert context.version_id == ids['version']
        assert context.blueprint['nombre'] == old_name
        assert len(context.visuals) == 1
        assert context.visuals[0].image_bytes == synthetic_png()
        after = list(await db.scalars(select(Calificacion).where(Calificacion.evaluacion_id == evaluation.id)))
        assert [(grade.id, grade.nota_confirmada, grade.resultado_json) for grade in after] == notes_before


@pytest.mark.asyncio
@pytest.mark.parametrize('entry', ['worker', 'direct_photo'])
async def test_grading_and_breakdown_consume_a_after_current_evaluation_changes_to_b(visual_http, visual_scope, monkeypatch, entry):
    from copy import deepcopy
    from decimal import Decimal
    from unittest.mock import AsyncMock
    from sqlalchemy import select
    from app.modules.calificaciones import photo_service
    from app.modules.calificaciones.models import Calificacion
    from app.modules.calificaciones.schemas import GradingResult
    from app.modules.calificaciones.breakdown_models import CalificacionDesglose
    from app.modules.evaluaciones.grading_visual_context import pin_new_submission_content
    from app.services.storage_service import save_upload
    from app.workers import tasks_grading
    sessions, _, _, _ = visual_scope
    _, owner, student, ids = visual_http
    async with sessions() as db:
        evaluation = await get_evaluation_or_404(db, ids['evaluation'])
        existing = list(await db.scalars(select(Calificacion).where(Calificacion.evaluacion_id == evaluation.id)))
        before = [(grade.id, grade.nota_confirmada, deepcopy(grade.resultado_json)) for grade in existing]
        old_name = evaluation.nombre
        photo = synthetic_png('red')
        path = await save_upload(photo, 'synthetic.png', subfolder='entregas')
        delivery = Entrega(evaluacion_id=evaluation.id, estudiante_id=student, materia_id=evaluation.materia_id,
            tipo='foto', estado='recibida', archivo_url=path, visual_text_json={})
        reference = await pin_new_submission_content(db, evaluation, delivery)
        db.add(delivery)
        await db.commit()
        evaluation = await get_evaluation_or_404(db, evaluation.id)
        evaluation = await update_evaluation(db, evaluation, EvaluacionUpdate(
            expected_updated_at=evaluation.updated_at, expected_content_version_id=ids['version'], nombre='Contenido B', nota_maxima=1,
            preguntas=[{**question, 'puntaje': 1} for question in evaluation.preguntas]))
        await db.commit()
        component = {'clave': 'pregunta:1', 'puntaje': 4, 'estado': 'parcial', 'respuesta_estudiante': 'Respuesta',
                     'explicacion': 'Compara la figura', 'confianza': .95}
        grade = AsyncMock(return_value=GradingResult(nota_sugerida=Decimal('4'), nota_maxima=Decimal('5'), confianza=.95,
            componentes=[component], raw_model_output={'grader_a': {'componentes': [component]}, 'grader_b': {'componentes': [component]}}))
        if entry == 'worker':
            monkeypatch.setattr(tasks_grading, 'grade_submission', grade)
            result, created = await tasks_grading._grade_delivery(db, evaluacion=evaluation, entrega=delivery,
                profesor_id=owner, expected_content_reference=reference)
            assert created
        else:
            monkeypatch.setattr(photo_service, 'grade_submission', grade)
            result = await photo_service.grade_persisted_photo(db, evaluacion=evaluation, entrega=delivery,
                estudiante_id=student, profesor_id=owner, image_bytes=photo, image_mime='image/png')
        assert result.nota_sugerida == Decimal('4'), result.resultado_json
        sent = grade.await_args.kwargs
        assert sent['blueprint']['nombre'] == old_name and sent['blueprint']['nota_maxima'] == 5
        assert sent['image_bytes'] == photo
        assert sent['evaluation_visuals'][0].image_bytes == synthetic_png()
        assert result.resultado_json['evaluation_content']['version_id'] == str(ids['version'])
        breakdown = await db.scalar(select(CalificacionDesglose).where(CalificacionDesglose.calificacion_id == result.id))
        assert breakdown.nota_maxima == 5
        assert delivery.archivo_url == path
        after = list(await db.scalars(select(Calificacion).where(Calificacion.id.in_([value[0] for value in before]))))
        assert [(record.id, record.nota_confirmada, record.resultado_json) for record in after] == before


@pytest.mark.asyncio
async def test_owner_and_admin_read_original_but_student_and_other_teacher_cannot(visual_http):
    app_for, owner, student, ids = visual_http
    for role, user, allowed in (("profesor", owner, True), ("admin", uuid4(), True),
                                ("estudiante", student, False), ("profesor", uuid4(), False)):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_for(role, user)), base_url="http://testserver") as client:
            response = await client.get(f"/api/evaluaciones/{ids['evaluation']}/original")
            assert response.status_code == (200 if allowed else 403)
            if allowed:
                assert response.content == synthetic_png()
                assert response.headers["cache-control"] == "private, no-store"
                assert response.headers["x-content-type-options"] == "nosniff"
            else:
                assert response.content != synthetic_png()


@pytest.mark.asyncio
async def test_enrolled_student_gets_only_referenced_clean_image(visual_http):
    app_for, owner, student, ids = visual_http
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_for("estudiante", student)), base_url="http://testserver") as client:
        path = f"/api/evaluaciones/{ids['evaluation']}/recursos/"
        assert (await client.get(path + str(ids["image"]))).status_code == 200
        for resource_id in (ids["original"], ids["draft"], uuid4()):
            response = await client.get(path + str(resource_id))
            assert response.status_code in {403, 404}
            assert response.content != synthetic_png()
        assert (await client.get(path + str(ids["image"]), params={"version_id": str(uuid4())})).status_code == 403
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_for("estudiante", uuid4())), base_url="http://testserver") as client:
        assert (await client.get(path + str(ids["image"]))).status_code == 403


@pytest.mark.asyncio
async def test_proposal_preview_is_private_and_no_public_upload_url_serves_bytes(visual_http):
    app_for, owner, student, ids = visual_http
    for role, user, allowed in (("profesor", owner, True), ("admin", uuid4(), True),
                                ("estudiante", student, False), ("profesor", uuid4(), False)):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_for(role, user)), base_url="http://testserver") as client:
            response = await client.get(f"/api/evaluaciones/recursos/{ids['draft']}/propuesta")
            assert response.status_code == (200 if allowed else 403)
            assert (await client.get("/uploads/" + ids["storage_key"])).status_code == 404


@pytest.mark.asyncio
async def test_upload_uses_permissions_and_never_returns_storage_paths(visual_http):
    app_for, owner, student, ids = visual_http
    data = {"materia_id": str(ids["subject"]), "borrador_id": str(uuid4()), "request_key": str(uuid4())}
    for role, user, allowed in (("profesor", owner, True), ("estudiante", student, False), ("profesor", uuid4(), False)):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app_for(role, user)), base_url="http://testserver") as client:
            response = await client.post("/api/evaluaciones/recursos", data=data, files={"file": ("material.png", synthetic_png(), "image/png")})
            assert response.status_code == (201 if allowed else 403)
            if allowed:
                assert response.json()["estado"] == "staged"
                assert set(response.json()) == {"id", "estado", "mime", "bytes_size", "ancho", "alto", "seguridad_contenido"}
                assert ".private" not in response.text and "storage_key" not in response.text
