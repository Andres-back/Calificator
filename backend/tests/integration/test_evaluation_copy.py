from copy import deepcopy
from io import BytesIO
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from spec128_database import database128  # noqa: F401
from app.core.config import settings
from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.dba.models import DBAPersonalizado
from app.modules.evaluaciones import copy_service as copying
from app.modules.evaluaciones.copy_schemas import CopyRequest
from app.modules.evaluaciones.models import Evaluacion, EvaluacionBlueprint, EvaluacionRecurso, EvaluacionContenidoVersion
from app.modules.evaluaciones.visual_schemas import VisualManifest, VisualUploadRequest
from app.modules.evaluaciones.visual_service import _snapshot, content_hash, read_resource_bytes, stage_resource
from app.modules.jobs import service as jobs
from app.modules.materias.models import Materia
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User


async def seed(db, monkeypatch, tmp_path):
    monkeypatch.setattr(settings, 'UPLOADS_DIR', str(tmp_path))
    monkeypatch.setattr(jobs, 'dispatch_persisted_job', lambda _: True)
    async def forbidden_ai(*args, **kwargs):
        raise AssertionError('Copying must not resolve models or call AI')
    monkeypatch.setattr(jobs, '_resolve_job_ai_config', forbidden_ai)
    teacher = User(nombre='Docente sintético', email=f'{uuid4()}@example.test', password_hash='no-login', rol='profesor')
    db.add(teacher); await db.flush()
    teacher._effective_permissions = default_permissions_for_role('profesor')
    source_subject, target = [Materia(profesor_id=teacher.id, nombre=name, codigo_matricula=uuid4().hex[:12]) for name in ('Origen', 'Destino')]
    db.add_all([source_subject, target]); await db.flush()
    question_id, block_id = uuid4(), uuid4()
    source = Evaluacion(materia_id=source_subject.id, profesor_id=teacher.id, nombre='Lectura con figura', tipo_origen='externa_digitalizada',
                        modalidad='fisica', estado='publicada', nota_maxima=5, preguntas=[{'contenido_id': str(question_id), 'numero': 1, 'tipo': 'abierta', 'enunciado': 'Describe la figura.', 'puntaje': 5}],
                        respuestas_esperadas=[{'numero': 1, 'respuesta': 'Una explicación privada'}], criterios=[{'nombre': 'Explicación', 'puntaje_maximo': 5}],
                        configuracion_impresion={'distribucion': 'compacta', 'blanco_negro': True, 'respuestas': {str(question_id): {'lineas': 4}}, 'materiales': {str(block_id): {'ancho_porcentaje': 35, 'disposicion': 'lateral'}}})
    db.add(source); await db.flush()
    source.blueprint = EvaluacionBlueprint(evaluacion_id=source.id, reglas_feedback={'lectura': 'Lectura sintética completa.', 'claves_pendientes': [1]}, contexto_rag=[{'texto': 'Privado de la materia origen'}], preguntas=deepcopy(source.preguntas), criterios=deepcopy(source.criterios))
    pixels = BytesIO(); Image.new('RGB', (80, 80), 'white').save(pixels, format='PNG')
    resources = []
    for kind in ('original', 'imagen'):
        resource = await stage_resource(db, propietario_id=teacher.id, request=VisualUploadRequest(materia_id=source_subject.id, evaluacion_id=source.id, request_key=uuid4()), content=pixels.getvalue(), clase=kind, origen='subido')
        resource.estado = 'ready'; resource.seguridad_contenido = 'privado_original' if kind == 'original' else 'publicable_confirmado'; resources.append(resource)
    manifest = VisualManifest.model_validate({'pregunta_ids': [str(question_id)], 'recurso_ids': [str(resources[1].id)], 'original_recurso_id': str(resources[0].id),
        'bloques': [{'id': str(block_id), 'tipo': 'imagen', 'orden': 0, 'pregunta_ids': [str(question_id)], 'recurso_id': str(resources[1].id), 'seguridad_contenido': 'publicable_confirmado'}]})
    snapshot = _snapshot(source); snapshot.update(contenido_visual=manifest.model_dump(mode='json'), claves_pendientes_revision=[str(question_id)])
    revision = EvaluacionContenidoVersion(evaluacion_id=source.id, numero_version=1, autor_id=teacher.id, content_hash=content_hash(snapshot), motivo='Prueba sintética', origen='importado', snapshot_json=snapshot, coverage_json=manifest.cobertura.model_dump(mode='json'), recurso_ids=[str(item.id) for item in resources], source_resource_id=resources[0].id)
    db.add(revision); await db.flush(); source.contenido_version_id = revision.id
    student = User(nombre='Alumno sintético', email=f'{uuid4()}@example.test', password_hash='no-login', rol='estudiante')
    db.add(student); await db.flush()
    db.add(Matricula(materia_id=source_subject.id, estudiante_id=student.id, estado='activo'))
    delivery = Entrega(evaluacion_id=source.id, estudiante_id=student.id, materia_id=source_subject.id, tipo='online', estado='revisada', respuesta_texto='Respuestas de alumno NO COPIAR')
    db.add(delivery); await db.flush()
    db.add(Calificacion(evaluacion_id=source.id, entrega_id=delivery.id, estudiante_id=student.id, materia_id=source_subject.id, profesor_id=teacher.id, estado='publicada', nota_confirmada=4))
    await db.commit(); await db.refresh(source)
    request = CopyRequest(materia_destino_id=target.id, request_key=uuid4(), expected_updated_at=source.updated_at, expected_content_version_id=source.contenido_version_id)
    return teacher, source, target, resources, request


