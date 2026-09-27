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
