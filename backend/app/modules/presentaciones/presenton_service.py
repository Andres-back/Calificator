"""Adaptador seguro entre XCalificator y Presenton.

El frontend nunca habla con Presenton directamente: este modulo centraliza
credenciales internas, endpoints reales de Presenton y resolucion de archivos.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

import httpx
from fastapi import HTTPException, status
import jwt
from jwt import PyJWTError

from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import ALGORITHM

ExportFormat = Literal["pptx", "pdf"]
DEFAULT_TEMPLATE = "modern"
DEFAULT_LAYOUT = "image-and-description"
PRESENTON_SESSION_COOKIE_NAME = "presenton_session"
logger = get_logger(__name__)


def _base_url() -> str:
    return (
        getattr(settings, "PRESENTON_INTERNAL_URL", None)
        or getattr(settings, "PRESENTON_BASE_URL", None)
        or "http://presenton:80"
    ).rstrip("/")


def _endpoint(path: str) -> str:
    return f"{_base_url()}/{path.lstrip('/')}"


def _template_name(value: str | None = None) -> str:
    template = str(value or getattr(settings, "PRESENTON_TEMPLATE", DEFAULT_TEMPLATE) or DEFAULT_TEMPLATE).strip()
    return template or DEFAULT_TEMPLATE


def _auth() -> tuple[str, str]:
    username = getattr(settings, "PRESENTON_AUTH_USERNAME", "presenton_admin")
    password = getattr(settings, "PRESENTON_AUTH_PASSWORD", "")
    if not password:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Presenton no tiene PRESENTON_AUTH_PASSWORD configurado.",
        )
    return username, password


async def ensure_presenton_auth_configured() -> None:
    """Configura credenciales internas si el contenedor arranco sin setup."""
    username, password = _auth()
    async with httpx.AsyncClient(timeout=10) as client:
        status_response = await client.get(_endpoint("/api/v1/auth/status"))
        status_response.raise_for_status()
        data = status_response.json()
        if data.get("configured"):
            return

        setup_response = await client.post(
            _endpoint("/api/v1/auth/setup"),
            json={"username": username, "password": password},
        )
        if setup_response.status_code not in {200, 201, 409}:
            setup_response.raise_for_status()


async def create_presenton_session_cookie() -> str:
    await ensure_presenton_auth_configured()
    username, password = _auth()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            _endpoint("/api/v1/auth/login"),
            json={"username": username, "password": password},
            auth=(username, password),
        )
        response.raise_for_status()
        cookie = response.cookies.get(PRESENTON_SESSION_COOKIE_NAME)
        if not cookie:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Presenton no devolvio cookie de sesion.",
            )
        return cookie


async def _presenton_request(
    method: str,
    path: str,
    *,
    json: dict | None = None,
    timeout: int | None = None,
) -> httpx.Response:
    await ensure_presenton_auth_configured()
    async with httpx.AsyncClient(timeout=timeout or settings.PRESENTON_ASSET_TIMEOUT) as client:
        response = await client.request(method, _endpoint(path), json=json, auth=_auth())
        if response.status_code == 428:
            await ensure_presenton_auth_configured()
            response = await client.request(method, _endpoint(path), json=json, auth=_auth())
        response.raise_for_status()
        return response


def slides_to_markdown(slides: list[dict]) -> list[str]:
    markdown: list[str] = []
    for slide in slides:
        title = str(slide.get("title") or "Diapositiva").strip()
        bullets = slide.get("bullets") or []
        notes = str(slide.get("notes") or "").strip()
        image = str(slide.get("image") or "").strip()

        lines = [f"# {title}"]
        for bullet in bullets:
            text = str(bullet).strip()
            if text:
                lines.append(f"- {text}")
        if image:
            lines.append("")
            lines.append(f"Imagen sugerida: {image}")
        if notes:
            lines.append("")
            lines.append(f"Notas del docente: {notes}")
        markdown.append("\n".join(lines))
    return markdown


def build_generation_payload(
    *,
    title: str,
    topic: str,
    area: str | None,
    grade: str | None,
    instructions: str | None,
    slides: list[dict],
    export_as: ExportFormat,
) -> dict:
    context = [
        f"Titulo: {title}",
        f"Tema: {topic}",
        f"Area: {area or 'General'}",
        f"Grado: {grade or 'No especificado'}",
    ]
    if instructions:
        context.append(f"Instrucciones: {instructions}")

    return {
        "content": "\n".join(context),
        "slides_markdown": slides_to_markdown(slides),
        "xcal_title": title,
        "xcal_slides": slides,
        "instructions": (
            "Crea una presentacion educativa en espanol para clase. "
            "Usa lenguaje claro, visual y alineado al contexto escolar. "
            "Cuando el motor solicite datos estructurados, responde solo JSON valido."
        ),
        "n_slides": len(slides),
        "language": "Spanish",
        "template": _template_name(),
        "include_table_of_contents": False,
        "include_title_slide": True,
        "web_search": False,
        "export_as": export_as,
        "trigger_webhook": False,
    }


async def create_editor_presentation(payload: dict) -> dict:
    """Crea en Presenton una copia editable de slides ya generadas por XCalificator."""
    slides = payload.get("xcal_slides") or []
    if not isinstance(slides, list) or not slides:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No hay slides de XCalificator para crear el editor.",
        )

    title = str(payload.get("xcal_title") or "Presentacion").strip()
    template = _template_name(str(payload.get("template") or ""))
    markdown_slides = payload.get("slides_markdown") or slides_to_markdown(slides)

    created = await _presenton_request(
        "POST",
        "/api/v1/ppt/presentation/create",
        json={
            "content": payload.get("content") or title,
            "n_slides": len(slides),
            "language": payload.get("language") or "Spanish",
            "instructions": payload.get("instructions"),
            "include_table_of_contents": False,
            "include_title_slide": True,
            "web_search": False,
        },
        timeout=getattr(settings, "PRESENTON_ASSET_TIMEOUT", 120),
    )
    presentation_id = str(created.json().get("id"))

    layout = _build_ordered_layout(template, len(slides))
    await _presenton_request(
        "POST",
        "/api/v1/ppt/presentation/prepare",
        json={
            "presentation_id": presentation_id,
            "outlines": [{"content": str(slide)} for slide in markdown_slides],
            "layout": layout,
            "title": title,
        },
        timeout=getattr(settings, "PRESENTON_ASSET_TIMEOUT", 120),
    )

    direct_slides = _build_direct_slides(presentation_id, template, slides)
    await _presenton_request(
        "PATCH",
        "/api/v1/ppt/presentation/update",
        json={
            "id": presentation_id,
            "title": title,
            "n_slides": len(slides),
            "slides": direct_slides,
        },
        timeout=getattr(settings, "PRESENTON_ASSET_TIMEOUT", 120),
    )

    return {
        "id": presentation_id,
        "presentation_id": presentation_id,
        "edit_path": build_editor_redirect_url(presentation_id),
        "_slides_for_fallback": direct_slides,
    }


def _build_ordered_layout(template: str, count: int) -> dict:
    layout_id = _layout_id(template)
    return {
        "name": template,
        "ordered": True,
        "slides": [
            {
                "id": layout_id,
                "name": "XCalificator Modern Slide",
                "description": "Modern educational slide composed from XCalificator content.",
                "json_schema": _modern_image_schema(),
            }
            for _ in range(count)
        ],
    }


def _modern_image_schema() -> dict:
    return {
        "type": "object",
        "properties": {
            "title": {"type": "string", "minLength": 3, "maxLength": 30},
            "content": {"type": "string", "minLength": 25, "maxLength": 300},
            "image": {
                "type": "object",
                "properties": {
                    "__image_url__": {"type": "string"},
                    "__image_prompt__": {"type": "string"},
                },
            },
        },
        "required": ["title", "content"],
    }


def _build_direct_slides(presentation_id: str, template: str, slides: list[dict]) -> list[dict]:
    direct_slides: list[dict] = []
    layout_id = _layout_id(template)
    for index, slide in enumerate(slides):
        direct_slides.append(
            {
                "id": str(uuid4()),
                "presentation": presentation_id,
                "layout_group": template,
                "layout": layout_id,
                "index": index,
                "content": _modern_image_content(slide, index),
                "speaker_note": str(slide.get("notes") or ""),
                "properties": {},
            }
        )
    return direct_slides


async def ensure_presenton_presentation_ready(
    presenton_id: str,
    *,
    xcal_slides: list[dict] | None = None,
    title: str | None = None,
) -> dict:
    """Normaliza presentaciones creadas antes del fix de layout/imagenes."""
    response = await _presenton_request(
        "GET",
        f"/api/v1/ppt/presentation/{presenton_id}",
        timeout=getattr(settings, "PRESENTON_ASSET_TIMEOUT", 120),
    )
    data = response.json()
    slides, changed = _normalize_presenton_slides(data)
    if xcal_slides and _needs_xcal_repair(slides):
        slides = _build_direct_slides(presenton_id, _template_name(), xcal_slides)
        changed = True
    if changed:
        await _presenton_request(
            "PATCH",
            "/api/v1/ppt/presentation/update",
            json={
                "id": presenton_id,
                "title": title or data.get("title"),
                "n_slides": len(slides),
                "slides": slides,
            },
            timeout=getattr(settings, "PRESENTON_ASSET_TIMEOUT", 120),
        )
        data["slides"] = slides
    return data


def _layout_id(template: str, layout: str = DEFAULT_LAYOUT) -> str:
    template_clean = _template_name(template)
    layout_clean = (layout or DEFAULT_LAYOUT).strip() or DEFAULT_LAYOUT
    if ":" in layout_clean:
        return layout_clean
    return f"{template_clean}:{layout_clean}"


def _modern_image_content(slide: dict, index: int) -> dict:
    bullets = slide.get("bullets") or []
    content = _compact_content(bullets, fallback=str(slide.get("notes") or ""))
    title = _compact_text(str(slide.get("title") or f"Diapositiva {index + 1}"), 30)
    image_prompt = str(slide.get("image") or f"Imagen educativa sobre {title}")
    # Prioriza la imagen IA pre-generada; recupera asset IA del disco; si no, PIL.
    image_url = _presenton_image_src(title, image_prompt, prebuilt=str(slide.get("image_asset") or "").strip())
    return {
        "title": title,
        "content": content,
        "image": {
            "__image_url__": image_url,
            "__image_prompt__": image_prompt,
        },
    }


def _normalize_presenton_slides(data: dict) -> tuple[list[dict], bool]:
    slides = data.get("slides") if isinstance(data, dict) else []
    if not isinstance(slides, list):
        return [], False

    changed = False
    normalized: list[dict] = []
    for index, slide in enumerate(sorted(slides, key=lambda item: int(item.get("index") or 0))):
        if not isinstance(slide, dict):
            continue
        fixed = {**slide}
        layout_group = str(fixed.get("layout_group") or "")
        layout = str(fixed.get("layout") or DEFAULT_LAYOUT)
        layout_name = layout.split(":")[-1] if layout else ""
        legacy_layout = not layout_group or layout_group == "general" or layout_name == "basic-info-slide"
        if legacy_layout:
            fixed["layout_group"] = _template_name()
            fixed["layout"] = _layout_id(fixed["layout_group"])
            changed = True
            layout_name = DEFAULT_LAYOUT
        else:
            fixed_layout = _layout_id(layout_group, layout)
            if fixed_layout != layout:
                fixed["layout"] = fixed_layout
                changed = True
        if fixed.get("index") != index:
            fixed["index"] = index
            changed = True

        if layout_name == DEFAULT_LAYOUT:
            content = fixed.get("content") if isinstance(fixed.get("content"), dict) else {}
            fixed_content, content_changed = _normalize_modern_image_content(content, index)
            if content_changed:
                changed = True
            fixed["content"] = fixed_content
        fixed["properties"] = fixed.get("properties") or {}
        normalized.append(fixed)
    return normalized, changed


def _needs_xcal_repair(slides: list[dict]) -> bool:
    for slide in slides:
        layout_name = str(slide.get("layout") or "").split(":")[-1]
        if layout_name in {"", "basic-info-slide"}:
            return True
        if layout_name != DEFAULT_LAYOUT:
            continue
        content = slide.get("content") if isinstance(slide.get("content"), dict) else {}
        text = " ".join(str(content.get("content") or "").split()).strip()
        if not text or text == "Contenido educativo generado por XCalificator.":
            return True
        image = content.get("image") if isinstance(content.get("image"), dict) else {}
        image_url = str(image.get("__image_url__") or "")
        if image_url.startswith("/app_data/"):
            return True
    return False


def _normalize_modern_image_content(content: dict, index: int) -> tuple[dict, bool]:
    changed = False
    fixed = {**content}
    title = _compact_text(str(fixed.get("title") or f"Diapositiva {index + 1}"), 30)
    if fixed.get("title") != title:
        fixed["title"] = title
        changed = True
    content_text = _minimum_content(
        _compact_text(
            str(fixed.get("content") or fixed.get("description") or "Contenido educativo generado por XCalificator."),
            260,
        )
    )
    if fixed.get("content") != content_text:
        fixed["content"] = content_text
        changed = True
    if "description" in fixed:
        fixed.pop("description", None)
        changed = True

    image = fixed.get("image") if isinstance(fixed.get("image"), dict) else {}
    image_fixed = {**image}
    image_prompt = str(image_fixed.get("__image_prompt__") or f"Imagen educativa sobre {title}")
    image_url = str(image_fixed.get("__image_url__") or "").strip()
    if image_url.startswith("/app_data/"):
        data_uri = _data_uri_from_app_data_url(image_url)
        if data_uri:
            image_url = data_uri
            image_fixed["__image_url__"] = image_url
            changed = True
    if not image_url:
        # Recupera la imagen IA del disco (por clave title+prompt); si no, PIL.
        image_fixed["__image_url__"] = _presenton_image_src(title, image_prompt)
        changed = True
    if image_fixed.get("__image_prompt__") != image_prompt:
        image_fixed["__image_prompt__"] = image_prompt
        changed = True
    fixed["image"] = image_fixed
    return fixed, changed


def _compact_content(bullets: object, *, fallback: str = "") -> str:
    if isinstance(bullets, list):
        parts = [_compact_text(str(item), 72) for item in bullets if str(item).strip()]
    else:
        parts = []
    text = " • ".join(parts[:3]) or fallback or "Contenido educativo generado por XCalificator."
    return _minimum_content(_compact_text(text, 260))


def _with_period(value: str) -> str:
    text = value.strip()
    if not text:
        return text
    return text if text[-1] in ".!?" else f"{text}."


def _minimum_content(value: str) -> str:
    text = " ".join(str(value).split()).strip()
    if len(text) >= 25:
        return text
    if text:
        return f"{text}. Idea clave para la clase."
    return "Contenido educativo generado por XCalificator."


def _compact_text(value: str, max_chars: int) -> str:
    cleaned = " ".join(str(value).replace("\n", " ").split())
    if len(cleaned) <= max_chars:
        return cleaned
    return cleaned[: max(0, max_chars - 1)].rstrip(" .,;:") + "…"


def _ensure_presenton_image_asset(title: str, hint: str) -> str:
    key = hashlib.sha1(f"{title}|{hint}".encode("utf-8")).hexdigest()[:18]
    host_path = _generated_slide_asset_path(f"{key}.png")
    if host_path.is_file():
        return _generated_slide_asset_url(host_path.name)
    try:
        _render_presenton_image(host_path, title, hint)
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


def _ai_slide_asset(title: str, prompt: str) -> tuple[Path, str]:
    """Ruta determinista (host_path, url pública) del asset de una slide.

    Usa la MISMA clave que `_ensure_presenton_image_asset` (PIL), a propósito:
    así la imagen IA ocupa el mismo archivo que buscaría el placeholder, y
    cualquier ruta de resolución (incluido el re-normalizado del export, que
    pierde nuestro __image_url__) encuentra la imagen IA antes de dibujar PIL."""
    key = hashlib.sha1(f"{title}|{prompt}".encode("utf-8")).hexdigest()[:18]
    return _generated_slide_asset_path(f"{key}.png"), _generated_slide_asset_url(f"{key}.png")


def _resolve_slide_image_url(title: str, prompt: str, *, prebuilt: str = "") -> str:
    """URL de imagen de la slide: 1) la pre-generada (image_asset), 2) un asset IA
    ya existente en disco (recuperado por clave), 3) placeholder PIL."""
    if prebuilt:
        return prebuilt
    host_path, public = _ai_slide_asset(title, prompt)
    if host_path.is_file():
        return public
    return _ensure_presenton_image_asset(title, prompt)


def _presenton_image_src(title: str, prompt: str, *, prebuilt: str = "") -> str:
    image_url = _resolve_slide_image_url(title, prompt, prebuilt=prebuilt)
    return _data_uri_from_app_data_url(image_url) or image_url


def _data_uri_from_app_data_url(image_url: str) -> str:
    asset_prefix = "/api/presentaciones/assets/"
    if image_url.startswith(asset_prefix):
        asset_id = image_url.removeprefix(asset_prefix)
        if not re.fullmatch(r"[0-9a-f]{18}", asset_id):
            return ""
        path = _generated_slide_asset_path(f"{asset_id}.png")
    elif image_url.startswith("/app_data/"):
        relative = image_url.removeprefix("/app_data/").lstrip("/")
        path = Path(settings.UPLOADS_DIR) / "presenton" / relative
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


def _write_asset_meta(path: Path, *, provider: str, title: str, prompt: str) -> None:
    meta = {
        "provider": provider,
        "title": title,
        "prompt": prompt,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        _asset_meta_path(path).write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:  # noqa: BLE001
        logger.warning("Could not write image provider metadata for %s", path.name)


async def generate_ai_slide_image_detailed(title: str, prompt: str, *, provider) -> dict:
    """Como `generate_ai_slide_image`, pero devuelve detalles para la biblioteca
    de imágenes: {url, path, provider, reused, placeholder, error}."""
    import io

    from app.services.image_router import generate_image

    host_path, public = _ai_slide_asset(title, prompt)
    expected_provider = str(getattr(provider, "value", provider) or "")
    existing_provider = _read_asset_provider(host_path)
    if host_path.is_file() and (existing_provider == expected_provider or (not existing_provider and expected_provider != "openai")):
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
        result = await generate_image(prompt, size="1536x1024", provider=provider, strict_provider=True)
        if result.b64_data and not result.is_placeholder:
            from PIL import Image

            raw = base64.b64decode(result.b64_data)
            host_path.parent.mkdir(parents=True, exist_ok=True)
            Image.open(io.BytesIO(raw)).convert("RGB").save(host_path, "PNG")
            _write_asset_meta(host_path, provider=result.provider, title=title, prompt=prompt)
            logger.info("Slide image generated via %s for %r", result.provider, title[:40])
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
        logger.warning("AI slide image failed (%s) for %r; using placeholder", exc, title[:40])

    try:
        _render_presenton_image(host_path, title, prompt)
        _write_asset_meta(host_path, provider="placeholder", title=title, prompt=prompt)
    except Exception:  # noqa: BLE001
        return {"url": "", "path": None, "provider": "placeholder", "reused": False, "placeholder": True, "error": error_text}
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
    slide y la guarda en el volumen de Presenton. Devuelve la ruta /app_data/...
    Si la IA falla, cae al placeholder PIL. Nunca rompe la generación."""
    detail = await generate_ai_slide_image_detailed(title, prompt, provider=provider)
    return str(detail.get("url") or "")


