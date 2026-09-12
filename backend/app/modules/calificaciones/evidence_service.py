"""Presentación segura, metadatos y limpieza de evidencia de entregas."""
from __future__ import annotations

import hashlib
import json
import os
from copy import copy
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status
from PIL import Image, ImageOps, UnidentifiedImageError

from app.modules.calificaciones.models import Entrega
from app.modules.evaluaciones.modality_service import (
    normalize_question_modalities,
    question_numbers_by_section,
)
from app.services.evidence_bundle_service import EvidenceBundle
from app.services.storage_service import get_upload_dir, resolve_upload_path
from app.shared.enums import EvaluacionModalidad

MAX_EVIDENCE_PAGES = 20


class EvidencePageError(ValueError):
    def __init__(self, detail: str, *, not_found: bool = False) -> None:
        super().__init__(detail)
        self.detail = detail
        self.not_found = not_found


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def _render_cached_evidence_page(
    evidence_path: Path,
    page_number: int,
) -> tuple[Path, int, str]:
    """Renderiza una página acotada y reutiliza el PNG por huella del archivo."""
    fingerprint = _file_sha256(evidence_path)

    with evidence_path.open("rb") as source:
        signature = source.read(8)

    if signature.startswith(b"%PDF"):
        try:
            import fitz

            with fitz.open(evidence_path) as document:
                total_pages = len(document)
                if total_pages > MAX_EVIDENCE_PAGES:
                    raise EvidencePageError(
                        f"El PDF supera el máximo de {MAX_EVIDENCE_PAGES} páginas"
                    )
                if page_number > total_pages:
                    raise EvidencePageError("Página de evidencia no encontrada", not_found=True)
                cache_dir = get_upload_dir().resolve() / ".private" / "evidence-page-cache"
                cache_path = cache_dir / f"{fingerprint}-p{page_number}.png"
                if cache_path.is_file():
                    return cache_path, total_pages, fingerprint
                page = document.load_page(page_number - 1)
                longest_side = max(float(page.rect.width), float(page.rect.height), 1.0)
                scale = min(2.0, 2000.0 / longest_side)
                pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
                png_content = pixmap.tobytes("png")
        except EvidencePageError:
            raise
        except Exception as exc:  # noqa: BLE001 - PyMuPDF expone varias excepciones
            raise EvidencePageError("La evidencia PDF no puede visualizarse") from exc
    else:
        if page_number != 1:
            raise EvidencePageError("Página de evidencia no encontrada", not_found=True)
        total_pages = 1
        cache_dir = get_upload_dir().resolve() / ".private" / "evidence-page-cache"
        cache_path = cache_dir / f"{fingerprint}-p{page_number}.png"
        if cache_path.is_file():
            return cache_path, total_pages, fingerprint
        try:
            with Image.open(evidence_path) as source:
                image = ImageOps.exif_transpose(source)
                image.load()
                image.thumbnail((2000, 2000), Image.Resampling.LANCZOS)
                if image.mode not in {"RGB", "RGBA"}:
                    image = image.convert("RGB")
                output = BytesIO()
                image.save(output, format="PNG", optimize=True)
                png_content = output.getvalue()
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise EvidencePageError("La imagen de evidencia no puede visualizarse") from exc

    cache_dir.mkdir(parents=True, exist_ok=True)
    temporary = cache_dir / f".{cache_path.name}.{uuid4().hex}.tmp"
    try:
        temporary.write_bytes(png_content)
        os.replace(temporary, cache_path)
    finally:
        temporary.unlink(missing_ok=True)
    return cache_path, total_pages, fingerprint


def _parse_evidence_rotations(raw: object) -> list[int] | None:
    if not isinstance(raw, str) or not raw.strip():
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La información de rotación no es válida",
        ) from exc
    if not isinstance(parsed, list) or any(
        not isinstance(value, int) for value in parsed
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La información de rotación no es válida",
        )
    return parsed


def _evidence_bundle_metadata(
    evaluacion: object,
    entrega: Entrega,
    bundle: EvidenceBundle,
) -> dict:
    document = dict(bundle.metadata)
    if getattr(evaluacion, "modalidad", None) == EvaluacionModalidad.MIXTA.value:
        metadata = _mixed_evidence_metadata(evaluacion, entrega)
        metadata["documento"] = document
        return metadata
    return {
        "modalidad": getattr(evaluacion, "modalidad", EvaluacionModalidad.FISICA.value),
        **document,
    }


def _delete_replaced_evidence(public_url: str | None) -> None:
    if not public_url:
        return
    try:
        resolve_upload_path(public_url).unlink(missing_ok=True)
    except (OSError, ValueError):
        pass


def _evidence_url(entrega: Entrega | None) -> str | None:
    if not entrega or not entrega.archivo_url:
        return None
    return f"/api/calificaciones/entregas/{entrega.id}/evidencia"


def _entrega_read(entrega: Entrega) -> Entrega:
    """Devuelve una copia serializable sin exponer la ruta persistida interna."""
    safe_entrega = copy(entrega)
    safe_entrega.archivo_url = _evidence_url(entrega)
    return safe_entrega


def _mixed_evidence_metadata(evaluacion: object, entrega: Entrega) -> dict:
    questions = normalize_question_modalities(
        getattr(evaluacion, "preguntas", []),
        getattr(evaluacion, "modalidad", None),
    )
    sections = question_numbers_by_section(questions)
    return {
        "modalidad": EvaluacionModalidad.MIXTA.value,
        "entrega_id": str(entrega.id),
        "secciones": {
            "online": {
                "preguntas": sections["online"],
                "respuesta_guardada": bool(entrega.respuesta_texto),
            },
            "fisica": {
                "preguntas": sections["fisica"],
                "archivo_url": entrega.archivo_url,
            },
        },
    }
