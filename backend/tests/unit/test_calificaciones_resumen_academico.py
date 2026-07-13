from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.main import create_app
from app.modules.calificaciones import router as calificaciones_router
from app.modules.calificaciones import service as calificaciones_service
from app.modules.users.models import User


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class FakeDb:
    def __init__(self, rows):
        self.rows = rows
        self.statement = None

    async def execute(self, statement):
        self.statement = statement
        return FakeResult(self.rows)


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_resumen_academico_normaliza_notas_y_agrega_por_materia() -> None:
    materia_fuerte = uuid4()
    materia_refuerzo = uuid4()
    db = FakeDb(
        [
            (materia_fuerte, "Ciencias", Decimal("8"), Decimal("10")),
            (materia_fuerte, "Ciencias", Decimal("4"), Decimal("5")),
            (materia_refuerzo, "Matematicas", Decimal("2"), Decimal("5")),
        ]
    )

    resumen = await calificaciones_service.get_resumen_academico(db, uuid4())

    assert db.statement is not None
    assert resumen["total_notas"] == 3
    assert resumen["total_materias"] == 2
    assert resumen["mejor"]["materia_id"] == materia_fuerte
    assert resumen["mejor"]["promedio"] == 4.0
    assert resumen["por_mejorar"]["materia_id"] == materia_refuerzo
    assert resumen["por_mejorar"]["promedio"] == 2.0
    assert resumen["promedio_general"] == pytest.approx(10 / 3)


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


def test_estudiante_puede_ver_su_propio_resumen(monkeypatch) -> None:
    estudiante = _user("estudiante")

    async def get_resumen(*args, **kwargs):
        return {
            "mejor": None,
            "por_mejorar": None,
            "promedio_general": None,
            "total_materias": 0,
            "total_notas": 0,
        }

    monkeypatch.setattr(calificaciones_service, "get_resumen_academico", get_resumen)

    response = _client_with_user(estudiante).get(
        f"/api/estudiantes/{estudiante.id}/resumen-academico"
    )

    assert response.status_code == 200
    assert response.json()["total_notas"] == 0


def test_profesor_no_puede_ver_resumen_transversal_de_estudiante() -> None:
    profesor = _user("profesor")

    response = _client_with_user(profesor).get(
        f"/api/estudiantes/{uuid4()}/resumen-academico"
    )

    assert response.status_code == 403
