from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.modules.users.models import User
from app.modules.users.schemas import (
    SolicitudDocenteDecision,
    SolicitudDocenteDecisionRequest,
    UserCreate,
    UserSelfUpdate,
    UserUpdate,
)
from app.services.audit_service import audit
from app.shared.enums import SolicitudDocenteEstado, UserEstado, UserRole


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(select(User).where(User.email == email.lower()))


async def get_user_or_404(
    db: AsyncSession, user_id: UUID, *, lock: bool = False
) -> User:
    statement = select(User).where(User.id == user_id)
    if lock:
        statement = statement.with_for_update()
    user = await db.scalar(statement)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )
    return user


async def list_users(
    db: AsyncSession,
    *,
    q: str | None = None,
    rol: UserRole | None = None,
    estado: UserEstado | None = None,
    solicitud_docente_estado: SolicitudDocenteEstado | None = None,
    limit: int = 25,
    offset: int = 0,
) -> list[User]:
    statement = select(User)
    if q and q.strip():
        term = f"%{q.strip()}%"
        statement = statement.where(
            or_(User.nombre.ilike(term), User.email.ilike(term))
        )
    if rol:
        statement = statement.where(User.rol == rol.value)
    if estado:
        statement = statement.where(User.estado == estado.value)
    if solicitud_docente_estado:
        statement = statement.where(
            User.solicitud_docente_estado == solicitud_docente_estado.value
        )
    result = await db.scalars(
        statement.order_by(User.created_at.desc()).limit(limit).offset(offset)
    )
    return list(result)


async def create_user(
    db: AsyncSession, payload: UserCreate, *, commit: bool = True
) -> User:
    existing = await get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado"
        )

    user = User(
        nombre=payload.nombre,
        email=payload.email.lower(),
        password_hash=get_password_hash(payload.password),
        rol=payload.rol.value,
        estado=UserEstado.ACTIVO.value,
    )
    db.add(user)
    try:
        await db.flush()
        if commit:
            await db.commit()
            await db.refresh(user)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado"
        ) from exc
    return user


async def _protect_last_active_admin(
    db: AsyncSession,
    user: User,
    *,
    new_role: str | None = None,
    new_state: str | None = None,
    deleting: bool = False,
) -> None:
    removes_admin = (
        deleting
        or (new_role is not None and new_role != UserRole.ADMIN.value)
        or (new_state is not None and new_state != UserEstado.ACTIVO.value)
    )
    if (
        user.rol != UserRole.ADMIN.value
        or user.estado != UserEstado.ACTIVO.value
        or not removes_admin
    ):
        return
    admins = list(
        await db.scalars(
            select(User)
            .where(
                User.rol == UserRole.ADMIN.value, User.estado == UserEstado.ACTIVO.value
            )
            .order_by(User.id)
            .with_for_update()
        )
    )
    if len(admins) <= 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Debe permanecer al menos un administrador activo",
        )


async def update_user(
    db: AsyncSession,
    user: User,
    payload: UserUpdate | UserSelfUpdate,
    *,
    actor: User | None = None,
) -> User:
    data = payload.model_dump(exclude_unset=True)
    role = data.get("rol")
    state = data.get("estado")
    if actor and actor.id == user.id and (role is not None or state is not None):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No puedes modificar tu propio rol o estado",
        )
    await _protect_last_active_admin(
        db,
        user,
        new_role=role.value if role is not None else None,
        new_state=state.value if state is not None else None,
    )
    if "email" in data and data["email"]:
        email = data["email"].lower()
        existing = await get_user_by_email(db, email)
        if existing and existing.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El correo ya está registrado",
            )
        user.email = email
    if "nombre" in data and data["nombre"] is not None:
        user.nombre = data["nombre"]
    security_state_changed = False
    if "password" in data and data["password"]:
        user.password_hash = get_password_hash(data["password"])
        security_state_changed = True
    if role is not None and hasattr(payload, "rol"):
        user.rol = role.value
        if (
            role == UserRole.PROFESOR
            and user.solicitud_docente_estado == SolicitudDocenteEstado.PENDIENTE.value
        ):
            user.solicitud_docente_estado = SolicitudDocenteEstado.APROBADA.value
            user.solicitud_docente_resuelta_at = _now()
            user.solicitud_docente_revisada_por = actor.id if actor else None
            user.solicitud_docente_motivo = (
                "Aprobada mediante gestión administrativa de rol"
            )
    if state is not None and hasattr(payload, "estado"):
        if user.estado != state.value:
            security_state_changed = True
        user.estado = state.value

    if security_state_changed:
        from app.modules.auth.models import PasswordResetRequest

        user.auth_version = int(user.auth_version or 1) + 1
        await db.execute(
            update(PasswordResetRequest)
            .where(
                PasswordResetRequest.user_id == user.id,
                PasswordResetRequest.consumed_at.is_(None),
                PasswordResetRequest.invalidated_at.is_(None),
            )
            .values(invalidated_at=_now())
        )

    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No fue posible guardar el usuario",
        ) from exc
    if actor:
        await audit(
            db,
            event="user_admin_updated",
            user_id=actor.id,
            metadata={"target_user_id": str(user.id)},
        )
    return user


async def resolve_teacher_request(
    db: AsyncSession,
    user_id: UUID,
    payload: SolicitudDocenteDecisionRequest,
    admin: User,
) -> User:
    user = await get_user_or_404(db, user_id, lock=True)
    if user.solicitud_docente_estado is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario no tiene una solicitud docente",
        )
    desired = (
        SolicitudDocenteEstado.APROBADA
        if payload.decision == SolicitudDocenteDecision.APROBAR
        else SolicitudDocenteEstado.RECHAZADA
    )
    current = SolicitudDocenteEstado(user.solicitud_docente_estado)
    if current == desired:
        return user
    if current != SolicitudDocenteEstado.PENDIENTE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La solicitud ya fue resuelta con otra decisión",
        )
    if user.rol == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Gestiona el rol administrador desde la edición de usuarios",
        )

    user.solicitud_docente_estado = desired.value
    user.solicitud_docente_resuelta_at = _now()
    user.solicitud_docente_revisada_por = admin.id
    user.solicitud_docente_motivo = payload.motivo.strip() if payload.motivo else None
    user.rol = (
        UserRole.PROFESOR.value
        if desired == SolicitudDocenteEstado.APROBADA
        else UserRole.ESTUDIANTE.value
    )
    await db.commit()
    await db.refresh(user)
    await audit(
        db,
        event="teacher_request_resolved",
        user_id=admin.id,
        metadata={"target_user_id": str(user.id), "decision": payload.decision.value},
    )
    return user


async def delete_user(
    db: AsyncSession, user: User, *, actor: User | None = None
) -> None:
    if actor and actor.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No puedes eliminar tu propia cuenta administrativa",
        )
    await _protect_last_active_admin(db, user, deleting=True)
    await db.delete(user)
    await db.commit()
    if actor:
        await audit(
            db,
            event="user_admin_deleted",
            user_id=actor.id,
            metadata={"target_user_id": str(user.id)},
        )
