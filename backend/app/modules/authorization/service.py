from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.authorization.catalog import ALL_PERMISSION_KEYS, PERMISSIONS, PERMISSION_BY_KEY, PERMISSION_DEPENDENCIES, default_permissions_for_role
from app.modules.authorization.models import AuditEvent, AuthorizationPermission, AuthorizationRole, AuthorizationRolePermission, AuthorizationUserRole
from app.modules.authorization.schemas import AuditEventRead, AuthorizationContextRead, PermissionExplanationRead, PermissionModuleRead, PermissionRead, RoleRead, RoleWrite
from app.modules.users.models import User
from app.services.audit_service import audit
from app.shared.enums import UserEstado


MODULE_LABELS = {
    "users": "Usuarios",
    "roles": "Roles y permisos",
    "admin_settings": "Configuración administrativa",
    "admin_ai": "IA institucional",
    "ai_settings": "IA personal",
    "subjects": "Materias",
    "dba": "DBA",
    "attendance": "Asistencia",
    "evaluations": "Evaluaciones",
    "resources": "Recursos",
    "presentations": "Presentaciones",
    "submissions": "Entregas",
    "grading": "Calificación",
    "gradebook": "Boletín",
    "reports": "Reportes",
    "xali": "Xali",
}


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def normalize_role_name(name: str) -> str:
    return " ".join(name.split()).casefold()


async def sync_permission_catalog(db: AsyncSession) -> None:
    existing = {item.key: item for item in await db.scalars(select(AuthorizationPermission))}
    changed = False
    for definition in PERMISSIONS:
        item = existing.get(definition.key)
        if item is None:
            db.add(
                AuthorizationPermission(
                    key=definition.key,
                    module=definition.module,
                    action=definition.action,
                    label=definition.label,
                    description=definition.description,
                    risk=definition.risk,
                    active=True,
                    sort_order=definition.sort_order,
                )
            )
            changed = True
            continue
        values = (
            definition.module,
            definition.action,
            definition.label,
            definition.description,
            definition.risk,
            definition.sort_order,
        )
        current = (item.module, item.action, item.label, item.description, item.risk, item.sort_order)
        if current != values or not item.active:
            item.module, item.action, item.label, item.description, item.risk, item.sort_order = values
            item.active = True
            changed = True
    if changed:
        await db.flush()


async def get_active_assignment(db: AsyncSession, user_id: UUID) -> tuple[AuthorizationUserRole, AuthorizationRole] | None:
    row = (
        await db.execute(
            select(AuthorizationUserRole, AuthorizationRole)
            .join(AuthorizationRole, AuthorizationRole.id == AuthorizationUserRole.role_id)
            .where(
                AuthorizationUserRole.user_id == user_id,
                AuthorizationUserRole.active.is_(True),
                AuthorizationRole.active.is_(True),
            )
        )
    ).first()
    return (row[0], row[1]) if row else None


async def effective_permissions(db: AsyncSession, user: User) -> frozenset[str]:
    if user.is_primary_admin and user.estado == UserEstado.ACTIVO.value:
        return ALL_PERMISSION_KEYS
    assignment = await get_active_assignment(db, user.id)
    if assignment is None:
        return default_permissions_for_role(user.rol)
    keys = await db.scalars(
        select(AuthorizationRolePermission.permission_key).where(
            AuthorizationRolePermission.role_id == assignment[1].id
        )
    )
    return frozenset(keys)


async def authorization_context(db: AsyncSession, user: User) -> AuthorizationContextRead:
    assignment = await get_active_assignment(db, user.id)
    permissions = sorted(await effective_permissions(db, user))
    role = assignment[1] if assignment else None
    return AuthorizationContextRead(
        profile=user.rol,
        is_primary_admin=bool(user.is_primary_admin),
        custom_role_id=role.id if role else None,
        custom_role_name=role.name if role else None,
        role_version=role.version if role else None,
        auth_version=int(user.auth_version or 1),
        permissions=permissions,
    )


async def ensure_permission(db: AsyncSession, user: User, permission_key: str) -> None:
    if permission_key not in ALL_PERMISSION_KEYS:
        raise RuntimeError(f"Unknown permission key: {permission_key}")
    effective = getattr(user, "_effective_permissions", None)
    if effective is None:
        effective = await effective_permissions(db, user)
    if permission_key not in effective:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para realizar esta acción")


async def _validate_grants(db: AsyncSession, actor: User, permission_keys: set[str]) -> None:
    unknown = sorted(permission_keys - ALL_PERMISSION_KEYS)
    if unknown:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Permisos desconocidos: {', '.join(unknown)}")
    missing_dependencies = {
        dependency
        for key in permission_keys
        for dependency in PERMISSION_DEPENDENCIES.get(key, frozenset())
        if dependency not in permission_keys
    }
    if missing_dependencies:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Faltan permisos requeridos: {', '.join(sorted(missing_dependencies))}",
        )
    if actor.is_primary_admin:
        return
    critical = sorted(
        key for key in permission_keys if PERMISSION_BY_KEY[key].risk == "critical"
    )
    if critical:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un Administrador principal puede conceder permisos críticos",
        )
    actor_permissions = await effective_permissions(db, actor)
    forbidden = sorted(permission_keys - actor_permissions)
    if forbidden:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes conceder permisos que no posees")


