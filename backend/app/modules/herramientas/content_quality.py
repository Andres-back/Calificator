"""Contratos mínimos para no persistir herramientas vacías o redundantes."""
from __future__ import annotations

from typing import Any

from app.shared.enums import MaterialTipo


LIST_KEYS: dict[MaterialTipo, tuple[str, ...]] = {
    MaterialTipo.SOPA_LETRAS: ("banco_palabras",),
    MaterialTipo.CRUCIGRAMA: ("preguntas_horizontales", "preguntas_verticales"),
    MaterialTipo.UNIR_COLUMNAS: ("columna_izquierda", "columna_derecha"),
    MaterialTipo.EMPAREJAR: ("columna_izquierda", "columna_derecha"),
    MaterialTipo.CUENTO: ("parrafos",),
    MaterialTipo.GUIA: ("secciones",),
    MaterialTipo.TALLER: ("puntos",),
    MaterialTipo.EXAMEN: ("preguntas",),
    MaterialTipo.RUBRICA: ("criterios",),
    MaterialTipo.FICHA: ("ejercicios",),
    MaterialTipo.QUIZ_RAPIDO: ("preguntas",),
    MaterialTipo.LECTURA_COMPRENSIVA: ("preguntas",),
    MaterialTipo.MAPA_CONCEPTUAL: ("nodos",),
    MaterialTipo.FLASHCARDS: ("tarjetas",),
    MaterialTipo.PLAN_REFUERZO: ("semanas",),
}

NUMBERED_KEYS = {"preguntas", "puntos", "ejercicios", "tarjetas"}


def _identity(value: Any) -> str:
    if isinstance(value, dict):
        candidate = (
            value.get("enunciado")
            or value.get("concepto")
            or value.get("nombre")
            or value.get("titulo")
            or value.get("anverso")
            or value.get("texto")
            or value.get("pista")
            or value.get("palabra")
            or value.get("tema")
            or value.get("respuesta")
            or value.get("izquierda")
            or value.get("derecha")
        )
        if candidate is None:
            primitives = [
                str(item).strip().casefold()
                for item in value.values()
                if isinstance(item, (str, int, float)) and str(item).strip()
            ]
            return "|".join(primitives)
        return str(candidate).strip().casefold()
    return str(value).strip().casefold()


def _deduplicate(values: Any) -> list[Any]:
    if not isinstance(values, list):
        return []
    result: list[Any] = []
    seen: set[str] = set()
    for value in values:
        identity = _identity(value)
        if not identity or identity in seen:
            continue
        seen.add(identity)
        result.append(value)
    return result


def normalize_material_content(
    tipo: MaterialTipo,
    content: Any,
    *,
    fallback_title: str,
) -> tuple[dict[str, Any], list[str]]:
    """Normaliza colecciones y devuelve los incumplimientos esenciales."""
    normalized = dict(content) if isinstance(content, dict) else {}
    title = str(normalized.get("titulo") or fallback_title).strip()
    normalized["titulo"] = title or fallback_title

    for key in LIST_KEYS.get(tipo, ()):
        values = _deduplicate(normalized.get(key))
        if key in NUMBERED_KEYS:
            values = [
                {**value, "numero": index}
                if isinstance(value, dict)
                else value
                for index, value in enumerate(values, start=1)
            ]
        normalized[key] = values

    issues: list[str] = []
    if tipo == MaterialTipo.CRUCIGRAMA:
        grid = (normalized.get("crucigrama") or {}).get("grid") if isinstance(normalized.get("crucigrama"), dict) else None
        clues = normalized.get("preguntas_horizontales", []) + normalized.get("preguntas_verticales", [])
        if not isinstance(grid, list) or not grid:
            issues.append("la grilla del crucigrama está vacía")
        if not clues:
            issues.append("el crucigrama no contiene pistas")
    elif tipo == MaterialTipo.SOPA_LETRAS:
        if not isinstance(normalized.get("grilla"), list) or not normalized.get("grilla"):
            issues.append("la grilla de la sopa está vacía")
        if not normalized.get("banco_palabras"):
            issues.append("la sopa no contiene palabras")
    elif tipo in {MaterialTipo.UNIR_COLUMNAS, MaterialTipo.EMPAREJAR}:
        if not normalized.get("columna_izquierda") or not normalized.get("columna_derecha"):
            issues.append("faltan elementos en una columna")
        elif len(normalized["columna_izquierda"]) != len(normalized["columna_derecha"]):
            issues.append("las columnas tienen cantidades diferentes")
    else:
        for key in LIST_KEYS.get(tipo, ()):
            if not normalized.get(key):
                issues.append(f"la sección {key} está vacía")

    if tipo == MaterialTipo.LECTURA_COMPRENSIVA and not str(normalized.get("texto") or "").strip():
        issues.append("falta el texto de lectura")
    if tipo == MaterialTipo.MAPA_CONCEPTUAL and not str(normalized.get("concepto_principal") or "").strip():
        issues.append("falta el concepto principal")
    if tipo == MaterialTipo.RUBRICA and not normalized.get("escala"):
        issues.append("falta la escala de valoración")

    return normalized, issues
