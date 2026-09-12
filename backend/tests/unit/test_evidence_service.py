from __future__ import annotations

import inspect
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import fitz
import pytest
from fastapi import HTTPException
from PIL import Image

from app.modules.calificaciones import evidence_service, router
from app.modules.calificaciones.models import Entrega
from app.shared.enums import EntregaEstado, EntregaTipo


def _delivery(*, archivo_url: str | None = "/uploads/entregas/evidencia.pdf") -> Entrega:
    return Entrega(
        id=uuid4(),
        evaluacion_id=uuid4(),
        estudiante_id=uuid4(),
        materia_id=uuid4(),
        tipo=EntregaTipo.PDF.value,
        estado=EntregaEstado.RECIBIDA.value,
        archivo_url=archivo_url,
    )


def _pdf(path: Path, pages: int) -> None:
    document = fitz.open()
    for page_number in range(1, pages + 1):
        page = document.new_page(width=300, height=400)
        page.insert_text((30, 40), f"Hoja {page_number}")
    document.save(path)
    document.close()


def test_delivery_read_replaces_private_storage_reference() -> None:
    delivery = _delivery()

    safe_delivery = evidence_service._entrega_read(delivery)

    assert safe_delivery is not delivery
    assert delivery.archivo_url == "/uploads/entregas/evidencia.pdf"
    assert safe_delivery.archivo_url == f"/api/calificaciones/entregas/{delivery.id}/evidencia"
    assert evidence_service._evidence_url(_delivery(archivo_url=None)) is None


def test_rotations_keep_current_validation_contract() -> None:
    assert evidence_service._parse_evidence_rotations(None) is None
    assert evidence_service._parse_evidence_rotations("[0, 90, 270]") == [0, 90, 270]

    for invalid in ("{}", "[0, 90.0]", "not-json"):
        with pytest.raises(HTTPException) as raised:
            evidence_service._parse_evidence_rotations(invalid)
        assert raised.value.status_code == 400
        assert raised.value.detail == "La información de rotación no es válida"


def test_pdf_page_rendering_reuses_fingerprint_cache(tmp_path: Path, monkeypatch) -> None:
    source = tmp_path / "evidencia.pdf"
    _pdf(source, 2)
    monkeypatch.setattr(evidence_service, "get_upload_dir", lambda: tmp_path)

    first_path, total, fingerprint = evidence_service._render_cached_evidence_page(source, 2)
    first_mtime = first_path.stat().st_mtime_ns
    second_path, second_total, second_fingerprint = evidence_service._render_cached_evidence_page(source, 2)

    assert first_path.read_bytes().startswith(b"\x89PNG")
    assert (total, second_total) == (2, 2)
    assert (second_path, second_fingerprint) == (first_path, fingerprint)
    assert second_path.stat().st_mtime_ns == first_mtime


def test_image_page_and_corrupt_content_keep_safe_errors(tmp_path: Path) -> None:
    image_path = tmp_path / "evidencia.jpg"
    Image.new("RGB", (40, 40), "white").save(image_path)

    with pytest.raises(evidence_service.EvidencePageError, match="no encontrada"):
        evidence_service._render_cached_evidence_page(image_path, 2)

    corrupt = tmp_path / "evidencia-corrupta.jpg"
    corrupt.write_bytes(b"contenido no visual")
    with pytest.raises(evidence_service.EvidencePageError, match="no puede visualizarse"):
        evidence_service._render_cached_evidence_page(corrupt, 1)


def test_mixed_metadata_keeps_online_and_physical_sections() -> None:
    delivery = _delivery()
    delivery.respuesta_texto = '{"1":"respuesta"}'
    evaluation = SimpleNamespace(
        modalidad="mixta",
        preguntas=[
            {"numero": 1, "modalidad": "online"},
            {"numero": 2, "modalidad": "fisica"},
        ],
    )

    metadata = evidence_service._mixed_evidence_metadata(evaluation, delivery)

    assert metadata["secciones"]["online"] == {
        "preguntas": [1],
        "respuesta_guardada": True,
    }
    assert metadata["secciones"]["fisica"] == {
        "preguntas": [2],
        "archivo_url": delivery.archivo_url,
    }


def test_replaced_evidence_cleanup_removes_file_and_tolerates_invalid_path(
    tmp_path: Path,
    monkeypatch,
) -> None:
    replaced = tmp_path / "evidencia-anterior.pdf"
    replaced.write_bytes(b"pdf anterior")
    monkeypatch.setattr(evidence_service, "resolve_upload_path", lambda _url: replaced)

    evidence_service._delete_replaced_evidence("/uploads/entregas/evidencia-anterior.pdf")

    assert not replaced.exists()

    def invalid_path(_url: str) -> Path:
        raise ValueError("fuera del almacenamiento")

    monkeypatch.setattr(evidence_service, "resolve_upload_path", invalid_path)
    evidence_service._delete_replaced_evidence("/uploads/entregas/invalida.pdf")


def test_router_reexports_helpers_owned_by_evidence_service() -> None:
    helper_names = (
        "EvidencePageError",
        "_render_cached_evidence_page",
        "_parse_evidence_rotations",
        "_evidence_bundle_metadata",
        "_delete_replaced_evidence",
        "_evidence_url",
        "_entrega_read",
        "_mixed_evidence_metadata",
    )

    for name in helper_names:
        helper = getattr(router, name)
        assert helper is getattr(evidence_service, name)
        assert inspect.getmodule(helper) is evidence_service
