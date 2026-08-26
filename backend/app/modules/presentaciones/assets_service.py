"""Activos visuales y archivos de presentaciones administrados por XCalificator."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger

ExportFormat = Literal["pptx", "pdf"]
logger = get_logger(__name__)


def _ensure_placeholder_asset(title: str, hint: str) -> str:
    key = hashlib.sha1(f"{title}|{hint}".encode("utf-8")).hexdigest()[:18]
    host_path = _generated_slide_asset_path(f"{key}.png")
    if host_path.is_file():
        return _generated_slide_asset_url(host_path.name)
    try:
        _render_placeholder_image(host_path, title, hint)
        _write_asset_meta(host_path, provider="placeholder", title=title, prompt=hint)
        return _generated_slide_asset_url(host_path.name)
    except Exception:
        return ""


def _generated_slide_asset_path(filename: str) -> Path:
    """Store images beside exports, a directory owned by the worker."""
    return Path(settings.UPLOADS_DIR) / "presentaciones" / f"slide-{filename}"


def _generated_slide_asset_url(filename: str) -> str:
    asset_id = Path(filename).stem
    return f"/api/presentaciones/assets/{asset_id}"


ASSET_URL_PREFIX = "/api/presentaciones/assets/"


def resolve_asset_path(raw_url: str) -> Path | None:
    """Resolve XCalificator presentation assets inside uploads only."""
    value = str(raw_url or "").strip()
    if not value:
        return None
    uploads_root = Path(settings.UPLOADS_DIR).resolve()
    if value.startswith(ASSET_URL_PREFIX):
        asset_id = value.removeprefix(ASSET_URL_PREFIX)
        if not re.fullmatch(r"[0-9a-f]{18}", asset_id):
            return None
        path = uploads_root / "presentaciones" / f"slide-{asset_id}.png"
    else:
        path = Path(value)
        if not path.is_absolute():
            path = uploads_root / path
    try:
        resolved = path.resolve()
        resolved.relative_to(uploads_root)
    except (OSError, ValueError):
        return None
    return resolved if resolved.is_file() else None


def _ai_slide_asset(title: str, prompt: str) -> tuple[Path, str]:
    """Ruta determinista (host_path, url pública) del asset de una slide.

    Usa la MISMA clave que `_ensure_placeholder_asset` (PIL), a propósito:
    así la imagen IA ocupa el mismo archivo que buscaría el placeholder, y
    cualquier ruta de resolución (incluido el re-normalizado del export, que
    pierde nuestro __image_url__) encuentra la imagen IA antes de dibujar PIL."""
    key = hashlib.sha1(f"{title}|{prompt}".encode("utf-8")).hexdigest()[:18]
    return _generated_slide_asset_path(f"{key}.png"), _generated_slide_asset_url(
        f"{key}.png"
    )


def _resolve_slide_image_url(title: str, prompt: str, *, prebuilt: str = "") -> str:
    """URL de imagen de la slide: 1) la pre-generada (image_asset), 2) un asset IA
    ya existente en disco (recuperado por clave), 3) placeholder PIL."""
    if prebuilt:
        return prebuilt
    host_path, public = _ai_slide_asset(title, prompt)
    if host_path.is_file():
        return public
    return _ensure_placeholder_asset(title, prompt)


def _image_src(title: str, prompt: str, *, prebuilt: str = "") -> str:
    image_url = _resolve_slide_image_url(title, prompt, prebuilt=prebuilt)
    return _data_uri_from_asset_url(image_url) or image_url


def _data_uri_from_asset_url(image_url: str) -> str:
    asset_prefix = "/api/presentaciones/assets/"
    if image_url.startswith(asset_prefix):
        asset_id = image_url.removeprefix(asset_prefix)
        if not re.fullmatch(r"[0-9a-f]{18}", asset_id):
            return ""
        path = _generated_slide_asset_path(f"{asset_id}.png")
    else:
        return ""
    try:
        if not path.is_file():
            return ""
        data = base64.b64encode(path.read_bytes()).decode("ascii")
        return f"data:image/png;base64,{data}"
    except Exception:  # noqa: BLE001
        return ""


def _asset_meta_path(path: Path) -> Path:
    return path.with_suffix(".json")


def _read_asset_provider(path: Path) -> str:
    try:
        meta = json.loads(_asset_meta_path(path).read_text(encoding="utf-8"))
    except Exception:
        return ""
    return str(meta.get("provider") or "")


def is_placeholder_asset(path: Path) -> bool:
    """Return whether an asset is explicitly marked as a generated fallback."""
    return _read_asset_provider(path) == "placeholder"


def _write_asset_meta(path: Path, *, provider: str, title: str, prompt: str) -> None:
    meta = {
        "provider": provider,
        "title": title,
        "prompt": prompt,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        _asset_meta_path(path).write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception:  # noqa: BLE001
        logger.warning("Could not write image provider metadata for %s", path.name)


async def generate_ai_slide_image_detailed(
    title: str,
    prompt: str,
    *,
    provider,
    db: AsyncSession | None = None,
    teacher_id: UUID | None = None,
    ai_config: dict[str, Any] | None = None,
) -> dict:
    """Como `generate_ai_slide_image`, pero devuelve detalles para la biblioteca
    de imágenes: {url, path, provider, reused, placeholder, error}."""
    import io

    from app.services.image_router import generate_image

    host_path, public = _ai_slide_asset(title, prompt)
    expected_provider = str(getattr(provider, "value", provider) or "")
    existing_provider = _read_asset_provider(host_path)
    if host_path.is_file() and (
        existing_provider == expected_provider
        or (not existing_provider and expected_provider != "openai")
    ):
        return {
            "url": public,
            "path": str(host_path),
            "provider": existing_provider or expected_provider,
            "reused": True,
            "placeholder": existing_provider == "placeholder",
            "error": None,
        }

    error_text: str | None = None
    try:
        result = await generate_image(
            prompt,
            size="1536x1024",
            provider=provider,
            strict_provider=True,
            db=db,
            teacher_id=teacher_id,
            ai_config=ai_config,
        )
        if result.b64_data and not result.is_placeholder:
            from PIL import Image

            raw = base64.b64decode(result.b64_data)
            host_path.parent.mkdir(parents=True, exist_ok=True)
            Image.open(io.BytesIO(raw)).convert("RGB").save(host_path, "PNG")
            _write_asset_meta(
                host_path, provider=result.provider, title=title, prompt=prompt
            )
            logger.info(
                "Slide image generated via %s for %r", result.provider, title[:40]
            )
            return {
                "url": public,
                "path": str(host_path),
                "provider": result.provider,
                "reused": False,
                "placeholder": False,
                "error": None,
            }
        error_text = "El proveedor devolvió placeholder o respuesta vacía."
    except Exception as exc:  # noqa: BLE001
        error_text = str(exc)[:500]
        logger.warning(
            "AI slide image failed (%s) for %r; using placeholder", exc, title[:40]
        )

    try:
        _render_placeholder_image(host_path, title, prompt)
        _write_asset_meta(host_path, provider="placeholder", title=title, prompt=prompt)
    except Exception:  # noqa: BLE001
        return {
            "url": "",
            "path": None,
            "provider": "placeholder",
            "reused": False,
            "placeholder": True,
            "error": error_text,
        }
    return {
        "url": public,
        "path": str(host_path),
        "provider": "placeholder",
        "reused": False,
        "placeholder": True,
        "error": error_text,
    }


async def generate_ai_slide_image(title: str, prompt: str, *, provider) -> str:
    """Genera una imagen IA real (OpenAI gpt-image low / Cloudflare SDXL) para una
    slide y la guarda en el almacen local de XCalificator. Devuelve la URL autenticada de XCalificator
    Si la IA falla, cae al placeholder PIL. Nunca rompe la generación."""
    detail = await generate_ai_slide_image_detailed(title, prompt, provider=provider)
    return str(detail.get("url") or "")


def _render_placeholder_image(path: Path, title: str, hint: str) -> None:
    from PIL import Image, ImageDraw

    path.parent.mkdir(parents=True, exist_ok=True)
    width, height = 960, 540
    image = Image.new("RGB", (width, height), "#e0f2fe")
    draw = ImageDraw.Draw(image)
    title_font = _placeholder_font(46, bold=True)
    body_font = _placeholder_font(28)
    draw.rectangle((0, 0, width, height), fill="#e0f2fe")
    draw.rounded_rectangle(
        (60, 60, width - 60, height - 60),
        radius=40,
        fill="#ffffff",
        outline="#0284c7",
        width=6,
    )
    draw.ellipse((665, 115, 845, 295), fill="#0f766e")
    initials = "".join(part[:1] for part in title.split()[:2]).upper() or "XC"
    draw.text(
        (755, 205),
        initials[:2],
        font=_placeholder_font(72, bold=True),
        fill="white",
        anchor="mm",
    )
    y = 105
    for line in _wrap_for_image(title, 29)[:3]:
        draw.text((105, y), line, font=title_font, fill="#0f172a")
        y += 56
    y = max(y + 20, 300)
    for line in _wrap_for_image(hint or "Imagen educativa", 52)[:4]:
        draw.text((105, y), line, font=body_font, fill="#334155")
        y += 36
    image.save(path, "PNG")


def _placeholder_font(size: int, *, bold: bool = False):
    from PIL import ImageFont

    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).is_file():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def _wrap_for_image(text: str, width: int) -> list[str]:
    import textwrap

    lines: list[str] = []
    for part in str(text).splitlines() or [""]:
        lines.extend(textwrap.wrap(part, width=width) or [""])
    return lines


async def save_export_file(
    content: bytes, presentation_id: UUID, export_as: ExportFormat
) -> str:
    dest_dir = Path(settings.UPLOADS_DIR) / "presentaciones"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{presentation_id}.{export_as}"
    await asyncio.to_thread(dest.write_bytes, content)
    return f"/api/presentaciones/{presentation_id}/archivo/{export_as}"


def get_export_file_path(presentation_id: UUID, export_as: ExportFormat) -> Path:
    return (
        Path(settings.UPLOADS_DIR) / "presentaciones" / f"{presentation_id}.{export_as}"
    )
