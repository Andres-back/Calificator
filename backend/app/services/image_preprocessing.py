"""Preparación local y segura de fotografías para modelos de visión."""
from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageEnhance, ImageOps, UnidentifiedImageError


@dataclass(frozen=True)
class PreparedImage:
    data: bytes
    mime: str
    rotation_degrees: int


def prepare_orientation_variants(
    content: bytes,
    mime: str,
    *,
    max_side: int = 2200,
) -> list[PreparedImage]:
    """Normaliza EXIF/contraste y ofrece orientaciones alternativas para OCR.

    La primera variante conserva la orientación declarada por el archivo. Las variantes
    de ±90° solo se consumen si la extracción inicial no recupera contenido suficiente.
    """
    if not mime.startswith("image/"):
        return [PreparedImage(content, mime, 0)]
    try:
        with Image.open(BytesIO(content)) as source:
            normalized = ImageOps.exif_transpose(source)
            normalized.load()
            if normalized.mode != "RGB":
                normalized = normalized.convert("RGB")
            if max(normalized.size) > max_side:
                normalized.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
            normalized = ImageOps.autocontrast(normalized, cutoff=0.5)
            normalized = ImageEnhance.Sharpness(normalized).enhance(1.12)
    except (UnidentifiedImageError, OSError, ValueError):
        return [PreparedImage(content, mime, 0)]

    orientations = (
        (0, normalized),
        (90, normalized.transpose(Image.Transpose.ROTATE_90)),
        (-90, normalized.transpose(Image.Transpose.ROTATE_270)),
    )
    variants: list[PreparedImage] = []
    for degrees, image in orientations:
        # 2 200 px conserva escritura y símbolos matemáticos, pero evita enviar fotos
        # de cámara de 8-20 MP. La compresión adaptativa reduce el base64 y la carga.
        encoded = b""
        for quality in (88, 82, 76):
            output = BytesIO()
            image.save(
                output,
                format="JPEG",
                quality=quality,
                optimize=True,
                progressive=True,
            )
            encoded = output.getvalue()
            if len(encoded) <= 2_500_000:
                break
        variants.append(PreparedImage(encoded, "image/jpeg", degrees))
    return variants