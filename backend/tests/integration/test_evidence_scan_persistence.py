"""Opt-in PostgreSQL evidence tests; never fall back to the application's DB URL."""
from __future__ import annotations

import os
from pathlib import Path
import runpy
from urllib.parse import urlparse
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
import pytest
import pytest_asyncio
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.modules.calificaciones.models import CalificacionRevision, Entrega
from app.modules.calificaciones.revision_service import revision_snapshot
from tests.integration.conftest import make_case
from tests.unit.test_evidence_manifest import manifest_data


@pytest_asyncio.fixture
async def scan_engine():
    url = os.getenv("SPEC131_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Requiere una base sintética SPEC131_TEST_DATABASE_URL explícita")
    parsed = urlparse(url)
    assert parsed.path == "/spec131"
    if parsed.hostname == "spec131-postgres":
        assert os.getenv("SPEC131_ISOLATED_DOCKER") == "1" and parsed.port == 5432
    else:
        assert parsed.hostname in {"127.0.0.1", "localhost"} and parsed.port == 55431
    engine = create_async_engine(url)
    try:
        yield engine
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_additive_migration_keeps_existing_rows_and_null_defaults(scan_engine):
    migration = runpy.run_path(str(Path(__file__).resolve().parents[2] / "alembic/versions/202610270001_evidence_scan_manifest.py"))
    schema = "scan_" + uuid4().hex
    async with scan_engine.begin() as connection:
        # Identifier is generated here, never supplied by an HTTP request.
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        await connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        await connection.execute(text("CREATE TABLE entregas (id text PRIMARY KEY, visual_text_json jsonb NOT NULL)"))
        await connection.execute(text("INSERT INTO entregas VALUES ('legacy', CAST(:payload AS jsonb))"), {"payload": '{"preserved":true}'})
        def upgrade(sync_connection):
            with Operations.context(MigrationContext.configure(sync_connection)):
                migration["upgrade"]()
            return inspect(sync_connection).get_columns("entregas", schema=schema)
        columns = await connection.run_sync(upgrade)
        added = next(column for column in columns if column["name"] == "evidencia_manifiesto")
        assert added["nullable"] is True and added["default"] is None
        row = (await connection.execute(text("SELECT visual_text_json, evidencia_manifiesto FROM entregas WHERE id='legacy'"))).one()
        assert row[0] == {"preserved": True} and row[1] is None
        with pytest.raises(RuntimeError, match="Conservar originales"):
            migration["downgrade"]()
        await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))


@pytest.mark.asyncio
async def test_private_manifest_survives_json_resets_and_history_snapshots(scan_engine):
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    async with sessions() as db:
        teacher, student, subject, evaluation, grade = await make_case(db)
        delivery = Entrega(evaluacion_id=evaluation.id, estudiante_id=student.id, materia_id=subject.id,
                          tipo="foto", archivo_url="/uploads/entregas/synthetic.jpg", visual_text_json={"old": True})
        db.add(delivery)
        await db.flush()
        value = manifest_data()
        value.update({"delivery_id": str(delivery.id), "actor_id": str(teacher.id), "evaluacion_id": str(evaluation.id),
                      "estudiante_id": str(student.id), "materia_id": str(subject.id)})
        from app.modules.calificaciones.evidence_manifest import EvidenceManifest, manifest_fingerprint
        value["fingerprint"] = manifest_fingerprint(value)
        delivery.evidencia_manifiesto = EvidenceManifest.model_validate(value).model_dump(mode="json")
        grade.entrega = delivery
        revision = CalificacionRevision(id=uuid4(), calificacion_id=grade.id, actor_id=teacher.id,
                                        accion="recalificar", request_fingerprint="a" * 64,
                                        archivo_url=delivery.archivo_url, snapshot_json=revision_snapshot(grade))
        db.add(revision)
        delivery.visual_text_json = {"pipeline_status": "running"}
        await db.commit()
        await db.refresh(delivery); await db.refresh(revision)
        assert delivery.evidencia_manifiesto["fingerprint"] == value["fingerprint"]
        delivery.evidencia_manifiesto = None
        await db.commit(); await db.refresh(revision)
        assert revision.snapshot_json["entrega"]["evidencia_manifiesto"]["fingerprint"] == value["fingerprint"]


@pytest.mark.asyncio
async def test_request_index_prevents_duplicate_new_admissions_but_allows_legacy(scan_engine):
    from sqlalchemy.exc import IntegrityError
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    async with sessions() as db:
        _teacher, student, subject, evaluation, _grade = await make_case(db)
        fields = dict(evaluacion_id=evaluation.id, estudiante_id=student.id, materia_id=subject.id, tipo="foto", visual_text_json={})
        db.add_all([Entrega(**fields), Entrega(**fields)])
        await db.commit()
        request = str(uuid4())
        # The database enforces uniqueness even if an application caller bypasses validation.
        db.add(Entrega(**fields, evidencia_manifiesto={"request_id": request}))
        await db.commit()
        db.add(Entrega(**fields, evidencia_manifiesto={"request_id": request}))
        with pytest.raises(IntegrityError):
            await db.commit()
        await db.rollback()


