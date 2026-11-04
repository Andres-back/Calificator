"""Offline comparison against a manually specified synthetic correction.

Both policies receive the same frozen reading and model outputs; no provider,
student data, storage or database is used.
"""
from decimal import Decimal
import json
from time import perf_counter

import pytest

from app.modules.calificaciones.breakdown_policy import build_component_scaffold, component_consensus
from app.modules.calificaciones.objective_validation import build_safe_objective_validation
from app.modules.calificaciones.orchestrator import build_objective_validation, objective_reading_candidates


def _photo(answer, **extra):
    return {"question_number": 1, "question_id": "q1", "answer": answer, "page": 1,
            "confidence": 0.99, "legible": True, **extra}


SYNTHETIC_CASES = [
        ("opcion_multiple", "A", [_photo("A")], "0.25", "0.625"),
        ("opcion_multiple", "A", [_photo("B")], "0.25", "0"),
        ("opcion_multiple", "A", [_photo("A"), _photo("B")], "0", None),
        ("opcion_multiple", "A", [_photo("A y B")], "0", None),
        ("opcion_multiple", "A", [_photo("B", needs_review=True)], "0", None),
        ("opcion_multiple", "A", [_photo("B", legible=False)], "0", None),
        ("opcion_multiple", None, [_photo("B")], "0", None),
        ("verdadero_falso", "Verdadero", [_photo("Falso")], "0.25", "0"),
        ("abierta", "Explicación de referencia", [_photo("Explicación parcial")], "0.25", "0.25"),
]


def compare_case(kind, key, reads, model_score, reference):
    blueprint = {"nota_maxima": 5, "preguntas": [
        {"id": "q1", "numero": 1, "tipo": kind, "puntaje": "0.625",
         "opciones": ["Uno", "Dos", "Tres", "Cuatro"]},
    ], "respuestas_esperadas": [{"numero": 1, "respuesta": key}]}
    scaffold = build_component_scaffold(blueprint)
    frozen_grade = [{"clave": "pregunta:q1", "puntaje": model_score, "estado": "parcial"}]
    baseline_reading = [{"pregunta": item["question_number"], "respuesta": item["answer"],
                         "legible": item["legible"]} for item in reads]
    baseline = build_objective_validation(blueprint, baseline_reading)
    old, _ = component_consensus(scaffold, frozen_grade, frozen_grade, baseline)
    candidates = objective_reading_candidates([], {"vision_extraction": {"pages": [{"answers": reads}]}})
    resolution = build_safe_objective_validation(blueprint, candidates, photographic=True)
    new, _ = component_consensus(scaffold, frozen_grade, frozen_grade, [], objective_resolution_v1=resolution)
    return old[0], new[0], Decimal(reference) if reference is not None else None


@pytest.mark.parametrize(("kind", "key", "reads", "model_score", "reference"), SYNTHETIC_CASES)
def test_frozen_reading_and_synthetic_reference(kind, key, reads, model_score, reference):
    old, new, expected = compare_case(kind, key, reads, model_score, reference)
    assert new["puntos_obtenidos"] == expected
    assert int(new["puntos_obtenidos"] != expected) <= int(old["puntos_obtenidos"] != expected)
    if expected is None:
        assert new["requiere_revision"]
        assert new["evidencia_json"]["paginas"] == [1]


def test_failed_sheet_does_not_admit_photo_zero_but_preserves_online_rows():
    rows = objective_reading_candidates([{"pregunta": 2, "respuesta": "B"}], {"vision_extraction": {"pages": [
        {"status": "extracted", "answers": [_photo("B")]},
        {"status": "failed_permanent", "answers": []},
    ]}})
    assert rows[0]["_objective_source"] == "online"
    assert rows[1]["_objective_source"] == "photo"
    assert rows[1]["needs_review"] is True


def synthetic_report():
    start = perf_counter()
    results = [compare_case(*case) for case in SYNTHETIC_CASES]
    report = {
        "reference": "synthetic_developer_assertions_not_teacher",
        "cases": len(results),
        "models": "frozen_outputs_no_api_calls",
        "elapsed_ms_baseline_and_candidate": round((perf_counter() - start) * 1000, 3),
        "expected_scorable": sum(expected is not None for _, _, expected in results),
        "expected_pending": sum(expected is None for _, _, expected in results),
    }
    for label, position in (("baseline", 0), ("candidate", 1)):
        report[label] = {
            "matching_scores_on_scorable": sum(
                result[position]["puntos_obtenidos"] == result[2]
                for result in results if result[2] is not None
            ),
            "pending": sum(result[position]["puntos_obtenidos"] is None for result in results),
            "undue_zero_on_pending": sum(
                result[position]["puntos_obtenidos"] == Decimal("0")
                for result in results if result[2] is None
            ),
        }
    return report


if __name__ == "__main__":
    print(json.dumps(synthetic_report(), ensure_ascii=False, indent=2))
