import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.db.session import AsyncSessionLocal
from app.main import create_app
from app.modules.users import service as user_service
from app.modules.users.schemas import UserCreate
from app.shared.constants import COOKIE_CSRF_NAME
from app.shared.enums import UserRole


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_SMOKE") != "1",
    reason="Set RUN_DB_SMOKE=1 and DATABASE_URL to run the database smoke test.",
)


async def _seed_teacher(email: str) -> None:
    async with AsyncSessionLocal() as db:
        await user_service.create_user(
            db,
            UserCreate(
                nombre="Profesor Smoke",
                email=email,
                password="Password123!",
                rol=UserRole.PROFESOR,
            ),
        )


def _csrf_headers(client: TestClient) -> dict[str, str]:
    token = client.cookies.get(COOKIE_CSRF_NAME)
    assert token, "The authenticated test client must have a CSRF cookie."
    return {"X-CSRF-Token": token}


def test_teacher_student_evaluation_business_flow() -> None:
    suffix = uuid4().hex[:10]
    teacher_email = f"prof_{suffix}@example.com"
    with TestClient(create_app(), base_url="https://localhost") as client:
        assert client.portal is not None
        client.portal.call(_seed_teacher, teacher_email)
        _run_business_flow(client, suffix, teacher_email)


def _run_business_flow(client: TestClient, suffix: str, teacher_email: str) -> None:
    response = client.post(
        "/api/auth/login",
        json={
            "email": teacher_email,
            "password": "Password123!",
        },
    )
    assert response.status_code == 200, response.text
    teacher_cookies = dict(client.cookies)

    response = client.post(
        "/api/materias",
        headers=_csrf_headers(client),
        json={
            "nombre": "Matematicas Smoke",
            "area": "Matematicas",
            "grado": "5",
        },
    )
    assert response.status_code == 201, response.text
    materia = response.json()

    response = client.post(
        "/api/auth/register",
        json={
            "nombre": "Estudiante Smoke",
            "email": f"est_{suffix}@example.com",
            "password": "Password123!",
        },
    )
    assert response.status_code == 201, response.text

    response = client.post(
        "/api/matriculas/unirse",
        headers=_csrf_headers(client),
        json={"codigo_matricula": materia["codigo_matricula"]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["estado"] == "activo"

    client.cookies.clear()
    for name, value in teacher_cookies.items():
        client.cookies.set(name, value)

    response = client.post(
        "/api/evaluaciones",
        headers=_csrf_headers(client),
        json={
            "materia_id": materia["id"],
            "nombre": "Evaluacion Smoke",
            "tipo_origen": "nativa",
            "nota_maxima": 5,
            "metas_profesor": ["Resolver problemas"],
            "criterios": [{"nombre": "Procedimiento", "peso": 1}],
        },
    )
    assert response.status_code == 201, response.text
    evaluacion = response.json()
    assert evaluacion["blueprint"]["nivel_contexto"] == "completo"
    assert evaluacion["blueprint"]["criterios"][0]["nombre"] == "Procedimiento"
