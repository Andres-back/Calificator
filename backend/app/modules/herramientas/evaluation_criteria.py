"""Criterios de recursos: guía observable, nunca otra suma de la nota."""
from __future__ import annotations

from copy import deepcopy
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import re
import unicodedata
from typing import Any


def _text(value: Any) -> str:
    return str(value or "").strip()


def _identity(value: Any) -> str:
    normalized = unicodedata.normalize("NFKD", _text(value).casefold())
    return re.sub(r"\W+", " ", "".join(c for c in normalized if not unicodedata.combining(c))).strip()


def _positive(value: Any, label: str) -> Decimal:
    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"{label}: introduce un número positivo válido.") from exc
    if not number.is_finite() or number <= 0:
        raise ValueError(f"{label}: introduce un número positivo válido.")
    return number


def teacher_criteria_from(source: dict[str, Any], content: dict[str, Any]) -> list[str]:
    trace = content.get("_xcalificator")
    trace = trace if isinstance(trace, dict) else {}
    values = source.get("criterios_rubrica") or source.get("criterios") or trace.get("criterios_rubrica") or []
    return [_text(item) for item in values if isinstance(item, str) and _text(item)] if isinstance(values, list) else []


def _family(material_type: str, question: dict[str, Any]) -> tuple[str, str, str]:
    if material_type == "crucigrama":
        return ("Identificación de conceptos", "La palabra registrada para la pista correspondiente.",
                "Otorgar el puntaje del punto si identifica y registra la palabra correcta; cero si es incorrecta.")
    if material_type == "sopa_letras":
        return ("Reconocimiento de vocabulario", "La palabra encontrada y registrada en el punto correspondiente.",
                "Otorgar el puntaje del punto si identifica la palabra solicitada; cero si es incorrecta.")
    if material_type in {"emparejar", "unir_columnas"}:
        return ("Correspondencia entre conceptos", "La relación elegida para el elemento solicitado.",
                "Otorgar el puntaje del punto por la correspondencia correcta; cero por una relación incorrecta.")
    if question.get("tipo") in {"completar", "opcion_multiple", "verdadero_falso"}:
        return ("Resolución del punto", "La respuesta registrada para la consigna correspondiente.",
                "Otorgar el puntaje del punto por la respuesta correcta según la clave; cero si es incorrecta.")
    names = {
        "cuento": "Comprensión del relato", "lectura_comprensiva": "Comprensión del texto",
        "mapa_conceptual": "Comprensión de relaciones conceptuales", "flashcards": "Explicación del concepto",
        "para_colorear": "Cumplimiento de la consigna", "plan_refuerzo": "Aplicación del aprendizaje trabajado",
    }
    return (names.get(material_type, "Desarrollo del aprendizaje solicitado"),
            "La respuesta o evidencia solicitada en el punto, incluyendo el procedimiento solo cuando se pide.",
            "Valorar el cumplimiento de la consigna y su corrección; asignar hasta el puntaje del punto según "
            "lo demostrado. El docente revisa los casos parciales; no penalizar aspectos no solicitados.")


