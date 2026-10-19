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
