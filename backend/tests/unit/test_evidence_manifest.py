"""Private evidence contract; only synthetic identities and image bytes."""
from copy import deepcopy
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.calificaciones.evidence_manifest import (
    EvidenceManifest, EvidenceManifestError, ManifestPage, ScanSubmission,
    manifest_fingerprint, parse_scan_submission,
)
from app.modules.calificaciones.revision_service import revision_snapshot


def asset(*, category="sources", digest="a" * 64, mime="image/png"):
    extension = ".jpg" if mime == "image/jpeg" else ".png"
    return {"key": f".private/evidence-scan/{category}/{uuid4().hex}{extension}", "sha256": digest,
            "mime": mime, "size_bytes": 100, "width": 800, "height": 1100}


def page(**changes):
    return {"page_id": str(uuid4()), "source": asset(), "decision": "original", "rotation": 0, "recipe": None, **changes}


def manifest_data():
    data = {"schema_version": 1, "version_id": str(uuid4()), "request_id": str(uuid4()),
            "actor_id": str(uuid4()), "delivery_id": str(uuid4()), "evaluacion_id": str(uuid4()),
            "estudiante_id": str(uuid4()), "materia_id": str(uuid4()),
            "algorithm": "opencv-4.13.0-scan2", "created_at": datetime.now(timezone.utc).isoformat(),
            "pages": [page()], "state": "admitted"}
    data["fingerprint"] = manifest_fingerprint(data)
    return data


def test_manifest_is_nullable_for_legacy_and_closed_for_new_data():
    assert parse_scan_submission(None) is None
    value = manifest_data()
    manifest = EvidenceManifest.model_validate(value)
    assert manifest.pages[0].source.key.startswith(".private/evidence-scan/")
    assert manifest.model_dump(mode="json")["fingerprint"] == value["fingerprint"]
    for change in [{"schema_version": True}, {"arbitrary_url": "https://invalid.example"}, {"algorithm": "some-new-filter"}]:
        with pytest.raises(ValidationError):
            EvidenceManifest.model_validate({**value, **change})


@pytest.mark.parametrize("key", ["https://invalid.example/photo", "/private/photo", ".private/../photo.png", ".private/other/" + "a" * 32 + ".png"])
def test_source_keys_are_generated_private_keys_not_client_paths(key):
    with pytest.raises(ValidationError):
        ManifestPage.model_validate(page(source={**asset(), "key": key}))


def test_fingerprint_covers_identity_order_recipe_and_source_not_file_locations():
    value = manifest_data()
    assert manifest_fingerprint(value) == value["fingerprint"]
    copied = deepcopy(value)
    copied["pages"][0]["source"]["key"] = asset()["key"]
    assert manifest_fingerprint(copied) == value["fingerprint"]
    for field in ["actor_id", "evaluacion_id", "estudiante_id", "materia_id"]:
        assert manifest_fingerprint({**value, field: str(uuid4())}) != value["fingerprint"]
    copied["pages"][0]["rotation"] = 90
    assert manifest_fingerprint(copied) != value["fingerprint"]
    with pytest.raises(ValidationError):
        EvidenceManifest.model_validate(copied)


def test_prepared_page_requires_checked_recipe_and_matching_source_dimensions():
    recipe = {"width": 800, "height": 1100, "corners": [[0., 0.], [1., 0.], [1., 1.], [0., 1.]], "rotation": 90, "profile": "natural", "coordinate_frame": "exif_oriented_source"}
    prepared = page(decision="prepared", rotation=90, recipe=recipe)
    ManifestPage.model_validate(prepared)
    for change in [{"recipe": None}, {"rotation": True}, {"recipe": {**recipe, "width": 500}}, {"source_to_prepared": [[1, 0, 0], [0, 1, 0], [0, 0, float("nan")]]}]:
        with pytest.raises(ValidationError):
            ManifestPage.model_validate({**prepared, **change})


def test_admission_json_cannot_supply_prepared_files_matrices_or_unreviewed_pages():
    value = {"schema_version": 1, "pages": [{"page_id": str(uuid4()), "revision": 0, "decision": "original", "rotation": 0, "confirmed": True}]}
    ScanSubmission.model_validate(value)
    for extra in [{"source": asset()}, {"prepared": asset(category="prepared")}, {"confirmed": False}, {"confirmed": 1}, {"rotation": True}]:
        invalid = {**value, "pages": [{**value["pages"][0], **extra}]}
        with pytest.raises(ValidationError):
            ScanSubmission.model_validate(invalid)
    with pytest.raises(EvidenceManifestError):
        parse_scan_submission("{" * 20000)


def test_history_keeps_an_independent_private_manifest_without_regrading_or_migrating():
    value = manifest_data()
    delivery = SimpleNamespace(evidencia_manifiesto=value, archivo_url="/uploads/entregas/synthetic.jpg")
    grade = SimpleNamespace(entrega=delivery)
    snapshot = revision_snapshot(grade)
    assert snapshot["entrega"]["evidencia_manifiesto"] == value
    value["pages"].clear()
    assert len(snapshot["entrega"]["evidencia_manifiesto"]["pages"]) == 1
