from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.modules.presentaciones.template_library import choose_layout


CANONICAL_VERSION = "1.0"

PEDAGOGICAL_ROLES = {
    "cover",
    "objective",
    "prior_knowledge",
    "concept",
    "explanation",
    "example",
    "process",
    "comparison",
    "activity",
    "comprehension_check",
    "assessment",
    "summary",
    "closing",
}
ROLE_TO_TIPO = {
    "cover": "portada",
    "objective": "objetivo",
    "prior_knowledge": "saberes_previos",
    "concept": "concepto",
    "explanation": "explicacion",
    "example": "ejemplo",
    "process": "proceso",
    "comparison": "comparacion",
    "activity": "actividad",
    "comprehension_check": "pregunta",
    "assessment": "evaluacion",
    "summary": "resumen",
    "closing": "cierre",
}
LAYOUT_HINTS = {"editable", "full_image", "cover", "support"}


def is_canonical_presentation(data: Any) -> bool:
    return (
        isinstance(data, dict)
        and data.get("version") == CANONICAL_VERSION
        and isinstance(data.get("meta"), dict)
        and isinstance(data.get("slides"), list)
    )


def normalize_to_canonical(
    raw_data: Any, input_data: dict[str, Any] | None = None
) -> dict[str, Any]:
    input_data = input_data if isinstance(input_data, dict) else {}
    source = (
        raw_data
        if isinstance(raw_data, dict)
        else {"slides": raw_data if isinstance(raw_data, list) else []}
    )
    if is_canonical_presentation(source):
        canonical = deepcopy(source)
    elif is_canonical_presentation(
        source.get("canonical") if isinstance(source, dict) else None
    ):
        canonical = deepcopy(source["canonical"])
        # Si el canonical embebido quedó sin slides (se creó antes de generar),
        # reconstruirlos desde los slides legacy frescos. Sin esto, el PPTX
        # editable exportaba solo la portada aunque el deck ya existiera.
        if not canonical.get("slides"):
            raw_slides = source.get("slides") if isinstance(source, dict) else []
            canonical["slides"] = [
                _legacy_slide_to_canonical(slide, index)
                for index, slide in enumerate(raw_slides or [])
            ]
    else:
        canonical = _empty_canonical(input_data, source)
        raw_slides = source.get("slides") if isinstance(source, dict) else []
        canonical["slides"] = [
            _legacy_slide_to_canonical(slide, index)
            for index, slide in enumerate(raw_slides or [])
        ]

    canonical = _apply_defaults(canonical, input_data, source)
    canonical["slides"] = [
        _normalize_canonical_slide(slide, index)
        for index, slide in enumerate(canonical.get("slides") or [])
    ]
    return canonical


def build_canonical_from_legacy(
    slides_json: dict[str, Any] | None, presentacion: Any
) -> dict[str, Any]:
    data = slides_json if isinstance(slides_json, dict) else {}
    input_data = data.get("input") if isinstance(data.get("input"), dict) else {}
    canonical = normalize_to_canonical(data, input_data)
    canonical["meta"]["titulo"] = str(
        getattr(presentacion, "titulo", None) or canonical["meta"]["titulo"] or ""
    )
    canonical["meta"]["materia_id"] = _string_or_none(
        getattr(presentacion, "materia_id", None)
    )
    canonical["exports"]["pptx"]["url"] = getattr(presentacion, "pptx_url", None)
    canonical["exports"]["pdf"]["url"] = getattr(presentacion, "pdf_url", None)
    estado = getattr(presentacion, "estado", None)
    if estado:
        canonical["generation"]["estado"] = str(estado)
    return canonical


def get_canonical_slides(presentacion: Any) -> list[dict[str, Any]]:
    canonical = build_canonical_from_legacy(
        getattr(presentacion, "slides_json", None), presentacion
    )
    return canonical.get("slides") or []


