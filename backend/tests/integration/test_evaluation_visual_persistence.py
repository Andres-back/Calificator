"""Synthetic PostgreSQL contracts; never fall back to the application database."""
from __future__ import annotations

import importlib.util
import json
import os
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import pytest
import pytest_asyncio
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import inspect, select, text
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from fastapi import HTTPException
from PIL import Image

from app.db.base import Base, import_models
from app.modules.evaluaciones.models import EvaluacionContenidoVersion, EvaluacionRecurso

TEST_URL = os.getenv("SPEC101_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="Requiere PostgreSQL aislado SPEC101_TEST_DATABASE_URL")
import_models()


@pytest_asyncio.fixture
async def database():
    schema = "spec101_" + uuid4().hex
    admin = create_async_engine(TEST_URL)
    async with admin.begin() as connection:
        await connection.execute(text(f"CREATE SCHEMA {schema}"))
    engine = create_async_engine(TEST_URL, connect_args={"server_settings": {"search_path": schema + ",public"}})
    try:
        yield engine
    finally:
        await engine.dispose()
        async with admin.begin() as connection:
            # Only the literal random schema created by this fixture is removed.
            await connection.execute(text(f"DROP SCHEMA {schema} CASCADE"))
        await admin.dispose()


def apply_migration(connection):
    path = Path(__file__).parents[2] / "alembic/versions/202610150001_evaluation_visual_content.py"
    spec = importlib.util.spec_from_file_location("visual_content_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(connection)):
        module.upgrade()


@pytest.mark.asyncio
async def test_additive_migration_preserves_legacy_keys_notes_and_evidence(database):
    evaluation_id, submission_id, grade_id = uuid4(), uuid4(), uuid4()
    async with database.begin() as connection:
        for table in ("users", "materias"):
            await connection.execute(text(f"CREATE TABLE {table} (id uuid PRIMARY KEY)"))
        await connection.execute(text("CREATE TABLE evaluaciones (id uuid PRIMARY KEY, preguntas jsonb, respuestas_esperadas jsonb)"))
        await connection.execute(text("CREATE TABLE entregas (id uuid PRIMARY KEY, archivo_url text, visual_text_json jsonb)"))
        await connection.execute(text("CREATE TABLE calificaciones (id uuid PRIMARY KEY, nota_confirmada numeric, resultado_json jsonb)"))
        await connection.execute(text("INSERT INTO evaluaciones VALUES (:id, CAST(:questions AS jsonb), CAST(:keys AS jsonb))"),
                                 {"id": evaluation_id, "questions": json.dumps([{"numero": 1, "enunciado": "Doce"}]), "keys": json.dumps([{"numero": 1, "respuesta": "12"}])})
        await connection.execute(text("INSERT INTO entregas VALUES (:id, 'fixture/no-real-file.png', CAST(:payload AS jsonb))"), {"id": submission_id, "payload": '{"legacy":true}'})
        await connection.execute(text("INSERT INTO calificaciones VALUES (:id, 3.8, CAST(:payload AS jsonb))"), {"id": grade_id, "payload": '{"decision_docente":true}'})
        before = {table: (await connection.execute(text(f"SELECT * FROM {table}"))).mappings().all() for table in ("evaluaciones", "entregas", "calificaciones")}
        await connection.run_sync(apply_migration)
        for table, rows in before.items():
            current = (await connection.execute(text(f"SELECT * FROM {table}"))).mappings().all()
            assert len(current) == len(rows)
            for column, value in rows[0].items():
                assert current[0][column] == value
        assert await connection.scalar(text("SELECT contenido_version_id FROM evaluaciones")) is None
        assert await connection.scalar(text("SELECT contenido_version_id FROM entregas")) is None
        for table in ("evaluacion_recursos", "evaluacion_contenido_versiones"):
            assert await connection.scalar(text(f"SELECT count(*) FROM {table}")) == 0
        columns = await connection.run_sync(lambda sync: {item["name"] for item in inspect(sync).get_columns("evaluacion_recursos")})
        assert {"storage_key", "sha256", "estado", "borrador_id", "request_key"} <= columns
        teacher_id, version_id = uuid4(), uuid4()
        await connection.execute(text("INSERT INTO users VALUES (:id)"), {"id": teacher_id})
        await connection.execute(text("INSERT INTO evaluacion_contenido_versiones (id, evaluacion_id, numero_version, autor_id, schema_version, content_hash, motivo, origen, snapshot_json, coverage_json, recurso_ids) VALUES (:id,:evaluation,1,:author,1,:hash,'Prueba','subido','{}','{}','[]')"),
                                 {"id": version_id, "evaluation": evaluation_id, "author": teacher_id, "hash": "a" * 64})
        async with connection.begin_nested() as savepoint:
            with pytest.raises(DBAPIError, match="inmutables"):
                await connection.execute(text("UPDATE evaluacion_contenido_versiones SET snapshot_json='{}' WHERE id=:id"), {"id": version_id})
            await savepoint.rollback()


@pytest.mark.asyncio
async def test_models_are_registered_and_draft_resources_have_scoped_idempotency(database):
    async with database.begin() as connection:
        await connection.run_sync(create_domain_tables)
    from app.modules.materias.models import Materia
    from app.modules.users.models import User

    sessions = async_sessionmaker(database, expire_on_commit=False)
    async with sessions() as db:
        teacher = User(nombre="Docente sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="profesor")
        db.add(teacher)
        await db.flush()
        subject = Materia(profesor_id=teacher.id, nombre="Materia sintética", codigo_matricula=uuid4().hex[:12])
        db.add(subject)
        await db.flush()
        request_key, draft_id = uuid4(), uuid4()
        values = dict(propietario_id=teacher.id, materia_id=subject.id, borrador_id=draft_id, request_key=request_key,
                      clase="imagen", origen="subido", storage_key=".private/evaluaciones/fixture.png",
                      sha256="a" * 64, mime="image/png", bytes_size=100, estado="staged", seguridad_contenido="pendiente_revision")
        resource = EvaluacionRecurso(**values)
        db.add(resource)
        await db.commit()
        assert resource.evaluacion_id is None
        assert await db.scalar(select(EvaluacionRecurso.id)) == resource.id
        db.add(EvaluacionRecurso(**values))
        with pytest.raises(IntegrityError):
            await db.flush()
        await db.rollback()
    assert "evaluacion_contenido_versiones" in Base.metadata.tables
    assert "contenido_version_id" in Base.metadata.tables["entregas"].c
    assert EvaluacionContenidoVersion.__table__.c.snapshot_json.nullable is False


def create_domain_tables(connection):
    """Only the domain under test and FK ancestors; no RAG/provider dependency."""
    tables = set()

    def include(table):
        if table in tables:
            return
        tables.add(table)
        for fk in table.foreign_keys:
            include(fk.column.table)

    for name in ("evaluacion_recursos", "evaluacion_contenido_versiones", "entregas", "calificaciones", "evaluacion_blueprints", "matriculas"):
        include(Base.metadata.tables[name])
    Base.metadata.create_all(connection, tables=list(tables))


def test_migration_refuses_destructive_downgrade():
    path = Path(__file__).parents[2] / "alembic/versions/202610150001_evaluation_visual_content.py"
    spec = importlib.util.spec_from_file_location("visual_content_rollback", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with pytest.raises(RuntimeError, match="conservar"):
        module.downgrade()


@pytest_asyncio.fixture
async def visual_scope(database, tmp_path, monkeypatch):
    from app.core.config import settings
    from app.modules.materias.models import Materia
    from app.modules.users.models import User

    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    async with database.begin() as connection:
        await connection.run_sync(create_domain_tables)
        await connection.execute(text("CREATE TABLE ai_jobs (id uuid PRIMARY KEY, estado text, input_json jsonb, entrega_id uuid)"))
    sessions = async_sessionmaker(database, expire_on_commit=False)
    async with sessions() as db:
        owner = User(nombre="Docente sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="profesor")
        db.add(owner)
        await db.flush()
        subject = Materia(profesor_id=owner.id, nombre="Materia sintética", codigo_matricula=uuid4().hex[:12])
        db.add(subject)
        await db.commit()
        yield sessions, owner.id, subject.id, tmp_path


def synthetic_png(color="white"):
    target = BytesIO()
    Image.new("RGB", (12, 8), color).save(target, format="PNG")
    return target.getvalue()


async def new_import_payload(db, owner, subject):
    from app.modules.evaluaciones.schemas import DigitalizarEvaluacionExternaRequest
    from app.modules.evaluaciones.visual_schemas import VisualManifest, VisualUploadRequest
    from app.modules.evaluaciones.visual_service import stage_resource

    question = uuid4()
    resource = await stage_resource(db, propietario_id=owner,
        request=VisualUploadRequest(materia_id=subject, borrador_id=uuid4(), request_key=uuid4()),
        content=synthetic_png(), clase="imagen", origen="importado")
    manifest = image_manifest(question, resource.id)
    payload = DigitalizarEvaluacionExternaRequest(materia_id=subject, nombre="Importación sintética", modalidad="fisica",
        estructura_detectada={"preguntas": [{"numero": 1, "contenido_id": str(question), "enunciado": "Describe la figura.", "puntaje": "5"}],
            "contenido_visual": manifest.model_dump(mode="json"), "respuestas_esperadas": [],
            "errores_comunes": ["Confundir los símbolos"],
            "reglas_feedback": {"clave_completa": False, "claves_pendientes": [1], "digitalizada_desde_archivo": True}})
    assert isinstance(manifest, VisualManifest)
    return payload, resource, question


@pytest.mark.asyncio
async def test_new_import_has_one_complete_initial_revision_and_no_fake_legacy_baseline(visual_scope, monkeypatch):
    from app.core.config import settings
    from app.modules.evaluaciones import service
    from app.modules.evaluaciones.models import Evaluacion
    from app.modules.users.models import User

    monkeypatch.setattr(settings, "EVALUATION_VISUAL_IMPORT_ENABLED", True)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        payload, resource, question = await new_import_payload(db, owner, subject)
        # An administrator imports on behalf of the subject owner, not into their own namespace.
        admin = User(nombre="Admin sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="admin")
        db.add(admin)
        await db.flush()
        evaluation = await service.digitalize_external_evaluation(db, payload, admin)
        revision = await db.get(EvaluacionContenidoVersion, evaluation.contenido_version_id)
        assert revision.numero_version == 1 and revision.previous_version_id is None
        assert not revision.legacy_baseline and revision.origen == "importado"
        assert evaluation.profesor_id == owner
        assert revision.snapshot_json["blueprint"]["errores_comunes"] == ["Confundir los símbolos"]
        assert revision.snapshot_json["blueprint"]["reglas_feedback"]["clave_completa"] is False
        assert revision.snapshot_json["claves_pendientes_revision"] == [str(question)]
        assert resource.estado == "ready" and resource.evaluacion_id == evaluation.id
        assert len(list(await db.scalars(select(EvaluacionContenidoVersion)))) == 1
        assert len(list(await db.scalars(select(Evaluacion)))) == 1


@pytest.mark.asyncio
async def test_visual_creation_can_rollback_with_job_transaction_without_losing_staged_material(visual_scope, monkeypatch):
    from app.core.config import settings
    from app.modules.evaluaciones import service
    from app.modules.evaluaciones.models import Evaluacion
    from app.modules.users.models import User

    monkeypatch.setattr(settings, "EVALUATION_VISUAL_IMPORT_ENABLED", True)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        payload, resource, _ = await new_import_payload(db, owner, subject)
        resource_id = resource.id
        await db.commit()  # Durable extraction checkpoint precedes evaluation creation.
        user = await db.get(User, owner)
        await service.digitalize_external_evaluation(db, payload, user, commit=False)
        await db.rollback()  # Simulate job finalization failure.
    async with sessions() as db:
        assert not list(await db.scalars(select(Evaluacion)))
        assert not list(await db.scalars(select(EvaluacionContenidoVersion)))
        resource = await db.get(EvaluacionRecurso, resource_id)
        assert resource.estado == "staged" and resource.evaluacion_id is None
        from app.modules.evaluaciones.visual_service import read_resource_bytes
        assert await read_resource_bytes(resource) == synthetic_png()


@pytest.mark.asyncio
async def test_disabled_visual_import_rejects_new_writes_before_creating_evaluation(visual_scope, monkeypatch):
    from app.core.config import settings
    from app.modules.evaluaciones import service
    from app.modules.evaluaciones.models import Evaluacion
    from app.modules.users.models import User

    monkeypatch.setattr(settings, "EVALUATION_VISUAL_IMPORT_ENABLED", False)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        payload, _, _ = await new_import_payload(db, owner, subject)
        user = await db.get(User, owner)
        with pytest.raises(HTTPException) as caught:
            await service.digitalize_external_evaluation(db, payload, user)
        assert caught.value.status_code == 503
        assert not list(await db.scalars(select(Evaluacion)))


@pytest.mark.asyncio
async def test_visual_job_retries_finalization_without_temp_file_or_duplicate_evaluation(visual_scope, monkeypatch):
    from decimal import Decimal
    from app.core.config import settings
    from app.modules.evaluaciones import visual_import_service
    from app.modules.evaluaciones.digitalize_service import normalize_detected_structure
    from app.modules.evaluaciones.models import Evaluacion
    from app.modules.jobs import service as jobs
    from app.modules.users.models import User
    from app.workers import tasks_digitalization as worker
    from tests.fixtures.evaluation_visuals import mixed_pdf

    monkeypatch.setattr(settings, "EVALUATION_VISUAL_IMPORT_ENABLED", True)
    sessions, owner, subject, root = visual_scope
    job, token = uuid4(), "synthetic-owner-attempt"
    async with sessions() as db:
        await db.execute(text("ALTER TABLE ai_jobs ADD COLUMN claim_token text, ADD COLUMN progreso int DEFAULT 0, "
            "ADD COLUMN resultado_json jsonb DEFAULT '{}'::jsonb, ADD COLUMN stage text, ADD COLUMN heartbeat_at timestamptz, "
            "ADD COLUMN lease_expires_at timestamptz, ADD COLUMN error text, ADD COLUMN finished_at timestamptz, ADD COLUMN parent_job_id uuid"))
        await db.execute(text("INSERT INTO ai_jobs (id,estado,claim_token) VALUES (:id,'running',:token)"), {"id": job, "token": token})
        await db.commit()
    reads, structures = [], []

    async def read_page(*_args, **_kwargs):
        reads.append(1)
        return "1. Explica qué representa la gráfica.", []

    async def structure(**kwargs):
        structures.append(1)
        return normalize_detected_structure({"preguntas": [{"numero": 1, "enunciado": "Explica qué representa la gráfica.",
            "bloque_fuente_ids": [str(block.id) for block in kwargs["contenido_visual"].bloques]}], "respuestas_esperadas": []},
            nota_maxima=Decimal("5"), contenido_visual=kwargs["contenido_visual"], visual_scope_id=job)

    real_finish = jobs.finish_job

    async def fail_finish(*_args, **_kwargs):
        raise TimeoutError("synthetic finalization failure")

    monkeypatch.setattr(visual_import_service, "_extract_image_text", read_page)
    monkeypatch.setattr(worker, "detectar_estructura_evaluacion", structure)
    monkeypatch.setattr(jobs, "finish_job", fail_finish)
    source = root / "synthetic-temporary-upload.pdf"
    source_content = mixed_pdf().content
    source.write_bytes(source_content)

    async def execute(db, result):
        return await worker._digitalize_visual_owned(db=db, user=await db.get(User, owner), job_id=job,
            materia_id=subject, private_path=source, nombre="Importación recuperable", descripcion=None,
            score=Decimal("5"), modalidad="fisica", ai_config=None, result=result,
            timings_ms={}, refresh_total=lambda: None)

    async with sessions() as db:
        with pytest.raises(TimeoutError):
            await execute(db, {"claim_token": token, "progreso": 15})
        await db.rollback()
        assert not list(await db.scalars(select(Evaluacion)))
        assert not list(await db.scalars(select(EvaluacionContenidoVersion)))
        saved = await jobs.get_job_result(db, job)
        assert saved["_visual_checkpoint"]["page_reads"]
        resource_count = len(list(await db.scalars(select(EvaluacionRecurso))))
        assert resource_count > 1
        assert all(resource.estado == "staged" for resource in await db.scalars(select(EvaluacionRecurso)))
    # Only our synthetic temporary upload is removed. The durable original stays.
    source.unlink()
    read_count = len(reads)
    monkeypatch.setattr(jobs, "finish_job", real_finish)
    async with sessions() as db:
        output = await execute(db, {**saved, "claim_token": token})
        assert output["status"] == "requires_review"
        assert len(reads) == read_count and len(structures) == 1
        assert len(list(await db.scalars(select(Evaluacion)))) == 1
        assert len(list(await db.scalars(select(EvaluacionContenidoVersion)))) == 1
        assert len(list(await db.scalars(select(EvaluacionRecurso)))) == resource_count
        resources = list(await db.scalars(select(EvaluacionRecurso)))
        assert all(resource.estado == "ready" for resource in resources)
        assert all(resource.seguridad_contenido == "privado_original" for resource in resources if resource.clase in {"original", "pagina"})
        original = next(resource for resource in resources if resource.clase == "original")
        from app.modules.evaluaciones.visual_service import read_resource_bytes
        assert await read_resource_bytes(original) == source_content
    async with sessions() as db:
        with pytest.raises(jobs.JobOwnershipLost):
            await execute(db, {**await jobs.get_job_result(db, job), "claim_token": token})
        await db.rollback()
        assert len(list(await db.scalars(select(Evaluacion)))) == 1


@pytest.mark.asyncio
async def test_stage_is_private_idempotent_and_rejects_request_key_reuse(visual_scope):
    from app.modules.evaluaciones.visual_schemas import VisualUploadRequest
    from app.modules.evaluaciones.visual_service import read_resource_bytes, stage_resource

    sessions, owner, subject, root = visual_scope
    request = VisualUploadRequest(materia_id=subject, borrador_id=uuid4(), request_key=uuid4())
    async with sessions() as db:
        first = await stage_resource(db, propietario_id=owner, request=request, content=synthetic_png(), clase="imagen", origen="subido")
        await db.commit()
        repeated = await stage_resource(db, propietario_id=owner, request=request, content=synthetic_png(), clase="imagen", origen="subido")
        assert repeated.id == first.id
        assert first.estado == "staged" and first.seguridad_contenido == "pendiente_revision"
        assert await read_resource_bytes(first) == synthetic_png()
        assert len(list(root.rglob("*.png"))) == 1
        with pytest.raises(HTTPException) as conflict:
            await stage_resource(db, propietario_id=owner, request=request, content=synthetic_png("red"), clase="imagen", origen="subido")
        assert conflict.value.status_code == 409
        await db.rollback()
    async with sessions() as db:
        with pytest.raises(HTTPException) as forbidden:
            await stage_resource(db, propietario_id=uuid4(), request=request, content=synthetic_png(), clase="imagen", origen="subido")
        assert forbidden.value.status_code == 404


@pytest.mark.asyncio
async def test_read_verifies_hash_and_cleanup_preserves_referenced_resources(visual_scope):
    from app.modules.evaluaciones.models import Evaluacion
    from app.modules.evaluaciones.visual_schemas import VisualUploadRequest
    from app.modules.evaluaciones.visual_service import cleanup_staged_resources, read_resource_bytes, stage_resource
    from app.services.storage_service import resolve_private_upload_path

    sessions, owner, subject, _ = visual_scope
    cutoff = datetime.now(timezone.utc) - timedelta(days=1)
    async with sessions() as db:
        resources = []
        for _ in range(2):
            resource = await stage_resource(db, propietario_id=owner,
                request=VisualUploadRequest(materia_id=subject, borrador_id=uuid4(), request_key=uuid4()),
                content=synthetic_png(), clase="imagen", origen="subido")
            resource.created_at = cutoff - timedelta(days=1)
            resources.append(resource)
        evaluation = Evaluacion(profesor_id=owner, materia_id=subject, nombre="Prueba visual", tipo_origen="nativa")
        db.add(evaluation)
        await db.flush()
        db.add(EvaluacionContenidoVersion(evaluacion_id=evaluation.id, numero_version=1, autor_id=owner,
            content_hash="a" * 64, motivo="Prueba", origen="subido", snapshot_json={},
            recurso_ids=[str(resources[0].id)]))
        await db.commit()
        assert await cleanup_staged_resources(db, before=cutoff) == 1
        await db.commit()
        assert resolve_private_upload_path(resources[0].storage_key).exists()
        assert not resolve_private_upload_path(resources[1].storage_key).exists()
        # Corruption is simulated only within this test's temporary directory.
        resolve_private_upload_path(resources[0].storage_key).write_bytes(synthetic_png("red"))
        with pytest.raises(HTTPException) as corrupt:
            await read_resource_bytes(resources[0])
        assert corrupt.value.status_code == 409


@pytest.mark.asyncio
async def test_attach_checks_scope_readiness_and_retry_after_save(visual_scope):
    from app.modules.evaluaciones.models import Evaluacion
    from app.modules.evaluaciones.visual_schemas import VisualUploadRequest
    from app.modules.evaluaciones.visual_service import attach_staged_resource, cleanup_staged_resources, stage_resource

    sessions, owner, subject, _ = visual_scope
    request = VisualUploadRequest(materia_id=subject, borrador_id=uuid4(), request_key=uuid4())
    async with sessions() as db:
        resource = await stage_resource(db, propietario_id=owner, request=request, content=synthetic_png(), clase="imagen", origen="subido")
        evaluation = Evaluacion(profesor_id=owner, materia_id=subject, nombre="Prueba visual", tipo_origen="nativa")
        db.add(evaluation)
        await db.flush()
        await attach_staged_resource(db, resource, evaluation)
        await db.commit()
        assert resource.estado == "ready" and resource.evaluacion_id == evaluation.id
        repeated = await stage_resource(db, propietario_id=owner, request=request, content=synthetic_png(), clase="imagen", origen="subido")
        assert repeated.id == resource.id
        assert await cleanup_staged_resources(db, before=datetime.now(timezone.utc) + timedelta(days=1)) == 0


@pytest.mark.asyncio
async def test_cleanup_does_not_delete_resources_of_an_active_job(visual_scope):
    from app.modules.evaluaciones.visual_schemas import VisualUploadRequest
    from app.modules.evaluaciones.visual_service import cleanup_staged_resources, stage_resource
    from app.services.storage_service import resolve_private_upload_path

    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        job_id = uuid4()
        await db.execute(text("INSERT INTO ai_jobs (id,estado) VALUES (:id,'running')"), {"id": job_id})
        resource = await stage_resource(db, propietario_id=owner,
            request=VisualUploadRequest(materia_id=subject, borrador_id=uuid4(), request_key=uuid4()),
            content=synthetic_png(), clase="imagen", origen="subido", job_id=job_id)
        resource.created_at = datetime.now(timezone.utc) - timedelta(days=3)
        await db.commit()
        assert await cleanup_staged_resources(db, before=datetime.now(timezone.utc)) == 0
        assert resolve_private_upload_path(resource.storage_key).exists()


@pytest.mark.asyncio
async def test_same_request_concurrently_creates_one_file(visual_scope):
    import asyncio
    from app.modules.evaluaciones.visual_schemas import VisualUploadRequest
    from app.modules.evaluaciones.visual_service import stage_resource

    sessions, owner, subject, root = visual_scope
    request = VisualUploadRequest(materia_id=subject, borrador_id=uuid4(), request_key=uuid4())

    async def upload():
        async with sessions() as db:
            resource = await stage_resource(db, propietario_id=owner, request=request, content=synthetic_png(), clase="imagen", origen="subido")
            await db.commit()
            return resource.id

    ids = await asyncio.gather(upload(), upload())
    assert ids[0] == ids[1]
    assert len(list(root.rglob("*.png"))) == 1


async def legacy_evaluation(db, owner, subject):
    from app.modules.calificaciones.models import Calificacion, Entrega
    from app.modules.evaluaciones.models import Evaluacion, EvaluacionBlueprint
    from app.modules.users.models import User

    student = User(nombre="Alumno sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="estudiante")
    db.add(student)
    await db.flush()
    evaluation = Evaluacion(profesor_id=owner, materia_id=subject, nombre="Prueba histórica", tipo_origen="nativa", modalidad="fisica",
        preguntas=[{"numero": 1, "tipo": "abierta", "enunciado": "¿Cuánto vale?", "puntaje": 5}],
        respuestas_esperadas=[{"numero": 1, "respuesta": "12"}], criterios=[{"nombre": "Criterio", "puntaje_maximo": 5}])
    db.add(evaluation)
    await db.flush()
    blueprint = EvaluacionBlueprint(evaluacion_id=evaluation.id, nivel_contexto="completo", preguntas=evaluation.preguntas,
        respuestas_esperadas=evaluation.respuestas_esperadas, criterios=evaluation.criterios, reglas_feedback={"keep": True})
    submission = Entrega(evaluacion_id=evaluation.id, estudiante_id=student.id, materia_id=subject, tipo="foto", estado="calificada", archivo_url="fixture/no-real-file.png", visual_text_json={"keep": True})
    db.add_all([blueprint, submission])
    await db.flush()
    grade = Calificacion(evaluacion_id=evaluation.id, estudiante_id=student.id, profesor_id=owner, materia_id=subject,
        entrega_id=submission.id, estado="confirmada", nota_confirmada=3.8, feedback="Conservar", resultado_json={"keep": True})
    db.add(grade)
    await db.commit()
    return evaluation.id, submission.id, grade.id


def image_manifest(question_id, resource_id):
    from app.modules.evaluaciones.visual_schemas import VisualManifest
    return VisualManifest(pregunta_ids=[question_id], recurso_ids=[resource_id], bloques=[{
        "id": uuid4(), "tipo": "imagen", "orden": 0, "pregunta_ids": [question_id],
        "recurso_id": resource_id, "descripcion": "Material de la pregunta", "seguridad_contenido": "publicable_confirmado",
    }])


@pytest.mark.asyncio
async def test_visual_edit_preserves_baseline_notes_and_keys_and_marks_review(visual_scope, monkeypatch):
    from copy import deepcopy
    from app.core.config import settings
    from app.modules.calificaciones.models import Calificacion, Entrega
    from app.modules.evaluaciones.schemas import EvaluacionUpdate
    from app.modules.evaluaciones.service import get_evaluation_or_404, publish_evaluation, rebuild_blueprint, update_evaluation
    from app.modules.evaluaciones.visual_schemas import VisualUploadRequest
    from app.modules.evaluaciones.visual_service import stage_resource

    monkeypatch.setattr(settings, "EVALUATION_VISUAL_EDITOR_ENABLED", True)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        evaluation_id, submission_id, grade_id = await legacy_evaluation(db, owner, subject)
        evaluation = await get_evaluation_or_404(db, evaluation_id)
        old_questions, old_keys = deepcopy(evaluation.preguntas), deepcopy(evaluation.respuestas_esperadas)
        resource = await stage_resource(db, propietario_id=owner,
            request=VisualUploadRequest(materia_id=subject, evaluacion_id=evaluation_id, request_key=uuid4()),
            content=synthetic_png(), clase="imagen", origen="subido")
        question_id = uuid4()
        questions = [{**old_questions[0], "contenido_id": str(question_id)}]
        updated = await update_evaluation(db, evaluation, EvaluacionUpdate(
            expected_updated_at=evaluation.updated_at, expected_content_version_id=None,
            preguntas=questions, contenido_visual=image_manifest(question_id, resource.id)))
        versions = list(await db.scalars(select(EvaluacionContenidoVersion).order_by(EvaluacionContenidoVersion.numero_version)))
        assert len(versions) == 2
        baseline, current = versions
        assert baseline.legacy_baseline and baseline.snapshot_json["preguntas"] == old_questions
        assert baseline.snapshot_json["respuestas_esperadas"] == old_keys
        assert current.previous_version_id == baseline.id and updated.contenido_version_id == current.id
        assert current.snapshot_json["claves_pendientes_revision"] == [str(question_id)]
        assert updated.respuestas_esperadas == old_keys
        assert resource.estado == "ready"
        with pytest.raises(HTTPException) as unreviewed:
            await publish_evaluation(db, updated)
        assert unreviewed.value.status_code == 409
        with pytest.raises(HTTPException):
            await rebuild_blueprint(db, updated)
        assert (await db.get(Entrega, submission_id)).contenido_version_id is None
        grade = await db.get(Calificacion, grade_id)
        assert float(grade.nota_confirmada) == 3.8 and grade.feedback == "Conservar" and grade.resultado_json == {"keep": True}
        # A text-only edit of versioned content must keep the visual manifest.
        updated = await update_evaluation(db, updated, EvaluacionUpdate(
            expected_updated_at=updated.updated_at, expected_content_version_id=current.id,
            nombre="Nombre actualizado"))
        newest = await db.get(EvaluacionContenidoVersion, updated.contenido_version_id)
        assert newest.snapshot_json["contenido_visual"] == current.snapshot_json["contenido_visual"]
        assert newest.snapshot_json["claves_pendientes_revision"] == [str(question_id)]
        assert baseline.snapshot_json["preguntas"] == old_questions
        with pytest.raises(HTTPException) as conflict:
            await update_evaluation(db, updated, EvaluacionUpdate(
                expected_updated_at=updated.updated_at, expected_content_version_id=current.id, nombre="Edición obsoleta"))
        assert conflict.value.status_code == 409


@pytest.mark.asyncio
async def test_legacy_active_job_blocks_visual_edit_without_changing_it(visual_scope, monkeypatch):
    from app.core.config import settings
    from app.modules.evaluaciones.schemas import EvaluacionUpdate
    from app.modules.evaluaciones.service import get_evaluation_or_404, update_evaluation
    from app.modules.evaluaciones.visual_schemas import VisualManifest

    monkeypatch.setattr(settings, "EVALUATION_VISUAL_EDITOR_ENABLED", True)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        evaluation_id, _, _ = await legacy_evaluation(db, owner, subject)
        job_id = uuid4()
        await db.execute(text("INSERT INTO ai_jobs (id,estado,input_json) VALUES (:id,'queued',CAST(:payload AS jsonb))"),
            {"id": job_id, "payload": json.dumps({"evaluacion_id": str(evaluation_id)})})
        await db.commit()
        evaluation = await get_evaluation_or_404(db, evaluation_id)
        with pytest.raises(HTTPException) as conflict:
            await update_evaluation(db, evaluation, EvaluacionUpdate(expected_updated_at=evaluation.updated_at,
                expected_content_version_id=None, contenido_visual=VisualManifest()))
        assert conflict.value.status_code == 409
        assert await db.scalar(select(EvaluacionContenidoVersion.id)) is None
        assert await db.scalar(text("SELECT estado FROM ai_jobs WHERE id=:id"), {"id": job_id}) == "queued"


@pytest.mark.asyncio
async def test_visual_writes_are_disabled_by_default(visual_scope):
    from app.modules.evaluaciones.schemas import EvaluacionUpdate
    from app.modules.evaluaciones.service import get_evaluation_or_404, update_evaluation
    from app.modules.evaluaciones.visual_schemas import VisualManifest

    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        evaluation_id, _, _ = await legacy_evaluation(db, owner, subject)
        evaluation = await get_evaluation_or_404(db, evaluation_id)
        with pytest.raises(HTTPException) as unavailable:
            await update_evaluation(db, evaluation, EvaluacionUpdate(expected_updated_at=evaluation.updated_at,
                contenido_visual=VisualManifest()))
        assert unavailable.value.status_code == 409
        assert evaluation.contenido_version_id is None


@pytest.mark.asyncio
async def test_original_cannot_be_published_as_a_clean_image(visual_scope, monkeypatch):
    from app.core.config import settings
    from app.modules.evaluaciones.schemas import EvaluacionUpdate
    from app.modules.evaluaciones.service import get_evaluation_or_404, update_evaluation
    from app.modules.evaluaciones.visual_schemas import VisualUploadRequest
    from app.modules.evaluaciones.visual_service import stage_resource

    monkeypatch.setattr(settings, "EVALUATION_VISUAL_EDITOR_ENABLED", True)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        evaluation_id, _, _ = await legacy_evaluation(db, owner, subject)
        resource = await stage_resource(db, propietario_id=owner,
            request=VisualUploadRequest(materia_id=subject, evaluacion_id=evaluation_id, request_key=uuid4()),
            content=synthetic_png(), clase="original", origen="importado")
        await db.commit()
        evaluation = await get_evaluation_or_404(db, evaluation_id)
        question_id = uuid4()
        with pytest.raises(HTTPException) as unsafe:
            await update_evaluation(db, evaluation, EvaluacionUpdate(expected_updated_at=evaluation.updated_at,
                preguntas=[{**evaluation.preguntas[0], "contenido_id": str(question_id)}],
                contenido_visual=image_manifest(question_id, resource.id)))
        assert unsafe.value.status_code == 422
        await db.rollback()
        assert await db.scalar(select(EvaluacionContenidoVersion.id)) is None


@pytest.mark.asyncio
async def test_legacy_in_progress_submission_blocks_edit_even_without_a_job(visual_scope, monkeypatch):
    from app.core.config import settings
    from app.modules.calificaciones.models import Entrega
    from app.modules.evaluaciones.schemas import EvaluacionUpdate
    from app.modules.evaluaciones.service import get_evaluation_or_404, update_evaluation
    from app.modules.evaluaciones.visual_schemas import VisualManifest

    monkeypatch.setattr(settings, "EVALUATION_VISUAL_EDITOR_ENABLED", True)
    sessions, owner, subject, _ = visual_scope
    async with sessions() as db:
        evaluation_id, submission_id, _ = await legacy_evaluation(db, owner, subject)
        submission = await db.get(Entrega, submission_id)
        submission.estado = "en_progreso"
        await db.commit()
        evaluation = await get_evaluation_or_404(db, evaluation_id)
        with pytest.raises(HTTPException) as conflict:
            await update_evaluation(db, evaluation, EvaluacionUpdate(expected_updated_at=evaluation.updated_at, contenido_visual=VisualManifest()))
        assert conflict.value.status_code == 409
        assert await db.scalar(select(EvaluacionContenidoVersion.id)) is None