@pytest.mark.asyncio
async def test_128_copy_is_complete_private_independent_and_idempotent(database128, monkeypatch, tmp_path):
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, source, target, resources, request = await seed(db, monkeypatch, tmp_path)
        before = deepcopy(source.preguntas)
        first = await copying.request_copy(db, source.id, request, actor)
        second = await copying.request_copy(db, source.id, request, actor)
        assert first['job_id'] == second['job_id']
        assert await jobs.claim_job_running(db, first['job_id'], claim_token='synthetic-token')
        await db.commit()
        copied_id = await copying.perform_copy(db, first['job_id'], 'synthetic-token')
        copied = await db.get(Evaluacion, copied_id)
        assert copied.id != source.id and copied.materia_id == target.id and copied.estado == 'borrador'
        assert copied.recepcion_habilitada is False and copied.fecha_publicacion is None
        assert copied.material_origen_id is None and copied.lectura == 'Lectura sintética completa.'
        assert copied.blueprint.contexto_rag == []
        assert copied.preguntas[0]['contenido_id'] != source.preguntas[0]['contenido_id']
        assert list(copied.configuracion_impresion['respuestas']) == [copied.preguntas[0]['contenido_id']]
        assert copied.respuestas_esperadas == source.respuestas_esperadas
        revision = await db.get(EvaluacionContenidoVersion, copied.contenido_version_id)
        assert revision.snapshot_json['claves_pendientes_revision'] == [copied.preguntas[0]['contenido_id']]
        cloned = list(await db.scalars(select(EvaluacionRecurso).where(EvaluacionRecurso.evaluacion_id == copied.id).order_by(EvaluacionRecurso.clase)))
        assert len(cloned) == 2
        await copying.cleanup_failed_files(db, first['job_id'])  # Uncertain post-commit failure must preserve referenced bytes.
        assert {item.storage_key for item in cloned}.isdisjoint(item.storage_key for item in resources)
        assert {item.id for item in cloned}.isdisjoint(item.id for item in resources)
        for item in cloned:
            assert await read_resource_bytes(item) == await read_resource_bytes(next(row for row in resources if row.clase == item.clase))
        assert next(item for item in cloned if item.clase == 'original').seguridad_contenido == 'privado_original'
        assert await db.scalar(select(func.count(Calificacion.id))) == 1
        for model in (Calificacion, Entrega, Matricula):
            assert await db.scalar(select(func.count(model.id)).where(model.materia_id == target.id)) == 0
        from app.modules.evaluaciones.visual_render import resolve_visual_material
        from app.modules.evaluaciones.export_service import build_evaluation_material
        blocks = await resolve_visual_material(db, copied.id, revision)
        material = build_evaluation_material(copied, soluciones=False, visual_blocks=blocks)
        assert material['contenido_json']['texto'] == 'Lectura sintética completa.'
        assert len(material['contenido_json']['preguntas'][0]['_evaluation_visuals']) == 1
        assert material['contenido_json']['configuracion_impresion'] == copied.configuracion_impresion
        assert 'respuesta_correcta' not in material['contenido_json']['preguntas'][0]
        # Exercise the unchanged serializers with the actual copied resources.
        from app.modules.evaluaciones.export_service import render_evaluation_docx
        from app.modules.herramientas.pdf_render import render_material_pdf
        from zipfile import ZipFile
        import fitz
        with ZipFile(BytesIO(render_evaluation_docx(material, soluciones=False))) as archive:
            xml = archive.read('word/document.xml').decode()
            assert 'Lectura sintética completa.' in xml and 'Describe la figura.' in xml
            assert 'Una explicación privada' not in xml
            assert any(name.startswith('word/media/') for name in archive.namelist())
        with fitz.open(stream=render_material_pdf(material, soluciones=False), filetype='pdf') as document:
            assert document.page_count >= 1
            text = ''.join(page.get_text() for page in document)
            assert 'Lectura sintética completa.' in text and 'Una explicación privada' not in text
            assert any(page.get_images() for page in document)
        copied.preguntas = [{**copied.preguntas[0], 'enunciado': 'Edición independiente'}]; await db.commit(); await db.refresh(source)
        assert source.preguntas == before
        again = await copying.request_copy(db, source.id, request, actor)
        assert UUID(str(again['evaluacion_id'])) == copied.id
        assert await db.scalar(select(func.count(Evaluacion.id))) == 2


