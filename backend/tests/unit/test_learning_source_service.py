from __future__ import annotations

import asyncio
import zipfile
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import fitz
import pytest
from fastapi import HTTPException
from PIL import Image
from starlette.datastructures import Headers, UploadFile

from app.db.base import import_models
from app.modules.criterios_aprendizaje import source_service
from app.modules.criterios_aprendizaje.schemas import LearningSourceTextCreate
from app.services.document_bundle_service import (
    DocumentBundle,
    DocumentBundleError,
    build_document_bundle,
)

import_models()


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


def test_more_than_ten_photos_and_pdf_over_twenty_pages_are_rejected() -> None:
    with pytest.raises(DocumentBundleError, match="máximo 10"):
        asyncio.run(
            build_document_bundle(
                [_upload(f"hoja-{index}.png", _image("white"), "image/png") for index in range(11)]
            )
        )

    with pytest.raises(DocumentBundleError, match="máximo permitido es 20"):
        asyncio.run(build_document_bundle(_upload("libro.pdf", _pdf(21), "application/pdf")))


def test_rotations_must_match_every_selected_page() -> None:
    with pytest.raises(DocumentBundleError, match="rotación no coincide"):
        asyncio.run(
            build_document_bundle(
                [_upload("uno.png", _image("white"), "image/png"), _upload("dos.png", _image("gray"), "image/png")],
                rotations=[90],
            )
        )


class _SourceSession:
    def __init__(self, scalar_values: list[object], *, commit_error: Exception | None = None) -> None:
        self.scalar_values = list(scalar_values)
        self.commit_error = commit_error
        self.added = None
        self.committed = False
        self.rolled_back = False

    async def scalar(self, _query):
        return self.scalar_values.pop(0)

    def add(self, value) -> None:
        self.added = value

    async def commit(self) -> None:
        if self.commit_error:
            raise self.commit_error
        self.committed = True

    async def rollback(self) -> None:
        self.rolled_back = True

    async def refresh(self, _value) -> None:
        return None


def _editable_scope():
    return (
        SimpleNamespace(id=uuid4(), estado="borrador", revision=1),
        SimpleNamespace(id=uuid4(), materia_id=uuid4(), profesor_id=uuid4()),
    )


def _bundle() -> DocumentBundle:
    return DocumentBundle(
        content=b"normalized-private-content",
        filename="material.pdf",
        mime="application/pdf",
        page_count=2,
        source_type="foto",
        original_names=["uno.png", "dos.png"],
    )


def test_duplicate_file_is_rejected_before_private_storage(monkeypatch) -> None:
    version, criterion_set = _editable_scope()
    db = _SourceSession([uuid4()])
    save = AsyncMock()

    async def scope(*_args, **_kwargs):
        return version, criterion_set

    monkeypatch.setattr(source_service.authorization, "get_version_for_management", scope)
    monkeypatch.setattr(source_service, "build_document_bundle", AsyncMock(return_value=_bundle()))
    monkeypatch.setattr(source_service, "save_private_upload", save)

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            source_service.add_file_source(
                db,
                version_id=version.id,
                uploads=[],
                rotations=None,
                visible_to_student=False,
                actor=SimpleNamespace(id=uuid4()),
            )
        )

    assert error.value.status_code == 409
    assert db.added is None
    assert db.committed is False
    save.assert_not_awaited()


def test_failed_file_transaction_rolls_back_and_removes_orphan(monkeypatch) -> None:
    version, criterion_set = _editable_scope()
    db = _SourceSession([None, 0], commit_error=RuntimeError("database unavailable"))
    removed: list[bool] = []
    real_model = source_service.LearningCriterionSource

    class FakeSourceModel:
        id = real_model.id
        version_id = real_model.version_id
        content_hash = real_model.content_hash
        deleted_at = real_model.deleted_at
        orden = real_model.orden

        def __init__(self, **values) -> None:
            self.__dict__["id"] = uuid4()
            for key, value in values.items():
                self.__dict__[key] = value

    async def scope(*_args, **_kwargs):
        return version, criterion_set

    monkeypatch.setattr(source_service.authorization, "get_version_for_management", scope)
    monkeypatch.setattr(source_service, "build_document_bundle", AsyncMock(return_value=_bundle()))
    monkeypatch.setattr(source_service, "save_private_upload", AsyncMock(return_value="learning-criteria/private.pdf"))
    monkeypatch.setattr(
        source_service,
        "LearningCriterionSource",
        FakeSourceModel,
    )
    monkeypatch.setattr(
        source_service,
        "resolve_private_upload_path",
        lambda _key: SimpleNamespace(unlink=lambda *, missing_ok: removed.append(missing_ok)),
    )

    with pytest.raises(RuntimeError, match="database unavailable"):
        asyncio.run(
            source_service.add_file_source(
                db,
                version_id=version.id,
                uploads=[],
                rotations=None,
                visible_to_student=False,
                actor=SimpleNamespace(id=uuid4()),
            )
        )

    assert db.added is not None
    assert db.rolled_back is True
    assert removed == [True]
    assert version.revision == 2


def test_text_source_is_trimmed_hashed_and_private_by_default(monkeypatch) -> None:
    version, criterion_set = _editable_scope()
    db = _SourceSession([None, 0])

    async def scope(*_args, **_kwargs):
        return version, criterion_set

    monkeypatch.setattr(source_service.authorization, "get_version_for_management", scope)
    audit = AsyncMock()
    monkeypatch.setattr(source_service, "audit_criteria_event", audit)

    row = asyncio.run(
        source_service.add_text_source(
            db,
            version_id=version.id,
            payload=LearningSourceTextCreate(
                titulo="  Capítulo trabajado  ",
                contenido="  La estudiante compara ideas principales.  ",
            ),
            actor=SimpleNamespace(id=uuid4()),
        )
    )

    assert row.display_name == "Capítulo trabajado"
    assert row.reference_json == {"contenido": "La estudiante compara ideas principales."}
    assert row.visible_to_student is False
    assert len(row.content_hash) == 64
    assert db.committed is True
    assert version.revision == 2
    audit.assert_awaited_once()