async def make_preparation_job(db, tmp_path, monkeypatch, pages=1, scanned=False, source_contents=None):
    from app.core.config import settings
    from app.modules.calificaciones.evidence_manifest import ScanSubmission
    from app.modules.calificaciones.evidence_preparation import ScanAdmissionContext, inspect_scan_source, persist_scan_sources
    from app.modules.calificaciones.evidence_preparation_jobs import manifest_job_reference
    from app.modules.jobs import service as jobs
    from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    teacher, student, subject, evaluation, _grade = await make_case(db)
    delivery = Entrega(evaluacion_id=evaluation.id, estudiante_id=student.id, materia_id=subject.id,
                      tipo="foto", archivo_url="/uploads/private-admission-marker.jpg", visual_text_json={})
    db.add(delivery); await db.flush()
    owner = ScanAdmissionContext(uuid4(), teacher.id, delivery.id, evaluation.id, student.id, subject.id)
    contents = source_contents if source_contents is not None else (make_scan_fixture(case).content for case in bank_cases()[:pages])
    sources = tuple(inspect_scan_source(content) for content in contents)
    decision = ScanSubmission.model_validate({"schema_version": 1, "pages": [
        {"page_id": str(uuid4()), "decision": "prepared" if scanned else "original", "rotation": 0, "confirmed": True,
         **({"recipe": {"width": source.width, "height": source.height, "corners": [[0., 0.], [1., 0.], [1., 1.], [0., 1.]],
                         "profile": "natural" if index % 2 else "lectura_suave"}} if scanned else {})}
        for index, source in enumerate(sources)]})
    manifest = await persist_scan_sources(owner, decision, sources)
    delivery.evidencia_manifiesto = manifest.model_dump(mode="json")
    job_id = await jobs.create_job(db, user_id=teacher.id, tipo="calificacion_entrega", entrega_id=delivery.id,
                                  input_json={"_ai_config": {}, "entrega_ids": [str(delivery.id)], **manifest_job_reference(delivery)})
    token = uuid4().hex
    await db.execute(text("UPDATE ai_jobs SET estado='running', claim_token=:token WHERE id=:job"), {"token": token, "job": job_id})
    await db.commit()
    return delivery, job_id, token


@pytest.mark.asyncio
async def test_durable_preparation_reuses_exact_pages_on_regrading_without_calls(scan_engine, tmp_path, monkeypatch):
    from app.modules.calificaciones.evidence_preparation_jobs import prepare_delivery_evidence
    from app.modules.calificaciones.evidence_preparation import resolve_canonical_pages
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    async with sessions() as db:
        delivery, job, token = await make_preparation_job(db, tmp_path, monkeypatch)
        manifest = await prepare_delivery_evidence(db, delivery=delivery, job_id=job, claim_token=token)
        first = await resolve_canonical_pages(delivery, manifest)
        async def forbidden(*_args, **_kwargs):
            raise AssertionError("Regrading must reuse the verified canonical bytes")
        monkeypatch.setattr("app.modules.calificaciones.evidence_preparation_jobs.run_page_preparation", forbidden)
        again = await prepare_delivery_evidence(db, delivery=delivery, job_id=job, claim_token=token)
        second = await resolve_canonical_pages(delivery, again)
        assert first.images() == second.images() and first.fingerprint == second.fingerprint
        assert manifest.consultation is not None
        assert len(list((tmp_path / ".private/evidence-scan/prepared").iterdir())) == 1
        from app.workers import tasks_grading
        def forbidden_legacy(*_args, **_kwargs):
            raise AssertionError("Canonical grading must not reopen the consultation JPEG/PDF")
        monkeypatch.setattr(tasks_grading, "resolve_upload_path", forbidden_legacy)
        loaded = await tasks_grading._load_submission(delivery)
        assert loaded["canonical_pages"].images() == first.images()
        assert loaded["image_bytes"] == first.pages[0].content


@pytest.mark.asyncio
async def test_partial_preparation_checkpoint_survives_retry_without_preparing_page_one_again(scan_engine, tmp_path, monkeypatch):
    from app.modules.calificaciones import evidence_preparation_jobs as preparation
    from app.modules.calificaciones.evidence_manifest import read_manifest
    from app.services.evidence_scan_process import EvidencePreparationError
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    async with sessions() as db:
        delivery, job, token = await make_preparation_job(db, tmp_path, monkeypatch, pages=2)
        real = preparation.run_page_preparation
        calls = []
        async def interrupted(asset, **kwargs):
            calls.append(asset.key)
            if len(calls) == 2:
                raise EvidencePreparationError("Interrupción sintética")
            return await real(asset, **kwargs)
        monkeypatch.setattr(preparation, "run_page_preparation", interrupted)
        with pytest.raises(EvidencePreparationError):
            await preparation.prepare_delivery_evidence(db, delivery=delivery, job_id=job, claim_token=token)
        await db.rollback(); await db.refresh(delivery)
        partial = read_manifest(delivery)
        assert partial.pages[0].prepared is not None and partial.pages[1].prepared is None
        monkeypatch.setattr(preparation, "run_page_preparation", real)
        ready = await preparation.prepare_delivery_evidence(db, delivery=delivery, job_id=job, claim_token=token)
        assert ready.state == "prepared" and len(ready.pages) == 2
        assert ready.pages[0].prepared.sha256 == partial.pages[0].prepared.sha256
        assert len(list((tmp_path / ".private/evidence-scan/prepared").iterdir())) == 2