async def permission_modules(db: AsyncSession, actor: User) -> list[PermissionModuleRead]:
    await sync_permission_catalog(db)
    allowed = ALL_PERMISSION_KEYS if actor.is_primary_admin else await effective_permissions(db, actor)
    grouped: dict[str, list[PermissionRead]] = defaultdict(list)
    for definition in PERMISSIONS:
        if definition.key not in allowed:
            continue
        grouped[definition.module].append(
            PermissionRead(
                key=definition.key,
                module=definition.module,
                action=definition.action,
                label=definition.label,
                description=definition.description,
                risk=definition.risk,
                sort_order=definition.sort_order,
                dependencies=sorted(PERMISSION_DEPENDENCIES.get(definition.key, frozenset())),
            )
        )
    return [
        PermissionModuleRead(module=module, label=MODULE_LABELS.get(module, module), permissions=items)
        for module, items in grouped.items()
    ]


async def _role_read(db: AsyncSession, role: AuthorizationRole) -> RoleRead:
    keys = list(
        await db.scalars(
            select(AuthorizationRolePermission.permission_key)
            .where(AuthorizationRolePermission.role_id == role.id)
            .order_by(AuthorizationRolePermission.permission_key)
        )
    )
    assigned = int(
        await db.scalar(
            select(func.count(AuthorizationUserRole.id)).where(
                AuthorizationUserRole.role_id == role.id,
                AuthorizationUserRole.active.is_(True),
            )
        )
        or 0
    )
    return RoleRead(
        id=role.id,
        name=role.name,
        description=role.description,
        active=role.active,
        is_system=role.is_system,
        version=role.version,
        permission_keys=keys,
        assigned_users=assigned,
        created_at=role.created_at,
        updated_at=role.updated_at,
    )


async def list_roles(db: AsyncSession, *, include_archived: bool = False) -> list[RoleRead]:
    statement = select(AuthorizationRole)
    if not include_archived:
        statement = statement.where(AuthorizationRole.active.is_(True))
    roles = list(await db.scalars(statement.order_by(AuthorizationRole.name)))
    return [await _role_read(db, role) for role in roles]


async def get_role_or_404(db: AsyncSession, role_id: UUID, *, lock: bool = False) -> AuthorizationRole:
    statement = select(AuthorizationRole).where(AuthorizationRole.id == role_id)
    if lock:
        statement = statement.with_for_update()
    role = await db.scalar(statement)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
    return role


async def get_role_read(db: AsyncSession, role_id: UUID) -> RoleRead:
    return await _role_read(db, await get_role_or_404(db, role_id))


async def _replace_permissions(db: AsyncSession, role: AuthorizationRole, keys: set[str], actor: User) -> None:
    await _validate_grants(db, actor, keys)
    await sync_permission_catalog(db)
    await db.execute(delete(AuthorizationRolePermission).where(AuthorizationRolePermission.role_id == role.id))
    for key in sorted(keys):
        db.add(AuthorizationRolePermission(role_id=role.id, permission_key=key, granted_by=actor.id))


async def create_role(db: AsyncSession, payload: RoleWrite, actor: User) -> RoleRead:
    await _validate_grants(db, actor, set(payload.permission_keys))
    role = AuthorizationRole(
        name=" ".join(payload.name.split()),
        normalized_name=normalize_role_name(payload.name),
        description=payload.description.strip() if payload.description else None,
        active=payload.active,
        is_system=False,
        version=1,
        created_by=actor.id,
        updated_by=actor.id,
    )
    db.add(role)
    try:
        await db.flush()
        await _replace_permissions(db, role, set(payload.permission_keys), actor)
        await db.commit()
        await db.refresh(role)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un rol con ese nombre") from exc
    await audit(db, event="authorization_role_created", user_id=actor.id, metadata={"role_id": str(role.id)})
    return await _role_read(db, role)


