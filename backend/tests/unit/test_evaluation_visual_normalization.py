"""Synthetic contracts for connecting conserved visuals to detected questions."""
from copy import deepcopy
from decimal import Decimal
from uuid import uuid4, uuid5

import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.modules.evaluaciones import digitalize_service as service
from app.modules.evaluaciones.visual_schemas import VisualManifest
from app.modules.evaluaciones.visual_normalization import visual_prompt_context


def source_manifest():
    block, resource, original = uuid4(), uuid4(), uuid4()
    return VisualManifest.model_validate({
        "recurso_ids": [str(resource), str(original)], "original_recurso_id": str(original),
        "bloques": [{"id": str(block), "tipo": "imagen", "orden": 0,
                     "recurso_id": str(resource), "descripcion": "Figura para las preguntas 1 y 2"}],
        "cobertura": {"detectados": ["figura"], "conservados": ["figura"],
                      "estado": "requiere_revision", "avisos": [
                          {"bloque_id": str(block), "motivo": "asociacion_pendiente", "mensaje": "Revisa las preguntas."},
                          {"bloque_id": str(block), "motivo": "publicacion_pendiente", "mensaje": "Revisa que no muestre soluciones."},
                      ]},
    })


def detected(manifest):
    block = str(manifest.bloques[0].id)
    return {"preguntas": [
        {"numero": 1, "enunciado": "Según la figura, ¿qué cantidad aparece?", "bloque_fuente_ids": [block], "puntaje": 1},
        {"numero": 2, "enunciado": "Explica la figura.", "bloque_fuente_ids": [block], "puntaje": 1},
    ], "respuestas_esperadas": [{"numero": 1, "respuesta": "7", "origen": "respuesta_estudiante"}]}


def normalize(raw, manifest, scope):
    return service.normalize_detected_structure(raw, nota_maxima=Decimal("5"),
                                               contenido_visual=manifest, visual_scope_id=scope)


def test_shared_visual_bindings_and_server_question_ids_survive_normalization():
    manifest, scope = source_manifest(), uuid4()
    before = manifest.model_dump(mode="json")
    raw = detected(manifest)
    raw["preguntas"][0]["contenido_id"] = str(uuid4())  # Never trust a model-assigned identity.
    result = normalize(raw, manifest, scope)
    restored = VisualManifest.model_validate(result["contenido_visual"])
    ids = [str(uuid5(scope, f"pregunta:{number}")) for number in (1, 2)]
    assert [q["contenido_id"] for q in result["preguntas"]] == ids
    assert [str(value) for value in restored.bloques[0].pregunta_ids] == ids
    assert result == normalize(raw, manifest, scope)
    assert manifest.model_dump(mode="json") == before
    assert restored.original_recurso_id == manifest.original_recurso_id
    assert restored.recurso_ids == manifest.recurso_ids
    assert restored.cobertura.estado == "requiere_revision"
    assert restored.for_student().bloques == []
    assert result["respuestas_esperadas"] == []
    assert not result["clave_completa"]


@pytest.mark.parametrize("references", [[str(uuid4())], "not-a-list", [None], []])
def test_unknown_or_missing_visual_binding_is_localized_never_invented(references):
    manifest = source_manifest()
    raw = detected(manifest)
    for question in raw["preguntas"]:
        question["bloque_fuente_ids"] = references
    result = normalize(raw, manifest, uuid4())
    restored = VisualManifest.model_validate(result["contenido_visual"])
    assert not restored.bloques[0].pregunta_ids
    assert any(warning.motivo == "asociacion_pendiente" for warning in restored.cobertura.avisos)
    assert result["reglas_feedback"]["claves_pendientes"] == [1, 2]


@pytest.mark.parametrize("origin", [None, "respuesta_observada", "respuesta_estudiante", "pendiente"])
def test_visual_objective_answer_needs_independent_provenance(origin):
    manifest = source_manifest()
    raw = detected(manifest)
    raw["preguntas"][0].update(tipo="opcion_multiple", opciones=["A) 7", "B) 8"])
    raw["respuestas_esperadas"] = [{"numero": 1, "respuesta": "A) 7", "origen": origin}]
    result = normalize(raw, manifest, uuid4())
    assert not result["respuestas_esperadas"]


