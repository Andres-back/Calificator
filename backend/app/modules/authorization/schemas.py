from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PermissionRead(BaseModel):
    key: str
    module: str
    action: str
    label: str
    description: str
    risk: str
    sort_order: int
    dependencies: list[str] = Field(default_factory=list)


class PermissionModuleRead(BaseModel):
    module: str
    label: str
    permissions: list[PermissionRead]


class RoleWrite(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    active: bool = True
    permission_keys: list[str] = Field(default_factory=list)
    expected_version: int = Field(default=0, ge=0)


class RoleRead(BaseModel):
    id: UUID
    name: str
    description: str | None
    active: bool
    is_system: bool
    version: int
    permission_keys: list[str] = Field(default_factory=list)
    assigned_users: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthorizationContextRead(BaseModel):
    profile: str
    is_primary_admin: bool
    custom_role_id: UUID | None = None
    custom_role_name: str | None = None
    role_version: int | None = None
    auth_version: int
    permissions: list[str]


class AuditEventRead(BaseModel):
    id: UUID
    actor_id: UUID | None = None
    event: str
    entity_type: str | None = None
    entity_id: str | None = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime


class PermissionExplanationRead(BaseModel):
    user_id: UUID
    permission: str
    granted: bool
    source: str
    role_id: UUID | None = None
    role_name: str | None = None
