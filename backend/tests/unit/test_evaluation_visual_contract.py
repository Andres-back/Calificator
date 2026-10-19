from copy import deepcopy
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.evaluaciones.visual_schemas import (
    VisualCoverage,
    VisualManifest,
    VisualProposalRequest,
    VisualUploadRequest,
)


def manifest_payload():
    question_ids = [str(uuid4()) for _ in range(3)]
    resource_id = str(uuid4())
    return {
        "schema_version": 1,
        "pregunta_ids": question_ids,
        "recurso_ids": [resource_id],
        "original_recurso_id": str(uuid4()),
        "bloques": [{
            "id": str(uuid4()), "tipo": "tabla", "orden": 0,
            "pregunta_ids": question_ids, "descripcion": "Precios en pesos",
            "recurso_id": resource_id, "seguridad_contenido": "publicable_confirmado",
            "procedencia": {"pagina": 1, "region": [0.1, 0.2, 0.9, 0.6], "ancla_ooxml": "body/p[2]"},
            "tabla": {"encabezados": ["Periodo", "Precio"], "filas": [["2021", "2400"], ["2022", "2600"]], "unidad": "pesos"},
        }],
        "cobertura": {"detectados": ["tabla-1"], "conservados": ["tabla-1"], "estado": "completa"},
    }


def test_shared_table_and_provenance_survive_typed_round_trip():
    payload = manifest_payload()
    model = VisualManifest.model_validate(payload)
    result = model.model_dump(mode="json")
    assert result["bloques"][0]["pregunta_ids"] == payload["pregunta_ids"]
    assert result["bloques"][0]["tabla"]["filas"][1] == ["2022", "2600"]
    assert result["bloques"][0]["procedencia"]["pagina"] == 1
    assert VisualManifest.model_validate(result) == model


@pytest.mark.parametrize("change", [
    lambda p: p["bloques"][0].update(tipo="html"),
    lambda p: p["bloques"][0].update(recurso_id="https://example.com/image.png"),
    lambda p: p["bloques"][0].update(storage_key="uploads/private.png"),
    lambda p: p["bloques"][0].update(pregunta_ids=[str(uuid4())]),
    lambda p: p["bloques"][0].update(recurso_id=str(uuid4())),
    lambda p: p["bloques"][0].update(id="not-an-id"),
    lambda p: p["bloques"].append(deepcopy(p["bloques"][0])),
    lambda p: p["pregunta_ids"].append(p["pregunta_ids"][0]),
    lambda p: p["bloques"][0]["tabla"].update(filas=[["2021"]]),
    lambda p: p["bloques"][0]["tabla"].update(encabezados=[]),
    lambda p: p["bloques"][0]["tabla"].update(filas=[["2021", 2400]]),
    lambda p: p["bloques"][0]["procedencia"].update(region=[0.9, 0.2, 0.1, 0.6]),
    lambda p: p["bloques"][0]["procedencia"].update(pagina=0),
    lambda p: p["bloques"][0].update(texto="incompatible with table"),
    lambda p: p.update(schema_version=2),
])
def test_invalid_content_references_shapes_types_and_private_fields_are_rejected(change):
    payload = manifest_payload()
    change(payload)
    with pytest.raises(ValidationError):
        VisualManifest.model_validate(payload)


def chart_payload(kind="barras", values=None):
    payload = manifest_payload()
    block = payload["bloques"][0]
    block.pop("tabla")
    block.update(tipo="grafica", grafica={
        "tipo": kind, "categorias": ["A", "B"],
        "series": [{"nombre": "Asistentes", "valores": values if values is not None else [6, 3]}],
        "unidad": "personas", "eje_x": "Grupo", "eje_y": "Cantidad",
    })
    return payload


