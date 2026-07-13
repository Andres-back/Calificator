from types import SimpleNamespace
from uuid import uuid4

from app.modules.evaluaciones.blueprint_service import build_blueprint_payload, infer_blueprint_level
from app.shared.enums import BlueprintNivelContexto, EvaluacionTipoOrigen


def test_infer_blueprint_level_by_evaluation_origin() -> None:
    assert infer_blueprint_level(EvaluacionTipoOrigen.NATIVA.value) == BlueprintNivelContexto.COMPLETO
    assert (
        infer_blueprint_level(EvaluacionTipoOrigen.EXTERNA_DIGITALIZADA.value)
        == BlueprintNivelContexto.RECONSTRUIDO
    )
    assert infer_blueprint_level(EvaluacionTipoOrigen.SORPRESA.value) == BlueprintNivelContexto.MINIMO


def test_build_blueprint_payload_normalizes_dba_and_keeps_criteria() -> None:
    dba_id = uuid4()
    custom_id = uuid4()
    record = SimpleNamespace(
        id=dba_id,
        area="Matematicas",
        grado="5",
        codigo="DBA-MAT-5-1",
        descripcion="Resuelve problemas con numeros naturales.",
        fuente="MEN",
    )
    custom_record = SimpleNamespace(
        id=custom_id,
        area="Matematicas",
        grado="5",
        enunciado="Resuelve problemas del contexto escolar con datos propios.",
        evidencias_aprendizaje="Explica el procedimiento usado.",
        ejemplo="Problemas con datos de la tienda escolar.",
    )

    payload = build_blueprint_payload(
        evaluacion_id=uuid4(),
        tipo_origen=EvaluacionTipoOrigen.NATIVA.value,
        dba_records=[record, custom_record],
        metas=["Resolver problemas"],
        criterios=[{"nombre": "Procedimiento", "peso": 0.5}],
    )

    assert payload["nivel_contexto"] == "completo"
    assert payload["dba"][0]["id"] == str(dba_id)
    assert payload["dba"][0]["fuente"] == "oficial"
    assert payload["dba"][1]["id"] == str(custom_id)
    assert payload["dba"][1]["fuente"] == "personalizado"
    assert payload["dba"][1]["enunciado"] == custom_record.enunciado
    assert payload["metas"] == ["Resolver problemas"]
    assert payload["criterios"][0]["nombre"] == "Procedimiento"
    assert payload["reglas_feedback"] == {}