def _render_presenton_image(path: Path, title: str, hint: str) -> None:
    from PIL import Image, ImageDraw

    path.parent.mkdir(parents=True, exist_ok=True)
    width, height = 960, 540
    image = Image.new("RGB", (width, height), "#e0f2fe")
    draw = ImageDraw.Draw(image)
    title_font = _presenton_font(46, bold=True)
    body_font = _presenton_font(28)
    draw.rectangle((0, 0, width, height), fill="#e0f2fe")
    draw.rounded_rectangle((60, 60, width - 60, height - 60), radius=40, fill="#ffffff", outline="#0284c7", width=6)
    draw.ellipse((665, 115, 845, 295), fill="#0f766e")
    initials = "".join(part[:1] for part in title.split()[:2]).upper() or "XC"
    draw.text((755, 205), initials[:2], font=_presenton_font(72, bold=True), fill="white", anchor="mm")
    y = 105
    for line in _wrap_for_image(title, 29)[:3]:
        draw.text((105, y), line, font=title_font, fill="#0f172a")
        y += 56
    y = max(y + 20, 300)
    for line in _wrap_for_image(hint or "Imagen educativa", 52)[:4]:
        draw.text((105, y), line, font=body_font, fill="#334155")
        y += 36
    image.save(path, "PNG")


