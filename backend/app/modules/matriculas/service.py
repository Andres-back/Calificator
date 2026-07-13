from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.materias.models import Materia
from app.modules.materias.service import ensure_can_manage_materia
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User
from app.shared.enums import MateriaEstado, MatriculaEstado, UserRole


async def join_by_code(db: AsyncSession, codigo_matricula: str, student: User) -> Matricula:
    if student.rol != UserRole.ESTUDIANTE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can join materias by code",
        )

    code = codigo_matricula.strip().upper()
    materia = await db.scalar(
        select(Materia).where(
            Materia.codigo_matricula == code,
            Materia.codigo_activo.is_(True),
            Materia.estado == MateriaEstado.ACTIVA.value,
        )
    )
    if not materia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment code not found")

    existing = await db.scalar(
        select(Matricula).where(
            Matricula.materia_id == materia.id,
            Matricula.estudiante_id == student.id,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student already has an enrollment record for this materia",
        )

    estado = (
        MatriculaEstado.PENDIENTE.value
        if materia.requiere_aprobacion
        else MatriculaEstado.ACTIVO.value
    )
    matricula = Matricula(materia_id=materia.id, estudiante_id=student.id, estado=estado)
    db.add(matricula)
    await db.commit()
    await db.refresh(matricula)
    return matricula


async def list_mis_materias(db: AsyncSession, student: User) -> list[Materia]:
    result = await db.scalars(
        select(Materia)
        .join(Matricula, Matricula.materia_id == Materia.id)
        .where(
            Matricula.estudiante_id == student.id,
            Matricula.estado == MatriculaEstado.ACTIVO.value,
        )
        .order_by(Materia.created_at.desc())
    )
    return list(result)


async def get_matricula_or_404(db: AsyncSession, matricula_id: UUID) -> Matricula:
    matricula = await db.get(Matricula, matricula_id)
    if not matricula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matricula not found")
    return matricula


async def update_estado(
    db: AsyncSession,
    matricula_id: UUID,
    estado: MatriculaEstado,
    current_user: User,
) -> Matricula:
    matricula = await get_matricula_or_404(db, matricula_id)
    await ensure_can_manage_materia(db, matricula.materia_id, current_user)
    matricula.estado = estado.value
    await db.commit()
    await db.refresh(matricula)
    return matricula
