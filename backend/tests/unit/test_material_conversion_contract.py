from __future__ import annotations

from app.main import app
from app.modules.herramientas.router import ConvertirEvaluacionRequest
from app.shared.enums import EvaluacionModalidad, PoliticaIntento


def test_material_conversion_request_exposes_the_canonical_delivery_configuration() -> None:
    request = ConvertirEvaluacionRequest.model_validate(
        {
            "materia_id": "ed36e1f1-d416-444b-aa4e-90a94a189dd9",
            "nombre": "Multiplicacion de cuarto",
            "nota_maxima": 5,
            "modalidad": "mixta",
            "politica_intento": "multiples_intentos",
            "intentos_permitidos": 2,
            "tiempo_limite_minutos": 45,
        }
    )

    assert request.modalidad == EvaluacionModalidad.MIXTA
    assert request.politica_intento == PoliticaIntento.MULTIPLES_INTENTOS
    assert request.intentos_permitidos == 2
    assert request.tiempo_limite_minutos == 45


def test_material_conversion_and_lifecycle_are_exposed_as_one_evaluation_api() -> None:
    paths = app.openapi()["paths"]

    conversion = paths[
        "/api/herramientas/{material_id}/convertir-evaluacion"
    ]["post"]
    response_schema = conversion["responses"]["201"]["content"][
        "application/json"
    ]["schema"]
    assert response_schema["$ref"].endswith("/EvaluacionRead")
    assert "get" in paths["/api/herramientas/{material_id}/evaluaciones"]

    lifecycle_path = paths["/api/evaluaciones/{evaluacion_id}"]
    assert {"get", "patch", "delete"}.issubset(lifecycle_path)
    assert paths[
        "/api/evaluaciones/{evaluacion_id}/activar-recepcion"
    ]["post"]
    assert paths[
        "/api/evaluaciones/{evaluacion_id}/pausar-recepcion"
    ]["post"]
