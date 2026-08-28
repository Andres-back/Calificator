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
READING_TYPES = ("literal", "inferencial", "vocabulario", "critica")


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


def _text(value: Any) -> str:
    return str(value or "").strip()


def _missing(issues: list[str], condition: bool, message: str) -> None:
    if condition:
        issues.append(message)


def _positive_int(value: Any) -> int:
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


def _normalize_guide(content: dict[str, Any]) -> None:
    content["objetivos"] = _deduplicate(content.get("objetivos"))
    content["saberes_previos"] = _deduplicate(content.get("saberes_previos"))
    sections = _deduplicate(content.get("secciones"))
    normalized: list[dict[str, Any]] = []
    for section in sections:
        if not isinstance(section, dict):
            continue
        explanation = _text(section.get("explicacion") or section.get("contenido"))
        normalized.append({
            **section,
            "explicacion": explanation,
            "contenido": _text(section.get("contenido") or explanation),
            "actividades": _deduplicate(section.get("actividades")),
        })
    content["secciones"] = normalized
    content["evaluacion_formativa"] = _deduplicate(content.get("evaluacion_formativa"))


def _normalize_reading(content: dict[str, Any]) -> None:
    questions: list[dict[str, Any]] = []
    for index, question in enumerate(_deduplicate(content.get("preguntas")), start=1):
        if not isinstance(question, dict):
            continue
        question_type = _text(question.get("tipo")).casefold().replace("í", "i")
        questions.append({**question, "numero": index, "tipo": question_type})
    content["preguntas"] = questions


def _normalize_workshop(content: dict[str, Any]) -> None:
    points: list[dict[str, Any]] = []
    for index, point in enumerate(_deduplicate(content.get("puntos")), start=1):
        if not isinstance(point, dict):
            continue
        points.append({**point, "numero": index})
    content["puntos"] = points
    content["criterios_revision"] = _deduplicate(content.get("criterios_revision"))


def _normalize_plan(content: dict[str, Any]) -> None:
    weeks: list[dict[str, Any]] = []
    for index, week in enumerate(_deduplicate(content.get("semanas")), start=1):
        if not isinstance(week, dict):
            continue
        weeks.append({
            **week,
            "semana": week.get("semana") or week.get("numero") or index,
            "meta_semana": _text(week.get("meta_semana") or week.get("meta")),
            "actividades": _deduplicate(week.get("actividades")),
            "recursos": _deduplicate(week.get("recursos")),
        })
    content["semanas"] = weeks
    for key in ("dificultades", "fortalezas", "estrategias_apoyo", "indicadores_mejora", "recomendaciones_familia"):
        content[key] = _deduplicate(content.get(key))


