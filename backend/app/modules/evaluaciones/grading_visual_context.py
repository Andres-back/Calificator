"""Immutable, explicitly pinned evaluation context for grading.

Submission snapshots and job references contain IDs/hashes only. Images remain
internal byte values, separate from the student's evidence. No provider calls.
"""
from copy import deepcopy
from dataclasses import dataclass
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import inspect, select

from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.evaluaciones.models import Evaluacion
from app.modules.evaluaciones.visual_render import ResolvedVisualBlock, resolve_visual_material
from app.modules.evaluaciones.visual_schemas import VisualManifest
from app.modules.evaluaciones.visual_service import get_content_revision


@dataclass(frozen=True)
class GradingVisualContext:
    evaluation: object
    blueprint: dict
    visuals: tuple[ResolvedVisualBlock, ...] = ()
    version_id: UUID | None = None
    content_hash: str | None = None


def _check_scope(evaluation, delivery):
    if delivery.evaluacion_id != evaluation.id:
        raise HTTPException(409, 'La entrega no corresponde a esta evaluación. Conserva la evidencia y solicita revisión.')


async def pin_new_submission_content(db, evaluation, delivery) -> dict:
    """Call only when creating a submission, before committing or enqueueing.

    The evaluation lock orders concurrent visual edits against the beginning of
    a new attempt/photo. Existing pinned attempts never adopt a newer revision.
    Legacy revalidations must not use this new-submission helper.
    """
    _check_scope(evaluation, delivery)
    if getattr(delivery, 'contenido_version_id', None) is not None:
        return await grading_job_reference(db, evaluation, delivery)
    state = inspect(delivery)
    if state.persistent or state.detached:
        raise HTTPException(409, 'La entrega ya existe sin una versión conservada. No cambiaremos su contexto automáticamente; revisa la versión antes de recalificar.')
    current = await db.scalar(select(Evaluacion).where(
        Evaluacion.id == evaluation.id, Evaluacion.deleted_at.is_(None),
    ).with_for_update().execution_options(populate_existing=True))
    if current is None:
        raise HTTPException(404, 'Evaluación no disponible')
    version_id = current.contenido_version_id
    if version_id is None:
        return {}
    revision = await get_content_revision(db, evaluation.id, version_id)
    delivery.contenido_version_id = revision.id
    return {'contenido_version_id': str(revision.id), 'contenido_hash': revision.content_hash}


async def grading_job_reference(db, evaluation, delivery) -> dict:
    _check_scope(evaluation, delivery)
    version_id = getattr(delivery, 'contenido_version_id', None)
    if version_id is None:
        if getattr(evaluation, 'contenido_version_id', None) is not None:
            raise HTTPException(409, 'Esta entrega es anterior al material actualizado. Elige y revisa la versión que corresponde antes de volver a calificarla.')
        return {}
    revision = await get_content_revision(db, evaluation.id, version_id)
    return {'contenido_version_id': str(revision.id), 'contenido_hash': revision.content_hash}


async def load_grading_context(db, evaluation, delivery) -> GradingVisualContext:
    _check_scope(evaluation, delivery)
    version_id = getattr(delivery, 'contenido_version_id', None)
    if version_id is None:
        await grading_job_reference(db, evaluation, delivery)
        return GradingVisualContext(evaluation=evaluation, blueprint=evaluation_to_grading_blueprint(evaluation))
    revision = await get_content_revision(db, evaluation.id, version_id)
    data = deepcopy(revision.snapshot_json)
    source_blueprint = data.get('blueprint')
    data['blueprint'] = SimpleNamespace(**source_blueprint) if source_blueprint is not None else None
    frozen = SimpleNamespace(**data, id=evaluation.id, materia_id=evaluation.materia_id,
                             profesor_id=evaluation.profesor_id)
    frozen.nota_maxima = Decimal(str(frozen.nota_maxima))
    raw_manifest = data.get('contenido_visual')
    if raw_manifest is not None:
        manifest = VisualManifest.model_validate(raw_manifest)
        questions = {str(question.get('contenido_id')) for question in data['preguntas']}
        if questions != {str(identifier) for identifier in manifest.pregunta_ids}:
            raise HTTPException(409, 'El material y las preguntas no coinciden. Conserva la evidencia y revisa esta versión.')
    try:
        visuals = tuple(await resolve_visual_material(db, evaluation.id, revision))
    except ValueError as exc:
        raise HTTPException(409, 'No pudimos reunir todo el material de la pregunta. Conserva la evidencia y revisa las figuras antes de calificar.') from exc
    blueprint = evaluation_to_grading_blueprint(frozen)
    blueprint.update(contenido_version_id=str(version_id), contenido_hash=revision.content_hash)
    return GradingVisualContext(evaluation=frozen, blueprint=blueprint, visuals=visuals,
                                version_id=version_id, content_hash=revision.content_hash)
