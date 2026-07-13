from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

from app.core.config import settings


SLIDE_W_IN = 13.333
SLIDE_H_IN = 7.5
MAX_BULLETS = 6


def build_editable_pptx(canonical: dict[str, Any]) -> bytes:
    """Build an editable PPTX from canonical presentation JSON.

    Speaker notes are intentionally not written in this phase. python-pptx does
    not expose a stable high-level API for notes pages, and skipping them keeps
    generation reliable without blocking editable slide content.
    """
    from pptx import Presentation
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN
    from pptx.util import Inches, Pt

    prs = Presentation()
    prs.slide_width = Inches(SLIDE_W_IN)
    prs.slide_height = Inches(SLIDE_H_IN)

    slides = canonical.get("slides") if isinstance(canonical.get("slides"), list) else []
    if not slides:
        slides = [_empty_slide(canonical)]

    for index, slide_data in enumerate(slides):
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        _paint_background(slide, prs)

        layout = str(slide_data.get("layout") or "").lower()
        slide_type = str(slide_data.get("tipo") or "").lower()
        image_path = _image_path(slide_data)

        if layout == "full_image":
            if image_path:
                _add_full_image_slide(slide, slide_data, image_path)
            else:
                # Fallback editable si la imagen no está disponible.
                _add_text_slide(slide, slide_data)
        elif index == 0 or slide_type == "portada" or layout == "cover":
            _add_cover_slide(slide, slide_data, image_path)
        elif slide_type == "cierre":
            _add_closing_slide(slide, slide_data, image_path)
        elif layout in {"split-left", "split-right"} or image_path:
            _add_split_slide(slide, slide_data, image_path, image_left=(layout == "split-left"))
        else:
            _add_text_slide(slide, slide_data)

    out = BytesIO()
    prs.save(out)
    return out.getvalue()


def _empty_slide(canonical: dict[str, Any]) -> dict[str, Any]:
    meta = canonical.get("meta") if isinstance(canonical.get("meta"), dict) else {}
    return {
        "tipo": "portada",
        "layout": "cover",
        "titulo": str(meta.get("titulo") or "Presentacion educativa"),
        "subtitulo": str(meta.get("tema") or ""),
        "bullets": [],
        "imagen": {},
    }


def _paint_background(slide: Any, prs: Any) -> None:
    from pptx.dml.color import RGBColor
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.util import Inches

    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = RGBColor(248, 250, 252)
    bg.line.fill.background()


def _add_cover_slide(slide: Any, data: dict[str, Any], image_path: Path | None) -> None:
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN
    from pptx.util import Inches, Pt

    if image_path:
        _add_image(slide, image_path, Inches(7.15), Inches(0.0), Inches(6.18), Inches(7.5), crop=True)
        _add_accent_bar(slide, Inches(6.95), Inches(0), Inches(0.08), Inches(7.5))
    else:
        _add_soft_panel(slide, Inches(7.15), Inches(0), Inches(6.18), Inches(7.5))

    title = _text(data.get("titulo") or "Presentacion educativa")
    subtitle = _text(data.get("subtitulo") or _first_bullet(data))
    _add_label(slide, "PRESENTACION EDUCATIVA", Inches(0.75), Inches(0.85), Inches(4.8))
    _add_textbox(slide, title, Inches(0.75), Inches(1.55), Inches(5.8), Inches(2.25), Pt(42), bold=True, color=RGBColor(15, 23, 42))
    if subtitle:
        _add_textbox(slide, subtitle, Inches(0.78), Inches(4.15), Inches(5.5), Inches(1.0), Pt(20), color=RGBColor(71, 85, 105))
    footer = _add_textbox(slide, "XCalificator", Inches(0.78), Inches(6.55), Inches(3), Inches(0.35), Pt(14), bold=True, color=RGBColor(13, 148, 136))
    footer.text_frame.paragraphs[0].alignment = PP_ALIGN.LEFT


