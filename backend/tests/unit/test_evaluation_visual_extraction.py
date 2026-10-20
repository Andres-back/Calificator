"""Preservation contracts, independent of paid OCR/LLM interpretation."""
from hashlib import sha256
from io import BytesIO
from zipfile import ZipFile
from xml.etree import ElementTree

import fitz
import httpx
import pytest

from app.core.config import settings
from app.modules.evaluaciones.document_visual_extractor import DocumentRendererUnavailable, extract_visual_document, render_docx
from tests.fixtures.evaluation_visuals import (
    TABLES, mixed_pdf, photo, scanned_pdf, shared_multipage_pdf,
    word_embedded_tables, word_native_tables,
)


@pytest.mark.asyncio
async def test_mixed_pdf_keeps_text_images_vectors_and_full_page():
    sample = mixed_pdf()
    result = await extract_visual_document(sample.content, sample.mime)
    assert "Use la tabla" in result.text and "1. Consulte" in result.text
    assert len(result.pages) == 1
    assert {element.kind for element in result.elements} >= {"texto", "imagen", "vectorial"}
    assert result.original_sha256 == sha256(sample.content).hexdigest()
    assert result.coverage.paginas_detectadas == result.coverage.paginas_conservadas == [1]
    assert result.coverage.estado == "requiere_revision"  # Associations were not guessed.
    for element in result.elements:
        if element.asset_key:
            asset = result.assets[element.asset_key]
            assert asset.content.startswith(b"\x89PNG")
            assert element.id in result.coverage.conservados


@pytest.mark.asyncio
async def test_shared_stimulus_remains_on_source_page_not_copied_as_questions():
    sample = shared_multipage_pdf()
    result = await extract_visual_document(sample.content, sample.mime)
    assert len(result.pages) == 2
    assert all(element.page == 1 for element in result.elements if element.kind in {"imagen", "vectorial"})
    assert any(element.page == 2 and "1. Consulte" in element.text for element in result.elements)
    assert result.coverage.paginas_conservadas == [1, 2]


@pytest.mark.asyncio
@pytest.mark.parametrize("sample_factory", [scanned_pdf, photo])
async def test_scanned_content_is_preserved_without_claiming_it_was_understood(sample_factory):
    sample = sample_factory()
    result = await extract_visual_document(sample.content, sample.mime)
    assert result.pages and result.assets
    assert result.coverage.estado == "requiere_revision"
    assert any(warning.motivo == "formato_no_interpretable" and warning.pagina == 1 for warning in result.coverage.avisos)
    assert all(asset.safety == "privado_original" for asset in result.assets.values() if asset.kind == "pagina")


@pytest.mark.asyncio
async def test_repeated_pdf_image_reuses_bytes_but_keeps_distinct_uses():
    image = photo().content
    with fitz.open() as document:
        page = document.new_page()
        xref = page.insert_image(fitz.Rect(20, 20, 180, 240), stream=image)
        page.insert_image(fitz.Rect(220, 20, 380, 240), xref=xref)
        content = document.tobytes()
    result = await extract_visual_document(content, "application/pdf")
    uses = [element for element in result.elements if element.kind == "imagen"]
    assert len(uses) == 2 and uses[0].id != uses[1].id
    assert uses[0].asset_key == uses[1].asset_key
    assert uses[0].region != uses[1].region


async def fake_renderer(_content):
    # Conversion adapter is tested separately against real LibreOffice. This
    # double deliberately does not pretend to reproduce the native document.
    return mixed_pdf().content


@pytest.mark.asyncio
async def test_docx_native_tables_preserve_cell_values_and_body_order():
    sample = word_native_tables()
    result = await extract_visual_document(sample.content, sample.mime, renderer=fake_renderer)
    native = [element for element in result.elements if element.anchor]
    tables = [element for element in native if element.kind == "tabla"]
    assert len(tables) == 4
    assert tables[0].data["rows"] == [list(row) for row in TABLES[0]]
    assert all(element.anchor.startswith("word/document.xml/body/") for element in native)
    assert native.index(tables[0]) < next(index for index, element in enumerate(native) if "1. Consulte" in element.text)
    assert result.pages and any(element.kind == "imagen" for element in native)
    assert result.coverage.estado == "requiere_revision"


@pytest.mark.asyncio
async def test_docx_four_png_tables_and_chart_keep_exact_original_bytes():
    sample = word_embedded_tables(annotations=True)
    result = await extract_visual_document(sample.content, sample.mime, renderer=fake_renderer)
    images = [element for element in result.elements if element.kind == "imagen" and element.anchor]
    assert len(images) == 5
    with ZipFile(BytesIO(sample.content)) as archive:
        media = {sha256(archive.read(name)).hexdigest() for name in archive.namelist() if name.startswith("word/media/")}
    assert {sha256(result.assets[element.asset_key].content).hexdigest() for element in images} == media
    assert "90% (incorrecta)" in result.text  # Source evidence, not an answer key.
    assert not hasattr(result, "respuestas_esperadas")


