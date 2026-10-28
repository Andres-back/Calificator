from copy import deepcopy
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.services.answer_evidence_regions import (
    attach_answer_regions, evidence_version, model_answer_regions, rotate_answer_regions,
    sanitize_answer_regions,
)
from app.services.vision_extractor import ExtractedAnswer, _merge, _normalize, VisionPageResult

REGION = {"page": 2, "bbox": [0.1, 0.2, 0.3, 0.1], "frame": "pagina_canonica_orientada"}
IDENTITY = UUID("11111111-1111-4111-8111-111111111111")


@pytest.mark.parametrize("bbox", [None, [], [0, 0, 0, 1], [True, 0, 0.3, 1], [-0.1, 0, 1, 1], [0.9, 0, 0.2, 1], [0, 0, float("nan"), 1], [0, 0, float("inf"), 1], ["0", 0, 1, 1]])
def test_invalid_optional_location_never_invalidates_the_answer(bbox):
    page = _normalize({"answers": [{"question_number": 1, "answer": "24", "confidence": 0.9, "regions": [bbox]}]}, 2, 100)
    assert page.answers[0].answer == "24"
    assert page.answers[0].regions == []


def test_normalization_binds_model_box_to_actual_page_not_model_page_or_private_fields():
    assert model_answer_regions([[0.1, 0.2, 0.3, 0.1]], page=2) == [REGION]
    assert model_answer_regions([{"page": 10, "bbox": [0.1, 0.2, 0.3, 0.1], "path": "private"}], page=2) == []
    answer = ExtractedAnswer(question_number=1, answer="24", page=2, regions=[{**REGION, "path": "private", "student": "other"}])
    assert answer.regions == [REGION]
    assert sanitize_answer_regions([{**REGION, "page": True}, {**REGION, "page": 21}]) == []


@pytest.mark.parametrize("rotation,expected", [(0, [0.1, 0.2, 0.3, 0.1]), (90, [0.7, 0.1, 0.1, 0.3]), (-90, [0.2, 0.6, 0.1, 0.3])])
def test_rotated_model_coordinates_return_to_the_stored_oriented_frame(rotation, expected):
    regions = rotate_answer_regions([REGION], rotation)
    assert regions[0]["bbox"] == pytest.approx(expected)
    assert regions[0]["page"] == 2
    assert rotate_answer_regions([REGION], 45) == []


def test_merge_keeps_continuations_without_duplicating_regions():
    first = ExtractedAnswer(question_id="q1", question_number=1, answer="primera", page=1, regions=[{**REGION, "page": 1}])
    second = ExtractedAnswer(question_id="q1", question_number=1, answer="segunda", page=2, regions=[REGION, REGION])
    result = _merge([VisionPageResult(page=1, status="extracted", answers=[first]), VisionPageResult(page=2, status="extracted", answers=[second])])
    assert result[0].source_pages == [1, 2]
    assert result[0].regions == [{**REGION, "page": 1}, REGION]


def test_region_binding_uses_canonical_identity_and_source_fingerprint_without_changing_scores():
    components = [{"clave": "pregunta:q-a", "numero": "1", "puntos_obtenidos": Decimal("0.5"), "evidencia_json": {"paginas": []}}, {"clave": "pregunta:q-b", "numero": "1", "puntos_obtenidos": Decimal("1"), "evidencia_json": {"paginas": []}}]
    extraction = {"source_fingerprint": "a" * 64, "pages_processed": 2, "answers": [{"question_id": "q-b", "question_number": "1", "regions": [REGION]}, {"question_id": None, "question_number": "1", "regions": [{**REGION, "page": 1}]}]}
    snapshot = deepcopy(extraction)
    attach_answer_regions(components, extraction, IDENTITY)
    assert components[0]["evidencia_json"] == {"paginas": []}
    public = components[1]["evidencia_json"]["regiones"][0]
    assert public == {"pagina": 2, "bbox": REGION["bbox"], "marco": REGION["frame"], "evidencia_version": evidence_version(IDENTITY, "a" * 64)}
    assert components[1]["evidencia_json"]["paginas"] == [2]
    assert [item["puntos_obtenidos"] for item in components] == [Decimal("0.5"), Decimal("1")]
    assert extraction == snapshot
    assert evidence_version(IDENTITY, "a" * 64) != evidence_version(IDENTITY, "b" * 64)
    assert evidence_version(IDENTITY, "a" * 64) != evidence_version(UUID(int=2), "a" * 64)


def test_legacy_or_invalid_fingerprint_does_not_invent_regions():
    for extraction in [None, {}, {"source_fingerprint": "model-name", "answers": [{"question_number": 1, "regions": [REGION]}]}]:
        components = [{"clave": "pregunta:1", "numero": "1", "evidencia_json": {"paginas": [2]}}]
        attach_answer_regions(components, extraction, IDENTITY)
        assert components == [{"clave": "pregunta:1", "numero": "1", "evidencia_json": {"paginas": [2]}}]


def test_student_projection_has_no_new_regions_or_private_sources():
    from app.modules.calificaciones.breakdown_service import _component_dict
    component = SimpleNamespace(id=UUID(int=1), clave="pregunta:1", orden=0, tipo="pregunta", numero="1", titulo="Pregunta", respuesta_estudiante="24", respuesta_referencia="24", puntos_obtenidos=1, puntos_maximos=1, estado="correcta", explicacion_estudiante="Correcta", explicacion_verificable="Correcta", origen="objetivo", requiere_revision=False, evidencia_json={"paginas": [2], "regiones": [{"pagina": 2, "bbox": REGION["bbox"], "marco": REGION["frame"], "evidencia_version": "c" * 32, "path": "private"}]}, valoraciones_json=[])
    assert _component_dict(component, student=True)["evidencia_regiones"] == []
    teacher = _component_dict(component)["evidencia_regiones"]
    assert teacher and "path" not in teacher[0]


def test_optional_region_is_robust_to_huge_integers_or_non_array_fields():
    assert model_answer_regions([[0, 0, 10 ** 1000, 1]], page=1) == []
    for value in [None, "unavailable", {"bbox": [0, 0, 1, 1]}]:
        assert ExtractedAnswer(question_number=1, page=1, answer="24", regions=value).regions == []