@pytest.mark.asyncio
async def test_128_copy_rejects_other_owner_stale_source_and_missing_material(database128, monkeypatch, tmp_path):
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, source, target, resources, request = await seed(db, monkeypatch, tmp_path)
        other = User(id=uuid4(), rol='profesor'); other._effective_permissions = actor._effective_permissions
        with pytest.raises(HTTPException) as error:
            await copying.request_copy(db, source.id, request, other)
        assert error.value.status_code in (403, 404)
        stale = request.model_copy(update={'expected_content_version_id': uuid4()})
        with pytest.raises(HTTPException) as error:
            await copying.request_copy(db, source.id, stale, actor)
        assert error.value.status_code == 409
        from app.services.storage_service import resolve_private_upload_path
        resolve_private_upload_path(resources[0].storage_key).unlink()
        with pytest.raises(HTTPException) as error:
            await copying.request_copy(db, source.id, request, actor)
        assert error.value.status_code == 409
        assert await db.scalar(select(func.count(Evaluacion.id))) == 1


@pytest.mark.asyncio
async def test_128_copy_rolls_back_partial_files_and_retries_the_same_operation(database128, monkeypatch, tmp_path):
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, source, target, resources, request = await seed(db, monkeypatch, tmp_path)
        actor_id, source_id = actor.id, source.id
        resource_ids = [item.id for item in resources]
        originals = [await read_resource_bytes(item) for item in resources]
        admitted = await copying.request_copy(db, source.id, request, actor)
        job_id = admitted['job_id']
        assert await jobs.claim_job_running(db, job_id, claim_token='first')
        await db.commit()
        write = copying._write_copy
        calls = 0
        def fail_second(*args):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError('Synthetic file failure')
            return write(*args)
        monkeypatch.setattr(copying, '_write_copy', fail_second)
        with pytest.raises(OSError):
            await copying.perform_copy(db, job_id, 'first')
        await db.rollback()
        await copying.cleanup_failed_files(db, job_id)
        await jobs.finish_job(db, job_id, estado='requires_review', resultado_json={'claim_token': 'first'}, error='Synthetic failure')
        await db.commit()
        assert await db.scalar(select(func.count(Evaluacion.id))) == 1
        assert not list((tmp_path / '.private/evaluation-copies' / str(job_id)).glob('*'))
        for resource_id, content in zip(resource_ids, originals):
            assert await read_resource_bytes(await db.get(EvaluacionRecurso, resource_id)) == content
        actor = await db.get(User, actor_id); actor._effective_permissions = default_permissions_for_role('profesor')
        retry = await copying.request_copy(db, source_id, request, actor)
        assert retry['job_id'] == job_id
        monkeypatch.setattr(copying, '_write_copy', write)
        assert await jobs.claim_job_running(db, job_id, claim_token='second')
        await db.commit()
        await copying.perform_copy(db, job_id, 'second')
        assert await db.scalar(select(func.count(Evaluacion.id))) == 2
        assert (await copying.read_copy(db, job_id, actor))['estado'] == 'success'


