"""Persistencia real en una base aislada explícita; nunca fallback a producción."""
import asyncio
import os
from datetime import date
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import import_models
from app.modules.asistencia.models import AsistenciaRegistro
from app.modules.asistencia.schemas import AsistenciaDiaPatch, AsistenciaDiaUpsert
from app.modules.asistencia.service import get_attendance_day, get_attendance_report, patch_attendance_day, save_attendance_day
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.evaluaciones.models import Evaluacion
from app.modules.materias.models import Materia
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User

TEST_URL = os.getenv("SPEC085_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="Requiere SPEC085_TEST_DATABASE_URL aislada")
import_models()


async def fixture(db):
    teacher = User(nombre="Docente sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="profesor")
    students = [User(nombre=f"Alumno {i}", email=f"{uuid4()}@example.test", password_hash="no-login", rol="estudiante") for i in range(3)]
    db.add_all([teacher, *students])
    await db.flush()
    subject = Materia(profesor_id=teacher.id, nombre="Asistencia sintética", codigo_matricula=uuid4().hex[:12])
    db.add(subject)
    await db.flush()
    db.add_all([Matricula(materia_id=subject.id, estudiante_id=s.id) for s in students])
    evaluation = Evaluacion(profesor_id=teacher.id, materia_id=subject.id, nombre="Histórica", estado="publicada",
                            modalidad="fisica", tipo_origen="externa_digitalizada", nota_maxima=5, preguntas=[], criterios=[])
    db.add(evaluation)
    await db.flush()
    submission = Entrega(evaluacion_id=evaluation.id, estudiante_id=students[0].id, materia_id=subject.id,
                         tipo="foto", estado="calificada", archivo_url="fixture/no-file.jpg", visual_text_json={"keep": True})
    db.add(submission)
    await db.flush()
    grade = Calificacion(evaluacion_id=evaluation.id, estudiante_id=students[0].id, profesor_id=teacher.id,
                         materia_id=subject.id, entrega_id=submission.id, estado="confirmada", nota_confirmada=3.8,
                         feedback="Conservar", resultado_json={"keep": True})
    db.add(grade)
    await db.commit()
    return subject, teacher, students, grade.id, submission.id


def payload(student, estado="presente", observacion=None):
    return AsistenciaDiaPatch(fecha=date.today(), registros=[{"estudiante_id": student.id, "estado": estado, "observacion": observacion}])


@pytest.mark.asyncio
async def test_partial_retry_preserves_omitted_records_and_historical_grades():
    engine = create_async_engine(TEST_URL)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as db:
            subject, teacher, students, grade_id, submission_id = await fixture(db)
            assert await db.scalar(text("SELECT count(*) FROM pg_constraint WHERE conname='uq_asistencia_materia_estudiante_fecha'")) == 1
            day = await patch_attendance_day(db, subject, payload(students[0], "tarde", " Con permiso "), teacher)
            assert day.resumen.pendientes == 2
            record = await db.scalar(select(AsistenciaRegistro).where(AsistenciaRegistro.materia_id == subject.id))
            original_id, created = record.id, record.created_at
            assert record.observacion == "Con permiso" and record.registrado_por == teacher.id
            await patch_attendance_day(db, subject, payload(students[1], "ausente"), teacher)
            await patch_attendance_day(db, subject, payload(students[0], "excusa", "Autorización"), teacher)
            await patch_attendance_day(db, subject, payload(students[0], "excusa", "Autorización"), teacher)
            records = list(await db.scalars(select(AsistenciaRegistro).where(AsistenciaRegistro.materia_id == subject.id)))
            assert len(records) == 2
            updated = next(r for r in records if r.estudiante_id == students[0].id)
            assert updated.id == original_id and updated.created_at == created
            assert updated.updated_at >= created
            assert updated.estado == "excusa" and updated.observacion == "Autorización"
            assert next(r for r in records if r.estudiante_id == students[1].id).estado == "ausente"
            grade = await db.get(Calificacion, grade_id)
            submission = await db.get(Entrega, submission_id)
            assert float(grade.nota_confirmada) == 3.8 and grade.feedback == "Conservar" and grade.resultado_json == {"keep": True}
            assert submission.archivo_url == "fixture/no-file.jpg" and submission.visual_text_json == {"keep": True}
        async with sessions() as fresh:
            day = await get_attendance_day(fresh, subject, date.today())
            assert day.resumen.pendientes == 1 and day.resumen.excusas == 1 and day.resumen.ausentes == 1
            report = await get_attendance_report(fresh, subject, date.today(), date.today())
            assert report.resumen.total_registros == 2 and report.resumen.excusas == 1 and report.resumen.ausentes == 1
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_invalid_batch_is_atomic_and_put_still_requires_complete_roster():
    engine = create_async_engine(TEST_URL)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as db:
            subject, teacher, students, _, _ = await fixture(db)
            invalid = AsistenciaDiaPatch(fecha=date.today(), registros=[{"estudiante_id": students[0].id, "estado": "presente"},
                {"estudiante_id": uuid4(), "estado": "ausente"}])
            with pytest.raises(HTTPException) as error:
                await patch_attendance_day(db, subject, invalid, teacher)
            assert error.value.status_code == 422
            assert (await get_attendance_day(db, subject, date.today())).resumen.pendientes == 3
            with pytest.raises(HTTPException) as error:
                await save_attendance_day(db, subject, AsistenciaDiaUpsert(**payload(students[0]).model_dump()), teacher)
            assert error.value.status_code == 422
            complete = AsistenciaDiaUpsert(fecha=date.today(), registros=[{"estudiante_id": s.id, "estado": "presente"} for s in students])
            assert (await save_attendance_day(db, subject, complete, teacher)).resumen.pendientes == 0
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_concurrent_initial_inserts_and_mixed_put_patch_do_not_duplicate():
    engine = create_async_engine(TEST_URL)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as setup:
            subject, teacher, students, _, _ = await fixture(setup)
        async def write(index):
            async with sessions() as db:
                return await patch_attendance_day(db, subject, payload(students[index % 2]), teacher)
        await asyncio.gather(*[write(i) for i in range(8)])
        async with sessions() as db:
            records = list(await db.scalars(select(AsistenciaRegistro).where(AsistenciaRegistro.materia_id == subject.id)))
            assert len(records) == 2
        async def put():
            async with sessions() as db:
                return await save_attendance_day(db, subject, AsistenciaDiaUpsert(fecha=date.today(), registros=[
                    {"estudiante_id": s.id, "estado": "presente"} for s in students]), teacher)
        await asyncio.gather(put(), write(0))
        async with sessions() as db:
            assert len(list(await db.scalars(select(AsistenciaRegistro).where(AsistenciaRegistro.materia_id == subject.id)))) == 3
    finally:
        await engine.dispose()
