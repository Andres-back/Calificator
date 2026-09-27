from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.criterios_aprendizaje import authorization


def _user(*, role: str, permissions: set[str]):
    return SimpleNamespace(id=uuid4(), rol=role, _effective_permissions=permissions)


def test_student_cannot_manage_learning_criteria() -> None:
    db = AsyncMock()
    student = _user(role="estudiante", permissions={"dba.read"})

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            authorization.ensure_can_manage_materia_criteria(db, uuid4(), student)
        )

    assert error.value.status_code == 403

def test_foreign_or_missing_set_is_hidden_as_404() -> None:
    db = AsyncMock()
    db.scalar.return_value = None
    teacher = _user(role="profesor", permissions={"dba.manage"})

    with pytest.raises(HTTPException) as error:
        asyncio.run(authorization.get_set_for_management(db, uuid4(), teacher))

    assert error.value.status_code == 404


def test_admin_still_needs_explicit_module_permission() -> None:
    db = AsyncMock()
    admin = _user(role="admin", permissions=set())

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            authorization.ensure_can_manage_materia_criteria(db, uuid4(), admin)
        )

    assert error.value.status_code == 403
