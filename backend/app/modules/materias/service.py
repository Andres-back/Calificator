from datetime import timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.materias.code_generator import generate_matricula_code
from app.modules.materias.models import Materia
from app.modules.materias.schemas import MateriaCreate, MateriaUpdate
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User
from app.modules.authorization.models import AuditEvent
from app.shared.enums import MateriaEstado, MatriculaEstado, UserRole


MAX_ACTIVE_MATERIAS_PER_PROFESOR = 6
MATERIA_LIMIT_REACHED_MESSAGE = "Has alcanzado el límite máximo de 6 materias."

TEACHER_CONTEXT_PERMISSIONS = frozenset(
    {
        "subjects.create",
        "subjects.update",
        "evaluations.create",
        "evaluations.update",
        "evaluations.publish",
        "resources.create",
        "resources.update",
        "resources.assign",
        "grading.grade",
        "grading.publish",
        "attendance.manage",
        "dba.manage",
    }
)


def _has_teacher_context(user: User) -> bool:
    if str(user.rol) in {UserRole.ADMIN.value, UserRole.PROFESOR.value}:
        return True
    effective = getattr(user, "_effective_permissions", frozenset())
    return bool(TEACHER_CONTEXT_PERMISSIONS.intersection(effective))


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
    if str(user.rol) != UserRole.ADMIN.value and active_count >= MAX_ACTIVE_MATERIAS_PER_PROFESOR:
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
    await _lock_owner(db, profesor.id)
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
    elif _has_teacher_context(current_user):
        enrolled_subjects = select(Matricula.materia_id).where(
            Matricula.estudiante_id == current_user.id,
            Matricula.estado == MatriculaEstado.ACTIVO.value,
        )
        stmt = (
            select(Materia)
            .where(
                or_(
                    Materia.profesor_id == current_user.id,
                    Materia.id.in_(enrolled_subjects),
                )
            )
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


async def ensure_can_manage_materia(db: AsyncSession, materia_id: UUID, current_user: User, *, admission: bool = False) -> Materia:
    materia = await get_materia_or_404(db, materia_id)
    if current_user.rol == UserRole.ADMIN.value or materia.profesor_id == current_user.id:
        if admission:
            return await ensure_active_materia(db, materia_id)
        return materia
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")


async def update_materia(
    db: AsyncSession,
    materia: Materia,
    payload: MateriaUpdate,
    actor: User,
) -> Materia:
    if actor.rol != UserRole.ADMIN.value and materia.profesor_id != actor.id:
        raise HTTPException(403, "No tienes permiso para modificar esta materia.")
    await _lock_owner(db, materia.profesor_id)
    materia = await db.scalar(select(Materia).where(Materia.id == materia.id).with_for_update().execution_options(populate_existing=True))
    if materia is None:
        raise HTTPException(404, "Materia no encontrada")
    data = payload.model_dump(exclude_unset=True, exclude={"expected_updated_at"})
    # A replay of an already completed state-only transition is harmless.
    same_transition = set(data) == {"estado"} and str(data["estado"]) == materia.estado
    expected = payload.expected_updated_at
    if expected is not None:
        expected = expected.astimezone(timezone.utc).replace(tzinfo=None) if expected.tzinfo else expected
        if expected != materia.updated_at and not same_transition:
            raise HTTPException(409, "La materia cambió. Actualiza la página y revisa los datos antes de guardar.")
    previous = materia.estado
    target = str(data.get("estado") or previous)
    if previous == MateriaEstado.ARCHIVADA.value and target == MateriaEstado.ACTIVA.value:
        _ensure_can_create_materia_for_count(await _count_active_materias_for_profesor(db, materia.profesor_id), actor)
        data["codigo_activo"] = False
    if target == MateriaEstado.ARCHIVADA.value:
        data["codigo_activo"] = False
        from app.modules.evaluaciones.models import Evaluacion
        await db.execute(update(Evaluacion).where(Evaluacion.materia_id == materia.id, Evaluacion.recepcion_habilitada.is_(True)).values(recepcion_habilitada=False))
    changed = []
    for field, value in data.items():
        if value is None and field not in {"area", "grado", "descripcion"}:
            continue
        value = value.value if hasattr(value, "value") else value
        if getattr(materia, field) != value:
            changed.append(field)
            setattr(materia, field, value)
    if changed:
        db.add(AuditEvent(actor_id=actor.id, event="materia_archived" if target == "archivada" and previous != target
                         else "materia_restored" if previous != target else "materia_updated",
                         entity_type="materia", entity_id=str(materia.id),
                         metadata_json={"fields": changed, "previous_state": previous, "state": target}))
    await db.commit()
    await db.refresh(materia)
    return materia


async def regenerate_code(db: AsyncSession, materia: Materia) -> Materia:
    materia = await ensure_active_materia(db, materia.id)
    materia.codigo_matricula = await _generate_unique_code(db)
    materia.codigo_activo = True
    await db.commit()
    await db.refresh(materia)
    return materia


async def _lock_owner(db: AsyncSession, profesor_id: UUID) -> None:
    # Creation and restoration share this lock, so neither can race past quota.
    await db.scalar(select(User.id).where(User.id == profesor_id).with_for_update())


async def ensure_active_materia(db: AsyncSession, materia_id: UUID) -> Materia:
    """Admission gate only. Workers processing already admitted jobs do not call it."""
    materia = await db.scalar(select(Materia).where(Materia.id == materia_id).with_for_update().execution_options(populate_existing=True))
    if materia is None:
        raise HTTPException(404, "Materia no encontrada")
    if materia.estado == MateriaEstado.ARCHIVADA.value:
        raise HTTPException(409, "Esta materia está archivada. Puedes consultar su historial o restaurarla desde Materias.")
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