async def update_role(db: AsyncSession, role_id: UUID, payload: RoleWrite, actor: User) -> RoleRead:
    role = await get_role_or_404(db, role_id, lock=True)
    if role.is_system:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Los roles del sistema no se pueden editar")
    if payload.expected_version != role.version:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El rol cambió en otra sesión; vuelve a cargarlo")
    if not payload.active:
        assigned = await db.scalar(select(func.count(AuthorizationUserRole.id)).where(AuthorizationUserRole.role_id == role.id, AuthorizationUserRole.active.is_(True)))
        if assigned:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Reasigna sus usuarios antes de archivar el rol")
    role.name = " ".join(payload.name.split())
    role.normalized_name = normalize_role_name(payload.name)
    role.description = payload.description.strip() if payload.description else None
    role.active = payload.active
    role.version += 1
    role.updated_by = actor.id
    role.updated_at = _now()
    await _replace_permissions(db, role, set(payload.permission_keys), actor)
    affected = list(await db.scalars(select(AuthorizationUserRole.user_id).where(AuthorizationUserRole.role_id == role.id, AuthorizationUserRole.active.is_(True))))
    if affected:
        await db.execute(update(User).where(User.id.in_(affected)).values(auth_version=User.auth_version + 1))
    try:
        await db.commit()
        await db.refresh(role)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un rol con ese nombre") from exc
    await audit(db, event="authorization_role_updated", user_id=actor.id, metadata={"role_id": str(role.id), "version": role.version})
    return await _role_read(db, role)


async def duplicate_role(db: AsyncSession, role_id: UUID, actor: User) -> RoleRead:
    source = await get_role_read(db, role_id)
    base = f"Copia de {source.name}"
    name = base
    suffix = 2
    while await db.scalar(select(AuthorizationRole.id).where(AuthorizationRole.normalized_name == normalize_role_name(name))):
        name = f"{base} {suffix}"
        suffix += 1
    return await create_role(db, RoleWrite(name=name, description=source.description, active=True, permission_keys=source.permission_keys), actor)


async def delete_role(db: AsyncSession, role_id: UUID, actor: User) -> None:
    role = await get_role_or_404(db, role_id, lock=True)
    if role.is_system:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Los roles del sistema no se pueden eliminar")
    assigned = await db.scalar(select(func.count(AuthorizationUserRole.id)).where(AuthorizationUserRole.role_id == role.id, AuthorizationUserRole.active.is_(True)))
    if assigned:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Reasigna sus usuarios antes de eliminar el rol")
    await db.delete(role)
    await db.commit()
    await audit(db, event="authorization_role_deleted", user_id=actor.id, metadata={"role_id": str(role_id)})


async def assign_role(db: AsyncSession, user: User, role_id: UUID | None, actor: User) -> None:
    if actor.id == user.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No puedes modificar tu propia asignación privilegiada")
    if user.is_primary_admin and role_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un Administrador principal no puede quedar limitado por un rol personalizado",
        )
    current = await db.scalar(select(AuthorizationUserRole).where(AuthorizationUserRole.user_id == user.id, AuthorizationUserRole.active.is_(True)).with_for_update())
    if current and current.role_id == role_id:
        return
    if role_id is not None:
        role = await get_role_or_404(db, role_id)
        if not role.active:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El rol está archivado")
        role_keys = set(await db.scalars(select(AuthorizationRolePermission.permission_key).where(AuthorizationRolePermission.role_id == role.id)))
        await _validate_grants(db, actor, role_keys)
    if current:
        current.active = False
        current.ended_by = actor.id
        current.ended_at = _now()
    if role_id is not None:
        db.add(AuthorizationUserRole(user_id=user.id, role_id=role_id, active=True, assigned_by=actor.id))
    user.auth_version = int(user.auth_version or 1) + 1
    await db.flush()


async def list_audit_events(
    db: AsyncSession,
    *,
    entity_type: str | None = None,
    entity_id: str | None = None,
    limit: int = 100,
) -> list[AuditEventRead]:
    statement = select(AuditEvent)
    if entity_type:
        statement = statement.where(AuditEvent.entity_type == entity_type)
    if entity_id:
        statement = statement.where(AuditEvent.entity_id == entity_id)
    events = list(await db.scalars(statement.order_by(AuditEvent.created_at.desc()).limit(max(1, min(limit, 200)))))
    return [
        AuditEventRead(
            id=item.id,
            actor_id=item.actor_id,
            event=item.event,
            entity_type=item.entity_type,
            entity_id=item.entity_id,
            metadata=item.metadata_json or {},
            created_at=item.created_at,
        )
        for item in events
    ]


async def explain_permission(db: AsyncSession, user_id: UUID, permission_key: str) -> PermissionExplanationRead:
    if permission_key not in ALL_PERMISSION_KEYS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permiso no encontrado")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    assignment = await get_active_assignment(db, user.id)
    effective = await effective_permissions(db, user)
    if user.is_primary_admin and user.estado == UserEstado.ACTIVO.value:
        source = "Administrador principal"
    elif assignment:
        source = f"Rol personalizado: {assignment[1].name}"
    else:
        source = f"Perfil operativo: {user.rol}"
    return PermissionExplanationRead(
        user_id=user.id,
        permission=permission_key,
        granted=permission_key in effective,
        source=source,
        role_id=assignment[1].id if assignment else None,
        role_name=assignment[1].name if assignment else None,
    )
