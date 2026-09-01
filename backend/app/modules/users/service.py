from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.modules.users.models import User
from app.modules.users.schemas import (
    AdminUserRead,
    SolicitudDocenteDecision,
    SolicitudDocenteDecisionRequest,
    UserCreate,
    UserSelfUpdate,
    UserUpdate,
    UserDeletionImpactRead,
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
    custom_role_id: UUID | None = None,
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
    if custom_role_id:
        from app.modules.authorization.models import AuthorizationUserRole

        statement = statement.join(
            AuthorizationUserRole,
            (AuthorizationUserRole.user_id == User.id)
            & AuthorizationUserRole.active.is_(True),
        ).where(AuthorizationUserRole.role_id == custom_role_id)
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
        estado=payload.estado.value,
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


async def _protect_last_primary_admin(
    db: AsyncSession,
    user: User,
    *,
    new_role: str | None = None,
    new_state: str | None = None,
    deleting: bool = False,
) -> None:
    removes_primary_access = (
        deleting
        or (new_role is not None and new_role != UserRole.ADMIN.value)
        or (new_state is not None and new_state != UserEstado.ACTIVO.value)
    )
    if (
        not user.is_primary_admin
        or user.estado != UserEstado.ACTIVO.value
        or not removes_primary_access
    ):
        return
    primary_admins = list(
        await db.scalars(
            select(User)
            .where(
                User.is_primary_admin.is_(True),
                User.rol == UserRole.ADMIN.value,
                User.estado == UserEstado.ACTIVO.value,
            )
            .order_by(User.id)
            .with_for_update()
        )
    )
    if len(primary_admins) <= 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Debe permanecer al menos un Administrador principal activo",
        )


async def validate_access_assignment(
    db: AsyncSession,
    actor: User,
    *,
    profile: str,
    custom_role_id: UUID | None,
) -> None:
    """Impide que un administrador delegado conceda más acceso del que posee."""
    if actor.is_primary_admin:
        return
    if profile == UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Administrador principal puede asignar el perfil administrador",
        )

    from app.modules.authorization.catalog import default_permissions_for_role
    from app.modules.authorization.models import AuthorizationRolePermission
    from app.modules.authorization.service import effective_permissions, get_role_or_404

    actor_permissions = await effective_permissions(db, actor)
    if custom_role_id is None:
        target_permissions = default_permissions_for_role(profile)
    else:
        if "roles.manage" not in actor_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Necesitas permiso para gestionar roles antes de asignarlos",
            )
        role = await get_role_or_404(db, custom_role_id)
        if not role.active:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El rol está archivado")
        target_permissions = frozenset(
            await db.scalars(
                select(AuthorizationRolePermission.permission_key).where(
                    AuthorizationRolePermission.role_id == custom_role_id
                )
            )
        )
    if not target_permissions.issubset(actor_permissions):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes conceder permisos que no posees",
        )


