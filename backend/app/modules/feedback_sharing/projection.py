"""Proyección pública permitida, nunca resultado_json ni contexto docente crudo."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
import hashlib
import json
from types import SimpleNamespace

from fastapi import HTTPException

from app.modules.calificaciones.breakdown_service import answers_released, serialize_breakdown
from app.modules.feedback_sharing.quality_policy import ensure_feedback_coherence
from app.modules.evaluaciones.document_structure import document_context


@dataclass(frozen=True)
class Projection:
    payload: dict
    fingerprint: str


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, default=str, separators=(",", ":")).encode()).hexdigest()


def review_source_fingerprint(grade, evaluation, student_name, subject_name, breakdown, *, evidence_identity=None) -> str:
    """Private approval identity; never expose the source material in a payload."""
    components = [
        {key: getattr(item, key, None) for key in (
            'id', 'clave', 'numero', 'titulo', 'respuesta_estudiante', 'respuesta_referencia',
            'puntos_obtenidos', 'puntos_maximos', 'estado', 'requiere_revision',
            'explicacion_estudiante', 'explicacion_verificable', 'evidencia_json',
        )}
        for item in getattr(breakdown, 'componentes', [])
    ] if breakdown else []
    return digest({
        'schema': 120, 'grade': {key: getattr(grade, key, None) for key in (
            'id', 'estudiante_id', 'evaluacion_id', 'materia_id', 'estado',
            'nota_confirmada', 'revisado_por_docente', 'feedback', 'entrega_id', 'updated_at',
        )},
        'student_name': student_name, 'subject_name': subject_name,
        'evaluation': {key: getattr(evaluation, key, None) for key in (
            'id', 'nombre', 'nota_maxima', 'preguntas', 'criterios', 'metas_profesor',
        )},
        'released': answers_released(evaluation), 'evidence': evidence_identity,
        'breakdown': {key: getattr(breakdown, key, None) for key in (
            'id', 'version', 'cobertura_estado', 'requiere_revision', 'nota_final', 'bloqueos_json',
        )} if breakdown else None,
        'components': components,
        **({'contexto_documental': document_context(evaluation)}
           if getattr(evaluation, 'estructura_documento', None) is not None else {}),
    })


def confirmed_score(grade, evaluation):
    if grade.estado not in {'confirmada', 'ajustada', 'publicada'} or not grade.revisado_por_docente or grade.nota_confirmada is None:
        raise HTTPException(409, 'Primero revisa y confirma la nota de este estudiante.')
    note, maximum = Decimal(str(grade.nota_confirmada)), Decimal(str(evaluation.nota_maxima))
    if not note.is_finite() or not maximum.is_finite() or maximum <= 0 or not 0 <= note <= maximum:
        raise HTTPException(409, 'Revisa la nota y la escala de esta evaluación.')
    return note, maximum


def build_review_projection(grade, evaluation, student_name, subject_name, breakdown, review, *, evidence_identity=None) -> Projection:
    """An explicit teacher summary is not an approval of the original breakdown."""
    source = review_source_fingerprint(grade, evaluation, student_name, subject_name, breakdown, evidence_identity=evidence_identity)
    if source != review.source_fingerprint:
        raise HTTPException(409, 'La devolución cambió. Revísala de nuevo antes de entregarla.')
    note, maximum = confirmed_score(grade, evaluation)
    message = (review.feedback_text or '').strip()
    if not message or len(message) > 6000:
        raise HTTPException(422, 'Escribe una devolución de 1 a 6000 caracteres antes de aprobarla.')
    reviewed = SimpleNamespace(**{key: getattr(grade, key) for key in (
        'id', 'estudiante_id', 'evaluacion_id', 'materia_id', 'estado',
        'revisado_por_docente', 'nota_confirmada',
    )}, feedback=message)
    if review.scope == 'detail':
        if breakdown is None:
            raise HTTPException(422, 'Esta nota no tiene detalle por pregunta revisado. Elige solo nota y retroalimentación.')
        projection = build_projection(reviewed, evaluation, student_name, subject_name, breakdown, evidence_identity=evidence_identity)
        payload = {**projection.payload, 'alcance': 'detail'}
    elif review.scope == 'summary':
        # Only the confirmed decision is authoritative here. Do not inspect or
        # send unvalidated question content, even as hidden assistant context.
        ensure_feedback_coherence(reviewed, [{'estado': 'correcta' if note == maximum else 'parcial'}])
        payload = {
            'estudiante': student_name, 'evaluacion': evaluation.nombre, 'materia': subject_name,
            'nota': str(note), 'nota_maxima': str(maximum), 'retroalimentacion': message,
            'explicacion': 'Nota y retroalimentación revisadas por tu docente. Esta devolución no incluye detalle por pregunta.',
            'respuestas': [], 'claves_liberadas': False, 'alcance': 'summary',
        }
    else:
        raise HTTPException(422, 'Elige el contenido que deseas entregar.')
    return Projection(payload, digest({'review': review.id, 'source': source, 'payload': payload}))


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
        **({'contexto_documental': document_context(evaluation)}
           if getattr(evaluation, 'estructura_documento', None) is not None else {}),
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