def _add_text_slide(slide: Any, data: dict[str, Any]) -> None:
    from pptx.dml.color import RGBColor
    from pptx.util import Inches, Pt

    _add_accent_bar(slide, Inches(0), Inches(0), Inches(0.12), Inches(7.5))
    _add_label(slide, "CLASE", Inches(0.85), Inches(0.75), Inches(1.45))
    _add_textbox(slide, _text(data.get("titulo")), Inches(0.85), Inches(1.35), Inches(11.6), Inches(1.15), Pt(34), bold=True, color=RGBColor(15, 23, 42))
    _add_bullets(slide, _bullet_texts(data), Inches(1.0), Inches(2.85), Inches(11.15), Inches(3.7), Pt(20))


def _add_split_slide(slide: Any, data: dict[str, Any], image_path: Path | None, *, image_left: bool) -> None:
    from pptx.dml.color import RGBColor
    from pptx.util import Inches, Pt

    image_w = Inches(5.2)
    if image_left:
        image_x = Inches(0)
        text_x = Inches(5.85)
    else:
        image_x = Inches(8.13)
        text_x = Inches(0.75)

    if image_path:
        _add_image(slide, image_path, image_x, Inches(0), image_w, Inches(7.5), crop=True)
    else:
        _add_soft_panel(slide, image_x, Inches(0), image_w, Inches(7.5))

    seam_x = Inches(5.2) if image_left else Inches(8.05)
    _add_accent_bar(slide, seam_x, Inches(0), Inches(0.08), Inches(7.5))
    _add_label(slide, "DIAPOSITIVA", text_x, Inches(0.75), Inches(2.1))
    _add_textbox(slide, _text(data.get("titulo")), text_x, Inches(1.35), Inches(6.6), Inches(1.25), Pt(31), bold=True, color=RGBColor(15, 23, 42))
    _add_bullets(slide, _bullet_texts(data), text_x, Inches(2.9), Inches(6.35), Inches(3.8), Pt(18))


def _add_full_image_slide(slide: Any, data: dict[str, Any], image_path: Path) -> None:
    """La imagen (infografía) cubre toda la diapositiva sin deformarse:
    se escala para CUBRIR el lienzo manteniendo la proporción y se centra
    (el sobrante sangra fuera del lienzo, que PowerPoint recorta al mostrar)."""
    from pptx.util import Inches

    slide_w = SLIDE_W_IN
    slide_h = SLIDE_H_IN
    try:
        from PIL import Image as PILImage

        with PILImage.open(image_path) as img:
            img_w, img_h = img.size
        scale = max(slide_w / img_w, slide_h / img_h)
        draw_w = img_w * scale
        draw_h = img_h * scale
        x = (slide_w - draw_w) / 2
        y = (slide_h - draw_h) / 2
        slide.shapes.add_picture(str(image_path), Inches(x), Inches(y), width=Inches(draw_w), height=Inches(draw_h))
    except Exception:  # noqa: BLE001
        # Sin PIL o imagen ilegible: ancho completo manteniendo proporción.
        slide.shapes.add_picture(str(image_path), 0, 0, width=Inches(slide_w))


def _add_closing_slide(slide: Any, data: dict[str, Any], image_path: Path | None) -> None:
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN
    from pptx.util import Inches, Pt

    if image_path:
        _add_image(slide, image_path, Inches(8.2), Inches(0.55), Inches(4.45), Inches(6.35), crop=True)
    _add_label(slide, "CIERRE", Inches(0.9), Inches(0.8), Inches(1.5))
    title_box = _add_textbox(slide, _text(data.get("titulo") or "Cierre"), Inches(0.9), Inches(1.55), Inches(6.9), Inches(1.25), Pt(36), bold=True, color=RGBColor(15, 23, 42))
    title_box.text_frame.paragraphs[0].alignment = PP_ALIGN.LEFT
    message = _text(data.get("texto_principal") or _first_bullet(data))
    if message:
        _add_textbox(slide, message, Inches(0.95), Inches(3.0), Inches(6.6), Inches(1.0), Pt(22), color=RGBColor(71, 85, 105))
    bullets = _bullet_texts(data)
    if len(bullets) > 1:
        _add_bullets(slide, bullets[1:], Inches(1.0), Inches(4.25), Inches(6.6), Inches(2.0), Pt(18))


