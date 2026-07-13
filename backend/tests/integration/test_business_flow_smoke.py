import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_SMOKE") != "1",
    reason="Set RUN_DB_SMOKE=1 and DATABASE_URL to run the database smoke test.",
)


def test_teacher_student_evaluation_business_flow() -> None:
    suffix = uuid4().hex[:10]
    with TestClient(create_app(), base_url="https://localhost") as client:
        _run_business_flow(client, suffix)


def _run_business_flow(client: TestClient, suffix: str) -> None:
    response = client.post(
        "/api/auth/register",
        json={
            "nombre": "Profesor Smoke",
            "email": f"prof_{suffix}@example.com",
            "password": "Password123!",
            "rol": "profesor",
        },
    )
    assert response.status_code == 201, response.text
    teacher_cookies = dict(client.cookies)

    response = client.post(
        "/api/materias",
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
            "rol": "estudiante",
        },
    )
    assert response.status_code == 201, response.text

    response = client.post(
        "/api/matriculas/unirse",
        json={"codigo_matricula": materia["codigo_matricula"]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["estado"] == "activo"

    client.cookies.clear()
    for name, value in teacher_cookies.items():
        client.cookies.set(name, value)

    response = client.post(
        "/api/evaluaciones",
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
