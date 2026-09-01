from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.core.permissions import (
    can_manage_profesor_resource,
    require_any_permission_now,
    require_permission_now,
)
from app.modules.authorization.catalog import (
    ALL_PERMISSION_KEYS,
    PERMISSIONS,
    PERMISSION_DEPENDENCIES,
    PROFESSOR_DEFAULT_PERMISSIONS,
    STUDENT_DEFAULT_PERMISSIONS,
    default_permissions_for_role,
)
from app.modules.authorization import service as authorization_service
from app.modules.authorization.schemas import RoleWrite
from app.modules.authorization.service import normalize_role_name
from app.modules.materias.service import _has_teacher_context
from app.modules.users import service as users_service
from app.services.audit_service import _sanitize_metadata
from app.shared.enums import UserRole
from authorization_helpers import make_user


def test_default_profiles_preserve_historical_capabilities() -> None:
    assert default_permissions_for_role(UserRole.ADMIN.value) == ALL_PERMISSION_KEYS
    assert default_permissions_for_role(UserRole.PROFESOR.value) == PROFESSOR_DEFAULT_PERMISSIONS
    assert default_permissions_for_role(UserRole.ESTUDIANTE.value) == STUDENT_DEFAULT_PERMISSIONS
    assert "grading.grade" in PROFESSOR_DEFAULT_PERMISSIONS
    assert "grading.grade" not in STUDENT_DEFAULT_PERMISSIONS


def test_role_name_normalization_is_case_and_whitespace_insensitive() -> None:
    assert normalize_role_name("  Auxiliar   Académico ") == normalize_role_name("auxiliar académico")


def test_mutating_permissions_declare_their_read_dependency() -> None:
    assert PERMISSION_DEPENDENCIES["evaluations.update"] == frozenset({"evaluations.read"})
    assert PERMISSION_DEPENDENCIES["grading.grade"] == frozenset({"grading.read"})
    assert PERMISSION_DEPENDENCIES["roles.manage"] == frozenset({"roles.read"})


def test_immediate_permission_guards_use_effective_permissions() -> None:
    user = make_user(UserRole.ESTUDIANTE)
    user._effective_permissions = frozenset({"subjects.read", "xali.use"})
    require_permission_now(user, "subjects.read")
    require_any_permission_now(user, "grading.read", "xali.use")
    with pytest.raises(HTTPException) as denied:
        require_permission_now(user, "grading.grade")
    assert denied.value.status_code == 403


def test_shared_read_permissions_do_not_turn_a_student_into_subject_manager() -> None:
    user = make_user(UserRole.ESTUDIANTE)
    user._effective_permissions = frozenset({"subjects.read", "grading.read", "attendance.read"})
    assert _has_teacher_context(user) is False

    user._effective_permissions = frozenset({"subjects.read", "evaluations.create"})
    assert _has_teacher_context(user) is True


def test_audit_metadata_removes_secrets_recursively() -> None:
    sanitized = _sanitize_metadata({
        "target_user_id": "synthetic-user",
        "api_key": "must-not-survive",
        "nested": {"password": "must-not-survive", "decision": "approved"},
    })
    assert sanitized == {
        "target_user_id": "synthetic-user",
        "nested": {"decision": "approved"},
    }