def canonical_to_legacy_slides(
    canonical: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    if not is_canonical_presentation(canonical):
        return []
    return [
        _canonical_slide_to_legacy(slide, index)
        for index, slide in enumerate(canonical.get("slides") or [])
    ]


def _empty_canonical(
    input_data: dict[str, Any], source: dict[str, Any]
) -> dict[str, Any]:
    title = str(source.get("title") or input_data.get("titulo") or "")
    return {
        "version": CANONICAL_VERSION,
        "meta": {
            "titulo": title,
            "tema": input_data.get("tema"),
            "materia_id": input_data.get("materia_id"),
            "grado": input_data.get("grado"),
            "area": input_data.get("area"),
            "nivel": input_data.get("nivel"),
            "tono": input_data.get("tono"),
            "objetivo": None,
            "publico_objetivo": None,
            "plantilla": "academica",
            "estilo": "default",
            "duracion_estimada_min": None,
        },
        "source": {
            "tipo": "tema",
            "ref_id": None,
            "dba_ids": [],
        },
        "ai": {
            "proveedor_texto": None,
            "modelo_texto": None,
            "proveedor_imagenes": input_data.get("proveedor_imagenes"),
            "densidad_imagenes": input_data.get("densidad_imagenes"),
            "costo_estimado_usd": None,
        },
        "generation": {
            "estado": "queued",
            "etapa": None,
            "progreso": None,
            "mensaje": None,
            "intentos": 0,
            "error_amigable": None,
        },
        "exports": {
            "pptx": {"url": None, "editable": False, "bytes": None},
            "pdf": {"url": None, "bytes": None},
        },
        "slides": [],
    }


def _apply_defaults(
    canonical: dict[str, Any], input_data: dict[str, Any], source: dict[str, Any]
) -> dict[str, Any]:
    defaults = _empty_canonical(input_data, source)
    merged = deepcopy(defaults)
    for key in ("meta", "source", "ai", "generation", "exports"):
        current = canonical.get(key) if isinstance(canonical.get(key), dict) else {}
        for nested_key, value in current.items():
            if isinstance(value, dict) and isinstance(
                merged[key].get(nested_key), dict
            ):
                merged[key][nested_key].update(value)
            else:
                merged[key][nested_key] = value
    merged["version"] = CANONICAL_VERSION
    merged["slides"] = (
        canonical.get("slides") if isinstance(canonical.get("slides"), list) else []
    )
    return merged


def _legacy_slide_to_canonical(slide: Any, index: int) -> dict[str, Any]:
    if not isinstance(slide, dict):
        slide = {"title": f"Diapositiva {index + 1}", "bullets": [str(slide)]}

    title = str(slide.get("title") or slide.get("titulo") or f"Diapositiva {index + 1}")
    image = slide.get("imagen") if isinstance(slide.get("imagen"), dict) else {}
    prompt = str(slide.get("image") or image.get("prompt") or "")
    image_asset = str(slide.get("image_asset") or image.get("url") or "")
    provider = slide.get("image_provider") or image.get("proveedor")
    role = _normalize_role(slide.get("role"), title=title, index=index)
    visual_concept = str(slide.get("visual_concept") or prompt or "")
    layout_hint = _normalize_layout_hint(
        slide.get("layout_hint") or slide.get("layout"), role=role, index=index
    )
    is_full_image = (
        str(slide.get("slide_type") or slide.get("layout") or layout_hint).lower()
        == "full_image"
    )

    layout = choose_layout(
        role=role,
        index=index,
        layout_hint="full_image" if is_full_image else layout_hint,
        has_visual=bool(prompt or image_asset),
    )

    return {
        "id": str(slide.get("id") or f"slide-{index + 1}"),
        "orden": int(slide.get("orden") or index + 1),
        "tipo": ROLE_TO_TIPO.get(role, _infer_slide_type(title, index)),
        "role": role,
        "key_message": str(slide.get("key_message") or ""),
        "example": str(slide.get("example") or ""),
        "activity": str(slide.get("activity") or ""),
        "question": str(slide.get("question") or ""),
        "visual_concept": visual_concept,
        "layout_hint": layout_hint,
        "layout": layout,
        "titulo": title,
        "subtitulo": slide.get("subtitle") or slide.get("subtitulo"),
        "bullets": _canonical_bullets(slide.get("bullets") or []),
        "texto_principal": slide.get("texto_principal")
        or slide.get("text_content")
        or _text_content_from_slide(slide),
        "image_text_expected": [
            str(t) for t in slide.get("image_text_expected") or [] if str(t).strip()
        ],
        "tags": [str(t) for t in slide.get("tags") or [] if str(t).strip()],
        "imagen": {
            "url": image_asset or None,
            "asset_id": None,
            "prompt": prompt or None,
            "proveedor": str(provider) if provider else None,
            "estado": "success" if image_asset else None,
            "is_placeholder": False,
        },
        "notas_presentador": slide.get("notes") or slide.get("notas_presentador"),
        "nivel_complejidad": slide.get("nivel_complejidad"),
        "tiempo_estimado_min": slide.get("tiempo_estimado_min"),
        "dba_ref": slide.get("dba_ref"),
        "evaluacion_ref": slide.get("evaluacion_ref"),
        "herramienta_ref": slide.get("herramienta_ref"),
    }


def _normalize_canonical_slide(slide: Any, index: int) -> dict[str, Any]:
    if not isinstance(slide, dict):
        return _legacy_slide_to_canonical(slide, index)
    normalized = _legacy_slide_to_canonical(
        _canonical_slide_to_legacy(slide, index), index
    )
    for key, value in slide.items():
        if key == "bullets":
            normalized["bullets"] = _canonical_bullets(value)
        elif key == "imagen" and isinstance(value, dict):
            normalized["imagen"].update(value)
        else:
            normalized[key] = value
    normalized["id"] = str(normalized.get("id") or f"slide-{index + 1}")
    normalized["orden"] = int(normalized.get("orden") or index + 1)
    normalized["titulo"] = str(normalized.get("titulo") or f"Diapositiva {index + 1}")
    normalized["role"] = _normalize_role(
        normalized.get("role"), title=normalized["titulo"], index=index
    )
    normalized["layout_hint"] = _normalize_layout_hint(
        normalized.get("layout_hint") or normalized.get("layout"),
        role=normalized["role"],
        index=index,
    )
    normalized["tipo"] = str(
        normalized.get("tipo") or ROLE_TO_TIPO.get(normalized["role"]) or "concepto"
    )
    normalized["bullets"] = _canonical_bullets(normalized.get("bullets") or [])
    normalized["image_text_expected"] = [
        str(t) for t in normalized.get("image_text_expected") or [] if str(t).strip()
    ]
    normalized["tags"] = [
        str(t) for t in normalized.get("tags") or [] if str(t).strip()
    ]
    normalized["visual_concept"] = str(
        normalized.get("visual_concept") or normalized.get("image") or ""
    )
    normalized["key_message"] = str(normalized.get("key_message") or "")
    normalized["example"] = str(normalized.get("example") or "")
    normalized["activity"] = str(normalized.get("activity") or "")
    normalized["question"] = str(normalized.get("question") or "")
    normalized["texto_principal"] = str(
        normalized.get("texto_principal") or _text_content_from_canonical(normalized)
    )
    if not isinstance(normalized.get("imagen"), dict):
        normalized["imagen"] = _legacy_slide_to_canonical({}, index)["imagen"]
    return normalized


def _canonical_slide_to_legacy(slide: dict[str, Any], index: int) -> dict[str, Any]:
    image = slide.get("imagen") if isinstance(slide.get("imagen"), dict) else {}
    bullets = slide.get("bullets") if isinstance(slide.get("bullets"), list) else []
    legacy = {
        "title": str(
            slide.get("titulo") or slide.get("title") or f"Diapositiva {index + 1}"
        ),
        "bullets": _legacy_bullet_texts(bullets),
        "image": str(image.get("prompt") or slide.get("image") or ""),
        "image_asset": str(image.get("url") or slide.get("image_asset") or ""),
        "image_provider": image.get("proveedor") or slide.get("image_provider"),
        "notes": str(slide.get("notas_presentador") or slide.get("notes") or ""),
        "role": _normalize_role(
            slide.get("role"), title=str(slide.get("titulo") or ""), index=index
        ),
        "key_message": str(slide.get("key_message") or ""),
        "example": str(slide.get("example") or ""),
        "activity": str(slide.get("activity") or ""),
        "question": str(slide.get("question") or ""),
        "visual_concept": str(slide.get("visual_concept") or image.get("prompt") or ""),
        "layout_hint": _normalize_layout_hint(
            slide.get("layout_hint") or slide.get("layout"),
            role=_normalize_role(
                slide.get("role"), title=str(slide.get("titulo") or ""), index=index
            ),
            index=index,
        ),
        "image_text_expected": [
            str(t) for t in slide.get("image_text_expected") or [] if str(t).strip()
        ],
        "tags": [str(t) for t in slide.get("tags") or [] if str(t).strip()],
        "text_content": str(
            slide.get("texto_principal") or slide.get("text_content") or ""
        ),
    }
    if (
        str(slide.get("layout") or slide.get("slide_type") or "").lower()
        == "full_image"
    ):
        legacy["slide_type"] = "full_image"
        legacy["layout"] = "full_image"
    return legacy


def _legacy_bullet_texts(bullets: list[Any]) -> list[str]:
    texts: list[str] = []
    for item in bullets:
        text = str(item.get("texto") if isinstance(item, dict) else item).strip()
        if text and text != "None":
            texts.append(text)
    return texts


def _canonical_bullets(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        raw = [raw] if raw else []
    bullets: list[dict[str, Any]] = []
    for item in raw:
        if isinstance(item, dict):
            text = str(
                item.get("texto") or item.get("text") or item.get("title") or ""
            ).strip()
            level = int(item.get("nivel") or item.get("level") or 0)
        else:
            text = str(item).strip()
            level = 0
        if text:
            bullets.append({"texto": text, "nivel": level})
    return bullets


def _normalize_role(value: Any, *, title: str, index: int) -> str:
    role = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if role in PEDAGOGICAL_ROLES:
        return role
    inferred = _infer_slide_type(title, index)
    tipo_to_role = {
        "portada": "cover",
        "objetivo": "objective",
        "ejemplo": "example",
        "actividad": "activity",
        "pregunta": "comprehension_check",
        "cierre": "closing",
        "concepto": "concept",
    }
    return tipo_to_role.get(inferred, "concept")


def _normalize_layout_hint(value: Any, *, role: str, index: int) -> str:
    hint = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if hint in LAYOUT_HINTS:
        return hint
    if hint == "text":
        return "editable"
    if index == 0 or role == "cover":
        return "cover"
    if role in {
        "objective",
        "prior_knowledge",
        "activity",
        "comprehension_check",
        "assessment",
    }:
        return "editable"
    if role in {
        "concept",
        "explanation",
        "example",
        "process",
        "comparison",
        "summary",
        "closing",
    }:
        return "full_image"
    return "support"


def _text_content_from_slide(slide: dict[str, Any]) -> str:
    bullets = slide.get("bullets") if isinstance(slide.get("bullets"), list) else []
    parts = [
        slide.get("key_message"),
        *bullets,
        slide.get("example"),
        slide.get("activity"),
        slide.get("question"),
    ]
    return " ".join(str(part).strip() for part in parts if str(part or "").strip())


def _text_content_from_canonical(slide: dict[str, Any]) -> str:
    bullets = _legacy_bullet_texts(
        slide.get("bullets") if isinstance(slide.get("bullets"), list) else []
    )
    parts = [
        slide.get("key_message"),
        *bullets,
        slide.get("example"),
        slide.get("activity"),
        slide.get("question"),
    ]
    return " ".join(str(part).strip() for part in parts if str(part or "").strip())


def _infer_slide_type(title: str, index: int) -> str:
    text = title.lower()
    if index == 0:
        return "portada"
    if "objetivo" in text or "propósito" in text or "proposito" in text:
        return "objetivo"
    if "ejemplo" in text:
        return "ejemplo"
    if "actividad" in text:
        return "actividad"
    if "pregunta" in text:
        return "pregunta"
    if "cierre" in text or "repaso" in text:
        return "cierre"
    return "concepto"


def _string_or_none(value: Any) -> str | None:
    return str(value) if value is not None else None
