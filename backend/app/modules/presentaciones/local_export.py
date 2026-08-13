"""Fallback local para exportar presentaciones cuando Presenton devuelve archivos vacios.

Genera una version visual simple: cada diapositiva se renderiza como PNG y se
inserta en PPTX/PDF. Evita depender de librerias externas de PowerPoint.
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
import re
from textwrap import wrap
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

EMU_WIDE = 12192000
EMU_HIGH = 6858000
SLIDE_W = 1600
SLIDE_H = 900


def build_local_export(title: str, slides: list[dict[str, Any]], export_as: str) -> bytes:
    total = len(slides)
    rendered = [_render_slide(title, slide, index, total) for index, slide in enumerate(slides)]
    if export_as == "pdf":
        return _build_pdf(rendered)
    return _build_pptx(title, rendered)


def extract_slides_for_export(slides_json: dict[str, Any] | None) -> list[dict[str, Any]]:
    raw_slides = (slides_json or {}).get("slides")
    if isinstance(raw_slides, list) and raw_slides:
        return [_normalize_xcal_slide(slide, index) for index, slide in enumerate(raw_slides)]
    return []


def presenton_slides_to_export(slides: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for index, slide in enumerate(sorted(slides, key=lambda item: int(item.get("index") or 0))):
        content = slide.get("content") if isinstance(slide.get("content"), dict) else {}
        description = str(content.get("content") or content.get("description") or "").strip()
        bullets = [
            line.strip().lstrip("- ").strip()
            for line in _split_description(description)
            if line.strip()
        ]
        image = content.get("image") if isinstance(content.get("image"), dict) else {}
        normalized.append(
            {
                "title": str(content.get("title") or f"Diapositiva {index + 1}"),
                "bullets": bullets,
                "image": str(image.get("__image_prompt__") or image.get("__image_url__") or ""),
                "image_asset": str(image.get("__image_url__") or ""),
                "notes": str(slide.get("speaker_note") or ""),
            }
        )
    return normalized


def _split_description(description: str) -> list[str]:
    text = " ".join(str(description).split())
    if not text:
        return []
    return [part.strip() for part in re.split(r"\s+[\u2022-]\s+|(?<=[.!?])\s+", text) if part.strip()]


def pptx_has_slides_and_media(content: bytes) -> bool:
    try:
        with ZipFile(BytesIO(content)) as pptx:
            slides = [
                name
                for name in pptx.namelist()
                if name.startswith("ppt/slides/slide") and name.endswith(".xml")
            ]
            media = [name for name in pptx.namelist() if name.startswith("ppt/media/")]
            return bool(slides) and bool(media)
    except Exception:
        return False


def pdf_has_minimal_content(content: bytes) -> bool:
    return content.startswith(b"%PDF") and b"%%EOF" in content[-2048:] and len(content) > 4096


def _normalize_xcal_slide(slide: Any, index: int) -> dict[str, Any]:
    if not isinstance(slide, dict):
        return {
            "title": f"Diapositiva {index + 1}",
            "bullets": [str(slide)],
            "image": "",
            "notes": "",
        }
    bullets = slide.get("bullets")
    if not isinstance(bullets, list):
        bullets = []
    normalized = {
        "title": str(slide.get("title") or f"Diapositiva {index + 1}"),
        "bullets": [str(item) for item in bullets if str(item).strip()],
        "image": str(slide.get("image") or ""),
        "image_asset": str(slide.get("image_asset") or ""),
        "notes": str(slide.get("notes") or ""),
        "role": str(slide.get("role") or ""),
        "layout": str(slide.get("layout") or slide.get("layout_hint") or ""),
    }
    if str(slide.get("slide_type") or slide.get("layout") or "").lower() == "full_image":
        normalized["slide_type"] = "full_image"
    return normalized


def _build_pdf(rendered: list[bytes]) -> bytes:
    images = [Image.open(BytesIO(data)).convert("RGB") for data in rendered]
    output = BytesIO()
    first, rest = images[0], images[1:]
    first.save(output, format="PDF", save_all=True, append_images=rest, resolution=144)
    return output.getvalue()


def _build_pptx(title: str, rendered: list[bytes]) -> bytes:
    output = BytesIO()
    timestamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    with ZipFile(output, "w", ZIP_DEFLATED) as pptx:
        _write_common_parts(pptx, title, len(rendered), timestamp)
        for index, image in enumerate(rendered, start=1):
            pptx.writestr(f"ppt/media/slide{index}.png", image)
            pptx.writestr(f"ppt/slides/slide{index}.xml", _slide_xml())
            pptx.writestr(f"ppt/slides/_rels/slide{index}.xml.rels", _slide_rels(index))
    return output.getvalue()


# Temas cohesivos por presentación (bg, ink=titulo, body=viñetas, muted, accent, soft=panel).
_THEMES = [
    ("#ffffff", "#0f172a", "#334155", "#64748b", "#4f46e5", "#eef2ff"),  # indigo
    ("#ffffff", "#0e1a17", "#31473f", "#5b7a70", "#0d9488", "#e7fbf4"),  # teal
    ("#0b1220", "#f1f5f9", "#cbd5e1", "#94a3b8", "#a5b4fc", "#18233b"),  # midnight
    ("#fffdf8", "#231610", "#4a3a30", "#7c6a5c", "#c2410c", "#fff2e3"),  # warm
    ("#ffffff", "#1a1024", "#3d2f4a", "#6b5b78", "#7c3aed", "#f3ecff"),  # violet
]


def _deck_theme(title: str) -> tuple[str, str, str, str, str, str]:
    h = int(hashlib.sha1((title or "x").encode("utf-8")).hexdigest(), 16)
    return _THEMES[h % len(_THEMES)]


def _clip(text: str, n: int) -> str:
    t = " ".join(str(text).split())
    return t if len(t) <= n else t[: n - 1].rstrip() + "…"


def _kicker(draw: ImageDraw.ImageDraw, x: int, y: int, label: str, theme) -> None:
    accent = theme[4]
    f = _font(24, bold=True)
    tw = _text_width(draw, label, f)
    draw.rounded_rectangle((x, y, x + tw + 40, y + 46), radius=23, fill=accent)
    draw.text((x + 20, y + 9), label, font=f, fill="#ffffff")


def _page(draw: ImageDraw.ImageDraw, x: int, y: int, index: int, total: int, theme) -> None:
    draw.text((x, y), f"{index + 1:02d} / {max(total, index + 1):02d}", font=_font(20, bold=True), fill=theme[3])


def _render_slide(deck_title: str, slide: dict[str, Any], index: int, total: int = 1) -> bytes:
    role = str(slide.get("role") or "").lower()
    theme = _role_theme(role, _deck_theme(deck_title))
    canvas = Image.new("RGB", (SLIDE_W, SLIDE_H), theme[0])
    draw = ImageDraw.Draw(canvas)

    title = str(slide.get("title") or f"Diapositiva {index + 1}")
    bullets = [str(b).strip() for b in (slide.get("bullets") or []) if str(b).strip()]
    if not bullets:
        note = str(slide.get("notes") or "").strip()
        if note:
            bullets = [note]
    photo = _resolve_photo(title, str(slide.get("image") or ""), str(slide.get("image_asset") or ""))

    if str(slide.get("slide_type") or "").lower() == "full_image" and photo is not None:
        _layout_full_image(canvas, photo)
    elif str(slide.get("layout") or "").lower() == "math-arrays":
        _layout_math_arrays(canvas, draw, title, bullets, theme, index=index, total=total)
    elif index == 0:
        _layout_cover(canvas, draw, deck_title, title, bullets, photo, theme)
    elif photo is not None:
        _layout_split(canvas, draw, title, bullets, photo, theme,
                      index=index, total=total, image_left=((index // 2) % 2 == 1))
    else:
        _layout_text(canvas, draw, title, bullets, theme, index=index, total=total)

    output = BytesIO()
    canvas.save(output, format="PNG")
    return output.getvalue()


def _layout_cover(canvas, draw, deck_title, title, bullets, photo, theme) -> None:
    bg, ink, body, muted, accent, soft = theme
    headline = " ".join(str(deck_title or title or "Presentacion educativa").split()).strip()
    kicker = "PRESENTACION EDUCATIVA"
    split = int(SLIDE_W * 0.50)
    if photo is not None:
        _paste_cover(canvas, (split, 0, SLIDE_W, SLIDE_H), photo)
    else:
        draw.rectangle((split, 0, SLIDE_W, SLIDE_H), fill=soft)
        _draw_glyph(canvas, draw, (split, 0, SLIDE_W, SLIDE_H), headline, theme)
    draw.rectangle((split - 8, 0, split, SLIDE_H), fill=accent)

    pad = 104
    tw = split - pad - 72
    draw.text((pad, 148), _clip(kicker, 40), font=_font(26, bold=True), fill=accent)
    tfont, tlines = _fit_lines(draw, headline, max_width=tw, max_lines=4, sizes=[92, 80, 70, 60, 52], bold=True)
    y = 212
    for line in tlines:
        draw.text((pad, y), line, font=tfont, fill=ink)
        y += _line_height(tfont) + 12
    y += 10
    draw.rounded_rectangle((pad, y, pad + 132, y + 11), radius=5, fill=accent)
    y += 48
    if bullets:
        sfont, slines = _fit_lines(draw, bullets[0], max_width=tw, max_lines=3, sizes=[34, 30, 28])
        for line in slines:
            draw.text((pad, y), line, font=sfont, fill=muted)
            y += _line_height(sfont) + 8
    draw.text((pad, SLIDE_H - 92), "XCalificator", font=_font(23, bold=True), fill=accent)
    draw.text((pad, SLIDE_H - 60), "Plataforma Educativa IA", font=_font(20), fill=muted)


def _layout_split(canvas, draw, title, bullets, photo, theme, *, index, total, image_left) -> None:
    bg, ink, body, muted, accent, soft = theme
    img_w = int(SLIDE_W * 0.42)
    if image_left:
        img_box = (0, 0, img_w, SLIDE_H)
        seam = (img_w, 0, img_w + 8, SLIDE_H)
        tx0, tx1 = img_w + 100, SLIDE_W - 96
    else:
        img_box = (SLIDE_W - img_w, 0, SLIDE_W, SLIDE_H)
        seam = (SLIDE_W - img_w - 8, 0, SLIDE_W - img_w, SLIDE_H)
        tx0, tx1 = 100, SLIDE_W - img_w - 96
    _paste_cover(canvas, img_box, photo)
    draw.rectangle(seam, fill=accent)

    tw = tx1 - tx0
    _kicker(draw, tx0, 100, f"{index + 1:02d}", theme)
    y = 176
    tfont, tlines = _fit_lines(draw, title, max_width=tw, max_lines=3, sizes=[62, 54, 48, 42], bold=True)
    for line in tlines:
        draw.text((tx0, y), line, font=tfont, fill=ink)
        y += _line_height(tfont) + 10
    y += 8
    draw.rounded_rectangle((tx0, y, tx0 + 108, y + 11), radius=5, fill=accent)
    y += 46
    bfont, items = _fit_bullet_lines(draw, bullets, max_width=tw - 54, max_lines=10)
    for marker, line in items:
        lh = _line_height(bfont)
        if marker:
            cy = y + lh // 2
            draw.ellipse((tx0, cy - 8, tx0 + 16, cy + 8), fill=accent)
        draw.text((tx0 + 42, y), line, font=bfont, fill=body)
        y += lh + 14
    _page(draw, tx0, SLIDE_H - 64, index, total, theme)


def _role_theme(role: str, fallback):
    palettes = {
        "objective": ("#eff6ff", "#172554", "#1e3a8a", "#3b82f6", "#2563eb", "#dbeafe"),
        "objetivo": ("#eff6ff", "#172554", "#1e3a8a", "#3b82f6", "#2563eb", "#dbeafe"),
        "prior_knowledge": ("#fff7ed", "#431407", "#7c2d12", "#f97316", "#ea580c", "#ffedd5"),
        "saberes_previos": ("#fff7ed", "#431407", "#7c2d12", "#f97316", "#ea580c", "#ffedd5"),
        "activity": ("#ecfdf5", "#022c22", "#065f46", "#10b981", "#059669", "#d1fae5"),
        "actividad": ("#ecfdf5", "#022c22", "#065f46", "#10b981", "#059669", "#d1fae5"),
        "comprehension_check": ("#f5f3ff", "#2e1065", "#4c1d95", "#8b5cf6", "#7c3aed", "#ede9fe"),
        "assessment": ("#f5f3ff", "#2e1065", "#4c1d95", "#8b5cf6", "#7c3aed", "#ede9fe"),
        "pregunta": ("#f5f3ff", "#2e1065", "#4c1d95", "#8b5cf6", "#7c3aed", "#ede9fe"),
    }
    safe_light = ("#eef2ff", "#1e1b4b", "#312e81", "#6366f1", "#4f46e5", "#e0e7ff")
    return palettes.get(role, safe_light)


def _layout_math_arrays(canvas, draw, title, bullets, theme, *, index, total) -> None:
    ink = "#1e1b4b"
    body = "#312e81"
    muted = "#64748b"
    accent = "#4f46e5"
    soft = "#e0e7ff"
    readable_theme = ("#eef2ff", ink, body, muted, accent, soft)
    dot = chr(0x25CF)
    groups = []
    equation = ""
    rows = []
    for bullet in bullets:
        for raw_line in str(bullet).splitlines():
            line = raw_line.strip()
            if not line:
                continue
            if "=" in line and not line.startswith(dot):
                if equation:
                    groups.append((equation, rows))
                equation, rows = line, []
            elif dot in line:
                rows.append(line)
    if equation:
        groups.append((equation, rows))

    draw.rectangle((0, 0, SLIDE_W, SLIDE_H), fill="#eef2ff")
    draw.rectangle((0, 0, 22, SLIDE_H), fill="#4f46e5")
    _kicker(draw, 100, 82, "MATEMATICAS EXACTAS", readable_theme)
    tfont, tlines = _fit_lines(draw, title, max_width=1360, max_lines=1, sizes=[60, 54, 48], bold=True)
    draw.text((100, 155), tlines[0], font=tfont, fill=ink)
    for group_index, (label, count_rows) in enumerate(groups[:2]):
        x0 = 92 + group_index * 760
        draw.rounded_rectangle((x0, 260, x0 + 670, 760), radius=42, fill="#ffffff", outline="#c7d2fe", width=4)
        draw.text((x0 + 50, 310), label, font=_font(34, bold=True), fill="#4f46e5")
        y = 405
        for row in count_rows:
            draw.text((x0 + 335, y), row, font=_font(38, bold=True), fill=ink, anchor="ma")
            y += 82
    _page(draw, 100, SLIDE_H - 64, index, total, readable_theme)


def _layout_text(canvas, draw, title, bullets, theme, *, index, total) -> None:
    bg, ink, body, muted, accent, soft = theme
    draw.rectangle((0, 0, 500, SLIDE_H), fill=accent)
    draw.text((82, 74), f"{index + 1:02d}", font=_font(46, bold=True), fill="#ffffff")
    draw.text((84, 151), "APRENDEMOS JUNTOS", font=_font(22, bold=True), fill="#ffffff")

    title_font, title_lines = _fit_lines(
        draw, title, max_width=340, max_lines=5,
        sizes=[54, 48, 42, 36], bold=True,
    )
    y = 228
    for line in title_lines:
        draw.text((84, y), line, font=title_font, fill="#ffffff")
        y += _line_height(title_font) + 10

    visible = bullets[:4] or ["Descubre la idea principal y explicala con tus palabras."]
    x0, x1 = 575, 1508
    gap = 24
    tile_h = min(154, (690 - gap * (len(visible) - 1)) // max(1, len(visible)))
    y = 86
    for bullet_index, bullet in enumerate(visible):
        draw.rounded_rectangle(
            (x0, y, x1, y + tile_h), radius=30,
            fill="#ffffff", outline=soft, width=4,
        )
        cy = y + tile_h // 2
        draw.ellipse((x0 + 28, cy - 30, x0 + 88, cy + 30), fill=accent)
        draw.text(
            (x0 + 58, cy), str(bullet_index + 1),
            font=_font(24, bold=True), fill="#ffffff", anchor="mm",
        )
        bfont, lines = _fit_lines(
            draw, str(bullet), max_width=x1 - x0 - 155,
            # Cuatro lineas a 20 pt caben dentro de la tarjeta de 154 px.
            # Conservamos la explicacion completa en vez de recortarla.
            max_lines=5, sizes=[32, 29, 26, 24, 22, 20, 18],
        )
        text_y = cy - (len(lines) * (_line_height(bfont) + 5)) // 2
        for line in lines:
            draw.text((x0 + 120, text_y), line, font=bfont, fill=ink)
            text_y += _line_height(bfont) + 5
        y += tile_h + gap
    _page(draw, 84, SLIDE_H - 64, index, total, theme)



def _draw_glyph(canvas, draw, box, title, theme) -> None:
    bg, ink, body, muted, accent, soft = theme
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    for i, r in enumerate((300, 210, 132)):
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(accent if i == 2 else soft))
    initials = "".join(w[:1] for w in title.split()[:2]).upper() or "XC"
    draw.text((cx, cy), initials[:2], font=_font(130, bold=True), fill="#ffffff", anchor="mm")


def _slide_image_path(title: str, hint: str) -> Path:
    """Misma clave que presenton_service._ai_slide_asset / _ensure_presenton_image_asset."""
    import hashlib

    from app.core.config import settings

    key = hashlib.sha1(f"{title}|{hint}".encode("utf-8")).hexdigest()[:18]
    return Path(settings.UPLOADS_DIR) / "presentaciones" / f"slide-{key}.png"


def _resolve_photo(title: str, hint: str, asset: str) -> Image.Image | None:
    """Devuelve la imagen IA real (foto, no placeholder PIL) o None."""
    path = _slide_image_path_from_asset(asset) or _slide_image_path(title, hint)
    try:
        if path and path.is_file() and path.stat().st_size >= 60_000:
            return Image.open(path).convert("RGB")
    except Exception:
        pass
    return None


def _layout_full_image(canvas: Image.Image, photo: Image.Image) -> None:
    """Slide full_image: la imagen (infografía) ocupa toda la página sin
    deformarse — fondo blur a sangre + imagen completa contenida encima."""
    _paste_cover(canvas, (0, 0, canvas.width, canvas.height), photo)


def _paste_cover(canvas: Image.Image, box: tuple[int, int, int, int], photo: Image.Image, *, radius: int = 0) -> None:
    """Pega la foto sin perder informacion importante.

    Usa un fondo blur a sangre y la imagen completa encima. Mantiene el acabado
    tipo Gamma sin cortar sujetos ni composiciones educativas.
    """
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    filled = ImageOps.fit(photo, (bw, bh), method=Image.LANCZOS, centering=(0.5, 0.42)).filter(ImageFilter.GaussianBlur(18))
    overlay = Image.new("RGB", (bw, bh), "#0f172a")
    filled = Image.blend(filled, overlay, 0.16)
    contained = ImageOps.contain(photo, (max(1, bw - 64), max(1, bh - 64)), method=Image.LANCZOS)
    px = (bw - contained.width) // 2
    py = (bh - contained.height) // 2
    filled.paste(contained, (px, py))
    if radius > 0:
        mask = Image.new("L", (bw, bh), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, bw - 1, bh - 1), radius=radius, fill=255)
        canvas.paste(filled, (x0, y0), mask)
    else:
        canvas.paste(filled, (x0, y0))


def _slide_image_path_from_asset(asset: str) -> Path | None:
    from app.core.config import settings

    asset_prefix = "/api/presentaciones/assets/"
    if asset.startswith(asset_prefix):
        asset_id = asset.removeprefix(asset_prefix)
        if not re.fullmatch(r"[0-9a-f]{18}", asset_id):
            return None
        return Path(settings.UPLOADS_DIR) / "presentaciones" / f"slide-{asset_id}.png"
    if asset.startswith("/app_data/"):
        relative = asset.removeprefix("/app_data/").lstrip("/")
        return Path(settings.UPLOADS_DIR) / "presenton" / relative
    return None




def _wrap_text(text: str, width: int) -> list[str]:
    wrapped: list[str] = []
    for part in str(text).splitlines() or [""]:
        wrapped.extend(wrap(part, width=width) or [""])
    return wrapped


def _fit_lines(
    draw: ImageDraw.ImageDraw,
    text: str,
    *,
    max_width: int,
    max_lines: int,
    sizes: list[int],
    bold: bool = False,
):
    last_font = _font(sizes[-1], bold=bold)
    last_lines = _wrap_pixels(draw, text, last_font, max_width)
    for size in sizes:
        font = _font(size, bold=bold)
        lines = _wrap_pixels(draw, text, font, max_width)
        if len(lines) <= max_lines and _wrap_kept_words(text, lines):
            return font, lines
        last_font, last_lines = font, lines
    return last_font, _limit_lines(draw, last_lines, last_font, max_width, max_lines)


def _wrap_kept_words(original: str, lines: list[str]) -> bool:
    source_words = [word.strip(".,;:!?").lower() for word in str(original).split() if word.strip()]
    rendered = " ".join(lines).replace("...", " ").lower()
    return all(word in rendered for word in source_words if len(word) > 2)


def _fit_bullet_lines(
    draw: ImageDraw.ImageDraw,
    bullets: list[Any],
    *,
    max_width: int,
    max_lines: int,
):
    last_font = _font(24)
    last_items: list[tuple[bool, str]] = []
    for size in [34, 31, 28, 26, 24]:
        font = _font(size)
        items: list[tuple[bool, str]] = []
        for bullet in bullets[:5]:
            lines = _wrap_pixels(draw, str(bullet), font, max_width)
            for line_index, line in enumerate(lines):
                items.append((line_index == 0, line))
        if len(items) <= max_lines:
            return font, items
        last_font, last_items = font, items
    limited = last_items[:max_lines]
    if len(last_items) > max_lines and limited:
        marker, line = limited[-1]
        limited[-1] = (marker, _truncate_to_width(draw, line, last_font, max_width))
    return last_font, limited


def _wrap_pixels(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in str(text).splitlines() or [""]:
        current = ""
        for word in paragraph.split():
            candidate = f"{current} {word}".strip()
            if _text_width(draw, candidate, font) <= max_width:
                current = candidate
                continue
            if current:
                lines.append(current)
                current = word
            if _text_width(draw, current, font) > max_width:
                lines.append(_truncate_to_width(draw, current, font, max_width))
                current = ""
        if current:
            lines.append(current)
    return lines or [""]


def _limit_lines(draw: ImageDraw.ImageDraw, lines: list[str], font, max_width: int, max_lines: int) -> list[str]:
    limited = lines[:max_lines]
    if len(lines) > max_lines and limited:
        limited[-1] = _truncate_to_width(draw, limited[-1], font, max_width)
    return limited


def _truncate_to_width(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> str:
    suffix = "..."
    value = str(text).strip()
    while value and _text_width(draw, value + suffix, font) > max_width:
        value = value[:-1].rstrip()
    return (value + suffix) if value else suffix


def _text_width(draw: ImageDraw.ImageDraw, text: str, font) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def _line_height(font) -> int:
    bbox = font.getbbox("Ag") if hasattr(font, "getbbox") else (0, 0, 0, 24)
    return max(18, bbox[3] - bbox[1])


def _font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).is_file():
            return ImageFont.truetype(candidate, size=size)
    return ImageFont.load_default()


def _write_common_parts(pptx: ZipFile, title: str, slide_count: int, timestamp: str) -> None:
    pptx.writestr("[Content_Types].xml", _content_types(slide_count))
    pptx.writestr("_rels/.rels", _root_rels())
    pptx.writestr("docProps/core.xml", _core_props(title, timestamp))
    pptx.writestr("docProps/app.xml", _app_props(slide_count))
    pptx.writestr("ppt/presentation.xml", _presentation_xml(slide_count))
    pptx.writestr("ppt/_rels/presentation.xml.rels", _presentation_rels(slide_count))
    pptx.writestr("ppt/slideMasters/slideMaster1.xml", _slide_master_xml())
    pptx.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", _slide_master_rels())
    pptx.writestr("ppt/slideLayouts/slideLayout1.xml", _slide_layout_xml())
    pptx.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", _slide_layout_rels())
    pptx.writestr("ppt/theme/theme1.xml", _theme_xml())


def _content_types(slide_count: int) -> str:
    slide_overrides = "".join(
        f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for i in range(1, slide_count + 1)
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
{slide_overrides}
</Types>'''


def _root_rels() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''


def _core_props(title: str, timestamp: str) -> str:
    escaped = _xml_escape(title)
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>{escaped}</dc:title><dc:creator>XCalificator</dc:creator><cp:lastModifiedBy>XCalificator</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">{timestamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">{timestamp}</dcterms:modified>
</cp:coreProperties>'''


def _app_props(slide_count: int) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>XCalificator</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>{slide_count}</Slides><Notes>0</Notes><HiddenSlides>0</HiddenSlides>
</Properties>'''


def _presentation_xml(slide_count: int) -> str:
    ids = "".join(
        f'<p:sldId id="{255 + i}" r:id="rId{i + 1}"/>'
        for i in range(1, slide_count + 1)
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>{ids}</p:sldIdLst>
<p:sldSz cx="{EMU_WIDE}" cy="{EMU_HIGH}" type="wide"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/>
</p:presentation>'''


def _presentation_rels(slide_count: int) -> str:
    rels = ['<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>']
    rels.extend(
        f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i}.xml"/>'
        for i in range(1, slide_count + 1)
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{''.join(rels)}</Relationships>'''


def _slide_xml() -> str:
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
<p:pic><p:nvPicPr><p:cNvPr id="2" name="slide.png"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
<p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{EMU_WIDE}" cy="{EMU_HIGH}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>
</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'''


def _slide_rels(index: int) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/slide{index}.png"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>'''


def _slide_master_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>'''


def _slide_master_rels() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>'''


def _slide_layout_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>'''


def _slide_layout_rels() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>'''


def _theme_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="XCalificator">
<a:themeElements><a:clrScheme name="XCalificator"><a:dk1><a:srgbClr val="0F172A"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="334155"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2><a:accent1><a:srgbClr val="0F766E"/></a:accent1><a:accent2><a:srgbClr val="1D4ED8"/></a:accent2><a:accent3><a:srgbClr val="7C3AED"/></a:accent3><a:accent4><a:srgbClr val="BE123C"/></a:accent4><a:accent5><a:srgbClr val="B45309"/></a:accent5><a:accent6><a:srgbClr val="475569"/></a:accent6><a:hlink><a:srgbClr val="2563EB"/></a:hlink><a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink></a:clrScheme><a:fontScheme name="XCalificator"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="XCalificator"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/>
</a:theme>'''


def _xml_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )
