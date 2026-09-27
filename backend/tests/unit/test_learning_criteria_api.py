from app.modules.criterios_aprendizaje.router import router


def test_canonical_learning_criteria_routes_are_registered() -> None:
    routes = {(route.path, next(iter(route.methods))) for route in router.routes}
    paths = {path for path, _method in routes}

    assert "/materias/{materia_id}/criterios-aprendizaje" in paths
    assert "/criterios-aprendizaje/{set_id}" in paths
    assert "/criterios-aprendizaje/versiones/{version_id}/aprobar" in paths
    assert "/criterios-aprendizaje/versiones/{version_id}/fuentes/archivo" in paths
    assert "/criterios-aprendizaje/fuentes/{source_id}" in paths
    assert "/criterios-aprendizaje/versiones/{version_id}/proponer" in paths


def test_learning_criteria_requires_an_authenticated_session() -> None:
    from fastapi.testclient import TestClient

    from app.main import create_app

    response = TestClient(create_app(), base_url="http://localhost").get(
        "/api/criterios-aprendizaje/capacidades"
    )

    assert response.status_code == 401