def build_material_criteria(
    material_type: str,
    content: dict[str, Any],
    questions: list[dict[str, Any]],
    note_max: Decimal,
    teacher_criteria: list[str] | None = None,
    expected_answers: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """No modifica contenido/preguntas; rechaza propuestas explícitas defectuosas."""
    raw = content.get("criterios")
    teacher = teacher_criteria or []
    if not raw and not teacher:
        generated = content.get("criterios_revision") or []
        if isinstance(generated, list):
            teacher = [_text(value) for value in generated if isinstance(value, str) and _text(value)]
        if not teacher:
            points = content.get("puntos") or []
            if isinstance(points, list):
                teacher = list(dict.fromkeys(_text(point.get("criterio_logro")) for point in points
                                            if isinstance(point, dict) and _text(point.get("criterio_logro"))))
    numbers = [q["numero"] for q in questions]
    if raw is not None and (not isinstance(raw, list) or not raw or not all(isinstance(c, dict) for c in raw)):
        raise ValueError("Criterios: escribe criterios observables con nombre y descripción, no una lista de preguntas.")
    if not raw:
        if material_type == "rubrica":
            raise ValueError("Rúbrica: añade criterios, pesos y niveles distinguibles antes de evaluar.")
        if teacher:
            raw = [{"nombre": text, "descripcion": text, "preguntas_numeros": numbers} for text in teacher]
        else:
            return [
                {"id": index, "nombre": f"{_family(material_type, q)[0]} · punto {q['numero']}",
                 "descripcion": f"{_family(material_type, q)[0]}. Evidencia: {_family(material_type, q)[1]} "
                                f"Puntuación: {_family(material_type, q)[2]}",
                 "evidencia": _family(material_type, q)[1], "regla_puntuacion": _family(material_type, q)[2],
                 "puntaje_maximo": q["puntaje"], "preguntas_numeros": [q["numero"]], "niveles": {}}
                for index, q in enumerate(questions, 1)
            ]
    if teacher:
        combined = [_identity(f"{c.get('nombre', '')} {c.get('descripcion', '')}") for c in raw]
        if any(not any(_identity(text) in value for value in combined) for text in teacher):
            raise ValueError("Criterios: la propuesta no conserva todos los criterios del docente. Revísalos antes de evaluar.")

    result: list[dict[str, Any]] = []
    weights: list[Decimal] = []
    weight_fields = {"peso_porcentaje" if "peso_porcentaje" in c else "puntaje_maximo" if "puntaje_maximo" in c else "" for c in raw}
    if len(weight_fields) != 1:
        raise ValueError("Criterios: usa pesos coherentes en todos los criterios, sin mezclar escalas.")
    weight_field = next(iter(weight_fields))
    if material_type == "rubrica" and not weight_field:
        raise ValueError("Rúbrica: define los pesos de cada criterio.")
    seen: set[str] = set()
    prompts = {_identity(q["enunciado"]) for q in questions}
    for index, item in enumerate(raw, 1):
        label = f"Criterio {index}"
        name, description = _text(item.get("nombre")), _text(item.get("descripcion"))
        public_text = _identity(f"{name} {description} {item.get('evidencia', '')} {item.get('regla_puntuacion', '')} {item.get('niveles', '')}")
        if any(len(answer := _identity(expected.get("respuesta"))) >= 8 and f" {answer} " in f" {public_text} "
               for expected in expected_answers or []):
            raise ValueError(f"{label}: no incluyas la respuesta de referencia en el criterio visible al estudiante.")
        if any(key in item for key in {"respuesta", "respuesta_correcta", "respuesta_esperada", "solucion", "soluciones"}):
            raise ValueError(f"{label}: separa las soluciones de los criterios públicos.")
        if not name or not description or _identity(description) in prompts:
            raise ValueError(f"{label}: describe el logro que valorarás; no copies únicamente la pregunta.")
        identity = _identity(name)
        if identity in seen:
            raise ValueError(f"{label}: hay nombres de criterios duplicados; distingue sus logros.")
        seen.add(identity)
        refs = item.get("preguntas_numeros", numbers)
        if not isinstance(refs, list) or not refs or any(type(n) is not int or n not in numbers for n in refs):
            raise ValueError(f"{label}: referencia únicamente números de preguntas existentes.")
        levels = item.get("niveles", {})
        if not isinstance(levels, dict) or (levels and (len(levels) < 2 or any(not _text(k) or not _text(v) for k, v in levels.items())
                                                     or len({_identity(v) for v in levels.values()}) != len(levels))):
            raise ValueError(f"{label}: completa niveles distinguibles, no descripciones repetidas.")
        if material_type == "rubrica" and not levels:
            raise ValueError(f"{label}: la rúbrica necesita niveles de logro.")
        scale = content.get("escala")
        if isinstance(scale, list) and scale and levels and set(levels) != set(scale):
            raise ValueError(f"{label}: los niveles deben coincidir con la escala declarada.")
        evidence = _text(item.get("evidencia")) or "La respuesta o evidencia solicitada en las preguntas relacionadas."
        rule = _text(item.get("regla_puntuacion")) or (
            "Valorar este logro únicamente en la evidencia solicitada, usando los niveles declarados cuando existen. "
            "Los puntos finales se contabilizan por pregunta, sin sumarlos otra vez por criterio; el docente revisa los casos parciales."
        )
        criterion = deepcopy(item)
        criterion.update(id=item.get("id", index), nombre=name, descripcion=description,
                         evidencia=evidence, regla_puntuacion=rule, preguntas_numeros=list(dict.fromkeys(refs)), niveles=levels)
        if not item.get("evidencia") or not item.get("regla_puntuacion"):
            criterion["descripcion"] = f"{description} Evidencia: {evidence} Puntuación: {rule}"
        result.append(criterion)
        weights.append(_positive(item.get(weight_field), label) if weight_field else Decimal(1))
    total = sum(weights, Decimal(0))
    expected_total = Decimal(100) if weight_field == "peso_porcentaje" else note_max
    if weight_field and total != expected_total:
        raise ValueError(f"Criterios: los pesos deben sumar {expected_total}, no {total}. Corrige la escala.")
    if weight_field == "peso_porcentaje" and any("puntaje_maximo" in item for item in raw):
        points = [_positive(item.get("puntaje_maximo"), f"Criterio {index}") for index, item in enumerate(raw, 1)]
        point_total = sum(points, Decimal(0))
        if any(abs(points[index] - point_total * weight / total) > Decimal("0.01") for index, weight in enumerate(weights)):
            raise ValueError("Criterios: los puntajes y porcentajes se contradicen. Usa pesos coherentes antes de evaluar.")
    accumulated = Decimal(0)
    for index, (criterion, weight) in enumerate(zip(result, weights, strict=True)):
        score = note_max - accumulated if index == len(result) - 1 else (note_max * weight / total).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if score <= 0:
            raise ValueError("Criterios: reduce la cantidad o ajusta los pesos para que cada criterio tenga puntaje positivo.")
        criterion["puntaje_maximo"] = float(score)
        accumulated += score
    return result
