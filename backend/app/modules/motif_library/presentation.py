"""Presentation-only merges and rendering. Never rebuild academic content."""
from __future__ import annotations

import base64
from copy import deepcopy

from app.core.config import settings
from app.modules.motif_library import service
from app.modules.motif_library.schemas import ResourceDecoration

UNCHANGED = object()


def merge_presentation(original: dict, *, academic: dict | None = None, decoration: object = UNCHANGED) -> dict:
    result = deepcopy(original if academic is None else academic)
    result.pop("_presentacion", None)
    old = original.get("_presentacion")
    presentation = deepcopy(old) if isinstance(old, dict) else {}
    # This URL is a read projection, never accepted as persistent user input.
    existing = presentation.get("decoracion")
    if isinstance(existing, dict):
        existing.pop("asset_url", None)
    if decoration is not UNCHANGED:
        if decoration is None:
            presentation["decoracion"] = None
        else:
            selection = ResourceDecoration.model_validate(decoration)
            catalog = service.load_catalog()
            if selection.motif_id not in {item.id for item in catalog.motifs}:
                raise ValueError("Elige una ilustración de la biblioteca")
            presentation["decoracion"] = selection.model_dump()
        presentation["version"] = 1
    if presentation:
        result["_presentacion"] = presentation
    return result


def _selected(content: dict):
    presentation = content.get("_presentacion")
    selection = presentation.get("decoracion") if isinstance(presentation, dict) else None
    if not isinstance(selection, dict) or selection.get("placement") != "header":
        return None
    try:
        catalog = service.load_catalog()
    except (OSError, ValueError):
        return None
    item = next((item for item in catalog.motifs if item.id == selection.get("motif_id")), None)
    return (catalog, item) if item else None


def presentation_for_read(content: dict | None) -> dict:
    result = merge_presentation(content or {})
    chosen = _selected(result)
    if chosen:
        _, item = chosen
        result["_presentacion"]["decoracion"]["asset_url"] = f"{settings.API_PREFIX.rstrip('/')}/biblioteca-motivos/archivos/{item.id}/thumbnail/{item.thumbnail.sha256}"
    return result


def decoration_html(content: dict) -> str:
    chosen = _selected(content)
    if not chosen:
        return ""
    catalog, item = chosen
    try:
        asset = service.read_asset(catalog, item.id, "thumbnail", item.thumbnail.sha256)
    except service.AssetUnavailable:
        return ""
    encoded = base64.b64encode(asset.content).decode("ascii")
    return f'<img alt="" aria-hidden="true" style="width:20mm;height:18mm;object-fit:contain;flex-shrink:0" src="data:{asset.media_type};base64,{encoded}">'
