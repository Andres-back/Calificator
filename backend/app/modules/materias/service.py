from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.materias.code_generator import generate_matricula_code
from app.modules.materias.models import Materia
from app.modules.materias.schemas import MateriaCreate, MateriaUpdate
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User
from app.shared.enums import MateriaEstado, MatriculaEstado, UserRole


MAX_ACTIVE_MATERIAS_PER_PROFESOR = 6
MATERIA_LIMIT_REACHED_MESSAGE = "Has alcanzado el límite máximo de 6 materias."


async def _generate_unique_code(db: AsyncSession) -> str:
    for _ in range(16):
        code = generate_matricula_code()
        exists = await db.scalar(select(Materia.id).where(Materia.codigo_matricula == code))
        if not exists:
            return code
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Could not generate a unique enrollment code",
    )


def _ensure_can_create_materia_for_count(active_count: int, user: User) -> None:
    if str(user.rol) == UserRole.PROFESOR.value and active_count >= MAX_ACTIVE_MATERIAS_PER_PROFESOR:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=MATERIA_LIMIT_REACHED_MESSAGE,
        )


async def _count_active_materias_for_profesor(db: AsyncSession, profesor_id: UUID) -> int:
    count = await db.scalar(
        select(func.count(Materia.id)).where(
            Materia.profesor_id == profesor_id,
            Materia.estado != MateriaEstado.ARCHIVADA.value,
        )
    )
    return int(count or 0)


async def create_materia(db: AsyncSession, payload: MateriaCreate, profesor: User) -> Materia:
    active_count = await _count_active_materias_for_profesor(db, profesor.id)
    _ensure_can_create_materia_for_count(active_count, profesor)
    materia = Materia(
        profesor_id=profesor.id,
        nombre=payload.nombre,
        area=payload.area,
        grado=payload.grado,
        descripcion=payload.descripcion,
        codigo_matricula=await _generate_unique_code(db),
        requiere_aprobacion=payload.requiere_aprobacion,
        estado=MateriaEstado.ACTIVA.value,
    )
    db.add(materia)
    await db.commit()
    await db.refresh(materia)
    return materia


async def list_materias(db: AsyncSession, current_user: User) -> list[Materia]:
    if current_user.rol == UserRole.ADMIN.value:
        stmt = select(Materia).order_by(Materia.created_at.desc())
    elif current_user.rol == UserRole.PROFESOR.value:
        stmt = (
            select(Materia)
            .where(Materia.profesor_id == current_user.id)
            .order_by(Materia.created_at.desc())
        )
    else:
        stmt = (
            select(Materia)
            .join(Matricula, Matricula.materia_id == Materia.id)
            .where(
                Matricula.estudiante_id == current_user.id,
                Matricula.estado == MatriculaEstado.ACTIVO.value,
            )
            .order_by(Materia.created_at.desc())
        )
    result = await db.scalars(stmt)
    return list(result)


async def get_materia_or_404(db: AsyncSession, materia_id: UUID) -> Materia:
    materia = await db.get(Materia, materia_id)
    if not materia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Materia not found")
    return materia


async def ensure_can_read_materia(db: AsyncSession, materia_id: UUID, current_user: User) -> Materia:
    materia = await get_materia_or_404(db, materia_id)
    if current_user.rol == UserRole.ADMIN.value or materia.profesor_id == current_user.id:
        return materia
    if current_user.rol == UserRole.ESTUDIANTE.value:
        enrollment = await db.scalar(
            select(Matricula.id).where(
                Matricula.materia_id == materia_id,
                Matricula.estudiante_id == current_user.id,
                Matricula.estado == MatriculaEstado.ACTIVO.value,
            )
        )
        if enrollment:
            return materia
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


async def ensure_can_manage_materia(db: AsyncSession, materia_id: UUID, current_user: User) -> Materia:
    materia = await get_materia_or_404(db, materia_id)
    if current_user.rol == UserRole.ADMIN.value or materia.profesor_id == current_user.id:
        return materia
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


async def update_materia(
    db: AsyncSession,
    materia: Materia,
    payload: MateriaUpdate,
) -> Materia:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if value is None and field not in {"area", "grado", "descripcion"}:
            continue
        setattr(materia, field, value.value if hasattr(value, "value") else value)

    await db.commit()
    await db.refresh(materia)
    return materia


async def regenerate_code(db: AsyncSession, materia: Materia) -> Materia:
    materia.codigo_matricula = await _generate_unique_code(db)
    materia.codigo_activo = True
    await db.commit()
    await db.refresh(materia)
    return materia


async def list_students(db: AsyncSession, materia: Materia) -> list[User]:
    result = await db.scalars(
        select(User)
        .join(Matricula, Matricula.estudiante_id == User.id)
        .where(
            Matricula.materia_id == materia.id,
            Matricula.estado == MatriculaEstado.ACTIVO.value,
        )
        .order_by(User.nombre.asc())
    )
    return list(result)
