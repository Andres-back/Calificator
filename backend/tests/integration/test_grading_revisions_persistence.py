"""Persistencia PostgreSQL sintética, cola simulada; nunca llama IA."""

from datetime import timedelta
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4
from pathlib import Path
import runpy

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from PIL import Image
import pytest
import pytest_asyncio
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.config import settings
from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.calificaciones import photo_service, revision_service
from app.modules.calificaciones.models import (
    Calificacion,
    CalificacionRevision,
    Entrega,
)
from app.modules.calificaciones.revision_router import router
from app.modules.evaluaciones.models import Evaluacion
from app.modules.feedback_sharing.models import FeedbackPublication
from app.modules.materias.models import Materia
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User


@pytest.mark.asyncio
async def test_migration_roundtrip_in_disposable_schema(fb_db):
    from alembic.migration import MigrationContext
    from alembic.operations import Operations

    schema = "revision114_" + uuid4().hex
    migration = runpy.run_path(
        str(
            Path(__file__).resolve().parents[2]
            / "alembic/versions/202610220001_grading_revisions.py"
        )
    )

    def roundtrip(connection):
        # Only a new schema in the guarded synthetic database; rollback removes
        # it transactionally. No existing academic table is altered or dropped.
        connection.execute(text(f"CREATE SCHEMA {schema}"))
        connection.execute(text(f"SET LOCAL search_path TO {schema}, public"))
        connection.execute(text("CREATE TABLE users (id uuid PRIMARY KEY)"))
        connection.execute(text("CREATE TABLE calificaciones (id uuid PRIMARY KEY)"))
        with Operations.context(MigrationContext.configure(connection)):
            migration["upgrade"]()
            migration["downgrade"]()
            migration["upgrade"]()
            actor_id, grade_id = uuid4(), uuid4()
            connection.execute(
                text("INSERT INTO users(id) VALUES (:id)"), {"id": actor_id}
            )
            connection.execute(
                text("INSERT INTO calificaciones(id) VALUES (:id)"), {"id": grade_id}
            )
            connection.execute(
                text(
                    "INSERT INTO calificacion_revisiones(id,actor_id,calificacion_id,accion,request_fingerprint,snapshot_json) VALUES (:id,:actor,:grade,'recalificar',:fingerprint,'{}')"
                ),
                {
                    "id": uuid4(),
                    "actor": actor_id,
                    "grade": grade_id,
                    "fingerprint": "a" * 64,
                },
            )
            with pytest.raises(RuntimeError, match="historial"):
                migration["downgrade"]()
            assert (
                connection.scalar(text("SELECT count(*) FROM calificacion_revisiones"))
                == 1
            )

    connection = await fb_db.connection()
    try:
        await connection.run_sync(roundtrip)
    finally:
        await fb_db.rollback()