@pytest.mark.parametrize("kind", ["barras", "lineas", "circular"])
def test_chart_data_and_labels_are_kept_exactly(kind):
    model = VisualManifest.model_validate(chart_payload(kind))
    assert model.bloques[0].grafica.series[0].valores == [6, 3]
    assert model.bloques[0].grafica.unidad == "personas"


@pytest.mark.parametrize("kind,values", [
    ("barras", [float("nan"), 3]), ("lineas", [float("inf"), 3]),
    ("barras", [True, 3]), ("barras", ["6", 3]), ("barras", [6]),
    ("circular", [-1, 3]), ("circular", [0, 0]), ("arbitrario", [6, 3]),
])
def test_invalid_or_misleading_chart_values_are_rejected(kind, values):
    with pytest.raises(ValidationError):
        VisualManifest.model_validate(chart_payload(kind, values))


def test_pie_chart_cannot_flatten_multiple_series_without_review():
    payload = chart_payload("circular")
    payload["bloques"][0]["grafica"]["series"].append({"nombre": "Otro", "valores": [2, 3]})
    with pytest.raises(ValidationError):
        VisualManifest.model_validate(payload)


def test_pie_chart_total_cannot_overflow_even_when_individual_values_are_finite():
    with pytest.raises(ValidationError):
        VisualManifest.model_validate(chart_payload("circular", [1e308, 1e308]))


def test_unbounded_integer_is_rejected_as_validation_error_not_runtime_exception():
    with pytest.raises(ValidationError):
        VisualManifest.model_validate(chart_payload("barras", [10 ** 1000, 3]))


@pytest.mark.parametrize("coverage", [
    {"detectados": ["a", "b"], "conservados": ["a"], "estado": "completa"},
    {"detectados": ["a"], "conservados": ["a", "b"], "estado": "completa"},
    {"detectados": ["a", "a"], "conservados": ["a"], "estado": "completa"},
    {"detectados": ["a"], "conservados": ["a"], "estado": "completa", "avisos": [{"elemento_id": "a", "motivo": "ilegible", "mensaje": "Revisa esta tabla."}]},
])
def test_incomplete_or_fabricated_coverage_is_never_complete(coverage):
    with pytest.raises(ValidationError):
        VisualCoverage.model_validate(coverage)


def test_unassociated_material_requires_localized_review_not_silent_drop():
    payload = manifest_payload()
    payload["bloques"][0]["pregunta_ids"] = []
    with pytest.raises(ValidationError):
        VisualManifest.model_validate(payload)
    payload["cobertura"].update(estado="requiere_revision", avisos=[{
        "bloque_id": payload["bloques"][0]["id"], "motivo": "asociacion_pendiente",
        "mensaje": "Elige las preguntas que usan esta tabla.",
    }])
    assert VisualManifest.model_validate(payload).bloques[0].pregunta_ids == []


@pytest.mark.parametrize("warning", [
    {"bloque_id": str(uuid4()), "motivo": "ilegible", "mensaje": "Revisa la figura."},
    {"elemento_id": "inventado", "motivo": "no_conservado", "mensaje": "Revisa el contenido."},
    {"pregunta_ids": [str(uuid4())], "motivo": "asociacion_pendiente", "mensaje": "Elige la pregunta."},
])
def test_review_warning_cannot_reference_unknown_content(warning):
    payload = manifest_payload()
    payload["cobertura"].update(estado="requiere_revision", avisos=[warning])
    with pytest.raises(ValidationError):
        VisualManifest.model_validate(payload)


def test_same_resource_can_have_distinct_legitimate_uses_without_duplicate_ids():
    payload = manifest_payload()
    second_use = deepcopy(payload["bloques"][0])
    second_use.update(id=str(uuid4()), orden=1, pregunta_ids=[payload["pregunta_ids"][2]])
    payload["bloques"].append(second_use)
    model = VisualManifest.model_validate(payload)
    assert len(model.recurso_ids) == 1 and len(model.bloques) == 2