@pytest.mark.asyncio
async def test_128_admitted_snapshot_survives_source_edits_and_archived_destination(database128, monkeypatch, tmp_path):
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, source, target, resources, request = await seed(db, monkeypatch, tmp_path)
        admitted = await copying.request_copy(db, source.id, request, actor)
        source.nombre = 'Edición posterior'
        source.preguntas = [{**source.preguntas[0], 'enunciado': 'Pregunta posterior'}]
        target.estado = 'archivada'
        await db.commit()
        await db.refresh(source)
        assert await jobs.claim_job_running(db, admitted['job_id'], claim_token='frozen')
        await db.commit()
        copied = await db.get(Evaluacion, await copying.perform_copy(db, admitted['job_id'], 'frozen'))
        assert copied.nombre == 'Lectura con figura' and copied.preguntas[0]['enunciado'] == 'Describe la figura.'
        assert copied.estado == 'borrador' and copied.recepcion_habilitada is False
        with pytest.raises(HTTPException) as error:
            await copying.request_copy(db, source.id, request.model_copy(update={'request_key': uuid4(), 'expected_updated_at': source.updated_at}), actor)
        assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_128_copy_contract_permissions_and_private_status(database128, monkeypatch, tmp_path):
    from httpx import ASGITransport, AsyncClient
    from app.core.permissions import get_current_user
    from app.db.session import get_db
    from app.main import create_app
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, source, target, resources, request = await seed(db, monkeypatch, tmp_path)
        admitted = await copying.request_copy(db, source.id, request, actor)
        with pytest.raises(HTTPException) as error:
            await copying.request_copy(db, source.id, request.model_copy(update={'nombre': 'Otra intención'}), actor)
        assert error.value.status_code == 409
        async def database_override():
            yield db
        app = create_app(); app.dependency_overrides[get_db] = database_override
        app.dependency_overrides[get_current_user] = lambda: actor
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://localhost') as client:
            retry = await client.post(f'/api/jobs/{admitted["job_id"]}/reintentar')
            assert retry.status_code == 409 and 'Usar en otra materia' in retry.json()['detail']
            response = await client.get(f'/api/evaluaciones/{source.id}/ultima-copia')
            assert response.status_code == 200
            result = response.json()
            assert UUID(result['job_id']) == admitted['job_id']
            assert set(result) == {'job_id', 'estado', 'progreso', 'materia_destino_id', 'evaluacion_id', 'error', 'solicitud'}
            assert set(result['solicitud']) == set(request.model_dump())
            outsider = User(id=uuid4(), rol='profesor'); outsider._effective_permissions = actor._effective_permissions
            app.dependency_overrides[get_current_user] = lambda: outsider
            assert (await client.get(f'/api/evaluaciones/copias/{admitted["job_id"]}')).status_code == 404
            outsider._effective_permissions = default_permissions_for_role('estudiante')
            assert (await client.post(f'/api/evaluaciones/{source.id}/copiar', json=request.model_dump(mode='json'))).status_code == 403
            assert (await client.get(f'/api/evaluaciones/{source.id}/ultima-copia')).status_code == 403
            assert (await client.get(f'/api/evaluaciones/copias/{admitted["job_id"]}')).status_code == 403
        # A role/permission withdrawal after admission is checked from the DB.
        actor.rol = 'estudiante'; await db.commit()
        assert await jobs.claim_job_running(db, admitted['job_id'], claim_token='revoked')
        await db.commit()
        with pytest.raises(HTTPException) as error:
            await copying.perform_copy(db, admitted['job_id'], 'revoked')
        assert error.value.status_code == 403
        assert await db.scalar(select(func.count(Evaluacion.id))) == 1


