"""Reglas de modalidad por pregunta para evaluaciones online, físicas y mixtas."""
from __future__ import annotations

from typing import Any

from app.shared.enums import EvaluacionModalidad

ONLINE_RESPONSE_MODE = "online"
PHYSICAL_RESPONSE_MODES = {"fisica", "archivo"}
VALID_RESPONSE_MODES = {ONLINE_RESPONSE_MODE, *PHYSICAL_RESPONSE_MODES}


def _value(modality: str | EvaluacionModalidad | None) -> str:
    return modality.value if isinstance(modality, EvaluacionModalidad) else str(modality or "")


def normalize_question_modalities(
    questions: list[dict[str, Any]] | None,
    evaluation_modality: str | EvaluacionModalidad | None,
) -> list[dict[str, Any]]:
    """Devuelve copias con una modalidad explícita y coherente por pregunta."""
    modality = _value(evaluation_modality)
    normalized = [dict(question) for question in (questions or [])]
    if modality == EvaluacionModalidad.ONLINE.value:
        for question in normalized:
            question["modalidad_respuesta"] = ONLINE_RESPONSE_MODE
        return normalized
    if modality == EvaluacionModalidad.FISICA.value:
        for question in normalized:
            question["modalidad_respuesta"] = "fisica"
        return normalized
    if modality != EvaluacionModalidad.MIXTA.value:
        return normalized

    for question in normalized:
        configured = str(question.get("modalidad_respuesta") or "").lower()
        if configured not in VALID_RESPONSE_MODES:
            question["modalidad_respuesta"] = (
                "fisica" if str(question.get("tipo") or "").lower() == "abierta" else ONLINE_RESPONSE_MODE
            )

    if len(normalized) >= 2:
        if not any(item["modalidad_respuesta"] == ONLINE_RESPONSE_MODE for item in normalized):
            normalized[0]["modalidad_respuesta"] = ONLINE_RESPONSE_MODE
        if not any(item["modalidad_respuesta"] in PHYSICAL_RESPONSE_MODES for item in normalized):
            normalized[-1]["modalidad_respuesta"] = "fisica"
    return normalized


def validate_mixed_question_modalities(
    questions: list[dict[str, Any]],
    evaluation_modality: str | EvaluacionModalidad | None,
) -> None:
    if _value(evaluation_modality) != EvaluacionModalidad.MIXTA.value:
        return
    has_online = any(item.get("modalidad_respuesta") == ONLINE_RESPONSE_MODE for item in questions)
    has_physical = any(item.get("modalidad_respuesta") in PHYSICAL_RESPONSE_MODES for item in questions)
    if not has_online or not has_physical:
        raise ValueError(
            "Una evaluacion mixta necesita al menos una pregunta online y una fisica o de archivo."
        )


def question_numbers_by_section(questions: list[dict[str, Any]] | None) -> dict[str, list[Any]]:
    sections: dict[str, list[Any]] = {"online": [], "fisica": []}
    for index, question in enumerate(questions or [], start=1):
        number = question.get("numero", index)
        mode = question.get("modalidad_respuesta")
        target = "online" if mode == ONLINE_RESPONSE_MODE else "fisica"
        sections[target].append(number)
    return sections