@pytest_asyncio.fixture
async def revision_case(fb_db, monkeypatch, tmp_path):
    # fb_db is guarded to loopback:55417/spec107 and never uses DATABASE_URL.
    teacher = User(
        nombre="Docente revisión sintética",
        email=f"{uuid4()}@example.test",
        password_hash="not-a-login",
        rol="profesor",
    )
    student = User(
        nombre="Alumno sintético",
        email=f"{uuid4()}@example.test",
        password_hash="not-a-login",
        rol="estudiante",
    )
    fb_db.add_all([teacher, student])
    await fb_db.flush()
    subject = Materia(
        profesor_id=teacher.id,
        nombre="Prueba revisión",
        codigo_matricula=uuid4().hex[:20],
    )
    fb_db.add(subject)
    await fb_db.flush()
    evaluation = Evaluacion(
        materia_id=subject.id,
        profesor_id=teacher.id,
        nombre="Prueba revisión",
        tipo_origen="nativa",
        estado="publicada",
        modalidad="fisica",
        nota_maxima=5,
    )
    fb_db.add(evaluation)
    await fb_db.flush()
    old = tmp_path / "old.png"
    Image.new("RGB", (80, 80), "white").save(old)
    delivery = Entrega(
        evaluacion_id=evaluation.id,
        estudiante_id=student.id,
        materia_id=subject.id,
        tipo="foto",
        estado="calificada",
        archivo_url="/uploads/old.png",
        visual_text_json={"evidencia_consolidada": {"paginas": 1}},
    )
    fb_db.add_all(
        [delivery, Matricula(materia_id=subject.id, estudiante_id=student.id)]
    )
    await fb_db.flush()
    grade = Calificacion(
        evaluacion_id=evaluation.id,
        entrega_id=delivery.id,
        estudiante_id=student.id,
        materia_id=subject.id,
        profesor_id=teacher.id,
        estado="publicada",
        nota_confirmada=0,
        nota_sugerida=2,
        revisado_por_docente=True,
        feedback="Anterior",
        resultado_json={"original": True},
    )
    fb_db.add(grade)
    await fb_db.flush()
    publication = FeedbackPublication(
        calificacion_id=grade.id,
        estudiante_id=student.id,
        evaluacion_id=evaluation.id,
        materia_id=subject.id,
        authorized_by=teacher.id,
        revision=1,
        content_fingerprint="a" * 64,
        payload_json={},
        state="authorized",
    )
    fb_db.add(publication)
    await fb_db.commit()
    monkeypatch.setattr(settings, "FEEDBACK_SHARING_ENABLED", True)
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    monkeypatch.setattr(
        revision_service,
        "resolve_upload_path",
        lambda url: tmp_path / url.split("/")[-1],
    )
    actor = {
        "user": SimpleNamespace(
            id=teacher.id,
            rol="profesor",
            _effective_permissions=default_permissions_for_role("profesor"),
        )
    }
    calls = []

    async def queue(db, **kwargs):
        calls.append(kwargs)
        result = photo_service.prepare_queued_grading(
            entrega=kwargs["entrega"],
            evaluacion=kwargs["evaluacion"],
            estudiante_id=kwargs["estudiante_id"],
            profesor_id=kwargs["profesor_id"],
            job_id=uuid4(),
            evidence_metadata=kwargs.get("evidence_metadata"),
            calificacion=kwargs["calificacion"],
        )
        await db.commit()
        await db.refresh(result)
        return result

    monkeypatch.setattr(
        revision_service.grading_queue_service, "enqueue_persisted_grading", queue
    )
    app = FastAPI()
    app.include_router(router, prefix="/api")

    async def current():
        return actor["user"]

    async def database():
        yield fb_db

    app.dependency_overrides[get_current_user] = current
    app.dependency_overrides[get_db] = database
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        yield client, actor, grade, delivery, publication, calls, old


def request(grade, **changes):
    return {
        "solicitud_id": str(uuid4()),
        "version_esperada": grade.updated_at.isoformat(),
        "confirmar_reapertura": "true",
        **changes,
    }


@pytest.mark.asyncio
async def test_reopen_zero_optional_reason_idempotency_and_suspended_links(
    fb_db, revision_case
):
    client, actor, grade, delivery, publication, calls, old = revision_case
    payload = request(grade)
    url = f"/api/calificaciones/{grade.id}/recalificar"
    first = await client.post(url, data=payload)
    assert first.status_code == 202, first.text
    assert (
        first.json()["estado"] == "procesando"
        and first.json()["nota_confirmada"] is None
    )
    again = await client.post(url, data=payload)
    assert again.status_code == 202 and len(calls) == 1
    assert (
        await fb_db.scalar(
            select(func.count())
            .select_from(CalificacionRevision)
            .where(CalificacionRevision.calificacion_id == grade.id)
        )
        == 1
    )
    await fb_db.refresh(publication)
    assert publication.state == "suspended" and old.is_file()
    history = await client.get(f"/api/calificaciones/{grade.id}/revisiones")
    assert history.status_code == 200 and history.json()[0]["nota_anterior"] in (
        "0",
        "0.00",
        0,
    )
    assert (
        history.json()[0]["motivo"] is None and "snapshot_json" not in history.json()[0]
    )
    evidence = await client.get(history.json()[0]["evidencia_url"])
    assert (
        evidence.status_code == 200
        and evidence.headers["cache-control"] == "private, no-store"
    )
    assert evidence.content == old.read_bytes() and delivery.id == grade.entrega_id
    for role in ("estudiante", "profesor"):
        actor["user"] = SimpleNamespace(
            id=uuid4(),
            rol=role,
            _effective_permissions=default_permissions_for_role(role),
        )
        denied = await client.get(history.json()[0]["evidencia_url"])
        assert denied.status_code == 403
        await fb_db.rollback()


