from collections.abc import Iterable
from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.asistencia.models import AsistenciaRegistro
from app.modules.asistencia.schemas import (
    AsistenciaDiaRead,
    AsistenciaDiaUpsert,
    AsistenciaEstudianteRead,
    AsistenciaResumenRead,
)
from app.modules.materias.models import Materia
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User
from app.shared.enums import AsistenciaEstado, MatriculaEstado


def ensure_attendance_date_is_valid(attendance_date: date, *, today: date | None = None) -> None:
    current_date = today or date.today()
    if attendance_date > current_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No puedes registrar asistencia en una fecha futura.",
        )


def build_attendance_summary(total: int, states: Iterable[str]) -> AsistenciaResumenRead:
    counts = {state.value: 0 for state in AsistenciaEstado}
    marked = 0
    for state in states:
        if state in counts:
            counts[state] += 1
            marked += 1
    return AsistenciaResumenRead(
        total=total,
        presentes=counts[AsistenciaEstado.PRESENTE.value],
        tarde=counts[AsistenciaEstado.TARDE.value],
        ausentes=counts[AsistenciaEstado.AUSENTE.value],
        excusas=counts[AsistenciaEstado.EXCUSA.value],
        pendientes=max(total - marked, 0),
    )


async def _list_active_students(db: AsyncSession, materia_id: UUID) -> list[User]:
    result = await db.scalars(
        select(User)
        .join(Matricula, Matricula.estudiante_id == User.id)
        .where(
            Matricula.materia_id == materia_id,
            Matricula.estado == MatriculaEstado.ACTIVO.value,
        )
        .order_by(User.nombre.asc(), User.email.asc())
    )
    return list(result)


async def get_attendance_day(
    db: AsyncSession,
    materia: Materia,
    attendance_date: date,
) -> AsistenciaDiaRead:
    ensure_attendance_date_is_valid(attendance_date)
    students = await _list_active_students(db, materia.id)
    records_result = await db.scalars(
        select(AsistenciaRegistro).where(
            AsistenciaRegistro.materia_id == materia.id,
            AsistenciaRegistro.fecha == attendance_date,
        )
    )
    records_by_student = {record.estudiante_id: record for record in records_result}

    rows: list[AsistenciaEstudianteRead] = []
    states: list[str] = []
    for student in students:
        record = records_by_student.get(student.id)
        if record:
            states.append(record.estado)
        rows.append(
            AsistenciaEstudianteRead(
                estudiante_id=student.id,
                estudiante_nombre=student.nombre,
                estudiante_email=student.email,
                estado=record.estado if record else None,
                observacion=record.observacion if record else None,
            )
        )

    return AsistenciaDiaRead(
        materia_id=materia.id,
        fecha=attendance_date,
        registros=rows,
        resumen=build_attendance_summary(len(students), states),
    )


async def save_attendance_day(
    db: AsyncSession,
    materia: Materia,
    payload: AsistenciaDiaUpsert,
    actor: User,
) -> AsistenciaDiaRead:
    ensure_attendance_date_is_valid(payload.fecha)
    students = await _list_active_students(db, materia.id)
    active_ids = {student.id for student in students}
    submitted_ids = {record.estudiante_id for record in payload.registros}

    if submitted_ids != active_ids:
        missing = len(active_ids - submitted_ids)
        unknown = len(submitted_ids - active_ids)
        details: list[str] = []
        if missing:
            details.append(f"faltan {missing} estudiante(s)")
        if unknown:
            details.append(f"hay {unknown} estudiante(s) que no pertenecen a la materia")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="No se guardó la asistencia: " + " y ".join(details) + ".",
        )

    existing_result = await db.scalars(
        select(AsistenciaRegistro).where(
            AsistenciaRegistro.materia_id == materia.id,
            AsistenciaRegistro.fecha == payload.fecha,
        )
    )
    existing_by_student = {record.estudiante_id: record for record in existing_result}

    for submitted in payload.registros:
        observation = submitted.observacion.strip() if submitted.observacion else None
        record = existing_by_student.get(submitted.estudiante_id)
        if record is None:
            record = AsistenciaRegistro(
                materia_id=materia.id,
                estudiante_id=submitted.estudiante_id,
                registrado_por=actor.id,
                fecha=payload.fecha,
                estado=submitted.estado.value,
                observacion=observation,
            )
            db.add(record)
        else:
            record.estado = submitted.estado.value
            record.observacion = observation
            record.registrado_por = actor.id

    await db.commit()
    return await get_attendance_day(db, materia, payload.fecha)