@pytest.mark.asyncio
async def test_http_admission_is_opt_in_private_idempotent_and_keeps_legacy_replacement_history(scan_engine, tmp_path, monkeypatch):
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient
    from unittest.mock import AsyncMock
    from sqlalchemy import select
    from app.core.config import settings
    from app.core.permissions import get_current_user
    from app.db.session import get_db
    from app.modules.authorization.catalog import default_permissions_for_role
    from app.modules.calificaciones import router, revision_service
    from app.modules.calificaciones.evidence_manifest import ScanSubmission
    from app.modules.jobs import service as jobs
    from app.workers.tasks_grading import grade_delivery
    from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture

    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "EVIDENCE_SCAN_ENABLED", False)
    monkeypatch.setattr(jobs, "_resolve_job_ai_config", AsyncMock(return_value={}))
    monkeypatch.setattr(grade_delivery, "apply_async", lambda **_kwargs: None)
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    async with sessions() as db:
        teacher, student, subject, evaluation, _old_grade = await make_case(db)
        evaluation.modalidad = "fisica"
        evaluation.recepcion_habilitada = True
        teacher._effective_permissions = default_permissions_for_role("profesor")
        student._effective_permissions = default_permissions_for_role("estudiante")
        await db.commit()
        app = FastAPI()
        app.include_router(router.router, prefix="/api")
        actor = {"value": teacher}
        async def current():
            return actor["value"]
        async def database():
            yield db
        app.dependency_overrides[get_current_user] = current
        app.dependency_overrides[get_db] = database
        content = make_scan_fixture(bank_cases()[0]).content
        request_id = uuid4()
        submission = ScanSubmission.model_validate({"schema_version": 1, "pages": [{"page_id": str(uuid4()), "decision": "original", "rotation": 0, "confirmed": True}]})
        data = {"evaluacion_id": str(evaluation.id), "estudiante_id": str(student.id), "solicitud_id": str(request_id), "escaneo": submission.model_dump_json()}
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            query = {"evaluacion_id": str(evaluation.id), "estudiante_id": str(student.id)}
            disabled = await client.get("/api/calificaciones/capacidades-evidencia", params=query)
            assert disabled.status_code == 200 and disabled.json()["enabled"] is False
            rejected = await client.post("/api/calificaciones/foto", data=data, files=[("foto", ("synthetic.png", content, "image/png"))])
            assert rejected.status_code == 409
            assert not list(tmp_path.rglob("*.png"))
            monkeypatch.setattr(settings, "EVIDENCE_SCAN_ENABLED", True)
            admitted = await client.post("/api/calificaciones/foto", data=data, files=[("foto", ("synthetic.png", content, "image/png"))])
            assert admitted.status_code == 202, admitted.text
            grade_id = admitted.json()["id"]
            again = await client.post("/api/calificaciones/foto", data=data, files=[("foto", ("synthetic.png", content, "image/png"))])
            assert again.status_code == 202 and again.json()["id"] == grade_id
            delivery = await db.scalar(select(Entrega).where(Entrega.evidencia_manifiesto["request_id"].astext == str(request_id)))
            saved_manifest = dict(delivery.evidencia_manifiesto)
            assert len(list((tmp_path / ".private/evidence-scan/sources").iterdir())) == 1
            actor["value"] = student
            denied = await client.get(f"/api/calificaciones/entregas/{delivery.id}/evidencia?version=original")
            waiting = await client.get(f"/api/calificaciones/entregas/{delivery.id}/evidencia")
            assert denied.status_code == 403 and waiting.status_code == 409
            actor["value"] = teacher
            # The read path remains available after rollback of new admission.
            monkeypatch.setattr(settings, "EVIDENCE_SCAN_ENABLED", False)
            original = await client.get(f"/api/calificaciones/entregas/{delivery.id}/evidencia?version=original")
            assert original.status_code == 200 and original.content == content
            # Student-requested legacy replacement archives, not overwrites, the
            # scan version. No real provider or academic grade is invoked here.
            await db.execute(text("UPDATE ai_jobs SET estado='failed' WHERE entrega_id=:id"), {"id": delivery.id})
            await revision_service.archive_scan_before_legacy_replacement(db, delivery, student.id)
            delivery.archivo_url = "/uploads/entregas/synthetic-replacement.png"
            await db.commit()
            revision = await db.scalar(select(CalificacionRevision).where(CalificacionRevision.calificacion_id == grade_id))
            assert delivery.evidencia_manifiesto is None
            assert revision.snapshot_json["entrega"]["evidencia_manifiesto"] == saved_manifest
            historical = await client.get(f"/api/calificaciones/{grade_id}/revisiones/{revision.id}/evidencia?version=original")
            assert historical.status_code == 200 and historical.content == content
            history_url = f"/api/calificaciones/{grade_id}/revisiones/{revision.id}/evidencia/paginas/1"
            page = await client.get(history_url + "?version=original")
            assert page.status_code == 200 and page.headers["x-evidence-variant"] == "original"
            old_token = page.headers["x-evidence-version"]
            conflict = await client.get(history_url + f"?version=preparada&evidencia_version={old_token}")
            assert conflict.status_code == 409
            actor["value"] = student
            denied_history = await client.get(history_url + "?version=original")
            assert denied_history.status_code == 403


