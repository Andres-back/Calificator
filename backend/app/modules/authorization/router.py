from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_permission
from app.db.session import get_db
from app.modules.authorization import service
from app.modules.authorization.schemas import AuditEventRead, AuthorizationContextRead, PermissionExplanationRead, PermissionModuleRead, RoleRead, RoleWrite
from app.modules.users.models import User

router = APIRouter(tags=["authorization"])


@router.get("/users/me/authorization", response_model=AuthorizationContextRead)
async def get_my_authorization(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> AuthorizationContextRead:
    return await service.authorization_context(db, current_user)


@router.get("/admin/authorization/modules", response_model=list[PermissionModuleRead])
async def get_permission_modules(actor: User = Depends(require_permission("roles.read")), db: AsyncSession = Depends(get_db)) -> list[PermissionModuleRead]:
    return await service.permission_modules(db, actor)


@router.get("/admin/authorization/audit", response_model=list[AuditEventRead])
async def get_authorization_audit(
    entity_type: str | None = None,
    entity_id: str | None = None,
    limit: int = 100,
    _: User = Depends(require_permission("roles.read")),
    db: AsyncSession = Depends(get_db),
) -> list[AuditEventRead]:
    return await service.list_audit_events(db, entity_type=entity_type, entity_id=entity_id, limit=limit)


@router.get("/admin/users/{user_id}/authorization/explain/{permission_key:path}", response_model=PermissionExplanationRead)
async def get_permission_explanation(
    user_id: UUID,
    permission_key: str,
    _: User = Depends(require_permission("users.read")),
    db: AsyncSession = Depends(get_db),
) -> PermissionExplanationRead:
    return await service.explain_permission(db, user_id, permission_key)


@router.get("/admin/roles", response_model=list[RoleRead])
async def get_roles(include_archived: bool = False, _: User = Depends(require_permission("roles.read")), db: AsyncSession = Depends(get_db)) -> list[RoleRead]:
    return await service.list_roles(db, include_archived=include_archived)


@router.post("/admin/roles", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
async def post_role(payload: RoleWrite, actor: User = Depends(require_permission("roles.manage")), db: AsyncSession = Depends(get_db)) -> RoleRead:
    return await service.create_role(db, payload, actor)


@router.get("/admin/roles/{role_id}", response_model=RoleRead)
async def get_role(role_id: UUID, _: User = Depends(require_permission("roles.read")), db: AsyncSession = Depends(get_db)) -> RoleRead:
    return await service.get_role_read(db, role_id)


@router.patch("/admin/roles/{role_id}", response_model=RoleRead)
async def patch_role(role_id: UUID, payload: RoleWrite, actor: User = Depends(require_permission("roles.manage")), db: AsyncSession = Depends(get_db)) -> RoleRead:
    return await service.update_role(db, role_id, payload, actor)


@router.post("/admin/roles/{role_id}/duplicate", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
async def duplicate_role(role_id: UUID, actor: User = Depends(require_permission("roles.manage")), db: AsyncSession = Depends(get_db)) -> RoleRead:
    return await service.duplicate_role(db, role_id, actor)


@router.delete("/admin/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_role(role_id: UUID, actor: User = Depends(require_permission("roles.manage")), db: AsyncSession = Depends(get_db)) -> Response:
    await service.delete_role(db, role_id, actor)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
