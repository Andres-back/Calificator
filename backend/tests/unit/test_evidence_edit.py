import json
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image

from app.core.config import settings
from app.modules.calificaciones.evidence_edit import read_editing_evidence, resolve_edited_pages
from app.modules.calificaciones.evidence_manifest import ScanSubmission, ScanSubmissionPage
from app.modules.calificaciones.evidence_preparation import (
    ScanAdmissionContext, inspect_scan_source, persist_scan_sources, read_verified_asset,
)


def image_bytes(color):
    stream = BytesIO()
    Image.new("RGB", (40, 60), color).save(stream, format="PNG")
    return stream.getvalue()


def edit(base, pages):
    return json.dumps({"fingerprint": base.fingerprint, "paginas": pages})


@pytest.fixture
def owner(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    return ScanAdmissionContext(*(uuid4() for _ in range(6)))


async def make_delivery(owner):
    original = inspect_scan_source(image_bytes("white"))
    decision = ScanSubmissionPage(page_id=uuid4(), rotation=0, decision="original", confirmed=True)
    manifest = await persist_scan_sources(owner, ScanSubmission(schema_version=1, pages=(decision,)), (original,))
    return SimpleNamespace(
        id=owner.delivery_id, evaluacion_id=owner.evaluacion_id, estudiante_id=owner.estudiante_id,
        materia_id=owner.materia_id, archivo_url="/uploads/" + manifest.pages[0].source.key,
        evidencia_manifiesto=manifest.model_dump(mode="json"),
    ), manifest, original


@pytest.mark.asyncio
async def test_add_and_rotate_preserves_saved_source_key_and_bytes(owner):
    delivery, old, original = await make_delivery(owner)
    base = await read_editing_evidence(delivery)
    new = image_bytes("blue")
    request_id = uuid4()
    raw = edit(base, [{"archivo_indice": 0}, {"referencia": str(base.pages[0].ref), "rotacion": 90}])
    sub, sources, reused = await resolve_edited_pages(raw, [UploadFile(BytesIO(new))], base, request_id)
    ctx = ScanAdmissionContext(request_id, owner.actor_id, owner.delivery_id, owner.evaluacion_id, owner.estudiante_id, owner.materia_id)
    edited = await persist_scan_sources(ctx, sub, sources, reused=reused)
    replay = await persist_scan_sources(ctx, sub, sources, reused=reused)
    assert edited.fingerprint == replay.fingerprint
    assert edited.pages[1].source == old.pages[0].source
    assert edited.pages[1].rotation == 90
    assert edited.pages[1].revision == old.pages[0].revision + 1
    assert await read_verified_asset(edited.pages[0].source) == new
    assert await read_verified_asset(edited.pages[1].source) == original.content
    assert delivery.evidencia_manifiesto == old.model_dump(mode="json")


@pytest.mark.asyncio
async def test_stale_duplicate_and_foreign_refs_fail_before_writing(owner):
    delivery, _, _ = await make_delivery(owner)
    base = await read_editing_evidence(delivery)
    ref = str(base.pages[0].ref)
    for payload, expected in [
        (edit(base, [{"referencia": ref}]).replace(base.fingerprint, "0" * 64), 409),
        (edit(base, [{"referencia": ref}, {"referencia": ref}]), 422),
        (edit(base, [{"referencia": str(uuid4())}]), 409),
        (edit(base, [{"archivo_indice": 0}]), 422),
        (edit(base, [{"referencia": ref, "path": "private.png"}]), 422),
    ]:
        with pytest.raises(HTTPException) as error:
            await resolve_edited_pages(payload, [], base, uuid4())
        assert error.value.status_code == expected


@pytest.mark.asyncio
async def test_crop_is_bound_to_original_dimensions_and_retains_source(owner):
    delivery, old, original = await make_delivery(owner)
    base = await read_editing_evidence(delivery)
    reference = str(base.pages[0].ref)
    recipe = {
        "width": original.width, "height": original.height, "rotation": 90,
        "corners": [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]],
        "profile": "natural", "coordinate_frame": "exif_oriented_source",
    }
    submission, sources, reused = await resolve_edited_pages(
        edit(base, [{"referencia": reference, "rotacion": 90, "receta": recipe}]), [], base, uuid4()
    )
    assert submission.pages[0].decision == "prepared"
    assert submission.pages[0].recipe.width == original.width
    assert sources[0].content == original.content
    assert reused[base.pages[0].ref].source == old.pages[0].source
    with pytest.raises(HTTPException) as error:
        await resolve_edited_pages(edit(base, [{"referencia": reference, "receta": {**recipe, "width": 500}}]), [], base, uuid4())
    assert error.value.status_code == 422


