from copy import deepcopy
from pathlib import Path
import runpy
from uuid import uuid4

import pytest

from app.modules.feedback_sharing.quality_policy import quality_review_record


def fixtures(count=2):
    reference = [{"id": f"anon-{i}", "independent_teacher_reference": True, "max_grade": 5, "points": {"p1": {"awarded": 1, "maximum": 1}}} for i in range(count)]
    quality = {"type": "feedback_quality", "instrument_version": "synthetic-test-v1", "correccion": 4, "especificidad": 4, "claridad": 4, "utilidad": 4, "adecuacion": 4, "blinded": True}
    runs = [{"activity_id": ref["id"], "configuration": model, "points": {"p1": 1}, "grade": 5, "timings": {"total": seconds, "verification": seconds / 2}, "quality": quality, "reviewer_id": str(uuid4()), "severe_incidents": []} for ref in reference for model, seconds in (("current", 10), ("candidate", 6))]
    return reference, runs


@pytest.fixture
def compare():
    script = Path(__file__).resolve().parents[3] / "scripts/benchmark_feedback_models.py"
    return runpy.run_path(str(script))["compare_runs"]


def test_small_sample_cannot_recommend_default_or_activate_models(compare):
    reference, runs = fixtures()
    original = deepcopy(runs)
    report = compare(reference, runs, "current", "candidate")
    assert not report["ready_for_human_decision"]
    assert report["activation_authorized"] is False
    assert report["configurations"]["candidate"]["latency"]["total"]["p50"] == 6
    assert runs == original


def test_fast_but_wrong_or_incoherent_candidate_fails_quality_gate(compare):
    reference, runs = fixtures(20)
    bad = next(row for row in runs if row["configuration"] == "candidate")
    bad["points"] = {"p1": 0}
    bad["grade"] = 5
    report = compare(reference, runs, "current", "candidate")
    assert not report["ready_for_human_decision"]
    assert report["configurations"]["candidate"]["component_errors"] == 1
    assert report["configurations"]["candidate"]["incoherent_totals"] == 1


def test_repeated_activities_do_not_become_twenty_independent_samples(compare):
    reference, runs = fixtures()
    with pytest.raises(ValueError):
        compare(reference * 10, runs, "current", "candidate")


def test_quality_requires_real_evaluator_version_five_dimensions_and_separate_incidents():
    _, runs = fixtures()
    record = quality_review_record(runs[0]["quality"], runs[0]["reviewer_id"], ["error_academico"])
    assert record["passed"] is False and record["severe_incident_count"] == 1
    assert record["review"]["instrument_version"] == "synthetic-test-v1"
    with pytest.raises(ValueError):
        quality_review_record({**runs[0]["quality"], "correccion": True}, runs[0]["reviewer_id"], [])
    with pytest.raises(ValueError):
        quality_review_record(runs[0]["quality"], "", [])
