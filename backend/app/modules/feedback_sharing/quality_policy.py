"""Puerta de publicación: no sustituye la revisión académica del docente."""
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException

from app.modules.calificaciones.breakdown_policy import feedback_quality_guard
from app.modules.calificaciones.feedback_usefulness import is_generic_feedback
from app.modules.impacto_tesis.schemas import FeedbackQualityPayload

QUALITY_DIMENSIONS = ("correccion", "especificidad", "claridad", "utilidad", "adecuacion")


def quality_review_record(review: dict, evaluator_id: str, severe_incidents: list[str]) -> dict:
    """Registro explícito de valoración humana; nunca asigna ratings por IA."""
    evaluator = UUID(evaluator_id)
    if any(type(review.get(key)) is not int for key in QUALITY_DIMENSIONS):
        raise ValueError("Se requieren las cinco valoraciones enteras del revisor")
    value = FeedbackQualityPayload.model_validate(review)
    allowed = {"error_academico", "comentario_no_sustentado", "contradiccion_puntaje", "otra"}
    if len(severe_incidents) > 100 or any(code not in allowed for code in severe_incidents):
        raise ValueError("Usa códigos de incidencia, sin información del estudiante")
    return {
        "record_version": 1, "evaluator_id": str(evaluator), "review": value.model_dump(),
        "severe_incidents": list(severe_incidents), "severe_incident_count": len(severe_incidents),
        "passed": not severe_incidents and all(getattr(value, key) >= 4 for key in QUALITY_DIMENSIONS),
    }


def ensure_feedback_coherence(grade, components: list[dict]) -> None:
    feedback = (grade.feedback or "").strip()
    if feedback.casefold().startswith("retroalimentación provisional"):
        raise HTTPException(409, "Revisa y edita la retroalimentación provisional antes de compartirla.")
    # No comparar contra la sugerencia antigua: el docente pudo ajustar la nota.
    # El cálculo oficial/desglose se valida aparte; aquí solo coherencia textual.
    report = feedback_quality_guard(
        components=components, original_feedback=feedback, blockers=[],
        model_score=None, calculated_score=Decimal("0"),
    )
    if report["status"] != "passed":
        raise HTTPException(409, "La retroalimentación dice que todo está correcto, pero hay respuestas por mejorar. Revísala antes de compartir.")
    if is_generic_feedback(feedback):
        raise HTTPException(409, "Añade una explicación o recomendación concreta sobre esta actividad antes de compartir la retroalimentación.")
