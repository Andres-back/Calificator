"""Adapta materiales generados al contrato canónico de evaluaciones.

No crea un segundo flujo de calificación: traduce cada material válido a la
estructura que ya consumen Evaluacion, Entrega y Calificacion.
"""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Iterable

from app.shared.enums import EvaluacionModalidad, MaterialTipo


EVALUABLE_MATERIAL_TYPES = frozenset(
    {
        MaterialTipo.SOPA_LETRAS.value,
        MaterialTipo.CRUCIGRAMA.value,
        MaterialTipo.UNIR_COLUMNAS.value,
        MaterialTipo.EMPAREJAR.value,
        MaterialTipo.CUENTO.value,
        MaterialTipo.PARA_COLOREAR.value,
        MaterialTipo.GUIA.value,
        MaterialTipo.TALLER.value,
        MaterialTipo.EXAMEN.value,
        MaterialTipo.RUBRICA.value,
        MaterialTipo.PLAN_REFUERZO.value,
        MaterialTipo.FICHA.value,
        MaterialTipo.QUIZ_RAPIDO.value,
        MaterialTipo.LECTURA_COMPRENSIVA.value,
        MaterialTipo.MAPA_CONCEPTUAL.value,
        MaterialTipo.FLASHCARDS.value,
    }
)

_MANUAL_EVIDENCE_TYPES = {
    MaterialTipo.PARA_COLOREAR.value,
    MaterialTipo.RUBRICA.value,
    MaterialTipo.MAPA_CONCEPTUAL.value,
}


def is_evaluable_material_type(material_type: str) -> bool:
    return material_type in EVALUABLE_MATERIAL_TYPES