def _add_textbox(
    slide: Any,
    text: str,
    x: Any,
    y: Any,
    w: Any,
    h: Any,
    size: Any,
    *,
    bold: bool = False,
    color: Any | None = None,
) -> Any:
    from pptx.dml.color import RGBColor

    shape = slide.shapes.add_textbox(x, y, w, h)
    frame = shape.text_frame
    frame.clear()
    frame.word_wrap = True
    p = frame.paragraphs[0]
    p.text = _clip(text, 180)
    run = p.runs[0] if p.runs else p.add_run()
    run.font.name = "Arial"
    run.font.size = size
    run.font.bold = bold
    run.font.color.rgb = color or RGBColor(30, 41, 59)
    return shape


def _add_bullets(slide: Any, bullets: list[str], x: Any, y: Any, w: Any, h: Any, size: Any) -> None:
    from pptx.dml.color import RGBColor

    shape = slide.shapes.add_textbox(x, y, w, h)
    frame = shape.text_frame
    frame.clear()
    frame.word_wrap = True
    visible = bullets[:MAX_BULLETS]
    if len(bullets) > MAX_BULLETS:
        visible.append("Contenido adicional resumido para mantener legibilidad.")
    if not visible:
        visible = ["Idea clave para trabajar en clase."]

    for index, bullet in enumerate(visible):
        p = frame.paragraphs[0] if index == 0 else frame.add_paragraph()
        p.text = _clip(bullet, 140)
        p.level = 0
        p.font.name = "Arial"
        p.font.size = size
        p.font.color.rgb = RGBColor(51, 65, 85)
        p.space_after = 0


def _add_label(slide: Any, text: str, x: Any, y: Any, w: Any) -> None:
    from pptx.dml.color import RGBColor
    from pptx.enum.shapes import MSO_SHAPE
    from pptx.enum.text import PP_ALIGN
    from pptx.util import Inches, Pt

    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, Inches(0.36))
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor(13, 148, 136)
    shape.line.fill.background()
    frame = shape.text_frame
    frame.clear()
    p = frame.paragraphs[0]
    p.text = text
    p.alignment = PP_ALIGN.CENTER
    p.font.name = "Arial"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = RGBColor(255, 255, 255)


def _add_accent_bar(slide: Any, x: Any, y: Any, w: Any, h: Any) -> None:
    from pptx.dml.color import RGBColor
    from pptx.enum.shapes import MSO_SHAPE

    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor(13, 148, 136)
    shape.line.fill.background()


def _add_soft_panel(slide: Any, x: Any, y: Any, w: Any, h: Any) -> None:
    from pptx.dml.color import RGBColor
    from pptx.enum.shapes import MSO_SHAPE

    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor(226, 232, 240)
    shape.line.fill.background()


def _add_image(slide: Any, path: Path, x: Any, y: Any, w: Any, h: Any, *, crop: bool = False) -> None:
    if not path.is_file():
        return
    if crop:
        slide.shapes.add_picture(str(path), x, y, width=w, height=h)
    else:
        slide.shapes.add_picture(str(path), x, y, width=w)


def _image_path(slide_data: dict[str, Any]) -> Path | None:
    image = slide_data.get("imagen") if isinstance(slide_data.get("imagen"), dict) else {}
    raw_url = str(image.get("url") or slide_data.get("image_asset") or "").strip()
    if not raw_url:
        return None
    if raw_url.startswith("/app_data/"):
        relative = raw_url.removeprefix("/app_data/").lstrip("/")
        path = (Path(settings.UPLOADS_DIR) / "presenton" / relative).resolve()
        try:
            path.relative_to((Path(settings.UPLOADS_DIR) / "presenton").resolve())
        except ValueError:
            return None
        return path if path.is_file() else None
    path = Path(raw_url)
    return path if path.is_file() else None


def _bullet_texts(data: dict[str, Any]) -> list[str]:
    raw = data.get("bullets")
    if not isinstance(raw, list):
        return []
    bullets: list[str] = []
    for item in raw:
        text = str(item.get("texto") if isinstance(item, dict) else item).strip()
        if text and text != "None":
            bullets.append(text)
    return bullets


def _first_bullet(data: dict[str, Any]) -> str:
    bullets = _bullet_texts(data)
    return bullets[0] if bullets else ""


def _text(value: Any) -> str:
    return " ".join(str(value or "").split())


def _clip(value: str, max_chars: int) -> str:
    text = _text(value)
    if len(text) <= max_chars:
        return text
    return text[: max(0, max_chars - 3)].rstrip(" .,;:") + "..."
