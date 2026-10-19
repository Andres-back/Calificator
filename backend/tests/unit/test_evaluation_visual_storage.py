from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

import pytest
from PIL import Image

from app.core.config import settings
from app.modules.evaluaciones.visual_service import inspect_resource_bytes
from app.services.storage_service import resolve_private_upload_path, save_private_upload


def png_bytes():
    target = BytesIO()
    Image.new("RGB", (12, 8), "white").save(target, format="PNG")
    return target.getvalue()


def test_image_metadata_is_verified_from_bytes_not_filename():
    metadata = inspect_resource_bytes(png_bytes(), clase="imagen")
    assert metadata == {"mime": "image/png", "ancho": 12, "alto": 8, "paginas": None}


@pytest.mark.parametrize("content", [b"", b"<svg onload='bad()' />", b"RIFFfake", b"\x89PNGbroken"])
def test_active_fake_or_truncated_content_is_rejected(content):
    with pytest.raises(ValueError):
        inspect_resource_bytes(content, clase="imagen")


def test_original_docx_must_be_valid_and_cannot_load_external_content():
    target = BytesIO()
    with ZipFile(target, "w") as archive:
        archive.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
        archive.writestr("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>')
        archive.writestr("word/_rels/document.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" TargetMode="External" Target="http://127.0.0.1/private" /></Relationships>')
    with pytest.raises(ValueError, match="extern"):
        inspect_resource_bytes(target.getvalue(), clase="original")


def test_docx_rejects_doctype_in_utf16_xml():
    target = BytesIO()
    with ZipFile(target, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", '<?xml version="1.0" encoding="UTF-16"?><!DOCTYPE document [<!ENTITY label "unsafe">]><document>&label;</document>'.encode("utf-16"))
    with pytest.raises(ValueError, match="XML"):
        inspect_resource_bytes(target.getvalue(), clase="original")


@pytest.mark.parametrize("part,markup", [
    ("word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:instrText>DDEAUTO executable</w:instrText></w:document>'),
    ("word/media/drawing.svg", '<svg xmlns="http://www.w3.org/2000/svg"><image href="file:///etc/passwd"/></svg>'),
    ("[Content_Types].xml", '<Types><Override ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/></Types>'),
])
def test_docx_rejects_active_fields_svg_file_links_and_macro_content_type(part, markup):
    target = BytesIO()
    with ZipFile(target, "w") as archive:
        for name, content in {"[Content_Types].xml": "<Types/>", "word/document.xml": "<document/>", part: markup}.items():
            archive.writestr(name, content)
    with pytest.raises(ValueError):
        inspect_resource_bytes(target.getvalue(), clase="original")


def test_original_validator_accepts_the_six_supported_synthetic_document_classes():
    from tests.fixtures.evaluation_visuals import all_visual_documents

    for sample in all_visual_documents():
        metadata = inspect_resource_bytes(sample.content, clase="original")
        assert metadata["mime"] == sample.mime


@pytest.mark.parametrize("unsafe", [False, True])
def test_docx_validates_embedded_chart_workbooks_too(unsafe):
    workbook = BytesIO()
    with ZipFile(workbook, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("xl/workbook.xml", "<workbook/>")
        if unsafe:
            archive.writestr("xl/vbaProject.bin", b"synthetic-not-executable")
    document = BytesIO()
    with ZipFile(document, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", "<document/>")
        archive.writestr("word/embeddings/chart.xlsx", workbook.getvalue())
    if unsafe:
        with pytest.raises(ValueError, match="macros"):
            inspect_resource_bytes(document.getvalue(), clase="original")
    else:
        assert inspect_resource_bytes(document.getvalue(), clase="original")["mime"].endswith("document")


@pytest.mark.parametrize("path", ["../outside.png", ".private/../../outside.png", "general/public.png", ".private", "https://example.test/a.png"])
def test_private_resolution_rejects_non_private_or_escaping_paths(tmp_path, monkeypatch, path):
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    with pytest.raises(ValueError):
        resolve_private_upload_path(path)


@pytest.mark.asyncio
async def test_private_writer_rejects_subfolder_traversal(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(tmp_path))
    with pytest.raises(ValueError):
        await save_private_upload(png_bytes(), "image/png", subfolder="../../public")
    assert not list(tmp_path.rglob("*.png"))


def test_private_resolution_rejects_a_symlink_outside_uploads(tmp_path, monkeypatch):
    uploads = tmp_path / "uploads"
    outside = tmp_path / "outside"
    uploads.mkdir()
    outside.mkdir()
    monkeypatch.setattr(settings, "UPLOADS_DIR", str(uploads))
    try:
        (uploads / ".private").symlink_to(outside, target_is_directory=True)
    except OSError:
        pytest.skip("El sistema no permite crear enlaces simbólicos sin privilegios")
    with pytest.raises(ValueError):
        resolve_private_upload_path(".private/stolen.png")
    assert Path(outside).exists()