@pytest.mark.asyncio
async def test_reprocessing_keeps_same_manifest_and_replacement_archives_previous_version(scan_engine, tmp_path, monkeypatch):
    from unittest.mock import AsyncMock
    from sqlalchemy import select
    from app.modules.calificaciones import revision_service
    from app.modules.calificaciones.models import Calificacion
    from app.modules.calificaciones.evidence_manifest import ScanSubmission, read_manifest
    from app.modules.calificaciones.evidence_preparation import inspect_scan_source, read_verified_asset
    from app.modules.evaluaciones.models import Evaluacion
    from app.modules.jobs import service as jobs
    from app.workers.tasks_grading import grade_delivery
    monkeypatch.setattr(jobs, "_resolve_job_ai_config", AsyncMock(return_value={}))
    monkeypatch.setattr(grade_delivery, "apply_async", lambda **_kwargs: None)
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    async with sessions() as db:
        delivery, _, _ = await make_preparation_job(db, tmp_path, monkeypatch)
        grade = await db.scalar(select(Calificacion).where(Calificacion.evaluacion_id == delivery.evaluacion_id))
        evaluation = await db.get(Evaluacion, delivery.evaluacion_id)
        grade.entrega = delivery
        await db.execute(text("UPDATE ai_jobs SET estado='failed' WHERE entrega_id=:id"), {"id": delivery.id})
        await db.commit(); await db.refresh(grade)
        old_manifest = read_manifest(delivery)
        request, version = uuid4(), grade.updated_at
        await revision_service.reprocess_grade(db, grade=grade, evaluation=evaluation, actor_id=grade.profesor_id,
            request_id=request, expected_version=version, confirmed=True)
        assert read_manifest(delivery).model_dump() == old_manifest.model_dump()
        # Lost acknowledgement: the same intention returns the existing result.
        await revision_service.reprocess_grade(db, grade=grade, evaluation=evaluation, actor_id=grade.profesor_id,
            request_id=request, expected_version=version, confirmed=True)
        old_revision = await db.get(CalificacionRevision, request)
        from decimal import Decimal
        assert Decimal(old_revision.snapshot_json["nota_confirmada"]) == Decimal("3")
        await db.execute(text("UPDATE ai_jobs SET estado='failed' WHERE entrega_id=:id"), {"id": delivery.id})
        grade.estado = "requiere_revision"
        await db.commit(); await db.refresh(grade)
        source_content = await read_verified_asset(old_manifest.pages[0].source)
        decision = ScanSubmission.model_validate({"schema_version": 1, "pages": [
            {"page_id": str(uuid4()), "decision": "original", "rotation": 90, "confirmed": True}]})
        replacement_id = uuid4()
        await revision_service.reprocess_grade(db, grade=grade, evaluation=evaluation, actor_id=grade.profesor_id,
            request_id=replacement_id, expected_version=grade.updated_at, confirmed=False,
            scan_replacement=(decision, (inspect_scan_source(source_content),)))
        current = read_manifest(delivery)
        assert current.version_id == replacement_id and current.version_id != old_manifest.version_id
        assert current.pages[0].rotation == 90
        archived = await db.get(CalificacionRevision, replacement_id)
        assert archived.accion == "cambiar_evidencia"
        assert archived.snapshot_json["entrega"]["evidencia_manifiesto"] == old_manifest.model_dump(mode="json")
        assert await read_verified_asset(old_manifest.pages[0].source) == source_content


