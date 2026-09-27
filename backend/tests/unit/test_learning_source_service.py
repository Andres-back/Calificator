from __future__ import annotations

import asyncio
import zipfile
from io import BytesIO

import fitz
import pytest
from PIL import Image
from starlette.datastructures import Headers, UploadFile

from app.services.document_bundle_service import DocumentBundleError, build_document_bundle


def _upload(name: str, content: bytes, mime: str) -> UploadFile:
    return UploadFile(
        file=BytesIO(content),
        filename=name,
        headers=Headers({"content-type": mime}),
    )


def _image(color: str) -> bytes:
    target = BytesIO()
    Image.new("RGB", (80, 60), color).save(target, format="PNG")
    return target.getvalue()


def _pdf(pages: int) -> bytes:
    document = fitz.open()
    for index in range(pages):
        page = document.new_page()
        page.insert_text((72, 72), f"Página {index + 1}")
    result = document.tobytes()
    document.close()
    return result


def _docx() -> bytes:
    target = BytesIO()
    with zipfile.ZipFile(target, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("word/document.xml", "<document />")
    return target.getvalue()


def test_ordered_teacher_photos_are_one_private_document() -> None:
    result = asyncio.run(
        build_document_bundle(
            [_upload("dos.png", _image("white"), "image/png"), _upload("uno.png", _image("gray"), "image/png")],
            rotations=[90, 0],
        )
    )

    assert result.source_type == "foto"
    assert result.mime == "application/pdf"
    assert result.page_count == 2
    assert result.original_names == ["dos.png", "uno.png"]


def test_pdf_and_docx_are_supported_without_mixing() -> None:
    pdf = asyncio.run(build_document_bundle(_upload("libro.pdf", _pdf(3), "application/pdf")))
    docx = asyncio.run(
        build_document_bundle(
            _upload(
                "planeacion.docx",
                _docx(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        )
    )

    assert (pdf.source_type, pdf.page_count) == ("pdf", 3)
    assert (docx.source_type, docx.page_count) == ("documento", 1)


def test_mixed_pdf_and_photo_is_rejected_before_persistence() -> None:
    with pytest.raises(DocumentBundleError, match="mezcles"):
        asyncio.run(
            build_document_bundle(
                [
                    _upload("hoja.png", _image("white"), "image/png"),
                    _upload("libro.pdf", _pdf(1), "application/pdf"),
                ]
            )
        )


def test_compressed_docx_with_oversized_xml_is_rejected() -> None:
    target = BytesIO()
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", "<Types />")
        archive.writestr("word/document.xml", "x" * (10 * 1024 * 1024 + 1))

    with pytest.raises(DocumentBundleError):
        asyncio.run(build_document_bundle(_upload("libro.docx", target.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")))