async def update_user(
    db: AsyncSession,
    user: User,
    payload: UserUpdate | UserSelfUpdate,
    *,
    actor: User | None = None,
) -> User:
    data = payload.model_dump(exclude_unset=True)
    original_role = user.rol
    original_state = user.estado
    original_primary_admin = bool(getattr(user, "is_primary_admin", False))
    custom_role_supplied = "custom_role_id" in data
    custom_role_id = data.pop("custom_role_id", None)
    primary_admin_supplied = "is_primary_admin" in data
    requested_primary_admin = data.pop("is_primary_admin", None)
    role = data.get("rol")
    state = data.get("estado")
    if actor and actor.id == user.id and (role is not None or state is not None or primary_admin_supplied or custom_role_supplied):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No puedes modificar tu propio acceso administrativo",
        )
    if actor and getattr(user, "is_primary_admin", False) and not getattr(actor, "is_primary_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Administrador principal puede gestionar otra cuenta principal",
        )
    if getattr(user, "is_primary_admin", False) and (
        (role is not None and role != UserRole.ADMIN)
        or (state is not None and state != UserEstado.ACTIVO)
        or (custom_role_supplied and custom_role_id is not None)
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Retira primero la condición de Administrador principal mediante el flujo protegido",
        )
    if actor and (role is not None or custom_role_supplied):
        active_assignment = None
        if not custom_role_supplied:
            from app.modules.authorization.service import get_active_assignment

            active_assignment = await get_active_assignment(db, user.id)
        await validate_access_assignment(
            db,
            actor,
            profile=role.value if role is not None else user.rol,
            custom_role_id=custom_role_id if custom_role_supplied else (active_assignment[1].id if active_assignment else None),
        )

    if primary_admin_supplied:
        if actor is None or not actor.is_primary_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo un Administrador principal puede designar o retirar esta condición",
            )
        if requested_primary_admin:
            resulting_role = role.value if role is not None else user.rol
            resulting_state = state.value if state is not None else user.estado
            if resulting_role != UserRole.ADMIN.value or resulting_state != UserEstado.ACTIVO.value or (custom_role_supplied and custom_role_id is not None):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Un Administrador principal debe estar activo, usar el perfil administrador y no tener un rol personalizado",
                )
        elif user.is_primary_admin:
            await _protect_last_primary_admin(db, user, deleting=True)

    await _protect_last_primary_admin(
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
        if user.rol != role.value:
            security_state_changed = True
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

    if primary_admin_supplied and user.is_primary_admin != bool(requested_primary_admin):
        user.is_primary_admin = bool(requested_primary_admin)
        security_state_changed = True

    if custom_role_supplied:
        if actor is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="La asignación de roles requiere administración")
        from app.modules.authorization.service import assign_role

        await assign_role(db, user, custom_role_id, actor)

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
        changed_fields = sorted(
            field
            for field, changed in {
                "nombre": "nombre" in data,
                "email": "email" in data,
                "password": "password" in data,
                "rol": original_role != user.rol,
                "estado": original_state != user.estado,
                "is_primary_admin": original_primary_admin != bool(user.is_primary_admin),
                "custom_role_id": custom_role_supplied,
            }.items()
            if changed
        )
        await audit(
            db,
            event="user_admin_updated",
            user_id=actor.id,
            metadata={
                "target_user_id": str(user.id),
                "changed_fields": changed_fields,
                "custom_role_id": str(custom_role_id) if custom_role_id else None,
                "primary_admin_changed": original_primary_admin != bool(user.is_primary_admin),
            },
        )
    return user


async def admin_user_read(db: AsyncSession, user: User) -> AdminUserRead:
    from app.modules.authorization.service import get_active_assignment

    assignment = await get_active_assignment(db, user.id)
    role = assignment[1] if assignment else None
    return AdminUserRead(
        id=user.id,
        nombre=user.nombre,
        email=user.email,
        rol=user.rol,
        estado=user.estado,
        is_primary_admin=bool(user.is_primary_admin),
        solicitud_docente_estado=user.solicitud_docente_estado,
        solicitud_docente_solicitada_at=user.solicitud_docente_solicitada_at,
        solicitud_docente_resuelta_at=user.solicitud_docente_resuelta_at,
        solicitud_docente_revisada_por=user.solicitud_docente_revisada_por,
        solicitud_docente_motivo=user.solicitud_docente_motivo,
        custom_role_id=role.id if role else None,
        custom_role_name=role.name if role else None,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


async def deletion_impact(db: AsyncSession, user: User) -> UserDeletionImpactRead:
    from app.db.base import Base, import_models

    import_models()
    references: dict[str, int] = {}
    for table in Base.metadata.sorted_tables:
        if table.name == "users":
            continue
        for column in table.columns:
            if not any(foreign_key.target_fullname == "users.id" for foreign_key in column.foreign_keys):
                continue
            count = int(await db.scalar(select(func.count()).select_from(table).where(column == user.id)) or 0)
            if count:
                references[f"{table.name}.{column.name}"] = count
    total = sum(references.values())
    return UserDeletionImpactRead(
        user_id=user.id,
        can_hard_delete=total == 0,
        action="delete" if total == 0 else "deactivate",
        total_references=total,
        references=references,
    )


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
    if user.is_primary_admin:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La cuenta de un Administrador principal está protegida",
        )
    await _protect_last_primary_admin(db, user, deleting=True)
    impact = await deletion_impact(db, user)
    if impact.can_hard_delete:
        await db.delete(user)
        event = "user_admin_deleted"
    else:
        user.estado = UserEstado.INACTIVO.value
        user.auth_version = int(user.auth_version or 1) + 1
        event = "user_admin_deactivated"
    await db.commit()
    if actor:
        await audit(
            db,
            event=event,
            user_id=actor.id,
            metadata={"target_user_id": str(user.id), "references": impact.total_references},
        )