@pytest.mark.asyncio
async def test_twenty_persisted_jobs_use_their_canonical_pages_without_real_ai(scan_engine, tmp_path, monkeypatch):
    from decimal import Decimal
    from sqlalchemy import select
    from app.modules.calificaciones.models import Calificacion
    from app.modules.calificaciones.schemas import GradingResult
    from app.modules.calificaciones.evidence_manifest import read_manifest
    from app.modules.calificaciones.evidence_preparation import resolve_canonical_pages
    from app.modules.calificaciones.evidence_preparation_jobs import manifest_job_reference
    from app.modules.calificaciones.photo_service import prepare_queued_grading
    from app.modules.evaluaciones.models import Evaluacion
    from app.workers import tasks_grading
    observed = {}
    async def simulated_ai(_db, **kwargs):
        canonical = kwargs["canonical_pages"]
        assert kwargs["image_bytes"] == canonical.pages[0].content
        assert kwargs["image_mime"] == "image/jpeg"
        observed[canonical.delivery_id] = (canonical.fingerprint, canonical.images())
        return GradingResult(nota_sugerida=Decimal("3"), nota_maxima=Decimal("5"), confianza=0.9,
                             feedback_estudiante="Muestra el paso que falta en tu procedimiento.")
    monkeypatch.setattr(tasks_grading, "grade_submission", simulated_ai)
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    for _index in range(20):
        async with sessions() as db:
            delivery, job, token = await make_preparation_job(db, tmp_path, monkeypatch)
            evaluation = await db.get(Evaluacion, delivery.evaluacion_id)
            evaluation.recepcion_habilitada = True
            grade = await db.scalar(select(Calificacion).where(Calificacion.evaluacion_id == evaluation.id))
            grade.entrega = delivery
            prepare_queued_grading(entrega=delivery, evaluacion=evaluation, estudiante_id=delivery.estudiante_id,
                profesor_id=grade.profesor_id, job_id=job, calificacion=grade)
            await db.commit()
            original_version = read_manifest(delivery).version_id
            result, written = await tasks_grading._grade_delivery(db, evaluacion=evaluation, entrega=delivery,
                profesor_id=grade.profesor_id, ai_config={}, job_id=job, claim_token=token,
                expected_content_reference=manifest_job_reference(delivery))
            assert written and result.nota_sugerida == Decimal("3")
            current = read_manifest(delivery)
            assert current.version_id == original_version and current.state == "prepared"
            verified = await resolve_canonical_pages(delivery, current)
            assert observed[delivery.id] == (verified.fingerprint, verified.images())
            assert result.estado in {"sugerida", "requiere_revision"}
    assert len(observed) == 20


@pytest.mark.asyncio
async def test_lost_worker_claim_preserves_files_and_cannot_write_its_checkpoint(scan_engine, tmp_path, monkeypatch):
    from app.modules.calificaciones import evidence_preparation_jobs as preparation
    from app.modules.calificaciones.evidence_manifest import read_manifest
    from app.modules.calificaciones.evidence_preparation import read_verified_asset
    from app.modules.jobs.service import JobOwnershipLost
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    async with sessions() as db:
        delivery, job, token = await make_preparation_job(db, tmp_path, monkeypatch)
        original = read_manifest(delivery).pages[0].source
        content = await read_verified_asset(original)
        real = preparation.run_page_preparation
        newer_token = uuid4().hex
        async def another_worker_claims(asset, **kwargs):
            result = await real(asset, **kwargs)
            async with sessions() as rival:
                await rival.execute(text("UPDATE ai_jobs SET claim_token=:token WHERE id=:job"), {"token": newer_token, "job": job})
                await rival.commit()
            return result
        monkeypatch.setattr(preparation, "run_page_preparation", another_worker_claims)
        with pytest.raises(JobOwnershipLost):
            await preparation.prepare_delivery_evidence(db, delivery=delivery, job_id=job, claim_token=token)
        await db.rollback(); await db.refresh(delivery)
        assert read_manifest(delivery).pages[0].prepared is None
        assert await read_verified_asset(original) == content
        # Publication happened before the lost DB claim. Retain, do not guess
        # whether another committed manifest might already refer to these bytes.
        assert len(list((tmp_path / ".private/evidence-scan/prepared").iterdir())) == 1
        monkeypatch.setattr(preparation, "run_page_preparation", real)
        ready = await preparation.prepare_delivery_evidence(db, delivery=delivery, job_id=job, claim_token=newer_token)
        assert ready.state == "prepared"
        assert len(list((tmp_path / ".private/evidence-scan/prepared").iterdir())) == 1


