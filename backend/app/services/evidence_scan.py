"""Conservative source-to-canonical page preparation, without AI or file writes."""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
from io import BytesIO
import math
from typing import Annotated, Literal
import warnings

from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field, field_validator

UnitCoordinate = Annotated[float, Field(strict=True, ge=0, le=1, allow_inf_nan=False)]
Point = tuple[UnitCoordinate, UnitCoordinate]
Quad = tuple[Point, Point, Point, Point]
MAX_PIXELS = 16_000_000
MAX_SOURCE_BYTES = 10 * 1024 * 1024
MAX_PREPARED_BYTES = 2_500_000
ALGORITHM = "opencv-4.13.0-scan2"


def _valid_quad(points: Quad) -> bool:
    twice_area = 0.0
    for index in range(4):
        a, b, c = points[index], points[(index + 1) % 4], points[(index + 2) % 4]
        if (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) <= 0.00001:
            return False
        if math.dist(a, b) < 0.01:
            return False
        twice_area += a[0] * b[1] - b[0] * a[1]
    return twice_area >= 0.03


class ScanRecipe(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    width: int = Field(strict=True, ge=2)
    height: int = Field(strict=True, ge=2)
    corners: Quad
    rotation: Literal[0, 90, 180, 270] = 0
    profile: Literal["natural", "lectura_suave"] = "natural"
    coordinate_frame: Literal["exif_oriented_source"] = "exif_oriented_source"

    @field_validator("corners")
    @classmethod
    def validate_corners(cls, value: Quad) -> Quad:
        if not _valid_quad(value):
            raise ValueError("Las cuatro esquinas deben formar una hoja convexa y no degenerada.")
        return value

    @field_validator("rotation", mode="before")
    @classmethod
    def validate_rotation(cls, value: object) -> object:
        if type(value) is not int:
            raise ValueError("El giro debe ser un número entero admitido.")
        return value


class ScanPreparationError(ValueError):
    """Recoverable preparation failure; caller retains the source/legacy path."""


@dataclass(frozen=True)
class PreparedEvidenceScan:
    content: bytes
    mime: str
    width: int
    height: int
    source_sha256: str
    source_to_prepared: list[list[float]]
    algorithm: str = ALGORITHM


def prepare_evidence_original(content: bytes, *, rotation: int = 0) -> PreparedEvidenceScan:
    """Full-frame natural reading copy; 16MP disables scanning, not this path.

    Keep the raw source elsewhere. Downsample before copying/orienting pixels,
    use JPEG draft decoding when available, and never enhance the handwriting.
    """
    if not content or len(content) > MAX_SOURCE_BYTES or type(rotation) is not int or rotation not in {0, 90, 180, 270}:
        raise ScanPreparationError("invalid_source")
    image = None
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as source:
                if source.format not in {"JPEG", "PNG", "WEBP"}:
                    raise ScanPreparationError("unsupported_format")
                source_width, source_height = source.size
                orientation = source.getexif().get(274, 1)
                if orientation in {5, 6, 7, 8}:
                    source_width, source_height = source_height, source_width
                source.draft("RGB", (2200, 2200))
                source.thumbnail((2200, 2200), Image.Resampling.LANCZOS)
                oriented = ImageOps.exif_transpose(source)
                try:
                    if "A" in oriented.getbands() or "transparency" in oriented.info:
                        rgba = oriented.convert("RGBA")
                        background = Image.new("RGBA", oriented.size, "white")
                        try:
                            composite = Image.alpha_composite(background, rgba)
                            try:
                                image = composite.convert("RGB")
                            finally:
                                composite.close()
                        finally:
                            rgba.close(); background.close()
                    else:
                        image = oriented.convert("RGB")
                finally:
                    oriented.close()
        width, height = image.size
        sx, sy = (width - 1) / max(1, source_width - 1), (height - 1) / max(1, source_height - 1)
        matrix = [[sx, 0., 0.], [0., sy, 0.], [0., 0., 1.]]
        if rotation:
            turned = image.rotate(-rotation, expand=True, fillcolor="white")
            image.close(); image = turned
            if rotation == 90:
                matrix = [[0., -sy, float(height - 1)], [sx, 0., 0.], [0., 0., 1.]]
            elif rotation == 180:
                matrix = [[-sx, 0., float(width - 1)], [0., -sy, float(height - 1)], [0., 0., 1.]]
            else:
                matrix = [[0., sy, 0.], [-sx, 0., float(width - 1)], [0., 0., 1.]]
        image.info.clear()
        output = BytesIO()
        image.save(output, format="JPEG", quality=96, subsampling=0, optimize=False)
        if output.tell() > MAX_PREPARED_BYTES:
            raise ScanPreparationError("prepared_size_budget")
        return PreparedEvidenceScan(output.getvalue(), "image/jpeg", image.width, image.height,
                                    hashlib.sha256(content).hexdigest(), matrix)
    except ScanPreparationError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ScanPreparationError("invalid_source") from exc
    finally:
        if image is not None:
            image.close()


def _rgb_strip_bytes(strip: Image.Image) -> bytes:
    """Same white-alpha/RGB conversion as before, bounded to a small strip."""
    if "A" in strip.getbands() or "transparency" in strip.info:
        with strip.convert("RGBA") as rgba, Image.new("RGBA", strip.size, "white") as background:
            with Image.alpha_composite(background, rgba) as composite:
                with composite.convert("RGB") as rgb:
                    return rgb.tobytes()
    if strip.mode == "RGB":
        return strip.tobytes()
    with strip.convert("RGB") as rgb:
        return rgb.tobytes()


def _rgb_pixels(image: Image.Image):
    """One contiguous OpenCV input without Pillow's full-frame bytes + join.

    np.asarray(PillowImage) materializes another complete RGB byte string.
    For a 16MP source, its intermediate chunks/join can exceed the unchanged
    512MiB address-space guard. Exact per-pixel conversion in 64-row strips
    avoids that peak; no resize, extra interpolation or lossy encoding occurs.
    """
    import numpy as np
    pixels = np.empty((image.height, image.width, 3), dtype=np.uint8)
    for top in range(0, image.height, 64):
        bottom = min(image.height, top + 64)
        with image.crop((0, top, image.width, bottom)) as strip:
            raw = _rgb_strip_bytes(strip)
        pixels[top:bottom] = np.frombuffer(raw, dtype=np.uint8).reshape(bottom - top, image.width, 3)
    return pixels


def prepare_evidence_scan(content: bytes, recipe: ScanRecipe) -> PreparedEvidenceScan:
    if not content or len(content) > MAX_SOURCE_BYTES:
        raise ScanPreparationError("source_size")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            source = Image.open(BytesIO(content))
            try:
                if source.format not in {"JPEG", "PNG", "WEBP"}:
                    raise ScanPreparationError("unsupported_format")
                if source.width * source.height > MAX_PIXELS:
                    raise ScanPreparationError("pixel_budget")
                image = ImageOps.exif_transpose(source)
                if image.size != (recipe.width, recipe.height):
                    image.close()
                    raise ScanPreparationError("source_dimensions_changed")
                image.load()
            finally:
                # Image.__exit__ only closes its file handle, not all decoded
                # pixels. Release the raw frame before importing CV/allocating
                # the oriented RGB array; the retained source bytes are intact.
                source.close()
    except ScanPreparationError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise ScanPreparationError("invalid_source") from exc

    try:
        # Heavy libraries stay lazy; no new decoding/encoding round trip.
        import cv2
        import numpy as np

        cv2.setNumThreads(1)
        pixels = _rgb_pixels(image)
    finally:
        image.close()

    points = np.float32([(x * (recipe.width - 1), y * (recipe.height - 1)) for x, y in recipe.corners])
    width = max(float(np.linalg.norm(points[1] - points[0])), float(np.linalg.norm(points[2] - points[3]))) + 1
    height = max(float(np.linalg.norm(points[3] - points[0])), float(np.linalg.norm(points[2] - points[1]))) + 1
    ratio = min(1.0, 2200 / max(width, height), max(recipe.width, recipe.height) / max(width, height))
    width, height = max(2, math.floor(width * ratio + 0.5)), max(2, math.floor(height * ratio + 0.5))
    target = np.float32([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]])
    matrix = cv2.getPerspectiveTransform(points, target)
    if not np.isfinite(matrix).all() or abs(float(np.linalg.det(matrix))) < 1e-10:
        raise ScanPreparationError("degenerate_transform")
    result = cv2.warpPerspective(pixels, matrix, (width, height), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    del pixels
    rotation_matrix = np.eye(3)
    if recipe.rotation == 90:
        result = cv2.rotate(result, cv2.ROTATE_90_CLOCKWISE)
        rotation_matrix = np.array([[0, -1, height - 1], [1, 0, 0], [0, 0, 1]], dtype=float)
    elif recipe.rotation == 180:
        result = cv2.rotate(result, cv2.ROTATE_180)
        rotation_matrix = np.array([[-1, 0, width - 1], [0, -1, height - 1], [0, 0, 1]], dtype=float)
    elif recipe.rotation == 270:
        result = cv2.rotate(result, cv2.ROTATE_90_COUNTERCLOCKWISE)
        rotation_matrix = np.array([[0, 1, 0], [-1, 0, width - 1], [0, 0, 1]], dtype=float)
    if recipe.profile == "lectura_suave":
        luminance = cv2.cvtColor(result, cv2.COLOR_RGB2YCrCb)
        enhanced = cv2.createCLAHE(clipLimit=1.25, tileGridSize=(8, 8)).apply(luminance[:, :, 0])
        luminance[:, :, 0] = np.clip(luminance[:, :, 0].astype("float32") * 0.85 + enhanced.astype("float32") * 0.15, 0, 255).astype("uint8")
        result = cv2.cvtColor(luminance, cv2.COLOR_YCrCb2RGB)
    encoded = BytesIO()
    with Image.fromarray(result) as canonical:
        canonical.save(encoded, format="JPEG", quality=96, subsampling=0, optimize=False)
        output_width, output_height = canonical.size
    if encoded.tell() > MAX_PREPARED_BYTES:
        raise ScanPreparationError("prepared_size_budget")
    return PreparedEvidenceScan(
        content=encoded.getvalue(), mime="image/jpeg", width=output_width, height=output_height,
        source_sha256=hashlib.sha256(content).hexdigest(), source_to_prepared=(rotation_matrix @ matrix).tolist(),
    )