@pytest.mark.asyncio
async def test_128_worker_copies_custom_criteria_and_duplicate_delivery_does_not_run_again(database128, monkeypatch, tmp_path):
    from app.modules.evaluaciones import copy_worker
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    monkeypatch.setattr(copy_worker, 'AsyncSessionLocal', sessions)
    async with sessions() as db:
        actor, source, target, resources, request = await seed(db, monkeypatch, tmp_path)
        custom = DBAPersonalizado(profesor_id=actor.id, materia_id=source.materia_id, area='Ciencias', grado='4', enunciado='Describir la evidencia', evidencias_aprendizaje='Detalle observado')
        db.add(custom); await db.flush()
        source.dba_personalizado_ids = [str(custom.id)]
        old_revision = await db.get(EvaluacionContenidoVersion, source.contenido_version_id)
        snapshot = deepcopy(old_revision.snapshot_json)
        snapshot['dba_personalizado_ids'] = [str(custom.id)]
        snapshot['blueprint']['dba'] = [{'id': str(custom.id), 'enunciado': custom.enunciado}]
        source.blueprint.dba = deepcopy(snapshot['blueprint']['dba'])
        revision = EvaluacionContenidoVersion(evaluacion_id=source.id, numero_version=2, autor_id=actor.id, previous_version_id=old_revision.id,
            content_hash=content_hash(snapshot), motivo='Criterio añadido', origen='edicion', snapshot_json=snapshot,
            coverage_json=old_revision.coverage_json, recurso_ids=old_revision.recurso_ids, source_resource_id=old_revision.source_resource_id)
        db.add(revision); await db.flush(); source.contenido_version_id = revision.id
        await db.commit(); await db.refresh(source)
        request = request.model_copy(update={'expected_updated_at': source.updated_at, 'expected_content_version_id': source.contenido_version_id})
        admitted = await copying.request_copy(db, source.id, request, actor)
        job_id, old_custom_id, target_id = admitted['job_id'], custom.id, target.id
    result = await copy_worker.run(job_id, 'worker')
    assert result.get('evaluacion_id')
    assert await copy_worker.run(job_id, 'duplicate-worker') == {'status': 'not_claimed'}
    async with sessions() as db:
        copied = await db.get(Evaluacion, UUID(result['evaluacion_id']))
        copied_custom = await db.get(DBAPersonalizado, UUID(copied.dba_personalizado_ids[0]))
        assert copied_custom.id != old_custom_id and copied_custom.materia_id == target_id
        assert copied_custom.enunciado == 'Describir la evidencia'
        assert copied.blueprint.dba[0]['id'] == str(copied_custom.id)
        assert await db.scalar(select(func.count(Evaluacion.id))) == 2


@pytest.mark.asyncio
async def test_128_legacy_copy_has_fresh_ids_without_blocking_previously_ready_keys(database128, monkeypatch, tmp_path):
    from app.modules.evaluaciones.service import publish_evaluation
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, source, target, resources, request = await seed(db, monkeypatch, tmp_path)
        questions = [{'numero': 1, 'tipo': 'opcion_multiple', 'enunciado': '¿Cuánto es 2+2?', 'opciones': ['A) 2', 'B) 4'], 'puntaje': 5}]
        keys = [{'numero': 1, 'respuesta': 'B) 4'}]
        criteria = [{'nombre': 'Dominio', 'puntaje_maximo': 5}]
        legacy = Evaluacion(id=uuid4(), materia_id=source.materia_id, profesor_id=actor.id, nombre='Preparada heredada',
            tipo_origen='nativa', modalidad='fisica', estado='publicada', preguntas=deepcopy(questions),
            respuestas_esperadas=deepcopy(keys), criterios=deepcopy(criteria), nota_maxima=5)
        legacy.blueprint = EvaluacionBlueprint(evaluacion_id=legacy.id, preguntas=deepcopy(questions),
            respuestas_esperadas=deepcopy(keys), criterios=deepcopy(criteria), reglas_feedback={'estrategia_calificacion': 'objetiva'})
        db.add(legacy); await db.commit(); await db.refresh(legacy)
        request = CopyRequest(materia_destino_id=target.id, request_key=uuid4(), expected_updated_at=legacy.updated_at)
        admitted = await copying.request_copy(db, legacy.id, request, actor)
        assert await jobs.claim_job_running(db, admitted['job_id'], claim_token='legacy')
        await db.commit()
        copied = await db.get(Evaluacion, await copying.perform_copy(db, admitted['job_id'], 'legacy'))
        assert copied.preguntas[0]['contenido_id'] and copied.respuestas_esperadas == keys
        published = await publish_evaluation(db, copied)
        assert published.estado == 'publicada'
        await db.refresh(legacy)
        assert legacy.preguntas == questions


