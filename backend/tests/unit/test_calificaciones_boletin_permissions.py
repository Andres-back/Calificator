from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from fastapi.testclient import TestClient
from fastapi import HTTPException
import pytest

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.main import create_app
from app.modules.calificaciones import router as calificaciones_router
from app.modules.calificaciones import service as calificaciones_service
from app.modules.materias import service as materias_service
from app.modules.users.models import User
from app.modules.authorization.catalog import default_permissions_for_role


def _user(role: str, user_id=None) -> User:
    user = User(
        id=user_id or uuid4(),
        nombre=f"Usuario {role}",
        email=f"{role}-{uuid4().hex[:8]}@example.com",
        password_hash="x",
        rol=role,
        estado="activo",
    )
    user._effective_permissions = default_permissions_for_role(role)
    return user


async def _db_override():
    yield object()


def _client_with_user(user: User) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = _db_override
    return TestClient(app, base_url="http://localhost")


def test_profesor_ajeno_no_puede_ver_boletin(monkeypatch) -> None:
    owner_id = uuid4()
    other_profesor = _user("profesor")
    materia_id = uuid4()
    estudiante_id = uuid4()

    async def get_materia_or_404(*args, **kwargs):
        return SimpleNamespace(id=materia_id, profesor_id=owner_id)

    async def is_student_enrolled(*args, **kwargs):
        return True

    async def get_boletin(*args, **kwargs):
        return []

    monkeypatch.setattr(materias_service, "get_materia_or_404", get_materia_or_404)
    monkeypatch.setattr(calificaciones_router, "is_student_enrolled", is_student_enrolled)
    monkeypatch.setattr(calificaciones_service, "get_boletin", get_boletin)

    response = _client_with_user(other_profesor).get(
        f"/api/estudiantes/{estudiante_id}/boletin?materia_id={materia_id}"
    )

    assert response.status_code == 403


@pytest.mark.parametrize("read_only", [True, False])
def test_export_read_only_never_assigns_zero_but_default_behavior_is_preserved(monkeypatch, read_only):
    teacher = _user("profesor")
    evaluation_id = uuid4()
    evaluation = SimpleNamespace(id=evaluation_id, profesor_id=teacher.id)
    ensure = AsyncMock(return_value=evaluation)
    overdue = AsyncMock(return_value=[])
    listing = AsyncMock(return_value=[])
    monkeypatch.setattr(calificaciones_router.evaluaciones_service, "ensure_can_manage_evaluation", ensure)
    monkeypatch.setattr(calificaciones_service, "assign_overdue_zero_grades", overdue)
    monkeypatch.setattr(calificaciones_service, "list_calificaciones_for_evaluacion", listing)
    suffix = "?solo_lectura=true" if read_only else ""
    response = _client_with_user(teacher).get(f"/api/evaluaciones/{evaluation_id}/calificaciones{suffix}")
    assert response.status_code == 200
    assert response.json() == []
    ensure.assert_awaited_once()
    listing.assert_awaited_once()
    assert overdue.await_count == (0 if read_only else 1)


def test_read_only_does_not_bypass_subject_ownership(monkeypatch):
    ensure = AsyncMock(side_effect=HTTPException(status_code=403, detail="Sin permiso"))
    listing = AsyncMock()
    overdue = AsyncMock()
    monkeypatch.setattr(calificaciones_router.evaluaciones_service, "ensure_can_manage_evaluation", ensure)
    monkeypatch.setattr(calificaciones_service, "list_calificaciones_for_evaluacion", listing)
    monkeypatch.setattr(calificaciones_service, "assign_overdue_zero_grades", overdue)
    response = _client_with_user(_user("profesor")).get(f"/api/evaluaciones/{uuid4()}/calificaciones?solo_lectura=true")
    assert response.status_code == 403
    listing.assert_not_awaited()
    overdue.assert_not_awaited()


def test_read_only_does_not_bypass_effective_grading_permission(monkeypatch):
    teacher = _user("profesor")
    teacher._effective_permissions = frozenset()
    ensure = AsyncMock()
    monkeypatch.setattr(calificaciones_router.evaluaciones_service, "ensure_can_manage_evaluation", ensure)
    response = _client_with_user(teacher).get(f"/api/evaluaciones/{uuid4()}/calificaciones?solo_lectura=true")
    assert response.status_code == 403
    ensure.assert_not_awaited()


def test_estudiante_no_puede_ver_boletin_ajeno(monkeypatch) -> None:
    student = _user("estudiante")
    materia_id = uuid4()
    other_student_id = uuid4()

    async def get_materia_or_404(*args, **kwargs):
        return SimpleNamespace(id=materia_id, profesor_id=uuid4())

    monkeypatch.setattr(materias_service, "get_materia_or_404", get_materia_or_404)

    response = _client_with_user(student).get(
        f"/api/estudiantes/{other_student_id}/boletin?materia_id={materia_id}"
    )

    assert response.status_code == 403


def test_profesor_dueno_puede_ver_boletin_de_estudiante_matriculado(monkeypatch) -> None:
    profesor = _user("profesor")
    materia_id = uuid4()
    estudiante_id = uuid4()

    async def get_materia_or_404(*args, **kwargs):
        return SimpleNamespace(id=materia_id, profesor_id=profesor.id)

    async def is_student_enrolled(*args, **kwargs):
        return True

    async def get_boletin(*args, **kwargs):
        return []

    monkeypatch.setattr(materias_service, "get_materia_or_404", get_materia_or_404)
    monkeypatch.setattr(calificaciones_router, "is_student_enrolled", is_student_enrolled)
    monkeypatch.setattr(calificaciones_service, "get_boletin", get_boletin)

    response = _client_with_user(profesor).get(
        f"/api/estudiantes/{estudiante_id}/boletin?materia_id={materia_id}"
    )

    assert response.status_code == 200
