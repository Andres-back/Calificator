"""Patch reversible para resolver templates en Presenton.

La imagen `ghcr.io/presenton/presenton:latest` instalada no expone la ruta
interna `/api/template` que su FastAPI espera. Este patch evita tocar la imagen:
lee los templates desde el filesystem de Next.js y devuelve el
`PresentationLayoutModel` que FastAPI necesita.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

from fastapi import HTTPException

from templates.presentation_layout import PresentationLayoutModel, SlideLayoutModel

TEMPLATE_ROOT = Path(
    os.getenv("PRESENTON_TEMPLATE_DIR", "/app/servers/nextjs/app/presentation-templates")
)


class CompatiblePresentationLayoutModel(PresentationLayoutModel):
    def to_string(self, with_schema: bool = False) -> str:
        message = "## Presentation Layout\n\nReturn valid JSON only when selecting or filling layouts.\n\n"
        for index, slide in enumerate(self.slides):
            message += f"### Slide Layout: {index}\n"
            message += f"- Name: {slide.name or slide.json_schema.get('title')}\n"
            message += f"- Description: {slide.description}\n"
            if with_schema:
                message += f"- JSON Schema: {json.dumps(slide.json_schema)}\n"
            message += "\n"
        return message


def _read_settings(template_dir: Path) -> dict:
    settings_path = template_dir / "settings.json"
    if not settings_path.is_file():
        return {"ordered": False}
    try:
        return json.loads(settings_path.read_text(encoding="utf-8"))
    except Exception:
        return {"ordered": False}


def _extract_export(source: str, name: str, fallback: str) -> str:
    patterns = [
        rf"export\s+const\s+{name}\s*=\s*['\"]([^'\"]+)['\"]",
        rf"export\s+let\s+{name}\s*=\s*['\"]([^'\"]+)['\"]",
    ]
    for pattern in patterns:
        match = re.search(pattern, source)
        if match:
            return match.group(1)
    return fallback


def _generic_schema(layout_name: str, description: str) -> dict:
    return {
        "type": "object",
        "title": layout_name,
        "description": description,
        "properties": {
            "title": {"type": "string", "description": "Slide title"},
            "subtitle": {"type": "string", "description": "Short supporting subtitle"},
            "description": {"type": "string", "description": "Main explanation text"},
            "bullets": {
                "type": "array",
                "description": "Concise bullet points",
                "items": {"type": "string"},
            },
            "points": {
                "type": "array",
                "description": "Key points for the slide",
                "items": {"type": "string"},
            },
            "image": {
                "type": "object",
                "description": "Supporting image",
                "properties": {
                    "__image_url__": {"type": "string"},
                    "__image_prompt__": {"type": "string"},
                },
            },
            "quote": {"type": "string"},
            "author": {"type": "string"},
            "items": {
                "type": "array",
                "items": {"type": "object"},
            },
            "metrics": {
                "type": "array",
                "items": {"type": "object"},
            },
        },
        "required": ["title"],
    }


def _layout_from_file(path: Path) -> SlideLayoutModel:
    source = path.read_text(encoding="utf-8", errors="ignore")
    fallback_id = path.stem
    fallback_name = re.sub(r"(?<!^)(?=[A-Z])", " ", path.stem).strip()
    layout_id = _extract_export(source, "layoutId", fallback_id)
    layout_name = _extract_export(source, "layoutName", fallback_name)
    layout_description = _extract_export(
        source,
        "layoutDescription",
        f"{layout_name} presentation layout",
    )
    return SlideLayoutModel(
        id=layout_id,
        name=layout_name,
        description=layout_description,
        json_schema=_generic_schema(layout_name, layout_description),
    )


async def get_layout_by_name(layout_name: str) -> PresentationLayoutModel:
    template_dir = TEMPLATE_ROOT / layout_name
    if not template_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Template '{layout_name}' not found")

    settings = _read_settings(template_dir)
    slides = [
        _layout_from_file(path)
        for path in sorted(template_dir.glob("*.tsx"))
        if not path.name.startswith(".") and ".test." not in path.name and ".spec." not in path.name
    ]
    if not slides:
        raise HTTPException(status_code=404, detail=f"Template '{layout_name}' has no slide layouts")

    return CompatiblePresentationLayoutModel(
        name=layout_name,
        ordered=bool(settings.get("ordered", False)),
        slides=slides,
    )
