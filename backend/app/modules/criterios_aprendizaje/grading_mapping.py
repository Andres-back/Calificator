"""Mapeo explicativo criterio↔respuesta sin alterar la fórmula de nota."""
from __future__ import annotations

from decimal import Decimal, ROUND_DOWN
from typing import Any


def _decimal(value: object) -> Decimal:
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal("0")


def _question_by_number(blueprint: dict[str, Any]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(blueprint.get("preguntas") or [], start=1):
        if isinstance(item, dict):
            result[str(item.get("numero") or item.get("id") or index)] = item
    return result


def _criterion_keys_for_component(
    component: dict[str, Any],
    *,
    criteria: list[dict[str, Any]],
    questions: dict[str, dict[str, Any]],
) -> list[str]:
    criterion_keys = {str(item.get("stable_key")): item for item in criteria if item.get("stable_key")}
    if component.get("tipo") == "rubrica":
        title = str(component.get("titulo") or "").strip().casefold()
        return [key for key, item in criterion_keys.items() if str(item.get("nombre") or "").strip().casefold() == title]
    question = questions.get(str(component.get("numero") or ""), {})
    explicit = [str(key) for key in question.get("learning_criterion_keys") or [] if str(key) in criterion_keys]
    if explicit:
        return list(dict.fromkeys(explicit))
    question_standards = {str(value) for value in question.get("dba_ids") or []}
    if question_standards:
        matched = []
        for key, criterion in criterion_keys.items():
            refs = {str(ref.get("id")) for ref in criterion.get("official_standard_refs") or [] if isinstance(ref, dict) and ref.get("id")}
            if refs.intersection(question_standards):
                matched.append(key)
        if matched:
            return matched
    return list(criterion_keys) if len(criterion_keys) == 1 else []


def build_criterion_allocations(
    components: list[dict[str, Any]],
    *,
    blueprint: dict[str, Any],
    snapshot: dict[str, Any],
) -> list[list[dict[str, Any]]]:
    """Distribuye solo el desglose explicativo; nunca recalcula la nota."""
    criteria = [item for item in snapshot.get("criterios") or [] if isinstance(item, dict)]
    criteria_by_key = {str(item.get("stable_key")): item for item in criteria if item.get("stable_key")}
    questions = _question_by_number(blueprint)
    result: list[list[dict[str, Any]]] = []
    for component in components:
        keys = _criterion_keys_for_component(component, criteria=criteria, questions=questions)
        maximum = _decimal(component.get("puntos_maximos"))
        awarded_raw = component.get("puntos_obtenidos")
        awarded = _decimal(awarded_raw) if awarded_raw is not None else None
        allocations: list[dict[str, Any]] = []
        for index, key in enumerate(keys):
            is_last = index == len(keys) - 1
            max_share = maximum - sum((item["max_points"] for item in allocations), Decimal("0")) if is_last else (maximum / Decimal(len(keys))).quantize(Decimal("0.0001"), rounding=ROUND_DOWN)
            if awarded is None:
                awarded_share = None
            else:
                awarded_share = awarded - sum((item["awarded_points"] for item in allocations), Decimal("0")) if is_last else (awarded / Decimal(len(keys))).quantize(Decimal("0.0001"), rounding=ROUND_DOWN)
            allocations.append({"criterion_stable_key": key, "criterion": dict(criteria_by_key[key]), "max_points": max_share, "awarded_points": awarded_share})
        result.append(allocations)
    return result
