from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
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


def test_owner_and_admin_can_manage_without_sharing_teacher_scope(monkeypatch) -> None:
    owner = _user(role="profesor", permissions={"dba.manage"})
    admin = _user(role="admin", permissions={"dba.manage"})
    criterion_set = SimpleNamespace(id=uuid4(), materia_id=uuid4(), profesor_id=owner.id)
    ensure = AsyncMock(return_value=SimpleNamespace(id=criterion_set.materia_id))
    monkeypatch.setattr(authorization, "ensure_can_manage_materia_criteria", ensure)

    class SetDb:
        def __init__(self) -> None:
            self.statement = None

        async def scalar(self, statement):
            self.statement = statement
            return criterion_set

    owner_db = SetDb()
    admin_db = SetDb()
    assert asyncio.run(authorization.get_set_for_management(owner_db, criterion_set.id, owner)) is criterion_set
    assert asyncio.run(authorization.get_set_for_management(admin_db, criterion_set.id, admin)) is criterion_set
    owner_where = str(owner_db.statement).partition("WHERE")[2]
    admin_where = str(admin_db.statement).partition("WHERE")[2]
    assert "profesor_id" in owner_where
    assert "profesor_id" not in admin_where
    assert ensure.await_count == 2


def test_private_source_is_visible_only_inside_owner_or_admin_scope(monkeypatch) -> None:
    teacher = _user(role="profesor", permissions={"dba.manage"})
    source = SimpleNamespace(id=uuid4(), private_file_key="private/material.pdf")
    version = SimpleNamespace(id=uuid4())
    criterion_set = SimpleNamespace(id=uuid4(), materia_id=uuid4(), profesor_id=teacher.id)
    ensure = AsyncMock(return_value=SimpleNamespace(id=criterion_set.materia_id))
    monkeypatch.setattr(authorization, "ensure_can_manage_materia_criteria", ensure)

    class Result:
        def __init__(self, value) -> None:
            self.value = value

        def first(self):
            return self.value

    db = MagicMock()
    db.execute = AsyncMock(return_value=Result((source, version, criterion_set)))
    found = asyncio.run(authorization.get_source_for_management(db, source.id, teacher))
    assert found == (source, version, criterion_set)
    assert "profesor_id" in str(db.execute.await_args.args[0])

    db.execute = AsyncMock(return_value=Result(None))
    stranger = _user(role="profesor", permissions={"dba.manage"})
    with pytest.raises(HTTPException) as hidden:
        asyncio.run(authorization.get_source_for_management(db, source.id, stranger))
    assert hidden.value.status_code == 404
    assert "private/material.pdf" not in str(hidden.value.detail)
