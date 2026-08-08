"""Persistencia segura del flujo de calificación por fotografía."""
from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.calificaciones import service
from app.modules.calificaciones.grading_service import grade_submission
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.calificaciones.schemas import GradingResult
from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.evaluaciones.models import Evaluacion
from app.shared.enums import CalificacionEstado, EntregaEstado


def serialize_grading_result(grading: GradingResult) -> dict:
    """Conserva el diagnóstico y añade el contrato estable de revisión."""
    payload = dict(grading.raw_model_output or {})
    payload.update({
        "requiere_revision_docente": grading.requiere_revision_docente,
        "motivo_revision": grading.motivo_revision,
        "alertas": list(grading.alertas),
        "criterios": list(grading.criterios),
    })
    return payload


def technical_failure_result(
    evaluacion: Evaluacion,
    *,
    motivo_revision: str = "pipeline_error",
    error_type: str | None = None,
) -> GradingResult:
    raw_output: dict = {
        "pipeline_status": "failed",
        "failure_stage": "unknown",
        "motivo_revision": motivo_revision,
    }
    if error_type:
        raw_output["error_type"] = error_type
    return GradingResult(
        nota_sugerida=None,
        nota_maxima=evaluacion.nota_maxima,
        confianza=0.0,
        requiere_revision_docente=True,
        motivo_revision=motivo_revision,
        raw_model_output=raw_output,
    )


def apply_grading_result(
    *,
    entrega: Entrega,
    evaluacion: Evaluacion,
    estudiante_id: UUID,
    profesor_id: UUID,
    grading: GradingResult,
    calificacion: Calificacion | None = None,
) -> Calificacion:
    """Aplica un resultado sin confundir ``None`` con una nota real de cero."""
    technical_failure = grading.nota_sugerida is None
    payload = serialize_grading_result(grading)

    entrega.estado = (
        EntregaEstado.REQUIERE_REINTENTO.value
        if technical_failure
        else EntregaEstado.CALIFICADA.value
    )
    entrega.visual_text_json = payload

    if calificacion is None:
        calificacion = Calificacion(
            evaluacion_id=evaluacion.id,
            entrega_id=entrega.id,
            estudiante_id=estudiante_id,
            materia_id=evaluacion.materia_id,
            profesor_id=profesor_id,
        )

    calificacion.nota_sugerida = grading.nota_sugerida
    calificacion.nota_confirmada = None
    calificacion.confianza = (
        None if technical_failure else Decimal(str(grading.confianza))
    )
    calificacion.feedback = grading.feedback_estudiante or None
    calificacion.resultado_json = payload
    calificacion.revisado_por_docente = False
    calificacion.estado = (
        CalificacionEstado.REQUIERE_REVISION.value
        if technical_failure or grading.requiere_revision_docente
        else CalificacionEstado.SUGERIDA.value
    )
    return calificacion


async def grade_persisted_photo(
    db: AsyncSession,
    *,
    evaluacion: Evaluacion,
    entrega: Entrega,
    estudiante_id: UUID,
    profesor_id: UUID,
    image_bytes: bytes,
    image_mime: str,
    student_response_text: str | None = None,
    evidence_metadata: dict | None = None,
    calificacion: Calificacion | None = None,
) -> Calificacion:
    """Califica una entrega que ya sobrevivió a un commit previo."""
    try:
        grading = await grade_submission(
            db,
            evaluacion_id=evaluacion.id,
            materia_id=evaluacion.materia_id,
            blueprint=evaluation_to_grading_blueprint(evaluacion),
            student_response_text=student_response_text,
            image_bytes=image_bytes,
            image_mime=image_mime,
            user_id=profesor_id,
        )
        if grading.nota_sugerida is not None:
            service.validate_score_within_evaluation(
                grading.nota_sugerida,
                evaluacion,
                "nota_sugerida",
            )
    except Exception as exc:  # La entrega ya existe y no debe perderse.
        grading = technical_failure_result(
            evaluacion,
            error_type=type(exc).__name__,
        )

    if evidence_metadata:
        grading.raw_model_output = {
            **grading.raw_model_output,
            "evidencia_consolidada": evidence_metadata,
        }

    if grading.nota_sugerida is not None:
        service.transition_to_grading_if_needed(evaluacion)

    result = apply_grading_result(
        entrega=entrega,
        evaluacion=evaluacion,
        estudiante_id=estudiante_id,
        profesor_id=profesor_id,
        grading=grading,
        calificacion=calificacion,
    )
    if calificacion is None:
        db.add(result)
    await db.commit()
    await db.refresh(result)
    return result
