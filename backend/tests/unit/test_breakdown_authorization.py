from types import SimpleNamespace
from uuid import uuid4

import asyncio

import pytest
from fastapi import HTTPException

from app.modules.calificaciones import router
from app.shared.enums import UserRole


class NoDatabaseAccess:
    def __getattr__(self, name):
        raise AssertionError(f"No debe consultar la base de datos antes de validar el rol: {name}")


def test_student_cannot_read_teacher_breakdown_endpoint():
    student = SimpleNamespace(id=uuid4(), rol=UserRole.ESTUDIANTE.value)
    with pytest.raises(HTTPException) as error:
        asyncio.run(router.get_desglose_docente(uuid4(), current_user=student, db=NoDatabaseAccess()))
    assert error.value.status_code == 403


def test_teacher_cannot_read_student_breakdown_endpoint():
    teacher = SimpleNamespace(id=uuid4(), rol=UserRole.PROFESOR.value)
    with pytest.raises(HTTPException) as error:
        asyncio.run(router.get_mi_desglose(uuid4(), current_user=teacher, db=NoDatabaseAccess()))
    assert error.value.status_code == 403