@pytest.mark.asyncio
async def test_uncertain_commit_keeps_admitted_sources_and_reuses_request_without_duplicate_jobs(scan_engine, tmp_path, monkeypatch):
    from unittest.mock import AsyncMock
    from app.core.config import settings
    from app.modules.calificaciones.evidence_scan_admission import admit_scan_grading
    from app.modules.calificaciones.evidence_manifest import ScanSubmission
    from app.modules.calificaciones.evidence_preparation import inspect_scan_source, read_verified_asset
    from app.modules.jobs import service as jobs
    from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "EVIDENCE_SCAN_ENABLED", True)
    monkeypatch.setattr(jobs, "_resolve_job_ai_config", AsyncMock(return_value={}))
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    async with sessions() as db:
        teacher, student, _subject, evaluation, _old_grade = await make_case(db)
        evaluation.modalidad = "fisica"
        await db.commit()
        teacher_id, student_id, evaluation_id = teacher.id, student.id, evaluation.id
        decision = ScanSubmission.model_validate({"schema_version": 1, "pages": [{"page_id": str(uuid4()), "decision": "original", "rotation": 0, "confirmed": True}]})
        content = make_scan_fixture(bank_cases()[0]).content
        sources = (inspect_scan_source(content),)
        request = uuid4()
        real_commit = db.commit
        async def commit_with_lost_acknowledgement():
            await real_commit()
            raise OSError("Synthetic lost database acknowledgement")
        monkeypatch.setattr(db, "commit", commit_with_lost_acknowledgement)
        with pytest.raises(OSError, match="Synthetic"):
            await admit_scan_grading(db, evaluation=evaluation, student_id=student.id, actor=teacher, request_id=request, submission=decision, sources=sources)
        monkeypatch.setattr(db, "commit", real_commit)
        # rollback after an uncertain commit expires ORM attributes. Re-read the
        # actor/context from the same isolated DB, as a new HTTP request would.
        from app.modules.users.models import User
        from app.modules.evaluaciones.models import Evaluacion
        teacher = await db.get(User, teacher_id)
        evaluation = await db.get(Evaluacion, evaluation_id)
        grade = await admit_scan_grading(db, evaluation=evaluation, student_id=student_id, actor=teacher, request_id=request, submission=decision, sources=sources)
        delivery = await db.get(Entrega, grade.entrega_id)
        from app.modules.calificaciones.evidence_manifest import read_manifest
        assert await read_verified_asset(read_manifest(delivery).pages[0].source) == content
        assert len(list((tmp_path / ".private/evidence-scan/sources").iterdir())) == 1
        count = await db.scalar(text("SELECT count(*) FROM ai_jobs WHERE entrega_id=:id"), {"id": delivery.id})
        assert count == 1


@pytest.mark.asyncio
async def test_twenty_concurrent_admissions_with_same_intention_create_one_delivery_and_job(scan_engine, tmp_path, monkeypatch):
    import asyncio
    from unittest.mock import AsyncMock
    from app.core.config import settings
    from app.modules.calificaciones.evidence_scan_admission import admit_scan_grading
    from app.modules.calificaciones.evidence_manifest import ScanSubmission
    from app.modules.calificaciones.evidence_preparation import inspect_scan_source
    from app.modules.evaluaciones.models import Evaluacion
    from app.modules.users.models import User
    from app.modules.jobs import service as jobs
    from app.workers.tasks_grading import grade_delivery
    from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "EVIDENCE_SCAN_ENABLED", True)
    monkeypatch.setattr(jobs, "_resolve_job_ai_config", AsyncMock(return_value={}))
    monkeypatch.setattr(grade_delivery, "apply_async", lambda **_kwargs: None)
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    async with sessions() as setup:
        teacher, student, _, evaluation, _ = await make_case(setup)
        evaluation.modalidad = "fisica"
        await setup.commit()
        teacher_id, student_id, evaluation_id = teacher.id, student.id, evaluation.id
    decision = ScanSubmission.model_validate({"schema_version": 1, "pages": [{"page_id": str(uuid4()), "decision": "original", "rotation": 0, "confirmed": True}]})
    sources = (inspect_scan_source(make_scan_fixture(bank_cases()[0]).content),)
    request = uuid4()
    async def admit():
        async with sessions() as db:
            actor = await db.get(User, teacher_id)
            activity = await db.get(Evaluacion, evaluation_id)
            grade = await admit_scan_grading(db, evaluation=activity, student_id=student_id,
                actor=actor, request_id=request, submission=decision, sources=sources)
            return grade.id, grade.entrega_id
    results = await asyncio.gather(*(admit() for _ in range(20)))
    assert len(set(results)) == 1
    assert len(list((tmp_path / ".private/evidence-scan/sources").iterdir())) == 1
    async with sessions() as db:
        count = await db.scalar(text("SELECT count(*) FROM ai_jobs WHERE entrega_id=:id"), {"id": results[0][1]})
        assert count == 1


