"""Preparación local y segura de fotografías para modelos de visión."""
from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageStat, UnidentifiedImageError


@dataclass(frozen=True)
class ImageQualityAssessment:
    status: str
    width: int = 0
    height: int = 0
    brightness: float = 0.0
    contrast: float = 0.0
    sharpness: float = 0.0
    warnings: tuple[str, ...] = ()


@dataclass(frozen=True)
class PreparedImage:
    data: bytes
    mime: str
    rotation_degrees: int
    quality: ImageQualityAssessment | None = None


def assess_image_quality(content: bytes, mime: str) -> ImageQualityAssessment:
    """Mide calidad básica sin OCR ni dependencias pesadas.

    Los umbrales son deliberadamente conservadores: una foto dudosa se advierte,
    pero solo un archivo corrupto, diminuto o prácticamente uniforme se considera
    inutilizable.
    """
    if not mime.startswith("image/"):
        return ImageQualityAssessment(status="good")
    try:
        with Image.open(BytesIO(content)) as source:
            image = ImageOps.exif_transpose(source)
            image.load()
            width, height = image.size
            gray = image.convert("L")
            gray.thumbnail((512, 512), Image.Resampling.LANCZOS)
            stats = ImageStat.Stat(gray)
            brightness = float(stats.mean[0])
            contrast = float(stats.stddev[0])
            edges = gray.filter(ImageFilter.FIND_EDGES)
            if edges.width > 8 and edges.height > 8:
                edges = edges.crop((4, 4, edges.width - 4, edges.height - 4))
            sharpness = float(ImageStat.Stat(edges).stddev[0])
    except (UnidentifiedImageError, OSError, ValueError):
        return ImageQualityAssessment(
            status="unusable",
            warnings=("corrupted",),
        )

    warnings: list[str] = []
    if min(width, height) < 420:
        warnings.append("low_resolution")
    if brightness < 55:
        warnings.append("dark")
    elif brightness > 250:
        warnings.append("overexposed")
    if contrast < 18:
        warnings.append("low_contrast")
    if sharpness < 10:
        warnings.append("blurry")

    almost_uniform = contrast < 2.5 and sharpness < 2.5
    too_small = min(width, height) < 120
    status = "unusable" if almost_uniform or too_small else ("warning" if warnings else "good")
    if almost_uniform:
        warnings.append("no_visual_information")
    if too_small:
        warnings.append("too_small")
    return ImageQualityAssessment(
        status=status,
        width=width,
        height=height,
        brightness=round(brightness, 2),
        contrast=round(contrast, 2),
        sharpness=round(sharpness, 2),
        warnings=tuple(dict.fromkeys(warnings)),
    )


def quality_warning_messages(quality: ImageQualityAssessment) -> list[str]:
    labels = {
        "corrupted": "El archivo de imagen está dañado o no se puede abrir.",
        "low_resolution": "La foto tiene poca resolución; revisa cuidadosamente el borrador.",
        "dark": "La foto está oscura; se ajustó la iluminación automáticamente.",
        "overexposed": "La foto tiene demasiada luz; se ajustó el contraste automáticamente.",
        "low_contrast": "El texto tiene poco contraste; se mejoró una copia para su lectura.",
        "blurry": "La foto puede estar borrosa; revisa el contenido extraído.",
        "no_visual_information": "La imagen no contiene detalle visual recuperable.",
        "too_small": "La imagen es demasiado pequeña para leerla con seguridad.",
    }
    return [labels[warning] for warning in quality.warnings if warning in labels]


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
    quality = assess_image_quality(content, mime)
    try:
        with Image.open(BytesIO(content)) as source:
            normalized = ImageOps.exif_transpose(source)
            normalized.load()
            if normalized.mode != "RGB":
                normalized = normalized.convert("RGB")
            if max(normalized.size) > max_side:
                normalized.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
            if quality.brightness and quality.brightness < 90:
                normalized = ImageEnhance.Brightness(normalized).enhance(
                    min(1.65, 118 / quality.brightness)
                )
            normalized = ImageOps.autocontrast(normalized, cutoff=0.5)
            if quality.contrast and quality.contrast < 24:
                normalized = ImageEnhance.Contrast(normalized).enhance(1.18)
            normalized = ImageEnhance.Sharpness(normalized).enhance(1.12)
    except (UnidentifiedImageError, OSError, ValueError):
        return [PreparedImage(content, mime, 0, quality)]

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
        for jpeg_quality in (88, 82, 76):
            output = BytesIO()
            image.save(
                output,
                format="JPEG",
                quality=jpeg_quality,
                optimize=True,
                progressive=True,
            )
            encoded = output.getvalue()
            if len(encoded) <= 2_500_000:
                break
        variants.append(PreparedImage(encoded, "image/jpeg", degrees, quality))
    return variants