@pytest.mark.anyio
async def test_permission_explanation_identifies_the_custom_role_source(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = make_user(UserRole.ESTUDIANTE)
    role = SimpleNamespace(id=uuid4(), name="Auxiliar académico")
    db = SimpleNamespace(get=AsyncMock(return_value=user))
    monkeypatch.setattr(
        authorization_service,
        "get_active_assignment",
        AsyncMock(return_value=(SimpleNamespace(), role)),
    )
    monkeypatch.setattr(
        authorization_service,
        "effective_permissions",
        AsyncMock(return_value=frozenset({"resources.read"})),
    )

    explanation = await authorization_service.explain_permission(
        db, user.id, "resources.read"
    )

    assert explanation.granted is True
    assert explanation.source == "Rol personalizado: Auxiliar académico"
    assert explanation.role_id == role.id
    assert "api" not in explanation.model_dump_json().lower()


@pytest.mark.anyio
async def test_custom_role_permissions_replace_the_base_profile(monkeypatch: pytest.MonkeyPatch) -> None:
    user = make_user(UserRole.ESTUDIANTE)
    role = SimpleNamespace(id=uuid4(), name="Auxiliar académico")
    monkeypatch.setattr(
        authorization_service,
        "get_active_assignment",
        AsyncMock(return_value=(SimpleNamespace(), role)),
    )
    db = SimpleNamespace(
        scalars=AsyncMock(return_value=["presentations.read", "resources.create"])
    )

    effective = await authorization_service.effective_permissions(db, user)

    assert effective == frozenset({"presentations.read", "resources.create"})
    assert "evaluations.submit" not in effective


@pytest.mark.anyio
async def test_active_primary_admin_always_has_the_complete_catalog() -> None:
    user = make_user(UserRole.ADMIN)
    user.is_primary_admin = True
    user.estado = "activo"

    assert await authorization_service.effective_permissions(object(), user) == ALL_PERMISSION_KEYS


@pytest.mark.anyio
async def test_primary_admin_cannot_receive_a_limiting_custom_role() -> None:
    actor = make_user(UserRole.ADMIN)
    actor.is_primary_admin = True
    protected = make_user(UserRole.ADMIN)
    protected.is_primary_admin = True

    with pytest.raises(HTTPException) as denied:
        await authorization_service.assign_role(object(), protected, uuid4(), actor)

    assert denied.value.status_code == 409


def test_resource_property_is_independent_from_the_profile_name() -> None:
    owner = make_user(UserRole.ESTUDIANTE)
    outsider = make_user(UserRole.PROFESOR)
    admin = make_user(UserRole.ADMIN)

    assert can_manage_profesor_resource(owner, owner.id) is True
    assert can_manage_profesor_resource(outsider, owner.id) is False
    assert can_manage_profesor_resource(admin, owner.id) is True


def _role_payload(*, expected_version: int = 1) -> RoleWrite:
    return RoleWrite(
        name="Auxiliar académico",
        description="Apoya recursos y presentaciones",
        permission_keys=["resources.read", "resources.create"],
        expected_version=expected_version,
    )


def test_permission_catalog_is_groupable_and_has_unique_keys() -> None:
    keys = [item.key for item in PERMISSIONS]
    modules = {item.module for item in PERMISSIONS}

    assert len(keys) == len(set(keys))
    assert {"users", "roles", "resources", "presentations", "grading"}.issubset(modules)


@pytest.mark.anyio
async def test_role_grants_require_declared_read_dependencies() -> None:
    actor = make_user(UserRole.ADMIN)
    actor.is_primary_admin = True

    with pytest.raises(HTTPException) as denied:
        await authorization_service._validate_grants(object(), actor, {"grading.grade"})

    assert denied.value.status_code == 422
    assert "grading.read" in denied.value.detail


@pytest.mark.anyio
async def test_system_role_cannot_be_edited(monkeypatch: pytest.MonkeyPatch) -> None:
    role = SimpleNamespace(is_system=True, version=1)
    monkeypatch.setattr(
        authorization_service,
        "get_role_or_404",
        AsyncMock(return_value=role),
    )

    with pytest.raises(HTTPException) as denied:
        await authorization_service.update_role(
            object(), uuid4(), _role_payload(), make_user(UserRole.ADMIN)
        )

    assert denied.value.status_code == 409
    assert "sistema" in denied.value.detail.lower()


@pytest.mark.anyio
async def test_stale_role_version_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    role = SimpleNamespace(is_system=False, version=2)
    monkeypatch.setattr(
        authorization_service,
        "get_role_or_404",
        AsyncMock(return_value=role),
    )

    with pytest.raises(HTTPException) as denied:
        await authorization_service.update_role(
            object(),
            uuid4(),
            _role_payload(expected_version=1),
            make_user(UserRole.ADMIN),
        )

    assert denied.value.status_code == 409
    assert "otra sesión" in denied.value.detail


@pytest.mark.anyio
async def test_duplicate_role_uses_the_next_available_normalized_name(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = SimpleNamespace(
        name="Auxiliar académico",
        description="Apoya recursos",
        permission_keys=["resources.read"],
    )
    expected = object()
    db = SimpleNamespace(scalar=AsyncMock(side_effect=[uuid4(), None]))
    create = AsyncMock(return_value=expected)
    monkeypatch.setattr(
        authorization_service,
        "get_role_read",
        AsyncMock(return_value=source),
    )
    monkeypatch.setattr(authorization_service, "create_role", create)

    result = await authorization_service.duplicate_role(
        db, uuid4(), make_user(UserRole.ADMIN)
    )

    assert result is expected
    payload = create.await_args.args[1]
    assert payload.name == "Copia de Auxiliar académico 2"
    assert payload.permission_keys == ["resources.read"]


@pytest.mark.anyio
async def test_primary_admin_account_cannot_be_deleted() -> None:
    protected = make_user(UserRole.ADMIN)
    protected.is_primary_admin = True

    with pytest.raises(HTTPException) as denied:
        await users_service.delete_user(
            object(), protected, actor=make_user(UserRole.ADMIN)
        )

    assert denied.value.status_code == 409
    assert "protegida" in denied.value.detail.lower()


@pytest.mark.anyio
async def test_admin_cannot_delete_own_account() -> None:
    actor = make_user(UserRole.ADMIN)

    with pytest.raises(HTTPException) as denied:
        await users_service.delete_user(object(), actor, actor=actor)

    assert denied.value.status_code == 409
    assert "propia cuenta" in denied.value.detail.lower()


@pytest.mark.anyio
async def test_empty_user_is_physically_deleted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    actor = make_user(UserRole.ADMIN)
    target = make_user(UserRole.ESTUDIANTE)
    db = SimpleNamespace(delete=AsyncMock(), commit=AsyncMock())
    monkeypatch.setattr(
        users_service,
        "_protect_last_primary_admin",
        AsyncMock(),
    )
    monkeypatch.setattr(
        users_service,
        "deletion_impact",
        AsyncMock(
            return_value=SimpleNamespace(
                can_hard_delete=True,
                total_references=0,
            )
        ),
    )
    audit = AsyncMock()
    monkeypatch.setattr(users_service, "audit", audit)

    await users_service.delete_user(db, target, actor=actor)

    db.delete.assert_awaited_once_with(target)
    db.commit.assert_awaited_once()
    assert audit.await_args.kwargs["event"] == "user_admin_deleted"


@pytest.mark.anyio
async def test_referenced_user_is_deactivated_without_losing_history(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    actor = make_user(UserRole.ADMIN)
    target = make_user(UserRole.ESTUDIANTE)
    target.auth_version = 4
    db = SimpleNamespace(delete=AsyncMock(), commit=AsyncMock())
    monkeypatch.setattr(
        users_service,
        "_protect_last_primary_admin",
        AsyncMock(),
    )
    monkeypatch.setattr(
        users_service,
        "deletion_impact",
        AsyncMock(
            return_value=SimpleNamespace(
                can_hard_delete=False,
                total_references=3,
            )
        ),
    )
    audit = AsyncMock()
    monkeypatch.setattr(users_service, "audit", audit)

    await users_service.delete_user(db, target, actor=actor)

    db.delete.assert_not_awaited()
    db.commit.assert_awaited_once()
    assert target.estado == "inactivo"
    assert target.auth_version == 5
    assert audit.await_args.kwargs["event"] == "user_admin_deactivated"
