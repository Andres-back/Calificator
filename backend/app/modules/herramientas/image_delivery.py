"""Entrega ligera de la imagen de un recurso (Spec 196).

La imagen original se conserva en ``contenido_json.imagen.b64_data`` porque el
PDF la necesita con toda su calidad. Al navegador, en cambio, no se le envía
incrustada en el JSON (1,5–2 MB por recurso): recibe un enlace a la misma
imagen convertida a WebP, que además puede guardar en caché.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import io
from typing import Any

from app.core.config import settings

WEB_IMAGE_QUALITY = 86
WEB_IMAGE_MAX_SIDE = 1280


def stored_image_b64(content: Any) -> str | None:
    """Devuelve el base64 guardado de la imagen real del recurso, si existe."""
    if not isinstance(content, dict):
        return None
    image = content.get("imagen")
    if not isinstance(image, dict) or image.get("is_placeholder"):
        return None
    value = image.get("b64_data")
    if not isinstance(value, str) or len(value) < 64:
        return None
    return value.split(",", 1)[1] if value.startswith("data:") else value


def image_version(b64: str) -> str:
    """Huella corta y barata: cambia si cambia la imagen, sin recorrer megabytes."""
    sample = f"{len(b64)}:{b64[:4096]}:{b64[-4096:]}"
    return hashlib.sha256(sample.encode("ascii", "ignore")).hexdigest()[:16]


def image_url(material_id: Any, b64: str) -> str:
    return f"{settings.API_PREFIX}/herramientas/{material_id}/imagen?v={image_version(b64)}"


def lighten_material(material: Any) -> Any:
    """Copia del material sin la imagen incrustada: deja un enlace en ``imagen.url``."""
    if not isinstance(material, dict):
        return material
    content = material.get("contenido_json")
    b64 = stored_image_b64(content)
    if b64 is None or material.get("id") is None:
        return material
    image = {key: value for key, value in content["imagen"].items() if key != "b64_data"}
    image["url"] = image_url(material["id"], b64)
    return {**material, "contenido_json": {**content, "imagen": image}}


def restore_stored_image(old_content: Any, new_content: Any) -> Any:
    """Al editar, el navegador devuelve la imagen sin sus datos; se conserva la guardada."""
    if not isinstance(new_content, dict) or stored_image_b64(old_content) is None:
        return new_content
    incoming = new_content.get("imagen")
    if isinstance(incoming, dict) and not incoming.get("b64_data"):
        return {**new_content, "imagen": old_content["imagen"]}
    return new_content


def render_web_image(b64: str) -> tuple[bytes, str]:
    """Convierte la imagen guardada a WebP; si no se puede, entrega la original."""
    try:
        raw = base64.b64decode(b64, validate=False)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("La imagen guardada no se puede leer.") from exc
    if not raw:
        raise ValueError("La imagen guardada está vacía.")
    try:
        from PIL import Image

        with Image.open(io.BytesIO(raw)) as source:
            source.load()
            image = source
            if image.mode not in {"RGB", "L"}:
                rgba = image.convert("RGBA")
                flat = Image.new("RGB", rgba.size, (255, 255, 255))
                flat.paste(rgba, mask=rgba.getchannel("A"))
                image = flat
            if max(image.size) > WEB_IMAGE_MAX_SIDE:
                image.thumbnail((WEB_IMAGE_MAX_SIDE, WEB_IMAGE_MAX_SIDE))
            output = io.BytesIO()
            image.save(output, "WEBP", quality=WEB_IMAGE_QUALITY, method=4)
            converted = output.getvalue()
    except Exception:  # noqa: BLE001 - una imagen ilegible no debe impedir mostrar la original
        return raw, _sniff_media_type(raw)
    # Nunca se entrega algo más pesado que lo guardado (pasa con dibujos muy simples).
    if len(converted) >= len(raw):
        return raw, _sniff_media_type(raw)
    return converted, "image/webp"


def _sniff_media_type(raw: bytes) -> str:
    if raw.startswith(b"\x89PNG"):
        return "image/png"
    if raw.startswith(b"\xff\xd8"):
        return "image/jpeg"
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return "image/webp"
    return "application/octet-stream"
