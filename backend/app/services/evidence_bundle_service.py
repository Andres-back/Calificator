"""Normaliza una o varias hojas físicas en una evidencia única y ordenada."""
from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Any

from fastapi import UploadFile
from PIL import Image, ImageEnhance, ImageOps, UnidentifiedImageError

from app.core.config import settings
from app.services.storage_service import read_upload_limited, validate_mime


ALLOWED_IMAGE_MIMES = {"image/jpeg", "image/png", "image/webp"}


class EvidenceBundleError(ValueError):
    """Error de validación seguro para mostrar al usuario."""


@dataclass(frozen=True)
class EvidenceBundle:
    content: bytes
    filename: str
    mime: str
    page_count: int
    evidence_type: str
    metadata: dict[str, Any]


def _limits() -> tuple[int, int, int, int]:
    max_files = max(1, int(getattr(settings, "MAX_EVIDENCE_FILES", 10)))
    per_image = max(
        1,
        int(getattr(settings, "MAX_EVIDENCE_FILE_MB", 10)),
    ) * 1024 * 1024
    total = max(
        1,
        int(getattr(settings, "MAX_EVIDENCE_TOTAL_MB", 40)),
    ) * 1024 * 1024
    max_pdf_pages = max(1, int(getattr(settings, "MAX_GRADING_PDF_PAGES", 20)))
    return max_files, per_image, total, max_pdf_pages


def _normalized_rotation(value: int) -> int:
    if value not in {0, 90, 180, 270}:
        raise EvidenceBundleError("La rotación de una hoja no es válida")
    return value


def _normalize_photo(content: bytes, rotation: int) -> Image.Image:
    try:
        with Image.open(BytesIO(content)) as source:
            image = ImageOps.exif_transpose(source)
            image.load()
            if image.mode != "RGB":
                image = image.convert("RGB")
            else:
                image = image.copy()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise EvidenceBundleError(
            "Una de las fotografías está dañada o no puede leerse"
        ) from exc

    if rotation:
        image = image.rotate(-rotation, expand=True, fillcolor="white")
    if max(image.size) > 2600:
        image.thumbnail((2600, 2600), Image.Resampling.LANCZOS)
    image = ImageOps.autocontrast(image, cutoff=0.5)
    return ImageEnhance.Sharpness(image).enhance(1.1)


def _safe_pdf_page_count(content: bytes, max_pages: int) -> int:
    try:
        import fitz

        with fitz.open(stream=content, filetype="pdf") as document:
            page_count = len(document)
    except Exception as exc:  # noqa: BLE001 - fitz expone varias excepciones
        raise EvidenceBundleError("El PDF está dañado o no puede leerse") from exc
    if page_count == 0:
        raise EvidenceBundleError("El PDF no contiene páginas")
    if page_count > max_pages:
        raise EvidenceBundleError(
            f"El PDF tiene {page_count} páginas; el máximo permitido es {max_pages}"
        )
    return page_count


def _photos_to_bundle(
    photos: list[tuple[bytes, str]],
    rotations: list[int],
    *,
    max_total_bytes: int,
) -> tuple[bytes, str, str]:
    images = [
        _normalize_photo(content, rotation)
        for (content, _filename), rotation in zip(photos, rotations, strict=True)
    ]
    try:
        output = BytesIO()
        if len(images) == 1:
            images[0].save(output, format="JPEG", quality=90, optimize=True)
            filename = "evidencia.jpg"
            mime = "image/jpeg"
        else:
            images[0].save(
                output,
                format="PDF",
                resolution=150,
                quality=90,
                save_all=True,
                append_images=images[1:],
            )
            filename = "evidencia-multihoja.pdf"
            mime = "application/pdf"
        content = output.getvalue()
    finally:
        for image in images:
            image.close()
    if len(content) > max_total_bytes:
        raise EvidenceBundleError(
            "El documento normalizado supera el límite total de 40 MB"
        )
    return content, filename, mime


async def build_evidence_bundle(
    uploads: UploadFile | list[UploadFile],
    *,
    rotations: list[int] | None = None,
) -> EvidenceBundle:
    """Valida todos los archivos antes de producir una evidencia persistible."""
    files = list(uploads) if isinstance(uploads, (list, tuple)) else [uploads]
    max_files, per_image_bytes, max_total_bytes, max_pdf_pages = _limits()
    if not files:
        raise EvidenceBundleError("Selecciona al menos una foto o un PDF")
    if len(files) > max_files:
        raise EvidenceBundleError(
            f"Puedes entregar máximo {max_files} fotografías"
        )

    requested_rotations = rotations or [0] * len(files)
    if len(requested_rotations) != len(files):
        raise EvidenceBundleError(
            "La información de rotación no coincide con las hojas seleccionadas"
        )
    normalized_rotations = [
        _normalized_rotation(int(value)) for value in requested_rotations
    ]

    loaded: list[tuple[bytes, str, str]] = []
    total_bytes = 0
    for upload in files:
        remaining = max_total_bytes - total_bytes
        if remaining <= 0:
            raise EvidenceBundleError("La entrega supera el límite total de 40 MB")
        try:
            content = await read_upload_limited(upload, remaining)
        except ValueError as exc:
            raise EvidenceBundleError(
                "La entrega supera el límite total de 40 MB"
            ) from exc
        filename = upload.filename or "evidencia"
        try:
            mime = validate_mime(content, filename)
        except ValueError as exc:
            raise EvidenceBundleError(
                "Solo puedes adjuntar fotografías JPG, PNG, WebP o un PDF"
            ) from exc
        if mime in ALLOWED_IMAGE_MIMES and len(content) > per_image_bytes:
            raise EvidenceBundleError(
                "Cada fotografía debe pesar máximo 10 MB"
            )
        total_bytes += len(content)
        loaded.append((content, filename, mime))

    pdf_files = [item for item in loaded if item[2] == "application/pdf"]
    if pdf_files:
        if len(loaded) != 1:
            raise EvidenceBundleError(
                "Entrega varias fotografías o un único PDF, pero no los mezcles"
            )
        content, filename, mime = pdf_files[0]
        page_count = _safe_pdf_page_count(content, max_pdf_pages)
        metadata = {
            "tipo": "pdf",
            "paginas": page_count,
            "archivos": [{"nombre": filename, "paginas": page_count}],
        }
        return EvidenceBundle(
            content=content,
            filename=filename,
            mime=mime,
            page_count=page_count,
            evidence_type="pdf",
            metadata=metadata,
        )

    photos = [(content, filename) for content, filename, _mime in loaded]
    bundled_content, bundled_filename, bundled_mime = _photos_to_bundle(
        photos,
        normalized_rotations,
        max_total_bytes=max_total_bytes,
    )
    metadata = {
        "tipo": "fotos" if len(photos) > 1 else "foto",
        "paginas": len(photos),
        "archivos": [
            {
                "pagina": index,
                "nombre": filename,
                "rotacion": normalized_rotations[index - 1],
            }
            for index, (_content, filename) in enumerate(photos, start=1)
        ],
    }
    return EvidenceBundle(
        content=bundled_content,
        filename=bundled_filename,
        mime=bundled_mime,
        page_count=len(photos),
        evidence_type=metadata["tipo"],
        metadata=metadata,
    )