@pytest.mark.asyncio
@pytest.mark.parametrize('large_photos', [False, True], ids=['frozen-bank', 'ten-16mp-photos'])
async def test_ten_scanned_pages_are_prepared_serially_and_reused_in_order(scan_engine, tmp_path, monkeypatch, large_photos, record_property):
    from io import BytesIO
    import resource
    import time
    from PIL import Image, ImageDraw
    from app.modules.calificaciones import evidence_preparation_jobs as preparation
    from app.modules.calificaciones.evidence_preparation import resolve_canonical_pages
    from app.modules.calificaciones.agents import _prepare_multimodal_images
    from app.workers.tasks_grading import _load_submission
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    def large_sources():
        for index in range(10):
            output = BytesIO()
            with Image.new('RGB', (4000, 4000), 'white') as image:
                draw = ImageDraw.Draw(image)
                for row in range(80, 3900, 90):
                    draw.text((80, row), f'SYNTHETIC PAGE {index + 1}: -0.5 + 1.25 = 0.75 | A B (X) D', fill=(70, 70, 70), font_size=48)
                image.save(output, format='JPEG', quality=92)
            yield output.getvalue()
    async with sessions() as db:
        delivery, job, token = await make_preparation_job(db, tmp_path, monkeypatch, pages=10, scanned=True,
            source_contents=large_sources() if large_photos else None)
        real = preparation.run_page_preparation
        active = peak = 0
        order, durations = [], []
        async def measured(asset, **kwargs):
            nonlocal active, peak
            active += 1
            peak = max(peak, active)
            order.append(asset.sha256)
            started = time.monotonic()
            try:
                return await real(asset, **kwargs)
            finally:
                durations.append(round((time.monotonic() - started) * 1000))
                active -= 1
        monkeypatch.setattr(preparation, "run_page_preparation", measured)
        manifest = await preparation.prepare_delivery_evidence(db, delivery=delivery, job_id=job, claim_token=token)
        images = await resolve_canonical_pages(delivery, manifest)
        assert peak == 1 and active == 0
        assert order == [page.source.sha256 for page in manifest.pages]
        assert len(images.pages) == 10 and [page.number for page in images.pages] == list(range(1, 11))
        # Frozen bank deliberately includes identical pictures under distinct
        # geometry cases; page identity/order, not unique bytes, is the contract.
        if large_photos:
            assert len(set(order)) == 10
        record_property('source_pixels_per_page', 16_000_000 if large_photos else 'frozen-bank')
        record_property('preparation_ms_per_page', durations)
        record_property('peak_child_rss_kib', resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss)
        assert len(list((tmp_path / ".private/evidence-scan/sources").iterdir())) == 10
        assert len(list((tmp_path / ".private/evidence-scan/prepared").iterdir())) == 10
        async def forbidden(*_args, **_kwargs):
            raise AssertionError("An acknowledged canonical page must not be prepared again")
        monkeypatch.setattr(preparation, "run_page_preparation", forbidden)
        again = await preparation.prepare_delivery_evidence(db, delivery=delivery, job_id=job, claim_token=token)
        loaded = await _load_submission(delivery)
        assert loaded["canonical_pages"].fingerprint == again.canonical_fingerprint
        assert _prepare_multimodal_images(b"not-the-consultation-pdf", "application/pdf", canonical_pages=loaded["canonical_pages"]) == images.images()


@pytest.mark.asyncio
async def test_rolled_back_admission_reuses_delivery_and_private_receipt(scan_engine, tmp_path, monkeypatch):
    from unittest.mock import AsyncMock
    from app.core.config import settings
    from app.modules.calificaciones import grading_queue_service as queue
    from app.modules.calificaciones.evidence_scan_admission import admit_scan_grading
    from app.modules.calificaciones.evidence_preparation import inspect_scan_source
    from app.modules.evaluaciones.models import Evaluacion
    from app.modules.users.models import User
    from app.modules.jobs import service as jobs
    from app.workers.tasks_grading import grade_delivery
    from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture
    from tests.unit.test_evidence_preparation import submission
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "EVIDENCE_SCAN_ENABLED", True)
    monkeypatch.setattr(jobs, "_resolve_job_ai_config", AsyncMock(return_value={}))
    monkeypatch.setattr(grade_delivery, "apply_async", lambda **_kwargs: None)
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    async with sessions() as db:
        teacher, student, _, evaluation, _ = await make_case(db)
        evaluation.modalidad = "fisica"
        await db.commit()
        teacher_id, student_id, evaluation_id = teacher.id, student.id, evaluation.id
        decision, request = submission(), uuid4()
        sources = (inspect_scan_source(make_scan_fixture(bank_cases()[0]).content),)
        real_enqueue = queue.enqueue_persisted_grading
        monkeypatch.setattr(queue, "enqueue_persisted_grading", AsyncMock(side_effect=OSError("synthetic pre-commit failure")))
        with pytest.raises(OSError, match="pre-commit"):
            await admit_scan_grading(db, evaluation=evaluation, student_id=student_id, actor=teacher,
                                     request_id=request, submission=decision, sources=sources)
        receipt = next((tmp_path / ".private/evidence-scan/receipts").iterdir())
        first_receipt = receipt.read_bytes()
        monkeypatch.setattr(queue, "enqueue_persisted_grading", real_enqueue)
        actor = await db.get(User, teacher_id)
        activity = await db.get(Evaluacion, evaluation_id)
        grade = await admit_scan_grading(db, evaluation=activity, student_id=student_id, actor=actor,
                                        request_id=request, submission=decision, sources=sources)
        assert receipt.read_bytes() == first_receipt
        assert len(list((tmp_path / ".private/evidence-scan/sources").iterdir())) == 1
        assert await db.scalar(text("SELECT count(*) FROM ai_jobs WHERE entrega_id=:id"), {"id": grade.entrega_id}) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("reference", ["delivery", "history", "job", "publication"])
