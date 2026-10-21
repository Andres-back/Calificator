"""Proyección pública permitida, nunca resultado_json ni contexto docente crudo."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
import hashlib
import json

from fastapi import HTTPException

from app.modules.calificaciones.breakdown_service import answers_released, serialize_breakdown
from app.modules.feedback_sharing.quality_policy import ensure_feedback_coherence


@dataclass(frozen=True)
class Projection:
    payload: dict
    fingerprint: str


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, default=str, separators=(",", ":")).encode()).hexdigest()


def build_projection(grade, evaluation, student_name: str, subject_name: str, breakdown, *, evidence_identity=None) -> Projection:
    if (
        grade.estado not in {"confirmada", "ajustada", "publicada"}
        or not grade.revisado_por_docente
        or grade.nota_confirmada is None
    ):
        raise HTTPException(409, "Primero revisa y confirma la nota de este estudiante.")
    if not grade.feedback or not grade.feedback.strip():
        raise HTTPException(409, "Añade y revisa la retroalimentación antes de compartir.")
    note, maximum = Decimal(str(grade.nota_confirmada)), Decimal(str(evaluation.nota_maxima))
    if not note.is_finite() or not maximum.is_finite() or maximum <= 0 or not 0 <= note <= maximum:
        raise HTTPException(409, "Revisa la nota y la escala de esta evaluación.")
    released = answers_released(evaluation)
    answers = []
    breakdown_identity = None
    if breakdown is not None:
        if breakdown.cobertura_estado != "completa" or breakdown.requiere_revision or Decimal(str(breakdown.nota_final)) != note:
            raise HTTPException(409, "Revisa los puntajes por pregunta antes de compartir esta devolución.")
        data = serialize_breakdown(breakdown, student=True, reveal_key=released)
        for item in data["componentes"]:
            answer = {key: item.get(key) for key in (
                "numero", "titulo", "respuesta_estudiante", "puntos_obtenidos",
                "puntos_maximos", "estado", "explicacion", "orientacion_mejora",
            )}
            if released:
                answer["respuesta_referencia"] = item.get("respuesta_referencia")
            answers.append(answer)
        breakdown_identity = {"id": breakdown.id, "version": breakdown.version}
    ensure_feedback_coherence(grade, answers)
    payload = {
        "estudiante": student_name, "evaluacion": evaluation.nombre, "materia": subject_name,
        "nota": str(note), "nota_maxima": str(maximum), "retroalimentacion": grade.feedback.strip(),
        "explicacion": "Nota revisada por tu docente. Consulta el detalle de las respuestas." if breakdown else "Nota revisada por tu docente. No hay explicación por pregunta registrada para este resultado.",
        "respuestas": json.loads(json.dumps(answers, default=str)),
        "claves_liberadas": released,
    }
    fingerprint = digest({
        "payload": payload, "grade": grade.id, "state": grade.estado,
        "student": grade.estudiante_id, "evaluation": grade.evaluacion_id,
        "subject": grade.materia_id, "breakdown": breakdown_identity,
        "evidence": evidence_identity,
        "questions": evaluation.preguntas, "criteria": evaluation.criterios,
        "goals": evaluation.metas_profesor,
    })
    return Projection(payload, fingerprint)
