from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.main import create_app
from app.modules.calificaciones import router as calificaciones_router
from app.modules.calificaciones import service as calificaciones_service
from app.modules.materias import service as materias_service
from app.modules.users.models import User


def _user(role: str, user_id=None) -> User:
    return User(
        id=user_id or uuid4(),
        nombre=f"Usuario {role}",
        email=f"{role}-{uuid4().hex[:8]}@example.com",
        password_hash="x",
        rol=role,
        estado="activo",
    )


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