@pytest.mark.asyncio
async def test_128_recovery_cleans_only_abandoned_staging_once(database128, monkeypatch, tmp_path):
    from sqlalchemy import text
    from app.modules.evaluaciones import copy_worker
    from app.services.storage_service import resolve_private_upload_path
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    monkeypatch.setattr(copy_worker, 'AsyncSessionLocal', sessions)
    async with sessions() as db:
        actor, source, target, resources, request = await seed(db, monkeypatch, tmp_path)
        admitted = await copying.request_copy(db, source.id, request, actor)
        job_id = admitted['job_id']
        original = await read_resource_bytes(resources[0])
        key = copying._copy_key(job_id, {field: str(getattr(resources[0], field)) for field in ('id', 'mime')})
        copying._write_copy(key, original, resources[0].sha256)
        await jobs.finish_job(db, job_id, estado='requires_review', resultado_json={}, error='Synthetic interruption')
        await db.execute(text("UPDATE ai_jobs SET finished_at=NOW()-INTERVAL '10 minutes' WHERE id=:id"), {'id': job_id})
        original_key = resources[0].storage_key
        await db.commit()
    assert await copy_worker.recover() == {'recovered': 0}
    assert not resolve_private_upload_path(key).exists()
    assert resolve_private_upload_path(original_key).read_bytes() == original
    async with sessions() as db:
        result = (await db.execute(text('SELECT resultado_json FROM ai_jobs WHERE id=:id'), {'id': job_id})).scalar_one()
        assert result['_copy_cleaned'] is True
    assert await copy_worker.recover() == {'recovered': 0}