@pytest.mark.asyncio
async def test_confirmation_stale_version_and_roles_cannot_modify(fb_db, revision_case):
    client, actor, grade, _, _, calls, _ = revision_case
    url = f"/api/calificaciones/{grade.id}/recalificar"
    for payload in [
        request(grade, confirmar_reapertura="false"),
        request(
            grade, version_esperada=(grade.updated_at - timedelta(days=1)).isoformat()
        ),
    ]:
        assert (await client.post(url, data=payload)).status_code == 409
        await fb_db.rollback()
        await fb_db.refresh(grade)
    for role in ["estudiante", "profesor"]:
        actor["user"] = SimpleNamespace(
            id=uuid4(),
            rol=role,
            _effective_permissions=default_permissions_for_role(role),
        )
        assert (await client.post(url, data=request(grade))).status_code == 403
        assert (
            await client.get(f"/api/calificaciones/{grade.id}/revisiones")
        ).status_code == 403
        await fb_db.rollback()
        await fb_db.refresh(grade)
    assert calls == []


@pytest.mark.asyncio
async def test_replace_retains_old_file_and_grade_and_rejects_invalid_upload(
    fb_db, revision_case
):
    client, _, grade, delivery, _, calls, old = revision_case
    url = f"/api/calificaciones/{grade.id}/recalificar"
    invalid = await client.post(
        url,
        data=request(grade),
        files={"foto": ("bad.exe", b"not image", "application/octet-stream")},
    )
    assert invalid.status_code == 400 and calls == [] and old.exists()
    await fb_db.rollback()
    await fb_db.refresh(grade)
    image = BytesIO()
    Image.new("RGB", (90, 90), "blue").save(image, format="PNG")
    payload = request(grade)
    result = await client.post(
        url, data=payload, files={"foto": ("new.png", image.getvalue(), "image/png")}
    )
    assert result.status_code == 202, result.text
    await fb_db.refresh(delivery)
    assert delivery.archivo_url != "/uploads/old.png" and old.exists()
    snapshot = await fb_db.scalar(
        select(CalificacionRevision).where(
            CalificacionRevision.calificacion_id == grade.id
        )
    )
    assert snapshot.snapshot_json["feedback"] == "Anterior" and snapshot.snapshot_json[
        "nota_confirmada"
    ] in ("0", "0.00")
    await revision_service.delete_unarchived_evidence(fb_db, "/uploads/old.png")
    assert old.exists()
    # A replay regenerates image/PDF bytes but uses the original input fingerprint.
    replay = await client.post(
        url, data=payload, files={"foto": ("new.png", image.getvalue(), "image/png")}
    )
    assert replay.status_code == 202 and len(calls) == 1


@pytest.mark.asyncio
async def test_failed_queue_transaction_preserves_previous_grade(
    fb_db, revision_case, monkeypatch
):
    client, _, grade, delivery, _, _, old = revision_case

    async def failing(*args, **kwargs):
        raise RuntimeError("synthetic failure")

    monkeypatch.setattr(
        revision_service.grading_queue_service, "enqueue_persisted_grading", failing
    )
    with pytest.raises(RuntimeError, match="synthetic failure"):
        await client.post(
            f"/api/calificaciones/{grade.id}/recalificar", data=request(grade)
        )
    await fb_db.refresh(grade)
    await fb_db.refresh(delivery)
    assert grade.estado == "publicada" and grade.nota_confirmada == 0 and old.exists()
    assert (
        await fb_db.scalar(
            select(func.count())
            .select_from(CalificacionRevision)
            .where(CalificacionRevision.calificacion_id == grade.id)
        )
        == 0
    )