async def test_reconciliation_protects_each_durable_reference(scan_engine, tmp_path, monkeypatch, reference):
    from datetime import datetime, timedelta, timezone
    from unittest.mock import AsyncMock
    from uuid import uuid5
    from app.core.config import settings
    from app.modules.calificaciones.evidence_preparation import ScanAdmissionContext, inspect_scan_source, persist_scan_sources
    from app.modules.calificaciones.evidence_scan_reconciliation import reconcile_scan_receipt
    from app.modules.feedback_sharing.models import FeedbackPublication
    from app.modules.jobs import service as jobs
    from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture
    from tests.unit.test_evidence_preparation import submission
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(jobs, "_resolve_job_ai_config", AsyncMock(return_value={}))
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    async with sessions() as db:
        teacher, student, subject, evaluation, grade = await make_case(db)
        owner = ScanAdmissionContext(uuid4(), teacher.id, uuid4(), evaluation.id, student.id, subject.id)
        manifest = await persist_scan_sources(owner, submission(), (inspect_scan_source(make_scan_fixture(bank_cases()[0]).content),))
        if reference == "delivery":
            # Even a legacy/null manifest on a live delivery protects staging.
            db.add(Entrega(id=owner.delivery_id, evaluacion_id=evaluation.id, estudiante_id=student.id, materia_id=subject.id, tipo="foto", visual_text_json={}))
        elif reference == "history":
            db.add(CalificacionRevision(id=uuid4(), calificacion_id=grade.id, actor_id=teacher.id, accion="cambiar_evidencia",
                request_fingerprint="b" * 64, snapshot_json={"entrega": {"evidencia_manifiesto": manifest.model_dump(mode="json")}}))
        elif reference == "job":
            await jobs.create_job(db, user_id=teacher.id, tipo="calificacion_entrega",
                input_json={"_evidence_manifest": {"version_id": str(owner.request_id), "fingerprint": manifest.fingerprint}})
        else:
            db.add(FeedbackPublication(calificacion_id=grade.id, estudiante_id=student.id, evaluacion_id=evaluation.id,
                materia_id=subject.id, authorized_by=teacher.id, revision=1, schema_version=1,
                content_fingerprint="c" * 64, payload_json={"evidence": manifest.pages[0].source.key}, state="authorized", evidence_enabled=False))
        await db.commit()
        now = datetime.now(timezone.utc)
        import os
        for path in tmp_path.rglob("*"):
            if path.is_file():
                old = (now - timedelta(days=8)).timestamp()
                os.utime(path, (old, old))
        identity = uuid5(owner.request_id, f"receipt:{owner.actor_id}")
        result = await reconcile_scan_receipt(db, identity, now=now, quarantine=True)
        assert result.status == "referenced"
        assert len(list((tmp_path / ".private/evidence-scan/sources").iterdir())) == 1


@pytest.mark.asyncio
async def test_reconciliation_waits_for_admission_lease_and_only_quarantines_known_absence(scan_engine, tmp_path, monkeypatch):
    from datetime import datetime, timedelta, timezone
    from uuid import uuid5
    import os
    from app.core.config import settings
    from app.modules.calificaciones.evidence_preparation import inspect_scan_source, persist_scan_sources
    from app.modules.calificaciones.evidence_scan_admission import lock_scan_request
    from app.modules.calificaciones.evidence_scan_reconciliation import reconcile_scan_receipt
    from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture
    from tests.unit.test_evidence_preparation import context, submission
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    owner = context()
    source = inspect_scan_source(make_scan_fixture(bank_cases()[0]).content)
    manifest = await persist_scan_sources(owner, submission(), (source,))
    now = datetime.now(timezone.utc)
    for path in tmp_path.rglob("*"):
        if path.is_file():
            old = (now - timedelta(days=8)).timestamp()
            os.utime(path, (old, old))
    identity = uuid5(owner.request_id, f"receipt:{owner.actor_id}")
    sessions = async_sessionmaker(scan_engine, expire_on_commit=False)
    async with sessions() as admission, sessions() as recovery:
        await lock_scan_request(admission, owner.request_id)
        assert (await reconcile_scan_receipt(recovery, identity, now=now, quarantine=True)).status == "busy"
        await admission.rollback()
        assert (await reconcile_scan_receipt(recovery, identity, now=now)).status == "candidate"
        assert (await reconcile_scan_receipt(recovery, identity, now=now, quarantine=True)).status == "quarantined"
        saved = tmp_path / ".private/evidence-scan-quarantine" / identity.hex / "sources" / Path(manifest.pages[0].source.key).name
        assert saved.read_bytes() == source.content
