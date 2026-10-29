"""Optional photo locations: never another scoring or authorization decision."""
from __future__ import annotations

import hashlib
import math
import re
from uuid import UUID

FRAME = "pagina_canonica_orientada"
MAX_REGIONS = 8
MAX_PAGES = 20


def _box(value: object) -> list[float] | None:
    if not isinstance(value, (list, tuple)) or len(value) != 4:
        return None
    if any(type(item) not in (int, float) for item in value):
        return None
    try:
        x, y, width, height = (float(item) for item in value)
    except (ValueError, OverflowError):
        return None
    if not all(math.isfinite(item) for item in (x, y, width, height)):
        return None
    if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > 1 or y + height > 1:
        return None
    return [x, y, width, height]


def sanitize_answer_regions(value: object) -> list[dict]:
    if not isinstance(value, list):
        return []
    result = []
    for item in value[:MAX_REGIONS * MAX_PAGES]:
        if not isinstance(item, dict):
            continue
        page, box = item.get("page"), _box(item.get("bbox"))
        if type(page) is not int or not 1 <= page <= MAX_PAGES or item.get("frame") != FRAME or box is None:
            continue
        region = {"page": page, "bbox": box, "frame": FRAME}
        if region not in result:
            result.append(region)
        if len(result) >= MAX_REGIONS:
            break
    return result


def model_answer_regions(value: object, *, page: int) -> list[dict]:
    """The model supplies boxes only; the calling page is server-owned."""
    if not isinstance(value, list):
        return []
    return sanitize_answer_regions([{"page": page, "bbox": box, "frame": FRAME} for box in value[:MAX_REGIONS]])


def rotate_answer_regions(value: object, rotation: int) -> list[dict]:
    if rotation not in {0, 90, -90, 180}:
        return []
    result = []
    for region in sanitize_answer_regions(value):
        x, y, width, height = region["bbox"]
        box = ([1 - y - height, x, height, width] if rotation == 90 else
               [y, 1 - x - width, height, width] if rotation == -90 else
               [1 - x - width, 1 - y - height, width, height] if rotation == 180 else
               [x, y, width, height])
        box = [max(0.0, min(1.0, coordinate)) for coordinate in box]
        result.append({**region, "bbox": box})
    return sanitize_answer_regions(result)


def evidence_version(entrega_id: UUID | str, fingerprint: str) -> str:
    """Opaque asset identity, not a capability or an alternative to permissions."""
    return hashlib.sha256(f"evidence-region-v1:{entrega_id}:{fingerprint}".encode()).hexdigest()[:32]


def public_answer_regions(value: object) -> list[dict]:
    if not isinstance(value, list):
        return []
    result = []
    for item in value[:MAX_REGIONS]:
        if not isinstance(item, dict) or not re.fullmatch(r"[a-f0-9]{32}", str(item.get("evidencia_version") or "")):
            continue
        normalized = sanitize_answer_regions([{"page": item.get("pagina"), "bbox": item.get("bbox"), "frame": item.get("marco")}])
        if normalized:
            region = normalized[0]
            result.append({"pagina": region["page"], "bbox": region["bbox"], "marco": FRAME, "evidencia_version": item["evidencia_version"]})
    return result


def attach_answer_regions(components: list[dict], extraction: object, entrega_id: UUID | str | None) -> None:
    if not entrega_id or not isinstance(extraction, dict):
        return
    fingerprint = extraction.get("source_fingerprint")
    total = extraction.get("pages_processed")
    if not isinstance(fingerprint, str) or not re.fullmatch(r"[a-f0-9]{64}", fingerprint) or type(total) is not int or not 1 <= total <= MAX_PAGES:
        return
    answers = extraction.get("answers")
    if not isinstance(answers, list):
        return
    for component in components:
        key, number = str(component.get("clave") or ""), str(component.get("numero"))
        keys = {key, key.removeprefix("pregunta:")}
        unique_number = sum(str(other.get("numero")) == number for other in components) == 1
        regions = []
        for answer in answers:
            if not isinstance(answer, dict):
                continue
            identity = answer.get("question_id")
            matches = str(identity) in keys if identity else unique_number and str(answer.get("question_number")) == number
            if not matches:
                continue
            regions.extend(region for region in sanitize_answer_regions(answer.get("regions")) if region["page"] <= total)
        regions = sanitize_answer_regions(regions)
        if not regions:
            continue
        evidence = dict(component.get("evidencia_json") or {})
        evidence["regiones"] = [{"pagina": region["page"], "bbox": region["bbox"], "marco": FRAME, "evidencia_version": evidence_version(entrega_id, fingerprint)} for region in regions]
        evidence["paginas"] = sorted({page for page in evidence.get("paginas", []) if type(page) is int and 1 <= page <= total} | {region["page"] for region in regions})
        component["evidencia_json"] = evidence
