"""Señales conservadoras de utilidad; no certifican corrección académica."""
import re
import unicodedata

_GENERIC_CLAUSES = tuple(re.compile(pattern) for pattern in (
    r"(?:muy )?bien", r"(?:muy )?buen(?: trabajo| esfuerzo| avance)",
    r"excelente(?: trabajo| esfuerzo)?", r"felicitaciones",
    r"trabajo perfecto", r"todo esta correcto", r"todas las respuestas estan correctas",
    r"sigue(?: asi| practicando| estudiando| esforzandote)",
    r"(?:debes? |necesitas? )?(?:mejorar|practicar|repasar|estudiar)(?: mas)?(?: en (?:matematicas|lectura|lenguaje|espanol|ciencias))?",
    r"(?:estudia|practica|repasa)(?: mas)?", r"esfuerzate(?: mas)?",
    r"revisa(?: tus| las| los)? (?:respuestas|errores|preguntas|trabajo|ejercicios)",
    r"presta(?: mas)? atencion", r"(?:respuesta )?(?:correcta|incorrecta|parcial|incompleta)",
    r"(?:es |esta )?(?:correct[oa]|incorrect[oa]|incomplet[oa])",
))
_PENDING = {"ilegible", "no_evaluable", "revision_pendiente"}


def _normalize(value):
    normalized = unicodedata.normalize("NFKD", str(value or "").casefold())
    return " ".join("".join(char for char in normalized if not unicodedata.combining(char)).split())


def is_generic_feedback(value):
    """Solo reconoce fórmulas vacías conocidas; texto desconocido no es validado."""
    normalized = re.sub(r"\bpregunta\s+\d+\s*[:\-]?\s*", "", _normalize(value))
    clauses = [part.strip(" ¡!¿?\"'()") for part in re.split(r"[.!?;:,]+|\s+y\s+", normalized)]
    clauses = [part for part in clauses if part]
    return bool(clauses) and all(any(pattern.fullmatch(part) for pattern in _GENERIC_CLAUSES) for part in clauses)


def assess_feedback_usefulness(feedback, components):
    """Avisos explicables, sin puntuar las cinco dimensiones ni mutar evidencia."""
    reasons, without_explanation, without_action, pending = [], [], [], []
    if not str(feedback or "").strip():
        reasons.append("feedback_vacio")
    elif is_generic_feedback(feedback):
        reasons.append("feedback_generico")
    for index, item in enumerate(components):
        identity = str(item.get("numero") or item.get("clave") or index + 1)
        if item.get("estado") in _PENDING:
            pending.append(identity)
            continue  # Una foto ilegible no demuestra un error del estudiante.
        if item.get("estado") not in {"incorrecta", "parcial", "sin_respuesta"}:
            continue
        explanation = item.get("explicacion") or item.get("explicacion_estudiante") or ""
        orientation = item.get("orientacion_mejora") or (item.get("evidencia_json") or {}).get("orientacion_mejora") or ""
        if not str(explanation).strip() or is_generic_feedback(explanation):
            without_explanation.append(identity)
        if not str(orientation).strip() or is_generic_feedback(orientation):
            without_action.append(identity)
    if without_explanation:
        reasons.append("falta_explicacion_concreta")
    if without_action:
        reasons.append("falta_siguiente_paso")
    if pending:
        reasons.append("evidencia_pendiente")
    return {
        "version": "feedback-usefulness-v1",
        "status": "needs_review" if reasons else "no_obvious_gaps" if components else "limited_context",
        "reasons": reasons, "sin_explicacion_concreta": without_explanation,
        "sin_siguiente_paso": without_action, "evidencia_pendiente": pending,
        "academic_correctness_verified": False, "requires_teacher_validation": True,
    }
