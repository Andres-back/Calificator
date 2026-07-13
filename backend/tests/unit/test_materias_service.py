from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.materias.service import (
    MATERIA_LIMIT_REACHED_MESSAGE,
    _ensure_can_create_materia_for_count,
)
from app.shared.enums import UserRole


def _user(role: UserRole):
    return SimpleNamespace(rol=role.value)


def test_profesor_with_five_active_materias_can_create_sixth() -> None:
    _ensure_can_create_materia_for_count(5, _user(UserRole.PROFESOR))


def test_profesor_with_six_active_materias_cannot_create_seventh() -> None:
    with pytest.raises(HTTPException) as exc:
        _ensure_can_create_materia_for_count(6, _user(UserRole.PROFESOR))

    assert exc.value.status_code == 409
    assert exc.value.detail == MATERIA_LIMIT_REACHED_MESSAGE


def test_admin_is_not_limited_by_profesor_materia_cap() -> None:
    _ensure_can_create_materia_for_count(6, _user(UserRole.ADMIN))
