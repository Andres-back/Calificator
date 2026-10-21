"""Pin online drafts before answering; no grading or provider calls here."""
from types import SimpleNamespace
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select

from app.modules.calificaciones.models import Entrega
from app.modules.calificaciones.service import ensure_evaluation_accepts_grading, ensure_student_can_submit_new_evidence
from app.modules.evaluaciones.grading_visual_context import pin_new_submission_content
from app.modules.evaluaciones.models import Evaluacion
from app.modules.evaluaciones.visual_service import get_content_revision
from app.shared.enums import EntregaEstado, EntregaTipo


async def start_online_content_attempt(db, evaluation, student_id: UUID) -> Entrega:
    # Serialize simultaneous starts against both another start and a content edit.
    current = await db.scalar(select(Evaluacion).where(
        Evaluacion.id == evaluation.id, Evaluacion.deleted_at.is_(None),
    ).with_for_update().execution_options(populate_existing=True))
    if current is None:
        raise HTTPException(404, 'Evaluación no disponible')
    ensure_evaluation_accepts_grading(current)
    if current.modalidad not in {'online', 'mixta'}:
        raise HTTPException(409, 'Esta evaluación se entrega mediante foto o PDF.')
    draft = await db.scalar(select(Entrega).where(
        Entrega.evaluacion_id == current.id, Entrega.estudiante_id == student_id,
        Entrega.estado == EntregaEstado.EN_PROGRESO.value,
    ).order_by(Entrega.created_at.desc()).limit(1).with_for_update())
    if draft is not None:
        if draft.contenido_version_id is None:
            raise HTTPException(409, 'Este intento no tiene una versión conservada. Pide al docente que lo revise.')
        await db.commit()  # Release locks even on an idempotent retry.
        return draft
    if current.contenido_version_id is None:
        raise HTTPException(409, 'Esta evaluación no necesita iniciar una versión de contenido.')
    await ensure_student_can_submit_new_evidence(db, current, student_id)
    draft = Entrega(evaluacion_id=current.id, estudiante_id=student_id, materia_id=current.materia_id,
        tipo=EntregaTipo.MIXTA.value if current.modalidad == 'mixta' else EntregaTipo.ONLINE.value,
        estado=EntregaEstado.EN_PROGRESO.value, visual_text_json={})
    await pin_new_submission_content(db, current, draft)
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


async def get_online_content_attempt(db, evaluation, student_id: UUID, attempt_id: UUID | None):
    if attempt_id is None:
        if getattr(evaluation, 'contenido_version_id', None) is not None:
            raise HTTPException(409, 'Abre de nuevo la evaluación para recuperar tu intento antes de enviarlo. Tus respuestas no se han borrado.')
        return None
    draft = await db.scalar(select(Entrega).where(Entrega.id == attempt_id).with_for_update())
    if draft is None or draft.estudiante_id != student_id or draft.evaluacion_id != evaluation.id:
        raise HTTPException(404, 'Intento no disponible')
    if draft.contenido_version_id is None:
        raise HTTPException(409, 'El intento no tiene una versión conservada. No cambiaremos su contenido automáticamente.')
    return draft


async def student_attempt_evaluation(db, evaluation, delivery) -> dict:
    """Overlay an allowlist of frozen educational fields on current access/state.

    Never serialize a snapshot directly: it also contains private answer keys.
    """
    from app.modules.evaluaciones.service import _student_safe_evaluation, sanitize_student_payload
    from app.modules.evaluaciones.modality_service import normalize_question_modalities
    from app.modules.evaluaciones.visual_serialization import visual_read_fields

    revision = await get_content_revision(db, evaluation.id, delivery.contenido_version_id)
    result = _student_safe_evaluation(evaluation)
    source = revision.snapshot_json
    from app.modules.evaluaciones.reading_service import evaluation_reading
    result['lectura'] = evaluation_reading(source)
    for key in ('nombre', 'descripcion', 'nota_maxima', 'modalidad', 'tipo_origen', 'criterios',
                'dba_ids', 'dba_personalizado_ids', 'metas_profesor'):
        if key in source:
            result[key] = sanitize_student_payload(source[key])
    result['preguntas'] = sanitize_student_payload(normalize_question_modalities(source['preguntas'], source['modalidad']))
    result.update(await visual_read_fields(db, SimpleNamespace(id=evaluation.id,
        contenido_version_id=revision.id), student=True))
    return result