@pytest.mark.asyncio
async def test_128_multipage_reading_mixed_questions_and_table_survive_reopen(database128, monkeypatch, tmp_path):
    import fitz
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, source, target, resources, request = await seed(db, monkeypatch, tmp_path)
        with fitz.open() as document:
            for number in (1, 2):
                document.new_page().insert_text((40, 40), f'Synthetic source page {number}')
            pdf = document.tobytes()
        original = await stage_resource(db, propietario_id=actor.id,
            request=VisualUploadRequest(materia_id=source.materia_id, evaluacion_id=source.id, request_key=uuid4()),
            content=pdf, clase='original', origen='subido')
        original.estado = 'ready'; original.seguridad_contenido = 'privado_original'
        revision = await db.get(EvaluacionContenidoVersion, source.contenido_version_id)
        snapshot = deepcopy(revision.snapshot_json)
        q2, q3, table_id = map(str, (uuid4(), uuid4(), uuid4()))
        snapshot['preguntas'][0]['puntaje'] = 3
        snapshot['preguntas'].extend([
            {'contenido_id': q2, 'numero': 2, 'tipo': 'opcion_multiple', 'enunciado': 'Elige la reserva mayor.', 'opciones': ['A) Río', 'B) Lago'], 'puntaje': 1},
            {'contenido_id': q3, 'numero': 3, 'tipo': 'verdadero_falso', 'enunciado': 'El agua es necesaria.', 'puntaje': 1}])
        snapshot['respuestas_esperadas'].extend([{'numero': 2, 'respuesta': 'B) Lago'}, {'numero': 3, 'respuesta': 'Verdadero'}])
        reading = 'Primera página: el río aporta agua.\n\nSegunda página: el lago almacena agua.'
        snapshot['blueprint']['reglas_feedback']['lectura'] = reading
        snapshot['blueprint']['preguntas'] = deepcopy(snapshot['preguntas'])
        snapshot['blueprint']['respuestas_esperadas'] = deepcopy(snapshot['respuestas_esperadas'])
        visual = snapshot['contenido_visual']
        visual['pregunta_ids'].extend([q2, q3]); visual['original_recurso_id'] = str(original.id)
        visual['bloques'].append({'id': table_id, 'tipo': 'tabla', 'orden': 1, 'pregunta_ids': [q2],
            'recurso_id': str(resources[1].id), 'seguridad_contenido': 'publicable_confirmado',
            'tabla': {'encabezados': ['Reserva', 'Cantidad'], 'filas': [['Río', '2'], ['Lago', '4']]}})
        manifest = VisualManifest.model_validate(visual)
        snapshot['contenido_visual'] = manifest.model_dump(mode='json')
        source.preguntas = deepcopy(snapshot['preguntas']); source.respuestas_esperadas = deepcopy(snapshot['respuestas_esperadas'])
        source.blueprint.reglas_feedback = deepcopy(snapshot['blueprint']['reglas_feedback'])
        fresh = EvaluacionContenidoVersion(evaluacion_id=source.id, numero_version=2, autor_id=actor.id,
            previous_version_id=revision.id, content_hash=content_hash(snapshot), motivo='Documento completo sintético',
            origen='edicion', snapshot_json=snapshot, coverage_json=revision.coverage_json,
            recurso_ids=[str(resources[1].id), str(original.id)], source_resource_id=original.id)
        db.add(fresh); await db.flush(); source.contenido_version_id = fresh.id
        await db.commit(); await db.refresh(source)
        request = request.model_copy(update={'expected_updated_at': source.updated_at, 'expected_content_version_id': fresh.id})
        admitted = await copying.request_copy(db, source.id, request, actor)
        assert await jobs.claim_job_running(db, admitted['job_id'], claim_token='mixed')
        await db.commit()
        copied_id = await copying.perform_copy(db, admitted['job_id'], 'mixed')
    async with sessions() as db:
        from sqlalchemy.orm import selectinload
        copied = await db.scalar(select(Evaluacion).options(selectinload(Evaluacion.blueprint)).where(Evaluacion.id == copied_id))
        assert copied.lectura == reading and [item['numero'] for item in copied.preguntas] == [1, 2, 3]
        assert copied.preguntas[1]['opciones'] == ['A) Río', 'B) Lago'] and copied.preguntas[2]['tipo'] == 'verdadero_falso'
        revision = await db.get(EvaluacionContenidoVersion, copied.contenido_version_id)
        table = next(item for item in revision.snapshot_json['contenido_visual']['bloques'] if item['tipo'] == 'tabla')
        assert table['tabla']['filas'] == [['Río', '2'], ['Lago', '4']]
        assert table['pregunta_ids'] == [copied.preguntas[1]['contenido_id']]
        resource = await db.get(EvaluacionRecurso, revision.source_resource_id)
        assert resource.seguridad_contenido == 'privado_original'
        with fitz.open(stream=await read_resource_bytes(resource), filetype='pdf') as document:
            assert document.page_count == 2


@pytest.mark.asyncio
async def test_128_simultaneous_requests_allocate_one_durable_operation(database128, monkeypatch, tmp_path):
    import asyncio
    from sqlalchemy import text
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        actor, source, target, resources, request = await seed(db, monkeypatch, tmp_path)
        actor_id, source_id = actor.id, source.id
    async def submit():
        async with sessions() as db:
            actor = await db.get(User, actor_id)
            actor._effective_permissions = default_permissions_for_role('profesor')
            return await copying.request_copy(db, source_id, request, actor)
    results = await asyncio.gather(submit(), submit())
    assert {item['job_id'] for item in results} == {request.request_key}
    async with sessions() as db:
        assert (await db.execute(text('SELECT COUNT(*) FROM ai_jobs'))).scalar_one() == 1
        assert await db.scalar(select(func.count(Evaluacion.id))) == 1
