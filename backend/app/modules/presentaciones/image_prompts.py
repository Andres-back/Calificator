"""Constructor central de prompts de imagen para presentaciones.

Modos:
- cover / full_image: infografía/portada con TEXTO GRANDE Y CORTO permitido
  (título + una frase). Nunca texto pequeño, fórmulas, tablas ni rúbricas.
- support / technical / activity / closing: imagen de apoyo SIN texto.

GPT Image 2 en calidad LOW: prompts claros y concretos (45-90 palabras para
full_image, 25-55 para apoyo), pocos elementos, alto contraste.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.shared.enums import ImageProvider

RESTRICCIONES_TEXTO_GRANDE = (
    "sin texto pequeño, sin etiquetas pequeñas, sin fórmulas complejas, "
    "sin tablas densas, sin párrafos, sin marcas de agua"
)
RESTRICCIONES_SIN_TEXTO = (
    "sin texto, sin letras, sin palabras, sin rótulos, sin etiquetas, "
    "sin fórmulas, sin marcas de agua, sin logos"
)

PromptKind = str  # cover | support | full_image | technical | activity | closing


@dataclass
class ImagePromptBundle:
    prompt_original: str
    prompt_normalizado: str
    prompt_usado: str
    restricciones: str
    tipo_uso: str
    image_text_expected: list[str] = field(default_factory=list)


def _clip(value: str, max_chars: int) -> str:
    cleaned = " ".join(str(value).replace("\n", " ").split())
    if len(cleaned) <= max_chars:
        return cleaned
    return cleaned[: max(0, max_chars - 1)].rstrip(" .,;:") + "…"


def _safe_visual_topic(raw_prompt: str, *, topic: str, bullets: list) -> str:
    combined = f"{raw_prompt} {topic} {' '.join(str(item) for item in bullets)}".lower()
    if (
        "ecosistema" in combined
        or "cadena alimentaria" in combined
        or "cadenas alimentarias" in combined
    ):
        return "ecosistema natural con relaciones ecologicas visibles entre seres vivos"
    return topic


def _safe_visual_subject(raw_prompt: str, *, topic: str, bullets: list) -> str:
    combined = f"{raw_prompt} {topic} {' '.join(str(item) for item in bullets)}".lower()
    if (
        "ecosistema" in combined
        or "cadena alimentaria" in combined
        or "cadenas alimentarias" in combined
    ):
        return (
            "escena natural de bosque o humedal con plantas productoras, insectos, conejo o venado, "
            "ave o zorro consumidor, hongos y hojas en descomposicion, relaciones ecologicas visibles sin etiquetas"
        )
    return raw_prompt


def _nivel_text(grade: str | None, nivel: str | None) -> str:
    if grade:
        return f"para grado {grade}"
    if nivel:
        return f"para {nivel}"
    return "para educación básica"


def _support_prompt(
    raw_prompt: str,
    *,
    title: str,
    bullets: list,
    topic: str,
    area: str | None,
    grade: str | None,
    provider: ImageProvider,
) -> str:
    """Prompt de apoyo (sin texto). Mantiene el estilo premium existente."""
    context = ", ".join(
        part for part in [area, f"grado {grade}" if grade else None] if part
    )
    context_text = f" para {context}" if context else ""
    slide_context = "; ".join(
        _clip(str(item), 42) for item in bullets[:3] if str(item).strip()
    )
    slide_context_text = (
        f" Ideas de la diapositiva: {slide_context}." if slide_context else ""
    )
    subject = _safe_visual_subject(raw_prompt, topic=topic, bullets=bullets)
    visual_topic = _safe_visual_topic(raw_prompt, topic=topic, bullets=bullets)
    if provider == ImageProvider.CLOUDFLARE:
        return (
            f"Professional educational 16:9 illustration about {visual_topic}. Represent this idea: {subject}. "
            f"School context{context_text}. Natural concrete scene, clear subject, modern editorial style, "
            "no text, no letters, no signs, no posters, no whiteboards, no grocery shelves, "
            "no product packaging, no watermark, no logo."
        )
    return (
        f"{subject}. Diapositiva: {title}. Tema visual: {visual_topic}.{slide_context_text} "
        f"Imagen educativa premium 16:9{context_text}, estilo editorial moderno, "
        "composicion clara, alta calidad, semantica escolar precisa, como escena visual o metafora limpia, "
        "no infografia, no diagramas, no flechas, no rotulos, sin texto, sin letras, sin palabras, sin marcas de agua, "
        "no diagram, no arrows, no captions, no labels, no written words, "
        "sin objetos comerciales ni estanterias, adecuada para una diapositiva profesional."
    )


def _big_text_lines(
    title: str, topic: str, bullets: list, *, kind: PromptKind
) -> list[str]:
    """Texto grande esperado dentro de la imagen: corto, claro, 1-2 líneas."""
    main = _clip(title or topic, 40).upper().rstrip("…")
    lines = [main]
    if kind == "full_image":
        first = next((str(b).strip() for b in bullets if str(b).strip()), "")
        if first:
            lines.append(_clip(first, 60).rstrip("…"))
    return [line for line in lines if line]


def _clean_text_lines(value: list | None) -> list[str]:
    if not isinstance(value, list):
        return []
    lines: list[str] = []
    words = 0
    for item in value[:4]:
        text = _clip(str(item), 90).strip()
        if not text:
            continue
        remaining = max(0, 45 - words)
        if remaining <= 0:
            break
        clipped = " ".join(text.split()[:remaining])
        if clipped:
            lines.append(clipped)
            words += len(clipped.split())
    return lines


def _quoted_text_lines(lines: list[str]) -> str:
    return " | ".join(f'"{line}"' for line in lines)


def build_presentation_image_prompt(
    kind: PromptKind,
    *,
    raw_prompt: str,
    title: str,
    bullets: list | None = None,
    topic: str,
    area: str | None = None,
    grade: str | None = None,
    nivel: str | None = None,
    provider: ImageProvider = ImageProvider.OPENAI,
    role: str | None = None,
    key_message: str | None = None,
    visual_concept: str | None = None,
    image_text_expected: list | None = None,
    tags: list | None = None,
) -> ImagePromptBundle:
    """Construye el prompt final de imagen y devuelve el bundle auditable
    (prompt_original, prompt_normalizado, prompt_usado, restricciones)."""
    bullets = bullets if isinstance(bullets, list) else []
    prompt_original = str(visual_concept or raw_prompt or "").strip()
    normalized = _clip(
        _safe_visual_subject(prompt_original, topic=topic, bullets=bullets), 220
    )

    if kind in {"cover", "full_image"}:
        text_lines = _clean_text_lines(image_text_expected)
        if not text_lines:
            text_lines = _big_text_lines(title, topic, bullets, kind=kind)
        texto_grande = _quoted_text_lines(text_lines)
        nivel_txt = _nivel_text(grade, nivel)
        area_txt = f" de {area}" if area else ""
        role_txt = f" Rol pedagogico: {role}." if role else ""
        key_txt = (
            f" Idea educativa: {_clip(str(key_message), 95)}." if key_message else ""
        )
        tag_txt = ""
        if isinstance(tags, list) and tags:
            tag_values = [_clip(str(tag), 24) for tag in tags[:4] if str(tag).strip()]
            if tag_values:
                tag_txt = f" Enfoque: {', '.join(tag_values)}."
        if kind == "cover":
            cuerpo = (
                f"Portada educativa horizontal 16:9 sobre {topic}{area_txt} {nivel_txt}. "
                f"Mostrar {normalized or 'una escena escolar clara relacionada con el tema'}.{role_txt}{key_txt}{tag_txt} "
            )
            tipo_uso = "portada"
        else:
            cuerpo = (
                f"Infografia educativa horizontal 16:9 sobre {topic}{area_txt} {nivel_txt}. "
                f"Mostrar {normalized or 'los elementos visuales clave del tema con composicion clara'}.{role_txt}{key_txt}{tag_txt} "
            )
            tipo_uso = "infografia_completa"
        prompt_usado = (
            f"{cuerpo}"
            f"Texto visible exacto y unico: {texto_grande}. "
            "Usar solo esos textos escritos. Jerarquia visual clara, pocos bloques, texto grande, "
            "alta legibilidad, estilo adecuado al grado, composicion limpia, alto contraste, "
            f"{RESTRICCIONES_TEXTO_GRANDE}."
        )
        return ImagePromptBundle(
            prompt_original=prompt_original,
            prompt_normalizado=normalized,
            prompt_usado=prompt_usado,
            restricciones=RESTRICCIONES_TEXTO_GRANDE,
            tipo_uso=tipo_uso,
            image_text_expected=text_lines,
        )

    tipo_por_kind = {
        "technical": "diagrama",
        "activity": "actividad",
        "closing": "cierre",
    }
    prompt_usado = _support_prompt(
        prompt_original,
        title=title,
        bullets=bullets,
        topic=topic,
        area=area,
        grade=grade,
        provider=provider,
    )
    return ImagePromptBundle(
        prompt_original=prompt_original,
        prompt_normalizado=normalized,
        prompt_usado=prompt_usado,
        restricciones=RESTRICCIONES_SIN_TEXTO,
        tipo_uso=tipo_por_kind.get(kind, "apoyo_visual"),
        image_text_expected=[],
    )
