import pytest

pytest.importorskip("fastapi")
pytest.importorskip("sqlalchemy")

from app.main import create_app


def test_phase_1_2_routes_are_registered() -> None:
    app = create_app()
    paths = set(app.openapi().get("paths", {}))

    expected_paths = {
        "/api/auth/login",
        "/api/auth/logout",
        "/api/auth/refresh",
        "/api/auth/me",
        "/api/auth/register",
        "/api/users/me",
        "/api/admin/users",
        "/api/materias",
        "/api/materias/{materia_id}",
        "/api/materias/{materia_id}/regenerar-codigo",
        "/api/materias/{materia_id}/estudiantes",
        "/api/matriculas/unirse",
        "/api/matriculas/mis-materias",
        "/api/matriculas/{matricula_id}/estado",
        "/api/dba",
        "/api/dba/importar",
        "/api/evaluaciones",
        "/api/materias/{materia_id}/evaluaciones",
        "/api/evaluaciones/{evaluacion_id}",
        "/api/evaluaciones/{evaluacion_id}/crear-blueprint",
        "/api/evaluaciones/{evaluacion_id}/publicar",
        "/api/evaluaciones/{evaluacion_id}/cerrar",
        "/api/evaluaciones/externa/digitalizar",
        "/api/evaluaciones/externa/digitalizar-con-archivo",
        "/api/evaluaciones/{evaluacion_id}/validar-estructura",
        "/api/evaluaciones/sorpresa",
        "/api/presentaciones",
        "/api/presentaciones/{presentacion_id}",
        "/api/presentaciones/{presentacion_id}/estado",
        "/api/presentaciones/{presentacion_id}/exportar",
        "/api/presentaciones/{presentacion_id}/archivo/{fmt}",
        "/api/presentaciones/{presentacion_id}/preview",
        "/api/presentaciones/{presentacion_id}/preview/{slide_number}.png",
    }

    assert expected_paths.issubset(paths)