def normalize_material_content(
    tipo: MaterialTipo,
    content: Any,
    *,
    fallback_title: str,
    expected_count: int | None = None,
) -> tuple[dict[str, Any], list[str]]:
    """Normaliza colecciones y devuelve los incumplimientos esenciales."""
    normalized = dict(content) if isinstance(content, dict) else {}
    title = str(normalized.get("titulo") or fallback_title).strip()
    normalized["titulo"] = title or fallback_title

    if tipo == MaterialTipo.GUIA:
        _normalize_guide(normalized)
    elif tipo == MaterialTipo.LECTURA_COMPRENSIVA:
        _normalize_reading(normalized)
    elif tipo == MaterialTipo.TALLER:
        _normalize_workshop(normalized)
    elif tipo == MaterialTipo.PLAN_REFUERZO:
        _normalize_plan(normalized)

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

    if tipo == MaterialTipo.GUIA:
        sections = normalized.get("secciones", [])
        _missing(issues, not normalized.get("objetivos"), "faltan objetivos de aprendizaje")
        _missing(issues, not normalized.get("saberes_previos"), "faltan saberes previos")
        _missing(issues, not _text(normalized.get("introduccion")), "falta la introducción")
        _missing(issues, len(sections) < 2, "la guía requiere al menos dos secciones")
        for index, section in enumerate(sections, start=1):
            _missing(issues, not _text(section.get("explicacion")), f"falta la explicación de la sección {index}")
            _missing(issues, not _text(section.get("ejemplo_guiado")), f"falta el ejemplo guiado de la sección {index}")
            _missing(issues, not section.get("actividades"), f"faltan actividades en la sección {index}")
            _missing(issues, not _text(section.get("verificacion")), f"falta la verificación de la sección {index}")
        activity_count = sum(len(section.get("actividades") or []) for section in sections)
        if expected_count is not None and activity_count != expected_count:
            issues.append(f"se solicitaron {expected_count} actividades y se generaron {activity_count}")
        _missing(
            issues,
            not _text(normalized.get("cierre")) and not normalized.get("evaluacion_formativa"),
            "falta el cierre o la evaluación formativa",
        )

    if tipo == MaterialTipo.LECTURA_COMPRENSIVA:
        questions = normalized.get("preguntas", [])
        _missing(issues, not _text(normalized.get("instrucciones")), "faltan las instrucciones de lectura")
        _missing(issues, not _text(normalized.get("estrategia_lectora")), "falta la estrategia lectora")
        if expected_count is not None and len(questions) != expected_count:
            issues.append(f"se solicitaron {expected_count} preguntas y se generaron {len(questions)}")
        required_types = READING_TYPES[: min(len(questions), len(READING_TYPES))]
        present_types = {_text(question.get("tipo")).casefold() for question in questions}
        for question_type in required_types:
            _missing(issues, question_type not in present_types, f"falta una pregunta de tipo {question_type}")
        for index, question in enumerate(questions, start=1):
            _missing(issues, not _text(question.get("enunciado")), f"falta el enunciado de la pregunta {index}")
            _missing(issues, not _text(question.get("respuesta_esperada") or question.get("respuesta_correcta")), f"falta la respuesta de la pregunta {index}")
            _missing(issues, not _text(question.get("evidencia_textual") or question.get("justificacion")), f"falta evidencia o justificación en la pregunta {index}")
            _missing(issues, not _text(question.get("dificultad")), f"falta la dificultad de la pregunta {index}")

    if tipo == MaterialTipo.TALLER:
        points = normalized.get("puntos", [])
        _missing(issues, not _text(normalized.get("objetivo")), "falta el objetivo del taller")
        _missing(issues, not _text(normalized.get("instrucciones")), "faltan las instrucciones del taller")
        if expected_count is not None and len(points) != expected_count:
            issues.append(f"se solicitaron {expected_count} puntos y se generaron {len(points)}")
        total = 0.0
        for index, point in enumerate(points, start=1):
            _missing(issues, not _text(point.get("enunciado")), f"falta el enunciado del punto {index}")
            _missing(issues, not _text(point.get("dificultad")), f"falta la dificultad del punto {index}")
            try:
                score = float(point.get("puntaje") or 0)
            except (TypeError, ValueError):
                score = 0
            total += max(0, score)
            _missing(issues, score <= 0, f"falta el puntaje del punto {index}")
            _missing(issues, not _text(point.get("respuesta_esperada") or point.get("criterio_logro")), f"falta la respuesta esperada o criterio del punto {index}")
            _missing(issues, _positive_int(point.get("lineas_respuesta")) < 1, f"falta espacio de respuesta en el punto {index}")
        declared = normalized.get("puntaje_total")
        if declared is None:
            issues.append("falta el puntaje total del taller")
        else:
            try:
                if abs(float(declared) - total) > 0.001:
                    issues.append("el puntaje total no coincide con la suma de los puntos")
            except (TypeError, ValueError):
                issues.append("el puntaje total del taller no es válido")

    if tipo == MaterialTipo.PLAN_REFUERZO:
        weeks = normalized.get("semanas", [])
        _missing(issues, not _text(normalized.get("diagnostico_inicial")), "falta el diagnóstico inicial")
        _missing(issues, not _text(normalized.get("objetivo_general")), "falta el objetivo general")
        _missing(issues, len(weeks) < 2, "el plan requiere al menos dos sesiones")
        for index, week in enumerate(weeks, start=1):
            _missing(issues, not _text(week.get("tema")), f"falta el tema de la sesión {index}")
            _missing(issues, not _text(week.get("meta_semana")), f"falta la meta de la sesión {index}")
            _missing(issues, not week.get("actividades"), f"faltan actividades en la sesión {index}")
            _missing(issues, not week.get("recursos"), f"faltan recursos en la sesión {index}")
            _missing(issues, not _text(week.get("evidencia")), f"falta la evidencia de la sesión {index}")
            _missing(issues, not _text(week.get("responsable")), f"falta el responsable de la sesión {index}")
        _missing(issues, not normalized.get("indicadores_mejora"), "faltan indicadores de mejora")
        _missing(issues, not _text(normalized.get("comprobacion_final")), "falta la comprobación final")

    return normalized, issues
