import asyncio
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4

from fastapi import UploadFile
from PIL import Image, ImageFile
import pytest

from app.modules.calificaciones.evidence_manifest import EvidenceAsset, EvidenceManifest, EvidenceManifestError, ScanSubmission
from app.modules.calificaciones.evidence_preparation import (
    ScanAdmissionContext, inspect_scan_source, persist_scan_sources, prepared_manifest_page,
    resolve_canonical_pages, validate_scan_sources,
)
from app.modules.calificaciones.evidence_service import _delete_replaced_evidence
from app.services.evidence_scan import ScanRecipe, prepare_evidence_scan
from app.services.storage_service import resolve_private_upload_path, save_private_evidence_asset
from tests.helpers.evidence_scan_fixtures import bank_cases, make_scan_fixture


def submission():
    return ScanSubmission.model_validate({"schema_version": 1, "pages": [{"page_id": str(uuid4()), "decision": "original", "confirmed": True, "rotation": 0}]})


def context():
    return ScanAdmissionContext(*(uuid4() for _ in range(6)))


def test_admission_reads_exif_header_without_decoding_full_png(monkeypatch):
    source = make_scan_fixture(next(case for case in bank_cases() if case.get("exif") == 6))
    def forbidden_decode(*_args, **_kwargs):
        raise AssertionError("API must not decode full camera pixels")
    monkeypatch.setattr(Image.Image, "load", forbidden_decode)
    monkeypatch.setattr(ImageFile.ImageFile, "load", forbidden_decode)
    result = inspect_scan_source(source.content)
    assert (result.width, result.height) == source.oriented_size
    assert result.exif_orientation == 6


def test_late_png_exif_is_read_without_loading_all_image_pixels(monkeypatch):
    original = make_scan_fixture(next(case for case in bank_cases() if case.get("exif") == 6)).content
    chunks = []
    offset = 8
    while offset < len(original):
        length = int.from_bytes(original[offset:offset + 4], "big")
        chunks.append(original[offset:offset + 12 + length])
        offset += 12 + length
    exif = next(chunk for chunk in chunks if chunk[4:8] == b"eXIf")
    reordered = original[:8] + b"".join(chunk for chunk in chunks if chunk[4:8] not in {b"eXIf", b"IEND"}) + exif + chunks[-1]
    def forbidden_decode(*_args, **_kwargs):
        raise AssertionError("Late EXIF must not trigger full pixel decoding in the API")
    monkeypatch.setattr(ImageFile.ImageFile, "load", forbidden_decode)
    result = inspect_scan_source(reordered)
    assert result.exif_orientation == 6


@pytest.mark.asyncio
async def test_sources_and_receipt_are_reused_without_saving_filenames(tmp_path, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    value = make_scan_fixture(bank_cases()[0])
    decision, owner = submission(), context()
    sources = await validate_scan_sources([UploadFile(BytesIO(value.content), filename="private-student-name.png")], decision)
    first = await persist_scan_sources(owner, decision, sources)
    second = await persist_scan_sources(owner, decision, sources)
    assert first.fingerprint == second.fingerprint
    assert first.pages[0].source.key == second.pages[0].source.key
    assert "private-student-name" not in first.model_dump_json()
    assert len(list((tmp_path / ".private/evidence-scan/sources").iterdir())) == 1
    assert resolve_private_upload_path(first.pages[0].source.key).read_bytes() == value.content
    changed = make_scan_fixture(bank_cases()[1])
    with pytest.raises(EvidenceManifestError, match="otros datos"):
        await persist_scan_sources(owner, decision, (inspect_scan_source(changed.content),))
    assert len(list((tmp_path / ".private/evidence-scan/sources").iterdir())) == 1


@pytest.mark.asyncio
async def test_resolver_reads_only_verified_canonical_bytes_and_never_legacy_pdf(tmp_path, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    source = make_scan_fixture(bank_cases()[0])
    decision, owner = submission(), context()
    manifest = await persist_scan_sources(owner, decision, (inspect_scan_source(source.content),))
    delivery = SimpleNamespace(id=owner.delivery_id, evaluacion_id=owner.evaluacion_id, estudiante_id=owner.estudiante_id,
                               materia_id=owner.materia_id, archivo_url="/uploads/a-pdf-that-must-not-be-read.pdf")
    with pytest.raises(EvidenceManifestError, match="preparando"):
        await resolve_canonical_pages(delivery, manifest)
    recipe = ScanRecipe(width=800, height=1100, corners=((0., 0.), (1., 0.), (1., 1.), (0., 1.)))
    prepared = prepare_evidence_scan(source.content, recipe)
    from hashlib import sha256
    key = await save_private_evidence_asset(prepared.content, prepared.mime, category="prepared", asset_id=uuid4())
    asset = EvidenceAsset(key=key, mime=prepared.mime, sha256=sha256(prepared.content).hexdigest(),
                          width=prepared.width, height=prepared.height, size_bytes=len(prepared.content))
    page = prepared_manifest_page(manifest.pages[0], asset, prepared.source_to_prepared)
    ready = EvidenceManifest.model_validate({**manifest.model_dump(mode="json"), "pages": [page.model_dump(mode="json")], "state": "prepared"})
    resolved = await resolve_canonical_pages(delivery, ready)
    assert resolved.images() == [(prepared.content, "image/jpeg", 1)]
    assert resolved.fingerprint == ready.canonical_fingerprint
    # A changed disk file must not be substituted for the version used in grading.
    resolve_private_upload_path(key).write_bytes(prepared.content + b"changed")
    with pytest.raises(EvidenceManifestError, match="no coincide"):
        await resolve_canonical_pages(delivery, ready)
    assert resolve_private_upload_path(manifest.pages[0].source.key).read_bytes() == source.content


@pytest.mark.asyncio
async def test_twenty_duplicate_asset_writes_do_not_duplicate_or_overwrite_files(tmp_path, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    identity = uuid4()
    data = make_scan_fixture(bank_cases()[0]).content
    keys = await asyncio.gather(*(save_private_evidence_asset(data, "image/png", category="sources", asset_id=identity) for _ in range(20)))
    assert len(set(keys)) == 1
    assert len(list((tmp_path / ".private/evidence-scan/sources").iterdir())) == 1


@pytest.mark.asyncio
async def test_legacy_cleanup_does_not_delete_a_new_private_original(tmp_path, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    source = make_scan_fixture(bank_cases()[0]).content
    key = await save_private_evidence_asset(source, "image/png", category="sources", asset_id=uuid4())
    _delete_replaced_evidence("/uploads/" + key)
    assert resolve_private_upload_path(key).read_bytes() == source
