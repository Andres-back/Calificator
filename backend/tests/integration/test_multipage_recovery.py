"""Recovery contracts in a random isolated schema, never the product database."""

import asyncio
import os
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from tests.integration.test_evaluation_visual_persistence import database as database
from tests.integration.test_evaluation_visual_persistence import create_domain_tables
from app.core.config import settings
from app.modules.calificaciones import recovery_service as service
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.evaluaciones.models import Evaluacion
from app.modules.materias.models import Materia
from app.modules.users.models import User

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(
        not os.getenv("SPEC101_TEST_DATABASE_URL"),
        reason="Requiere PostgreSQL aislado SPEC101_TEST_DATABASE_URL, nunca DATABASE_URL del producto",
    ),
]


async def fixture(database, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    async with database.begin() as db:
        await db.run_sync(create_domain_tables)
        await db.execute(
            text(
                "CREATE TABLE ai_jobs (id uuid PRIMARY KEY,estado text,entrega_id uuid)"
            )
        )
        await db.execute(
            text(
                "CREATE TABLE audit_events (actor_id uuid,event text,entity_type text,entity_id text,metadata jsonb)"
            )
        )
    sessions = async_sessionmaker(database, expire_on_commit=False)
    path = tmp_path / "synthetic.pdf"
    path.write_bytes(b"synthetic immutable PDF bytes")
    async with sessions() as db:
        teacher = User(
            nombre="Docente sintético",
            email=f"{uuid4()}@example.test",
            password_hash="no-login",
            rol="profesor",
        )
        student = User(
            nombre="Alumno sintético",
            email=f"{uuid4()}@example.test",
            password_hash="no-login",
            rol="estudiante",
        )
        db.add_all([teacher, student])
        await db.flush()
        subject = Materia(
            profesor_id=teacher.id,
            nombre="Materia sintética",
            codigo_matricula=uuid4().hex[:12],
        )
        db.add(subject)
        await db.flush()
        evaluation = Evaluacion(
            materia_id=subject.id,
            profesor_id=teacher.id,
            nombre="Evaluación sintética",
            tipo_origen="externa_digitalizada",
            estado="en_calificacion",
        )
        db.add(evaluation)
        await db.flush()
        delivery = Entrega(
            evaluacion_id=evaluation.id,
            materia_id=subject.id,
            estudiante_id=student.id,
            tipo="pdf",
            archivo_url="/uploads/synthetic.pdf",
            estado="requiere_reintento",
            visual_text_json={"original": True},
        )
        db.add(delivery)
        await db.flush()
        grade = Calificacion(
            evaluacion_id=evaluation.id,
            entrega_id=delivery.id,
            estudiante_id=student.id,
            materia_id=subject.id,
            profesor_id=teacher.id,
            estado="requiere_revision",
            revisado_por_docente=False,
            resultado_json={"failure_stage": "extraction"},
        )
        db.add(grade)
        await db.commit()
        return sessions, teacher.id, evaluation.id, delivery.id, grade.id, path


async def test_recovery_transaction_preserves_evidence_and_is_repeat_safe(
    database, tmp_path, monkeypatch
):
    sessions, teacher, evaluation, delivery, grade, path = await fixture(
        database, tmp_path, monkeypatch
    )
    original = path.read_bytes()

    async def enqueue(db, **kwargs):
        kwargs["calificacion"].estado = "procesando"
        kwargs["entrega"].estado = "procesando"
        await db.execute(
            text("INSERT INTO ai_jobs VALUES (:id,'queued',:delivery)"),
            {"id": uuid4(), "delivery": delivery},
        )
        await db.commit()

    monkeypatch.setattr(service, "enqueue_persisted_grading", enqueue)
    async with sessions() as db:
        dry = await service.recover_failed_grade(
            db, grade_id=grade, evaluation_id=evaluation, teacher_id=teacher
        )
        assert dry["eligible"] and not dry["queued"]
        assert await db.scalar(text("SELECT count(*) FROM audit_events")) == 0
        result = await service.recover_failed_grade(
            db,
            grade_id=grade,
            evaluation_id=evaluation,
            teacher_id=teacher,
            execute=True,
        )
        assert result["queued"]
    async with sessions() as db:
        repeat = await service.recover_failed_grade(
            db,
            grade_id=grade,
            evaluation_id=evaluation,
            teacher_id=teacher,
            execute=True,
        )
        assert not repeat["eligible"] and not repeat["queued"]
        assert await db.scalar(text("SELECT count(*) FROM audit_events")) == 1
        assert await db.scalar(text("SELECT count(*) FROM ai_jobs")) == 1
        current = await db.get(Entrega, delivery)
        assert current.archivo_url == "/uploads/synthetic.pdf"
        assert path.read_bytes() == original
        assert len(list((tmp_path / ".private/grading-recovery").glob("*.json"))) == 1


async def test_teacher_decision_while_waiting_for_lock_prevents_recovery(
    database, tmp_path, monkeypatch
):
    sessions, teacher, evaluation, delivery, grade, path = await fixture(
        database, tmp_path, monkeypatch
    )

    async def forbidden(*args, **kwargs):
        raise AssertionError("Teacher decision must win")

    monkeypatch.setattr(service, "enqueue_persisted_grading", forbidden)
    async with sessions() as teacher_db, sessions() as recovery_db:
        current = await teacher_db.scalar(
            select(Calificacion).where(Calificacion.id == grade).with_for_update()
        )
        current.nota_confirmada = Decimal("4.20")
        current.revisado_por_docente = True
        current.estado = "confirmada"
        await teacher_db.flush()
        task = asyncio.create_task(
            service.recover_failed_grade(
                recovery_db,
                grade_id=grade,
                evaluation_id=evaluation,
                teacher_id=teacher,
                execute=True,
            )
        )
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(asyncio.shield(task), timeout=0.1)
        await teacher_db.commit()
        result = await asyncio.wait_for(task, timeout=5)
        assert not result["eligible"] and result["reason"] == "existing_score"
        assert await recovery_db.scalar(text("SELECT count(*) FROM audit_events")) == 0
    async with sessions() as db:
        current = await db.get(Calificacion, grade)
        assert (
            current.nota_confirmada == Decimal("4.20") and current.revisado_por_docente
        )
