from __future__ import annotations

import asyncio
from io import BytesIO

import fitz
import pytest
from PIL import Image
from starlette.datastructures import Headers, UploadFile

from app.services.evidence_bundle_service import (
    EvidenceBundleError,
    build_evidence_bundle,
)


def image_bytes(size: tuple[int, int], color: str = "white") -> bytes:
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format="PNG")
    return output.getvalue()


def pdf_bytes(pages: int) -> bytes:
    document = fitz.open()
    for index in range(pages):
        page = document.new_page()
        page.insert_text((72, 72), f"Pagina {index + 1}")
    content = document.tobytes()
    document.close()
    return content


def upload(name: str, content: bytes, mime: str) -> UploadFile:
    return UploadFile(
        file=BytesIO(content),
        filename=name,
        headers=Headers({"content-type": mime}),
    )


def test_two_ordered_photos_become_one_pdf_with_rotation_metadata() -> None:
    first = upload("hoja-2.png", image_bytes((120, 80), "white"), "image/png")
    second = upload("hoja-1.png", image_bytes((80, 120), "gray"), "image/png")

    bundle = asyncio.run(build_evidence_bundle([first, second], rotations=[90, 0]))

    assert bundle.mime == "application/pdf"
    assert bundle.evidence_type == "fotos"
    assert bundle.page_count == 2
    assert [item["nombre"] for item in bundle.metadata["archivos"]] == [
        "hoja-2.png",
        "hoja-1.png",
    ]
    assert [item["rotacion"] for item in bundle.metadata["archivos"]] == [90, 0]
    with fitz.open(stream=bundle.content, filetype="pdf") as document:
        assert len(document) == 2


def test_single_photo_remains_backward_compatible() -> None:
    bundle = asyncio.run(
        build_evidence_bundle(upload("respuesta.png", image_bytes((64, 64)), "image/png"))
    )

    assert bundle.mime == "image/jpeg"
    assert bundle.page_count == 1
    assert bundle.metadata["tipo"] == "foto"
    with Image.open(BytesIO(bundle.content)) as normalized:
        assert normalized.format == "JPEG"


def test_multi_page_pdf_is_kept_as_one_document() -> None:
    bundle = asyncio.run(
        build_evidence_bundle(upload("taller.pdf", pdf_bytes(3), "application/pdf"))
    )

    assert bundle.mime == "application/pdf"
    assert bundle.page_count == 3
    assert bundle.metadata["paginas"] == 3


@pytest.mark.parametrize(
    ("files", "message"),
    [
        (
            [
                upload("hoja.png", image_bytes((20, 20)), "image/png"),
                upload("archivo.pdf", pdf_bytes(1), "application/pdf"),
            ],
            "no los mezcles",
        ),
        (
            [upload(f"hoja-{index}.png", image_bytes((10, 10)), "image/png") for index in range(11)],
            "maximo 10",
        ),
    ],
)
def test_invalid_packages_are_rejected_atomically(files: list[UploadFile], message: str) -> None:
    with pytest.raises(EvidenceBundleError) as error:
        asyncio.run(build_evidence_bundle(files))
    assert message in str(error.value).lower().replace("á", "a")


def test_pdf_over_twenty_pages_is_rejected() -> None:
    with pytest.raises(EvidenceBundleError) as error:
        asyncio.run(
            build_evidence_bundle(upload("demasiado-largo.pdf", pdf_bytes(21), "application/pdf"))
        )
    assert "21 paginas" in str(error.value).lower().replace("á", "a")


def test_rotation_count_must_match_the_selected_pages() -> None:
    files = [
        upload("uno.png", image_bytes((10, 10)), "image/png"),
        upload("dos.png", image_bytes((10, 10)), "image/png"),
    ]
    with pytest.raises(EvidenceBundleError) as error:
        asyncio.run(build_evidence_bundle(files, rotations=[90]))
    assert "rotacion" in str(error.value).lower().replace("ó", "o")