def _text(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def _dict_items(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def _strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [text for item in value if (text := _text(item))]


def _answer(item: dict[str, Any]) -> str:
    for key in (
        "respuesta_correcta",
        "respuesta_esperada",
        "respuesta",
        "solucion",
        "reverso",
    ):
        value = item.get(key)
        if value not in (None, "", []):
            if isinstance(value, list):
                return ", ".join(_text(part) for part in value if _text(part))
            return _text(value)
    return ""


def _question_type(item: dict[str, Any]) -> str:
    raw = _text(item.get("tipo")).lower().replace("/", "_")
    if raw in {"verdadero_falso", "verdadero o falso", "vf"}:
        return "verdadero_falso"
    if raw in {"opcion_multiple", "seleccion_multiple", "selección múltiple"}:
        return "opcion_multiple"
    if raw in {"completar", "rellenar"}:
        return "completar"
    if isinstance(item.get("opciones"), list) and item.get("opciones"):
        return "opcion_multiple"
    return "abierta"


def _options(item: dict[str, Any]) -> list[str]:
    options: list[str] = []
    for option in item.get("opciones") or []:
        if isinstance(option, dict):
            value = option.get("texto") or option.get("label") or option.get("valor")
        else:
            value = option
        if text := _text(value):
            options.append(text)
    return options


def _generic_questions(content: dict[str, Any]) -> list[dict[str, Any]]:
    raw: list[Any] = []
    for key in ("preguntas", "ejercicios", "puntos"):
        if isinstance(content.get(key), list):
            raw.extend(content[key])
    result: list[dict[str, Any]] = []
    for index, item in enumerate(raw, start=1):
        if isinstance(item, str):
            result.append({"enunciado": item, "tipo": "abierta", "respuesta": ""})
            continue
        if not isinstance(item, dict):
            continue
        prompt = _text(
            item.get("enunciado")
            or item.get("pregunta")
            or item.get("descripcion")
            or item.get("instruccion")
            or item.get("texto")
        )
        if not prompt:
            prompt = f"Desarrolla el punto {index}."
        result.append(
            {
                "enunciado": prompt,
                "tipo": _question_type(item),
                "opciones": _options(item),
                "respuesta": _answer(item),
                "peso": item.get("puntaje") or item.get("peso_porcentaje") or 1,
            }
        )
    return result


def _crossword_questions(content: dict[str, Any]) -> list[dict[str, Any]]:
    clues = [
        *_dict_items(content.get("preguntas_horizontales")),
        *_dict_items(content.get("preguntas_verticales")),
    ]
    if not clues and isinstance(content.get("crucigrama"), dict):
        nested = content["crucigrama"]
        clues = [
            *_dict_items(nested.get("pistas_horizontal")),
            *_dict_items(nested.get("pistas_vertical")),
        ]
    return [
        {
            "enunciado": _text(item.get("pista") or item.get("definicion")),
            "tipo": "completar",
            "respuesta": _text(item.get("respuesta") or item.get("palabra")),
        }
        for item in clues
        if _text(item.get("pista") or item.get("definicion"))
        and _text(item.get("respuesta") or item.get("palabra"))
    ]


def _word_search_questions(content: dict[str, Any]) -> list[dict[str, Any]]:
    bank = _dict_items(content.get("banco"))
    if bank:
        return [
            {
                "enunciado": (
                    f"Escribe la palabra que corresponde a esta pista: {_text(item.get('pista'))}"
                    if _text(item.get("pista"))
                    else "Registra una de las palabras encontradas en la sopa de letras."
                ),
                "tipo": "completar",
                "respuesta": _text(item.get("palabra")),
            }
            for item in bank
            if _text(item.get("palabra"))
        ]
    words = _strings(content.get("banco_palabras"))
    if not words:
        words = [
            _text(item.get("palabra"))
            for item in _dict_items(content.get("palabras"))
            if _text(item.get("palabra"))
        ]
    return [
        {
            "enunciado": "Registra una de las palabras encontradas en la sopa de letras.",
            "tipo": "completar",
            "respuesta": word,
        }
        for word in words
    ]


def _matching_questions(content: dict[str, Any]) -> list[dict[str, Any]]:
    left = _dict_items(content.get("columna_izquierda"))
    right = _dict_items(content.get("columna_derecha"))
    solutions = {
        str(item.get("numero")): _text(item.get("letra"))
        for item in _dict_items(content.get("soluciones"))
    }
    right_by_letter = {
        _text(item.get("letra")): _text(item.get("texto")) for item in right
    }
    if left and right:
        options = [
            f"{letter}) {text}"
            for letter, text in right_by_letter.items()
            if letter and text
        ]
        questions: list[dict[str, Any]] = []
        for index, item in enumerate(left, start=1):
            number = str(item.get("numero") or index)
            letter = solutions.get(number, "")
            expected = f"{letter}) {right_by_letter.get(letter, '')}".strip()
            questions.append(
                {
                    "enunciado": f"Relaciona: {_text(item.get('texto'))}",
                    "tipo": "opcion_multiple",
                    "opciones": options,
                    "respuesta": expected,
                }
            )
        return questions
    return [
        {
            "enunciado": f"Relaciona el concepto: {_text(item.get('izquierda'))}",
            "tipo": "abierta",
            "respuesta": _text(item.get("derecha")),
        }
        for item in _dict_items(content.get("pares"))
        if _text(item.get("izquierda")) and _text(item.get("derecha"))
    ]


def _story_questions(content: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for item in content.get("preguntas_comprension") or []:
        if isinstance(item, dict):
            prompt = _text(item.get("enunciado") or item.get("pregunta"))
            answer = _answer(item)
        else:
            prompt, answer = _text(item), ""
        if prompt:
            result.append({"enunciado": prompt, "tipo": "abierta", "respuesta": answer})
    return result


def _guide_questions(content: dict[str, Any]) -> list[dict[str, Any]]:
    activities = _strings(content.get("evaluacion_formativa"))
    for section in _dict_items(content.get("secciones")):
        activities.extend(_strings(section.get("actividades")))
    return [
        {"enunciado": activity, "tipo": "abierta", "respuesta": ""}
        for activity in activities
    ]


def _reinforcement_questions(content: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for week in _dict_items(content.get("semanas")):
        label = _text(week.get("semana") or week.get("tema"))
        for activity in _strings(week.get("actividades")):
            result.append(
                {
                    "enunciado": f"{f'Semana {label}: ' if label else ''}{activity}",
                    "tipo": "abierta",
                    "respuesta": "",
                }
            )
    return result


def _flashcard_questions(content: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "enunciado": f"Explica el concepto: {_text(item.get('anverso'))}",
            "tipo": "abierta",
            "respuesta": _text(item.get("reverso")),
        }
        for item in _dict_items(content.get("tarjetas"))
        if _text(item.get("anverso"))
    ]


def _concept_map_questions(content: dict[str, Any]) -> list[dict[str, Any]]:
    nodes = {
        _text(item.get("id")): _text(item.get("concepto"))
        for item in _dict_items(content.get("nodos"))
    }
    questions: list[dict[str, Any]] = []
    for relation in _dict_items(content.get("relaciones")):
        origin = nodes.get(_text(relation.get("origen")), _text(relation.get("origen")))
        target = nodes.get(_text(relation.get("destino")), _text(relation.get("destino")))
        label = _text(relation.get("etiqueta"))
        if origin and target:
            questions.append(
                {
                    "enunciado": f"Explica la relación entre {origin} y {target}.",
                    "tipo": "abierta",
                    "respuesta": f"{origin} {label} {target}".strip(),
                }
            )
    return questions


def _material_context(material_type: str, content: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in ("objetivo", "introduccion", "texto", "descripcion", "moraleja", "objetivo_general"):
        if text := _text(content.get(key)):
            parts.append(text)
    parts.extend(_strings(content.get("parrafos")))
    if material_type == MaterialTipo.GUIA.value:
        for section in _dict_items(content.get("secciones")):
            if text := _text(section.get("contenido")):
                parts.append(text)
    return "\n\n".join(parts)[:6000]


def _raw_questions(material_type: str, content: dict[str, Any]) -> list[dict[str, Any]]:
    if material_type == MaterialTipo.SOPA_LETRAS.value:
        return _word_search_questions(content)
    if material_type == MaterialTipo.CRUCIGRAMA.value:
        return _crossword_questions(content)
    if material_type in {MaterialTipo.UNIR_COLUMNAS.value, MaterialTipo.EMPAREJAR.value}:
        return _matching_questions(content)
    if material_type == MaterialTipo.CUENTO.value:
        return _story_questions(content)
    if material_type == MaterialTipo.GUIA.value:
        return _guide_questions(content)
    if material_type == MaterialTipo.PLAN_REFUERZO.value:
        return _reinforcement_questions(content)
    if material_type == MaterialTipo.FLASHCARDS.value:
        return _flashcard_questions(content)
    if material_type == MaterialTipo.MAPA_CONCEPTUAL.value:
        return _concept_map_questions(content)
    if material_type in _MANUAL_EVIDENCE_TYPES:
        return []
    return _generic_questions(content)


def _weights(items: list[dict[str, Any]], note_max: Decimal) -> list[Decimal]:
    raw: list[Decimal] = []
    for item in items:
        try:
            value = Decimal(str(item.get("peso") or 1))
        except (ArithmeticError, TypeError, ValueError):
            value = Decimal("1")
        raw.append(value if value > 0 else Decimal("1"))
    total = sum(raw, Decimal("0"))
    result: list[Decimal] = []
    accumulated = Decimal("0")
    for index, value in enumerate(raw):
        if index == len(raw) - 1:
            score = note_max - accumulated
        else:
            score = (note_max * value / total).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            accumulated += score
        result.append(score)
    return result


def _rubric_criteria(content: dict[str, Any], note_max: Decimal) -> list[dict[str, Any]]:
    raw = _dict_items(content.get("criterios"))
    if not raw:
        return []
    weights = _weights(
        [{"peso": item.get("peso_porcentaje") or 1} for item in raw],
        note_max,
    )
    return [
        {
            "id": index,
            "nombre": _text(item.get("nombre")) or f"Criterio {index}",
            "descripcion": _text(item.get("descripcion")),
            "puntaje_maximo": float(weights[index - 1]),
            "niveles": item.get("niveles") if isinstance(item.get("niveles"), dict) else {},
        }
        for index, item in enumerate(raw, start=1)
    ]


def build_evaluation_structure(
    material_type: str,
    content: dict[str, Any],
    *,
    note_max: float | Decimal,
    modality: str | EvaluacionModalidad,
) -> dict[str, Any]:
    """Devuelve preguntas, clave y criterios compatibles con el grader actual."""
    if not is_evaluable_material_type(material_type):
        raise ValueError("Este tipo de material no admite asignación evaluable")
    if not isinstance(content, dict) or not content:
        raise ValueError("El material no contiene una estructura válida para evaluar")
    modality_value = modality.value if isinstance(modality, EvaluacionModalidad) else str(modality)
    note = Decimal(str(note_max))
    if note <= 0:
        raise ValueError("La nota máxima debe ser mayor que cero")

    raw_questions = _raw_questions(material_type, content)
    context = _material_context(material_type, content)
    if not raw_questions:
        raw_questions = [
            {
                "enunciado": (
                    "Presenta o describe la evidencia solicitada en este material para que el docente la valore."
                ),
                "tipo": "abierta",
                "respuesta": "",
            }
        ]
    if modality_value == EvaluacionModalidad.MIXTA.value and len(raw_questions) == 1:
        raw_questions.append(
            {
                "enunciado": (
                    "Adjunta o presenta evidencia fisica del desarrollo de esta "
                    "actividad para que el docente la valore."
                ),
                "tipo": "abierta",
                "respuesta": "",
            }
        )

    weights = _weights(raw_questions, note)
    questions: list[dict[str, Any]] = []
    expected: list[dict[str, Any]] = []
    for index, (item, score) in enumerate(zip(raw_questions, weights, strict=True), start=1):
        question_type = _text(item.get("tipo")) or "abierta"
        if modality_value == EvaluacionModalidad.ONLINE.value:
            response_mode = "online"
        elif modality_value == EvaluacionModalidad.FISICA.value:
            response_mode = "fisica"
        else:
            # Toda actividad mixta conserva el orden original y expone como
            # minimo un punto online y otro fisico de forma determinista.
            response_mode = "online" if index % 2 == 1 else "fisica"
        question = {
            "numero": index,
            "tipo": question_type,
            "enunciado": _text(item.get("enunciado")) or f"Punto {index}",
            "opciones": item.get("opciones") if isinstance(item.get("opciones"), list) else [],
            "puntaje": float(score),
            "modalidad_respuesta": response_mode,
            "material_tipo": material_type,
        }
        if context:
            question["contexto_material"] = context
        questions.append(question)
        if answer := _text(item.get("respuesta")):
            expected.append({"numero": index, "respuesta": answer})

    rubric = _rubric_criteria(content, note)
    criteria = rubric or [
        {
            "id": index,
            "nombre": f"Punto {index}",
            "descripcion": _text(question["enunciado"])[:240],
            "puntaje_maximo": question["puntaje"],
        }
        for index, question in enumerate(questions, start=1)
    ]
    all_objective = bool(expected) and len(expected) == len(questions)
    if material_type in _MANUAL_EVIDENCE_TYPES:
        strategy = "manual"
    elif all_objective:
        strategy = "autocorreccion_total"
    else:
        strategy = "ia_asistida"
    if modality_value == EvaluacionModalidad.MIXTA.value:
        strategy = "mixta"

    return {
        "preguntas": questions,
        "respuestas_esperadas": expected,
        "criterios": criteria,
        "descripcion": context,
        "metas": _strings(content.get("objetivos"))
        or ([context[:240]] if context else []),
        "reglas_feedback": {
            "origen_material": material_type,
            "estrategia_calificacion": strategy,
            "requiere_confirmacion_docente": True,
            "orientar_sin_dar_respuesta": True,
        },
    }