@pytest.mark.asyncio
async def test_two_replacements_preserve_both_results_files_and_mixed_answer(
    fb_db, revision_case
):
    client, _, grade, delivery, _, calls, old = revision_case
    delivery.tipo = "mixta"
    delivery.respuesta_texto = "Parte online que no debe perderse"
    await fb_db.commit()
    url = f"/api/calificaciones/{grade.id}/recalificar"
    image = BytesIO()
    Image.new("RGB", (95, 95), "green").save(image, format="PNG")
    for index in range(2):
        result = await client.post(
            url,
            data=request(grade),
            files={"foto": (f"new-{index}.png", image.getvalue(), "image/png")},
        )
        assert result.status_code == 202, result.text
        await fb_db.refresh(delivery)
        assert (
            delivery.tipo == "mixta"
            and delivery.respuesta_texto == "Parte online que no debe perderse"
        )
        # Simulate a completed worker and a teacher decision, not an AI call.
        grade.estado = "confirmada"
        grade.nota_confirmada = 3
        grade.revisado_por_docente = True
        grade.feedback = "Segundo resultado sintético"
        await fb_db.commit()
        await fb_db.refresh(grade)
    revisions = (
        await fb_db.scalars(
            select(CalificacionRevision).where(
                CalificacionRevision.calificacion_id == grade.id
            )
        )
    ).all()
    assert len(revisions) == len(calls) == 2 and old.is_file()
    assert {row.snapshot_json["feedback"] for row in revisions} == {
        "Anterior",
        "Segundo resultado sintético",
    }
    for row in revisions:
        assert (
            row.snapshot_json["entrega"]["respuesta_texto"] == delivery.respuesta_texto
        )
        response = await client.get(
            f"/api/calificaciones/{grade.id}/revisiones/{row.id}/evidencia"
        )
        assert response.status_code == 200 and response.content


@pytest.mark.asyncio
async def test_reusing_request_with_different_payload_is_rejected(revision_case):
    client, _, grade, _, _, calls, _ = revision_case
    payload = request(grade)
    url = f"/api/calificaciones/{grade.id}/recalificar"
    assert (await client.post(url, data=payload)).status_code == 202
    response = await client.post(url, data={**payload, "motivo": "Otro motivo"})
    assert response.status_code == 409 and len(calls) == 1


@pytest.mark.asyncio
async def test_real_active_job_blocks_new_work(fb_db, revision_case):
    client, actor, grade, delivery, _, calls, _ = revision_case
    await fb_db.execute(
        text(
            "INSERT INTO ai_jobs (id,user_id,tipo,estado,entrega_id,input_json) VALUES (:id,:actor,'calificacion_entrega','queued',:delivery,'{}')"
        ),
        {"id": uuid4(), "actor": actor["user"].id, "delivery": delivery.id},
    )
    await fb_db.commit()
    response = await client.post(
        f"/api/calificaciones/{grade.id}/recalificar", data=request(grade)
    )
    assert response.status_code == 409 and calls == []


@pytest.mark.asyncio
async def test_concurrent_requests_lock_and_recheck_current_version(
    fb_db, revision_case
):
    import asyncio

    client, _, grade, _, _, calls, _ = revision_case
    grade_id = grade.id
    payload = request(grade)
    await fb_db.rollback()
    sessions = async_sessionmaker(fb_db.bind, expire_on_commit=False)

    async def independent_database():
        async with sessions() as db:
            yield db

    client._transport.app.dependency_overrides[get_db] = independent_database
    responses = await asyncio.gather(
        client.post(f"/api/calificaciones/{grade_id}/recalificar", data=payload),
        client.post(
            f"/api/calificaciones/{grade_id}/recalificar",
            data={**payload, "solicitud_id": str(uuid4())},
        ),
    )
    assert sorted(response.status_code for response in responses) == [202, 409]
    assert len(calls) == 1