def _presenton_font(size: int, *, bold: bool = False):
    from PIL import ImageFont

    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
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


async def save_export_file(content: bytes, presentation_id: UUID, export_as: ExportFormat) -> str:
    dest_dir = Path(settings.UPLOADS_DIR) / "presentaciones"
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{presentation_id}.{export_as}"
    await asyncio.to_thread(dest.write_bytes, content)
    return f"/api/presentaciones/{presentation_id}/archivo/{export_as}"


def get_export_file_path(presentation_id: UUID, export_as: ExportFormat) -> Path:
    return Path(settings.UPLOADS_DIR) / "presentaciones" / f"{presentation_id}.{export_as}"


def create_editor_token(presentation_id: UUID, user_id: UUID, presenton_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "type": "presenton_editor",
        "sub": str(user_id),
        "pid": str(presentation_id),
        "presenton_id": presenton_id,
        "iat": now,
        "exp": now + timedelta(seconds=settings.PRESENTON_EDITOR_TOKEN_EXPIRE_SECONDS),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_editor_token(token: str, presentation_id: UUID, user_id: UUID, presenton_id: str) -> None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de editor invalido.") from exc

    if (
        payload.get("type") != "presenton_editor"
        or payload.get("sub") != str(user_id)
        or payload.get("pid") != str(presentation_id)
        or payload.get("presenton_id") != presenton_id
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de editor invalido.")


def build_editor_redirect_url(presenton_id: str) -> str:
    base = (settings.PRESENTON_PUBLIC_EDITOR_URL or "/presenton").rstrip("/")
    return f"{base}/presentation?id={presenton_id}"