def pdf_bytes(*colors):
    import fitz

    document = fitz.open()
    for color in colors:
        page = document.new_page(width=200, height=300)
        page.draw_rect(page.rect, color=color, fill=color)
    try:
        return document.tobytes()
    finally:
        document.close()


@pytest.mark.asyncio
async def test_legacy_single_image_can_be_promoted(owner, tmp_path):
    image = tmp_path / "source.png"
    image.write_bytes(image_bytes("white"))
    delivery = SimpleNamespace(id=owner.delivery_id, archivo_url="/uploads/source.png")
    base = await read_editing_evidence(delivery)
    assert len(base.pages) == 1
    assert (await base.pages[0].source()).content == image.read_bytes()


@pytest.mark.asyncio
async def test_legacy_pdf_offers_one_stable_editable_sheet_per_page(owner, tmp_path):
    pdf = tmp_path / "legacy.pdf"
    pdf.write_bytes(pdf_bytes((1, 0, 0), (0, 0, 1)))
    before = pdf.read_bytes()
    delivery = SimpleNamespace(id=owner.delivery_id, archivo_url="/uploads/legacy.pdf")
    base = await read_editing_evidence(delivery)
    again = await read_editing_evidence(delivery)
    assert len(base.pages) == 2
    assert [page.ref for page in base.pages] == [page.ref for page in again.pages]
    assert base.fingerprint == again.fingerprint
    first, second = [await page.source() for page in base.pages]
    assert first.mime == second.mime == "image/jpeg"
    assert first.height > first.width
    red = Image.open(BytesIO(first.content)).convert("RGB").getpixel((first.width // 2, first.height // 2))
    blue = Image.open(BytesIO(second.content)).convert("RGB").getpixel((second.width // 2, second.height // 2))
    assert red[0] > 200 and red[2] < 60
    assert blue[2] > 200 and blue[0] < 60
    assert pdf.read_bytes() == before
    pdf.write_bytes(pdf_bytes((0, 1, 0)))
    changed = await read_editing_evidence(delivery)
    assert changed.fingerprint != base.fingerprint


@pytest.mark.asyncio
async def test_legacy_pdf_sheet_can_be_rotated_and_saved_with_a_new_photo(owner, tmp_path):
    (tmp_path / "legacy.pdf").write_bytes(pdf_bytes((1, 0, 0), (0, 0, 1)))
    delivery = SimpleNamespace(id=owner.delivery_id, archivo_url="/uploads/legacy.pdf")
    base = await read_editing_evidence(delivery)
    request_id = uuid4()
    raw = edit(base, [
        {"referencia": str(base.pages[1].ref), "rotacion": 90},
        {"archivo_indice": 0},
    ])
    sub, sources, reused = await resolve_edited_pages(raw, [UploadFile(BytesIO(image_bytes("blue")))], base, request_id)
    assert [page.rotation for page in sub.pages] == [90, 0]
    assert reused == {}
    ctx = ScanAdmissionContext(request_id, owner.actor_id, owner.delivery_id, owner.evaluacion_id, owner.estudiante_id, owner.materia_id)
    manifest = await persist_scan_sources(ctx, sub, sources, reused=reused)
    assert len(manifest.pages) == 2
    assert await read_verified_asset(manifest.pages[0].source) == (await base.pages[1].source()).content


@pytest.mark.asyncio
async def test_damaged_empty_or_long_legacy_pdf_keeps_the_current_notice(owner, tmp_path, monkeypatch):
    delivery = SimpleNamespace(id=owner.delivery_id, archivo_url="/uploads/legacy.pdf")
    pdf = tmp_path / "legacy.pdf"
    monkeypatch.setattr(settings, "MAX_EVIDENCE_FILES", 2)
    for content in (b"%PDF-1.7", pdf_bytes((1, 0, 0), (0, 1, 0), (0, 0, 1))):
        pdf.write_bytes(content)
        with pytest.raises(HTTPException) as error:
            await read_editing_evidence(delivery)
        assert error.value.status_code == 409
        assert "No podemos editar las hojas" in error.value.detail
