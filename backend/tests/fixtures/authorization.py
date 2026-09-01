"""Datos sintéticos reutilizables para pruebas de autorización modular."""
from __future__ import annotations

from uuid import UUID, uuid4

from app.modules.authorization.catalog import default_permissions_for_role
from app.modules.users.models import User
from app.shared.enums import UserRole


def authorization_user(
    role: UserRole | str,
    *,
    user_id: UUID | None = None,
    permissions: set[str] | frozenset[str] | None = None,
    primary: bool = False,
) -> User:
    role_value = role.value if isinstance(role, UserRole) else role
    user = User(
        id=user_id or uuid4(),
        nombre=f"Prueba {role_value}",
        email=f"auth-{uuid4().hex[:12]}@example.test",
        password_hash="synthetic-test-only",
        rol=role_value,
        estado="activo",
        is_primary_admin=primary,
        auth_version=1,
    )
    user._effective_permissions = frozenset(
        permissions if permissions is not None else default_permissions_for_role(role_value)
    )
    return user