def test_student_contract_only_keeps_confirmed_stimuli_without_private_provenance():
    payload = manifest_payload()
    private_block = deepcopy(payload["bloques"][0])
    private_block.update(id=str(uuid4()), seguridad_contenido="privado_original", orden=1)
    pending_block = deepcopy(private_block)
    pending_block.update(id=str(uuid4()), seguridad_contenido="pendiente_revision", orden=2)
    payload["bloques"].extend([private_block, pending_block])
    payload["cobertura"].update(estado="requiere_revision", avisos=[{
        "bloque_id": pending_block["id"], "motivo": "publicacion_pendiente",
        "mensaje": "Comprueba que esta tabla no muestra soluciones.",
    }])
    model = VisualManifest.model_validate(payload)
    before = model.model_dump(mode="json")
    student = model.for_student().model_dump(mode="json")
    assert len(student["bloques"]) == 1
    assert "original_recurso_id" not in student and "cobertura" not in student
    assert "procedencia" not in student["bloques"][0]
    assert "seguridad_contenido" not in student["bloques"][0]
    assert model.model_dump(mode="json") == before


def test_text_stimulus_remains_visible_when_no_original_resource_exists():
    payload = {"schema_version": 1, "pregunta_ids": [str(uuid4())]}
    payload["bloques"] = [{
        "id": str(uuid4()), "tipo": "texto", "orden": 0,
        "pregunta_ids": payload["pregunta_ids"], "texto": "Lee este contexto.",
        "seguridad_contenido": "publicable_confirmado",
    }]
    student = VisualManifest.model_validate(payload).for_student()
    assert student.bloques[0].texto == "Lee este contexto."


def test_unconfirmed_publication_safety_needs_explicit_review():
    payload = manifest_payload()
    payload["bloques"][0]["seguridad_contenido"] = "pendiente_revision"
    with pytest.raises(ValidationError):
        VisualManifest.model_validate(payload)


def test_preserved_but_unreadable_content_needs_localized_warning():
    payload = manifest_payload()
    block = payload["bloques"][0]
    block["legible"] = False
    with pytest.raises(ValidationError):
        VisualManifest.model_validate(payload)
    payload["cobertura"].update(estado="requiere_revision", avisos=[{
        "bloque_id": block["id"], "motivo": "ilegible", "mensaje": "Reemplaza esta tabla por una foto más clara.",
    }])
    assert not VisualManifest.model_validate(payload).bloques[0].legible


def test_original_resource_is_never_public_even_if_flag_is_changed():
    payload = manifest_payload()
    payload["original_recurso_id"] = payload["recurso_ids"][0]
    with pytest.raises(ValidationError):
        VisualManifest.model_validate(payload)


def test_upload_scope_and_generation_require_explicit_question_and_version():
    request = {"materia_id": str(uuid4()), "evaluacion_id": str(uuid4()), "request_key": str(uuid4())}
    assert VisualUploadRequest.model_validate(request).evaluacion_id is not None
    request.pop("evaluacion_id")
    with pytest.raises(ValidationError):
        VisualUploadRequest.model_validate(request)
    request["borrador_id"] = str(uuid4())
    assert VisualUploadRequest.model_validate(request).borrador_id is not None
    proposal = {**request, "pregunta_id": str(uuid4()), "tipo": "imagen", "descripcion": "Dibuja un triangulo con lados rotulados.", "expected_version_id": str(uuid4())}
    assert VisualProposalRequest.model_validate(proposal).tipo == "imagen"
    proposal.pop("pregunta_id")
    with pytest.raises(ValidationError):
        VisualProposalRequest.model_validate(proposal)


def test_legacy_questions_are_not_rewritten_to_add_content_ids():
    legacy = [{"numero": 1, "enunciado": "Cuanto es 2 mas 2?", "puntaje": 1}]
    before = deepcopy(legacy)
    assert VisualManifest.model_validate({"schema_version": 1}).bloques == []
    assert legacy == before