def test_independent_key_is_preserved_as_proposal_but_visual_review_remains_pending():
    manifest = source_manifest()
    raw = detected(manifest)
    raw["respuestas_esperadas"] = [{"numero": 1, "respuesta": "7", "origen": "resolucion_independiente",
                                  "confianza": 0.9, "explicacion": "Lectura de la figura."}]
    result = normalize(raw, manifest, uuid4())
    assert result["respuestas_esperadas"][0]["respuesta"] == "7"
    assert result["claves_pendientes"] == [1, 2]
    assert not result["clave_completa"]
    assert result["reglas_feedback"]["cobertura_visual"] == "requiere_revision"


def test_legacy_normalizer_does_not_accept_untrusted_visual_manifest_or_ids():
    manifest = source_manifest()
    raw = detected(manifest)
    raw["contenido_visual"] = manifest.model_dump(mode="json")
    raw["preguntas"][0]["contenido_id"] = str(uuid4())
    result = service.normalize_detected_structure(raw, nota_maxima=Decimal("5"))
    assert "contenido_visual" not in result
    assert "contenido_id" not in result["preguntas"][0]


def test_nested_table_text_excludes_labeled_student_annotations_from_key_context():
    data = source_manifest().model_dump(mode="json")
    data["bloques"][0].update(tipo="tabla", tabla={"encabezados": ["Cantidad"],
        "filas": [["12 [RESPUESTA DEL ESTUDIANTE: CLAVE_MAL_ESCRITA]"]]})
    context = visual_prompt_context(VisualManifest.model_validate(data), service._strip_student_answer_annotations)
    assert "CLAVE_MAL_ESCRITA" not in context
    assert "12" in context


def test_implicit_question_number_has_same_stable_identity_as_normalized_number():
    manifest, scope = source_manifest(), uuid4()
    raw = detected(manifest)
    del raw["preguntas"][0]["numero"]
    result = normalize(raw, manifest, scope)
    assert result["preguntas"][0]["contenido_id"] == str(uuid5(scope, "pregunta:1"))


@pytest.mark.anyio
async def test_visual_prompt_keeps_full_text_without_original_ids_or_student_annotations(monkeypatch):
    manifest = source_manifest()
    scope = uuid4()
    # Legacy path capped at 12k. The new path must include the end, never silently drop it.
    text = "1. Explica la figura.\n" + "Contexto impreso. " * 800 + " FIN_DEL_DOCUMENTO"
    text += "\n[RESPUESTA DEL ESTUDIANTE: CLAVE_PRIVADA_INCORRECTA]"
    calls = []

    class LLM:
        def __init__(self, **_kwargs):
            pass

        def set_output_budget(self, _value):
            pass

        async def generate_json(self, _task, prompt):
            calls.append(prompt)
            return detected(manifest)

    monkeypatch.setattr(service, "LLMRouter", LLM)
    monkeypatch.setattr(settings, "PHOTO_GRADING_CONTEXT_BUDGET_CHARS", 30000)
    result = await service.detectar_estructura_evaluacion(uuid4(), text, contenido_visual=manifest, visual_scope_id=scope)
    assert result["contenido_visual"]
    assert "FIN_DEL_DOCUMENTO" in calls[0]
    assert "CLAVE_PRIVADA_INCORRECTA" not in calls[0]
    assert str(manifest.original_recurso_id) not in calls[0]
    assert str(manifest.bloques[0].id) in calls[0]
    assert "bloque_fuente_ids" in calls[0]


@pytest.mark.anyio
async def test_visual_context_over_budget_fails_before_calling_ai(monkeypatch):
    monkeypatch.setattr(settings, "PHOTO_GRADING_CONTEXT_BUDGET_CHARS", 100)
    monkeypatch.setattr(service, "LLMRouter", lambda **kwargs: pytest.fail("No AI call for over-budget input"))
    with pytest.raises(HTTPException, match="") as caught:
        await service.detectar_estructura_evaluacion(uuid4(), "1. Explica " + "a" * 200,
                                                    contenido_visual=source_manifest(), visual_scope_id=uuid4())
    assert caught.value.status_code == 422


def test_visual_normalization_requires_server_scope_and_unbound_import_manifest():
    manifest = source_manifest()
    with pytest.raises(ValueError, match="identificador"):
        normalize(detected(manifest), manifest, None)
    bound = deepcopy(manifest.model_dump(mode="json"))
    bound["pregunta_ids"] = [str(uuid4())]
    with pytest.raises(ValueError, match="importación"):
        normalize(detected(manifest), VisualManifest.model_validate(bound), uuid4())
