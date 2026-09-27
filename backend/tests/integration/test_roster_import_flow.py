"""Transacciones de matrícula sobre PostgreSQL aislado, sin servicios externos."""
from __future__ import annotations

import asyncio
import os
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import verify_password
from app.db.base import import_models
from app.modules.importacion_estudiantes.models import ImportacionEstudiantesFila, ImportacionEstudiantesLote
from app.modules.importacion_estudiantes.schemas import FilaUpdate
from app.modules.importacion_estudiantes.service import confirm_lote, enroll_existing, expire_abandoned_lotes, get_lote, replace_rows, reset_temporary_password, searchable_students
from app.modules.materias.models import Materia
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User
from app.shared.enums import UserRole

TEST_URL = os.getenv("SPEC061_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="Requiere PostgreSQL aislado SPEC061_TEST_DATABASE_URL")
import_models()


async def _session():
    engine = create_async_engine(TEST_URL)
    connection = await engine.connect()
    transaction = await connection.begin()
    db = AsyncSession(bind=connection, expire_on_commit=False)
    return engine, connection, transaction, db


async def _subject(db: AsyncSession, teacher: User | None = None) -> tuple[User, Materia]:
    if teacher is None:
        teacher = User(nombre="Docente de prueba", email=f"docente.{uuid4().hex}@example.test", password_hash="no-login", rol=UserRole.PROFESOR.value)
        db.add(teacher)
        await db.flush()
    subject = Materia(profesor_id=teacher.id, nombre="Materia de prueba", codigo_matricula=uuid4().hex[:12])
    db.add(subject)
    await db.flush()
    return teacher, subject


@pytest.mark.asyncio
async def test_confirm_creates_only_selected_students_and_is_idempotent() -> None:
    engine, connection, transaction, db = await _session()
    try:
        teacher, subject = await _subject(db)
        batch = ImportacionEstudiantesLote(materia_id=subject.id, creado_por=teacher.id, archivo_nombre="lista.jpg", archivo_sha256="a" * 64, estado="revision")
        db.add(batch)
        await db.flush()
        db.add_all([
            ImportacionEstudiantesFila(lote_id=batch.id, orden=1, nombre_detectado="Ana Ruiz", nombre_revisado="Ana Ruiz", confianza=1, decision="crear", advertencias=[]),
            ImportacionEstudiantesFila(lote_id=batch.id, orden=2, nombre_detectado="Luis Paz", nombre_revisado="Luis Paz", confianza=1, decision="crear", advertencias=[]),
            ImportacionEstudiantesFila(lote_id=batch.id, orden=3, nombre_detectado="Encabezado", nombre_revisado="Encabezado", confianza=1, decision="omitir", advertencias=[]),
        ])
        await db.flush()
        result = await confirm_lote(db, batch.id, teacher)
        assert (result["creados"], result["omitidos"]) == (2, 1)
        assert len({item["email"] for item in result["credenciales"]}) == 2
        assert len({item["password_temporal"] for item in result["credenciales"]}) == 2
        assert all(item["email"].endswith("@alumnos.xcalificator.daimuz.com") for item in result["credenciales"])
        assert await db.scalar(select(func.count(Matricula.id)).where(Matricula.materia_id == subject.id)) == 2
        for item in result["credenciales"]:
            student = await db.get(User, item["estudiante_id"])
            assert student.email_es_interno and student.debe_cambiar_password
            assert verify_password(item["password_temporal"], student.password_hash)
            assert item["password_temporal"] not in str(batch.resultado_json)
        repeat = await confirm_lote(db, batch.id, teacher)
        assert repeat["credenciales"] == []
        assert await db.scalar(select(func.count(Matricula.id)).where(Matricula.materia_id == subject.id)) == 2
    finally:
        await db.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()


@pytest.mark.asyncio
async def test_duplicate_blocks_before_any_account_is_created() -> None:
    engine, connection, transaction, db = await _session()
    try:
        teacher, subject = await _subject(db)
        existing = User(nombre="Ana Ruiz", email=f"ana.{uuid4().hex}@example.test", password_hash="no-login", rol=UserRole.ESTUDIANTE.value)
        db.add(existing)
        await db.flush()
        db.add(Matricula(materia_id=subject.id, estudiante_id=existing.id))
        batch = ImportacionEstudiantesLote(materia_id=subject.id, creado_por=teacher.id, archivo_nombre="lista.jpg", archivo_sha256="b" * 64, estado="revision")
        db.add(batch)
        await db.flush()
        db.add_all([
            ImportacionEstudiantesFila(lote_id=batch.id, orden=1, nombre_detectado="Bea Luz", nombre_revisado="Bea Luz", confianza=1, decision="crear", advertencias=[]),
            ImportacionEstudiantesFila(lote_id=batch.id, orden=2, nombre_detectado="Ana Ruiz", nombre_revisado="Ana Ruiz", confianza=1, decision="crear", advertencias=[]),
        ])
        await db.flush()
        with pytest.raises(HTTPException) as error:
            await confirm_lote(db, batch.id, teacher)
        assert error.value.status_code == 422
        assert await db.scalar(select(func.count(Matricula.id)).where(Matricula.materia_id == subject.id)) == 1
    finally:
        await db.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()


@pytest.mark.asyncio
async def test_existing_student_can_join_second_subject_without_new_credentials() -> None:
    engine, connection, transaction, db = await _session()
    try:
        teacher, first = await _subject(db)
        _, second = await _subject(db, teacher)
        student = User(nombre="Alumno existente", email=f"alumno.{uuid4().hex}@example.test", password_hash="original-hash", rol=UserRole.ESTUDIANTE.value)
        db.add(student)
        await db.flush()
        db.add(Matricula(materia_id=first.id, estudiante_id=student.id))
        await db.flush()
        result = await enroll_existing(db, second.id, [student.id], teacher)
        assert result == {"matriculados": 1, "ya_matriculados": 0}
        await db.flush()
        assert await db.scalar(select(func.count(Matricula.id)).where(Matricula.estudiante_id == student.id)) == 2
        assert student.password_hash == "original-hash"
        with pytest.raises(HTTPException) as error:
            await reset_temporary_password(db, second.id, student.id, teacher)
        assert error.value.status_code == 404
    finally:
        await db.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()


@pytest.mark.asyncio
async def test_review_can_reorder_delete_and_add_rows_atomically() -> None:
    engine, connection, transaction, db = await _session()
    try:
        teacher, subject = await _subject(db)
        batch = ImportacionEstudiantesLote(materia_id=subject.id, creado_por=teacher.id, archivo_nombre="lista.jpg", archivo_sha256="c" * 64, estado="revision")
        db.add(batch)
        await db.flush()
        first = ImportacionEstudiantesFila(lote_id=batch.id, orden=1, nombre_detectado="Ana", nombre_revisado="Ana", confianza=1, advertencias=[])
        second = ImportacionEstudiantesFila(lote_id=batch.id, orden=2, nombre_detectado="Luis", nombre_revisado="Luis", confianza=1, advertencias=[])
        db.add_all([first, second])
        await db.flush()
        reviewed = await replace_rows(db, batch, [
            FilaUpdate(id=second.id, nombre_revisado="Luis Paz", decision="crear"),
            FilaUpdate(nombre_revisado="Marta Díaz", decision="crear"),
        ], teacher)
        assert [(row.orden, row.nombre_revisado) for row in reviewed.filas] == [(1, "Luis Paz"), (2, "Marta Díaz")]
        assert await db.scalar(select(func.count(ImportacionEstudiantesFila.id)).where(ImportacionEstudiantesFila.lote_id == batch.id)) == 2
    finally:
        await db.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()


@pytest.mark.asyncio
async def test_other_teacher_cannot_read_or_confirm_roster() -> None:
    engine, connection, transaction, db = await _session()
    try:
        teacher, subject = await _subject(db)
        outsider, _ = await _subject(db)
        batch = ImportacionEstudiantesLote(materia_id=subject.id, creado_por=teacher.id, archivo_nombre="lista.jpg", archivo_sha256="d" * 64, estado="revision")
        db.add(batch)
        await db.flush()
        for operation in (get_lote, confirm_lote):
            with pytest.raises(HTTPException) as error:
                await operation(db, batch.id, outsider)
            assert error.value.status_code == 403
    finally:
        await db.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()


@pytest.mark.asyncio
async def test_temporary_password_reset_is_scoped_and_revokes_old_password() -> None:
    engine, connection, transaction, db = await _session()
    try:
        teacher, subject = await _subject(db)
        batch = ImportacionEstudiantesLote(materia_id=subject.id, creado_por=teacher.id, archivo_nombre="lista.jpg", archivo_sha256="e" * 64, estado="revision")
        db.add(batch)
        await db.flush()
        db.add(ImportacionEstudiantesFila(lote_id=batch.id, orden=1, nombre_detectado="Ana Ruiz", nombre_revisado="Ana Ruiz", confianza=1, decision="crear", advertencias=[]))
        await db.flush()
        access = (await confirm_lote(db, batch.id, teacher))["credenciales"][0]
        student = await db.get(User, access["estudiante_id"])
        old_version = student.auth_version
        reset = await reset_temporary_password(db, subject.id, student.id, teacher)
        assert reset["password_temporal"] != access["password_temporal"]
        assert verify_password(reset["password_temporal"], student.password_hash)
        assert not verify_password(access["password_temporal"], student.password_hash)
        assert student.auth_version == old_version + 1
    finally:
        await db.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()


@pytest.mark.asyncio
async def test_existing_search_is_limited_to_teacher_subjects() -> None:
    engine, connection, transaction, db = await _session()
    try:
        teacher, subject = await _subject(db)
        outsider, other_subject = await _subject(db)
        own_student = User(nombre="Nora Docente", email=f"nora.{uuid4().hex}@example.test", password_hash="hash", rol=UserRole.ESTUDIANTE.value)
        other_student = User(nombre="Nora Ajena", email=f"ajena.{uuid4().hex}@example.test", password_hash="hash", rol=UserRole.ESTUDIANTE.value)
        db.add_all([own_student, other_student])
        await db.flush()
        db.add_all([Matricula(materia_id=subject.id, estudiante_id=own_student.id), Matricula(materia_id=other_subject.id, estudiante_id=other_student.id)])
        await db.flush()
        found = await searchable_students(db, subject, "Nora")
        assert [item["id"] for item in found] == [own_student.id]
        with pytest.raises(HTTPException) as error:
            await enroll_existing(db, subject.id, [other_student.id], teacher)
        assert error.value.status_code == 403
    finally:
        await db.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()


@pytest.mark.asyncio
async def test_parallel_confirmation_creates_one_account_only() -> None:
    engine = create_async_engine(TEST_URL)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with sessions() as setup:
        teacher, subject = await _subject(setup)
        batch = ImportacionEstudiantesLote(materia_id=subject.id, creado_por=teacher.id, archivo_nombre="lista.jpg", archivo_sha256="f" * 64, estado="revision")
        setup.add(batch)
        await setup.flush()
        setup.add(ImportacionEstudiantesFila(lote_id=batch.id, orden=1, nombre_detectado="Sara Sol", nombre_revisado="Sara Sol", confianza=1, decision="crear", advertencias=[]))
        await setup.commit()
    async def confirm_once():
        async with sessions() as db:
            actor = await db.get(User, teacher.id)
            result = await confirm_lote(db, batch.id, actor)
            await db.commit()
            return result
    try:
        results = await asyncio.wait_for(asyncio.gather(confirm_once(), confirm_once()), timeout=15)
        assert sorted(len(result["credenciales"]) for result in results) == [0, 1]
        async with sessions() as db:
            assert await db.scalar(select(func.count(Matricula.id)).where(Matricula.materia_id == subject.id)) == 1
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_abandoned_photo_expires_without_creating_students() -> None:
    engine, connection, transaction, db = await _session()
    try:
        teacher, subject = await _subject(db)
        batch = ImportacionEstudiantesLote(materia_id=subject.id, creado_por=teacher.id, archivo_nombre="lista.jpg", archivo_sha256="1" * 64, archivo_key=".private/roster-imports/old.jpg", estado="revision")
        db.add(batch)
        await db.flush()
        from datetime import datetime, timedelta, timezone
        batch.created_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=8)
        await db.flush()
        keys = await expire_abandoned_lotes(db, datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=7))
        assert keys == [".private/roster-imports/old.jpg"]
        assert batch.estado == "cancelado" and batch.archivo_key is None
        assert await db.scalar(select(func.count(Matricula.id)).where(Matricula.materia_id == subject.id)) == 0
    finally:
        await db.close()
        await transaction.rollback()
        await connection.close()
        await engine.dispose()
