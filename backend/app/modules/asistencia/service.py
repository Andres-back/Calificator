from collections import defaultdict
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
    AsistenciaReporteDiaRead,
    AsistenciaReporteEstudianteRead,
    AsistenciaReporteRead,
    AsistenciaReporteResumenRead,
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


def validate_attendance_report_range(
    start_date: date,
    end_date: date,
    *,
    today: date | None = None,
) -> None:
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail='La fecha inicial no puede ser posterior a la fecha final.',
        )
    current_date = today or date.today()
    if end_date > current_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail='El reporte no puede incluir fechas futuras.',
        )


def build_attendance_report_summary(states: Iterable[str]) -> AsistenciaReporteResumenRead:
    counts = {state.value: 0 for state in AsistenciaEstado}
    for state in states:
        if state in counts:
            counts[state] += 1

    total = sum(counts.values())
    attended = counts[AsistenciaEstado.PRESENTE.value] + counts[AsistenciaEstado.TARDE.value]
    percentage = round((attended / total) * 100, 1) if total else 0.0
    return AsistenciaReporteResumenRead(
        total_registros=total,
        presentes=counts[AsistenciaEstado.PRESENTE.value],
        tarde=counts[AsistenciaEstado.TARDE.value],
        ausentes=counts[AsistenciaEstado.AUSENTE.value],
        excusas=counts[AsistenciaEstado.EXCUSA.value],
        porcentaje_asistencia=percentage,
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


async def get_attendance_report(
    db: AsyncSession,
    materia: Materia,
    start_date: date,
    end_date: date,
) -> AsistenciaReporteRead:
    validate_attendance_report_range(start_date, end_date)

    active_students = await _list_active_students(db, materia.id)
    result = await db.execute(
        select(AsistenciaRegistro, User)
        .join(User, User.id == AsistenciaRegistro.estudiante_id)
        .where(
            AsistenciaRegistro.materia_id == materia.id,
            AsistenciaRegistro.fecha >= start_date,
            AsistenciaRegistro.fecha <= end_date,
        )
        .order_by(AsistenciaRegistro.fecha.asc(), User.nombre.asc(), User.email.asc())
    )
    record_rows = list(result.all())

    students_by_id = {student.id: student for student in active_students}
    states_by_student: dict[UUID, list[str]] = defaultdict(list)
    states_by_date: dict[date, list[str]] = defaultdict(list)
    all_states: list[str] = []

    for record, student in record_rows:
        students_by_id[student.id] = student
        states_by_student[student.id].append(record.estado)
        states_by_date[record.fecha].append(record.estado)
        all_states.append(record.estado)

    student_rows: list[AsistenciaReporteEstudianteRead] = []
    for student in sorted(
        students_by_id.values(),
        key=lambda item: (item.nombre.casefold(), item.email.casefold()),
    ):
        summary = build_attendance_report_summary(states_by_student[student.id])
        student_rows.append(
            AsistenciaReporteEstudianteRead(
                estudiante_id=student.id,
                estudiante_nombre=student.nombre,
                estudiante_email=student.email,
                **summary.model_dump(),
            )
        )

    day_rows = [
        AsistenciaReporteDiaRead(
            fecha=attendance_date,
            **build_attendance_report_summary(states_by_date[attendance_date]).model_dump(),
        )
        for attendance_date in sorted(states_by_date)
    ]

    return AsistenciaReporteRead(
        materia_id=materia.id,
        fecha_desde=start_date,
        fecha_hasta=end_date,
        jornadas_registradas=len(day_rows),
        resumen=build_attendance_report_summary(all_states),
        estudiantes=student_rows,
        jornadas=day_rows,
    )
