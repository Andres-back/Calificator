import asyncio
from datetime import date
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from spec128_database import database128  # noqa: F401
from app.modules.authorization.models import AuditEvent
from app.modules.evaluaciones.models import Evaluacion
from app.modules.materias.models import Materia
from app.modules.materias.schemas import MateriaCreate, MateriaUpdate
from app.modules.materias.service import create_materia, ensure_active_materia, update_materia
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User
from app.modules.authorization.catalog import default_permissions_for_role


async def seed(db):
    teacher = User(nombre="Docente sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="profesor")
    student = User(nombre="Alumno sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="estudiante")
    db.add_all([teacher, student]); await db.flush()
    subject = Materia(profesor_id=teacher.id, nombre="Materia original", codigo_matricula=uuid4().hex[:12])
    db.add(subject); await db.flush()
    evaluation = Evaluacion(materia_id=subject.id, profesor_id=teacher.id, nombre="Lectura", tipo_origen="nativa",
                            estado="publicada", modalidad="fisica", nota_maxima=5, recepcion_habilitada=True)
    enrollment = Matricula(materia_id=subject.id, estudiante_id=student.id, estado="activo")
    db.add_all([evaluation, enrollment]); await db.commit()
    return teacher, subject, evaluation, enrollment


@pytest.mark.asyncio
async def test_128_edit_archive_restore_keeps_history_and_reception_closed(database128, tmp_path):
    from app.modules.calificaciones.models import Calificacion, Entrega
    from app.modules.asistencia.models import AsistenciaRegistro
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        teacher, subject, evaluation, enrollment = await seed(db)
        evidence = tmp_path / 'synthetic-evidence.txt'
        evidence.write_bytes(b'synthetic evidence preserved')
        delivery = Entrega(evaluacion_id=evaluation.id, estudiante_id=enrollment.estudiante_id,
            materia_id=subject.id, tipo='foto', estado='revisada', archivo_url=str(evidence))
        attendance = AsistenciaRegistro(materia_id=subject.id, estudiante_id=enrollment.estudiante_id,
            registrado_por=teacher.id, fecha=date(2026, 10, 25), estado='presente', observacion='Registro sintético')
        db.add_all([delivery, attendance]); await db.flush()
        grade = Calificacion(evaluacion_id=evaluation.id, entrega_id=delivery.id, estudiante_id=enrollment.estudiante_id,
            materia_id=subject.id, profesor_id=teacher.id, estado='publicada', nota_confirmada=4)
        db.add(grade); await db.commit()
        protected_ids = (delivery.id, grade.id, attendance.id)
        original = (evaluation.id, evaluation.estado, enrollment.id, enrollment.estado)
        subject = await update_materia(db, subject, MateriaUpdate(nombre="Materia editada", expected_updated_at=subject.updated_at), teacher)
        subject = await update_materia(db, subject, MateriaUpdate(estado="archivada", expected_updated_at=subject.updated_at), teacher)
        await db.refresh(evaluation)
        assert subject.estado == "archivada" and subject.codigo_activo is False
        assert evaluation.recepcion_habilitada is False
        assert (evaluation.id, evaluation.estado, enrollment.id, enrollment.estado) == original
        with pytest.raises(HTTPException) as error:
            await ensure_active_materia(db, subject.id)
        assert error.value.status_code == 409
        subject_id, teacher_id, evaluation_id = subject.id, teacher.id, evaluation.id
        await db.rollback()
        subject = await db.get(Materia, subject_id)
        teacher = await db.get(User, teacher_id)
        evaluation = await db.get(Evaluacion, evaluation_id)
        subject = await update_materia(db, subject, MateriaUpdate(estado="activa", expected_updated_at=subject.updated_at), teacher)
        assert subject.estado == "activa" and subject.codigo_activo is False
        await db.refresh(evaluation)
        assert evaluation.recepcion_habilitada is False
        assert await db.scalar(select(func.count(AuditEvent.id))) == 3
        delivery = await db.get(Entrega, protected_ids[0]); await db.refresh(delivery)
        grade = await db.get(Calificacion, protected_ids[1]); await db.refresh(grade)
        attendance = await db.get(AsistenciaRegistro, protected_ids[2]); await db.refresh(attendance)
        assert delivery.archivo_url == str(evidence) and delivery.estado == 'revisada'
        assert evidence.read_bytes() == b'synthetic evidence preserved'
        assert grade.nota_confirmada == 4 and grade.estado == 'publicada'
        assert attendance.estado == 'presente' and attendance.observacion == 'Registro sintético'
        assert await db.scalar(select(func.count(User.id))) == 2


@pytest.mark.asyncio
async def test_128_restore_and_create_share_quota_lock(database128):
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        teacher, subject, _, _ = await seed(db)
        archived = Materia(profesor_id=teacher.id, nombre="Archivada", codigo_matricula=uuid4().hex[:12], estado="archivada")
        db.add(archived)
        db.add_all([Materia(profesor_id=teacher.id, nombre=f"Materia {i}", codigo_matricula=uuid4().hex[:12]) for i in range(4)])
        await db.commit()
        teacher_id, archived_id = teacher.id, archived.id
    async def operation(restore):
        async with sessions() as db:
            teacher = await db.get(User, teacher_id)
            try:
                if restore:
                    subject = await db.get(Materia, archived_id)
                    await update_materia(db, subject, MateriaUpdate(estado="activa"), teacher)
                else:
                    await create_materia(db, MateriaCreate(nombre="Nueva concurrente"), teacher)
                return "ok"
            except HTTPException as error:
                await db.rollback()
                return error.status_code
    assert sorted(await asyncio.gather(operation(True), operation(False)), key=str) == [409, "ok"]
    async with sessions() as db:
        assert await db.scalar(select(func.count(Materia.id)).where(Materia.estado == "activa")) == 6


@pytest.mark.asyncio
async def test_128_stale_edit_and_other_owner_cannot_mutate_subject(database128):
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        teacher, subject, _, _ = await seed(db)
        old = subject.updated_at
        await update_materia(db, subject, MateriaUpdate(nombre="Modificada"), teacher)
        with pytest.raises(HTTPException) as error:
            await update_materia(db, subject, MateriaUpdate(nombre="Obsoleta", expected_updated_at=old), teacher)
        assert error.value.status_code == 409
        other = User(id=uuid4(), rol="profesor")
        with pytest.raises(HTTPException) as error:
            await update_materia(db, subject, MateriaUpdate(estado="archivada"), other)
        assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_128_archived_http_admission_denied_but_history_is_readable(database128):
    from app.core.permissions import get_current_user
    from app.db.session import get_db
    from app.main import create_app
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        teacher, subject, evaluation, enrollment = await seed(db)
        teacher._effective_permissions = default_permissions_for_role("profesor")
        await update_materia(db, subject, MateriaUpdate(estado="archivada"), teacher)
        async def database_override():
            yield db
        app = create_app()
        app.dependency_overrides[get_current_user] = lambda: teacher
        app.dependency_overrides[get_db] = database_override
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost") as client:
            response = await client.post("/api/evaluaciones", json={"materia_id": str(subject.id), "nombre": "No admitida", "modalidad": "fisica"})
            assert response.status_code == 409 and "archivada" in response.json()["detail"]
            for suffix in ("publicar", "activar-recepcion"):
                response = await client.post(f"/api/evaluaciones/{evaluation.id}/{suffix}")
                assert response.status_code == 409 and "archivada" in response.json()["detail"]
            response = await client.post("/api/calificaciones/foto", data={"evaluacion_id": str(evaluation.id), "estudiante_id": str(enrollment.estudiante_id)}, files={"foto": ("synthetic.png", b"not-read", "image/png")})
            assert response.status_code == 409 and "archivada" in response.json()["detail"]
            response = await client.get(f"/api/evaluaciones/{evaluation.id}/calificaciones?solo_lectura=true")
            assert response.status_code == 200 and response.json() == []
            response = await client.get(f"/api/materias/{subject.id}/estudiantes")
            assert response.status_code == 200 and len(response.json()["estudiantes"]) == 1
        # Simulate persistence of a result already admitted before archive.
        # Archiving installs no destructive trigger or global worker ban.
        from app.modules.calificaciones.models import Calificacion
        grade = Calificacion(evaluacion_id=evaluation.id, estudiante_id=enrollment.estudiante_id,
                             materia_id=subject.id, profesor_id=teacher.id, estado="sugerida", nota_sugerida=3)
        db.add(grade); await db.commit()
        assert await db.scalar(select(Calificacion.nota_sugerida).where(Calificacion.id == grade.id)) == 3