@pytest.mark.asyncio
async def test_merged_word_cells_keep_their_span_and_are_not_called_rectangular():
    sample = word_native_tables()
    target = BytesIO()
    namespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    with ZipFile(BytesIO(sample.content)) as source, ZipFile(target, "w") as destination:
        for item in source.infolist():
            data = source.read(item)
            if item.filename == "word/document.xml":
                root = ElementTree.fromstring(data)
                cell = root.find(f".//{{{namespace}}}tbl/{{{namespace}}}tr/{{{namespace}}}tc")
                properties = cell.find(f"{{{namespace}}}tcPr")
                ElementTree.SubElement(properties, f"{{{namespace}}}gridSpan", {f"{{{namespace}}}val": "2"})
                data = ElementTree.tostring(root)
            destination.writestr(item.filename, data)
    result = await extract_visual_document(target.getvalue(), sample.mime, renderer=fake_renderer)
    table = next(element for element in result.elements if element.kind == "tabla")
    assert table.data["rows"][0][0] == "Periodo"
    assert table.data["merged_cells"][0]["grid_span"] == "2"
    assert table.data["structure_requires_review"] is True
    assert any(warning.elemento_id == table.id and warning.motivo == "formato_no_interpretable" for warning in result.coverage.avisos)


@pytest.mark.asyncio
async def test_full_document_over_page_limit_is_rejected_not_truncated(monkeypatch):
    monkeypatch.setattr(settings, "MAX_GRADING_PDF_PAGES", 1)
    sample = shared_multipage_pdf()
    with pytest.raises(ValueError, match="páginas"):
        await extract_visual_document(sample.content, sample.mime)


@pytest.mark.asyncio
async def test_converted_docx_also_enforces_page_limit(monkeypatch):
    monkeypatch.setattr(settings, "MAX_GRADING_PDF_PAGES", 1)
    async def too_many_pages(_content):
        return shared_multipage_pdf().content
    sample = word_native_tables()
    with pytest.raises(ValueError, match="páginas"):
        await extract_visual_document(sample.content, sample.mime, renderer=too_many_pages)


@pytest.mark.asyncio
async def test_normalized_budget_is_enforced_without_partial_result(monkeypatch):
    monkeypatch.setattr(settings, "DOCUMENT_VISUAL_MAX_BYTES", 64)
    sample = mixed_pdf()
    with pytest.raises(ValueError, match="límite"):
        await extract_visual_document(sample.content, sample.mime)


@pytest.mark.asyncio
async def test_word_budget_overrun_is_not_swallowed_as_an_unsupported_image(monkeypatch):
    monkeypatch.setattr(settings, "DOCUMENT_VISUAL_MAX_BYTES", 64)
    called = []
    async def renderer(content):
        called.append(True)
        return await fake_renderer(content)
    sample = word_embedded_tables()
    with pytest.raises(ValueError, match="límite"):
        await extract_visual_document(sample.content, sample.mime, renderer=renderer)
    assert not called


@pytest.mark.asyncio
async def test_text_budget_never_returns_a_truncated_document(monkeypatch):
    monkeypatch.setattr(settings, "PHOTO_GRADING_CONTEXT_BUDGET_CHARS", 64)
    sample = mixed_pdf()
    with pytest.raises(ValueError, match="texto"):
        await extract_visual_document(sample.content, sample.mime)


@pytest.mark.asyncio
async def test_mime_mismatch_and_password_protected_pdf_are_rejected():
    with pytest.raises(ValueError):
        await extract_visual_document(photo().content, "application/pdf")
    with fitz.open() as document:
        document.new_page()
        content = document.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="synthetic", user_pw="synthetic")
    with pytest.raises(ValueError, match="protegido"):
        await extract_visual_document(content, "application/pdf")


@pytest.mark.asyncio
async def test_renderer_adapter_uses_internal_service_and_does_not_follow_redirects():
    calls = []
    def handler(request):
        calls.append(request)
        return httpx.Response(302, headers={"location": "http://outside.example.test/private"})
    with pytest.raises(ValueError):
        await render_docx(b"synthetic", transport=httpx.MockTransport(handler))
    assert len(calls) == 1
    assert calls[0].url.host == "document-renderer" and calls[0].url.path == "/convert"


@pytest.mark.asyncio
@pytest.mark.parametrize("status", [429, 503, 504])
async def test_renderer_unavailable_is_recoverable(status):
    with pytest.raises(DocumentRendererUnavailable):
        await render_docx(b"synthetic", transport=httpx.MockTransport(lambda _: httpx.Response(status)))


@pytest.mark.asyncio
async def test_renderer_rejects_unapproved_service_address(monkeypatch):
    monkeypatch.setattr(settings, "DOCUMENT_RENDERER_URL", "http://127.0.0.1:8080")
    with pytest.raises(ValueError, match="interno"):
        await render_docx(b"synthetic")


@pytest.mark.asyncio
async def test_renderer_limits_response_bytes_before_accepting_pdf(monkeypatch):
    from app.modules.evaluaciones import document_visual_extractor as extractor
    monkeypatch.setattr(extractor, "MAX_RESOURCE_BYTES", 16)
    transport = httpx.MockTransport(lambda _: httpx.Response(200, headers={"content-type": "application/pdf"}, content=b"%PDF" + b"x" * 20))
    with pytest.raises(ValueError, match="límite"):
        await render_docx(b"synthetic", transport=transport)
