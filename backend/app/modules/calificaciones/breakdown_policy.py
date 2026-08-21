"""Reglas puras para componentes, consenso y fórmula de calificación."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any

PENDING_STATES = {"ilegible", "no_evaluable", "revision_pendiente"}
VALID_STATES = {"correcta", "parcial", "incorrecta", "sin_respuesta", *PENDING_STATES}
ALLOWED_VALUATION_FIELDS = {"evaluador", "puntaje", "estado", "explicacion", "confianza", "proveedor", "modelo", "tiempo_ms"}


def _decimal(value: object, default: str = "0") -> Decimal:
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def canonical_key(item: dict, index: int, prefix: str = "pregunta") -> str:
    identity = item.get("id") or item.get("numero") or item.get("orden") or index + 1
    return f"{prefix}:{identity}"


def build_component_scaffold(blueprint: dict, *, manual_key: str | None = None) -> list[dict]:
    questions = list(blueprint.get("preguntas") or [])
    max_grade = _decimal(blueprint.get("nota_maxima", 5), "5")
    if manual_key:
        return [{"clave": f"manual:{manual_key}", "orden": 0, "tipo": "manual", "numero": None, "titulo": "Valoración directa del docente", "respuesta_referencia": None, "puntos_maximos": max_grade}]
    if questions:
        explicit = all(question.get("puntaje") is not None for question in questions)
        uniform = max_grade / Decimal(len(questions))
        expected = list(blueprint.get("respuestas_esperadas") or [])
        answers: dict[str, Any] = {}
        for index, item in enumerate(expected):
            if isinstance(item, dict):
                identity = item.get("numero") or item.get("id") or index + 1
                answer = next((item.get(key) for key in ("respuesta", "respuesta_correcta", "respuesta_esperada", "texto", "answer") if item.get(key) is not None), None)
            else:
                identity, answer = index + 1, item
            answers[str(identity)] = answer
        components: list[dict] = []
        for index, question in enumerate(questions):
            identity = question.get("numero") or question.get("id") or index + 1
            reference = question.get("respuesta_correcta") or question.get("respuesta_esperada") or answers.get(str(identity))
            if reference is None and index < len(expected):
                fallback = expected[index]
                reference = fallback if not isinstance(fallback, dict) else next((fallback.get(key) for key in ("respuesta", "respuesta_correcta", "respuesta_esperada", "texto", "answer") if fallback.get(key) is not None), None)
            components.append({
                "clave": canonical_key(question, index),
                "orden": index,
                "tipo": "pregunta",
                "numero": str(question.get("numero")) if question.get("numero") is not None else str(index + 1),
                "titulo": str(question.get("enunciado") or question.get("pregunta") or question.get("texto") or f"Pregunta {index + 1}"),
                "respuesta_referencia": reference,
                "puntos_maximos": _decimal(question.get("puntaje")) if explicit else uniform,
            })
        return components
    rubric = [criterion for criterion in (blueprint.get("criterios") or []) if criterion.get("puntaje") is not None or criterion.get("peso") is not None or criterion.get("maximo") is not None]
    return [{
        "clave": canonical_key(criterion, index, "rubrica"), "orden": index, "tipo": "rubrica", "numero": str(index + 1),
        "titulo": str(criterion.get("nombre") or criterion.get("descripcion") or f"Criterio {index + 1}"),
        "respuesta_referencia": criterion.get("descriptor") or criterion.get("descripcion"),
        "puntos_maximos": _decimal(criterion.get("puntaje") or criterion.get("maximo") or criterion.get("peso")),
    } for index, criterion in enumerate(rubric)]


def sanitize_valuation(value: dict) -> dict:
    clean = {key: value.get(key) for key in ALLOWED_VALUATION_FIELDS if value.get(key) is not None}
    clean["explicacion"] = " ".join(str(clean.get("explicacion") or "").split())[:2000]
    if clean.get("estado") not in VALID_STATES:
        clean["estado"] = "revision_pendiente"
    return clean


def sanitize_component_payload(value: dict) -> dict:
    """Conserva solo la evidencia mínima verificable que puede persistirse."""
    clean = sanitize_valuation(value)
    clean["clave"] = str(value.get("clave") or "")[:160]
    response = value.get("respuesta_estudiante")
    clean["respuesta_estudiante"] = str(response)[:4000] if response is not None else None
    clean["paginas"] = [page for page in (value.get("paginas") or []) if isinstance(page, int) and page > 0][:20]
    return clean

def component_consensus(scaffold: list[dict], components_a: list[dict], components_b: list[dict], objective_validation: list[dict] | None = None) -> tuple[list[dict], list[str]]:
    by_a = {str(item.get("clave")): item for item in components_a or []}
    by_b = {str(item.get("clave")): item for item in components_b or []}
    objective = {str(item.get("numero")): item for item in objective_validation or []}
    result: list[dict] = []
    blockers: list[str] = []
    for base in scaffold:
        key = base["clave"]
        a = sanitize_valuation({**by_a.get(key, {}), "evaluador": "A"}) if key in by_a else None
        b = sanitize_valuation({**by_b.get(key, {}), "evaluador": "B"}) if key in by_b else None
        maximum = _decimal(base["puntos_maximos"])
        validated = objective.get(str(base.get("numero")))
        response = (by_a.get(key) or {}).get("respuesta_estudiante") or (by_b.get(key) or {}).get("respuesta_estudiante")
        if validated and validated.get("correcta") is True:
            score, state, origin = maximum, "correcta", "objetivo"
            explanation = "La respuesta coincide con la clave oficial y recibe el puntaje completo."
            response = validated.get("respuesta_detectada") or response
            review = False
        elif not a and not b:
            score, state, origin = None, "revision_pendiente", "consenso_ia"
            explanation, review = "No se obtuvo una valoración verificable para esta respuesta.", True
        else:
            scores = [_decimal(item.get("puntaje")) for item in (a, b) if item and item.get("puntaje") is not None]
            score = sum(scores, Decimal("0")) / Decimal(len(scores)) if scores else None
            score = min(max(score, Decimal("0")), maximum) if score is not None else None
            states = [str(item.get("estado")) for item in (a, b) if item]
            threshold = max(Decimal("0.10"), maximum * Decimal("0.10"))
            material = len(scores) == 2 and abs(scores[0] - scores[1]) > threshold
            material = material or (len(set(states)) > 1 and {"correcta", "incorrecta"}.issubset(set(states)))
            state = states[0] if len(set(states)) == 1 else ("revision_pendiente" if material else "parcial")
            explanation = str((a or b or {}).get("explicacion") or "Valoración automática sin explicación suficiente.")
            review, origin = material or state in PENDING_STATES, "consenso_ia"
        if review:
            blockers.append(f"componente_pendiente:{key}")
        pages: list[int] = []
        for item in (by_a.get(key), by_b.get(key)):
            for page in (item or {}).get("paginas", []) or []:
                if isinstance(page, int) and page > 0 and page not in pages:
                    pages.append(page)
        result.append({**base, "respuesta_estudiante": response, "puntos_obtenidos": score, "estado": state, "explicacion_verificable": explanation, "explicacion_estudiante": explanation, "origen": origin, "requiere_revision": review, "evidencia_json": {"paginas": sorted(pages)}, "valoraciones_json": [item for item in (a, b) if item]})
    return result, blockers


def calculate_formula(components: list[dict], nota_maxima: object, ajuste_global: object = 0, decimales: int = 2) -> dict:
    maximum_grade = _decimal(nota_maxima, "5")
    possible = sum((_decimal(item.get("puntos_maximos")) for item in components), Decimal("0"))
    if possible <= 0:
        raise ValueError("Los puntos posibles deben ser mayores que cero")
    obtained = sum((_decimal(item.get("puntos_obtenidos")) for item in components if item.get("puntos_obtenidos") is not None), Decimal("0"))
    base = obtained / possible * maximum_grade
    adjustment = _decimal(ajuste_global)
    before_rounding = min(max(base + adjustment, Decimal("0")), maximum_grade)
    quantum = Decimal("1").scaleb(-decimales)
    final = before_rounding.quantize(quantum, rounding=ROUND_HALF_UP)
    return {"puntos_obtenidos": obtained, "puntos_posibles": possible, "nota_maxima": maximum_grade, "nota_base": base, "ajuste_global": adjustment, "nota_antes_redondeo": before_rounding, "regla_redondeo": "half_up", "decimales": decimales, "nota_final": final}


def coverage_state(components: list[dict]) -> tuple[str, list[str]]:
    blockers = [f"componente_pendiente:{item.get('clave')}" for item in components if item.get("requiere_revision") or item.get("puntos_obtenidos") is None]
    keys = [str(item.get("clave")) for item in components]
    if len(keys) != len(set(keys)):
        blockers.append("componentes_duplicados")
        return "inconsistente", blockers
    return ("incompleta", blockers) if blockers else ("completa", [])
