"""Immutable, explicitly pinned evaluation context for grading.

Submission snapshots and job references contain IDs/hashes only. Images remain
internal byte values, separate from the student's evidence. No provider calls.
"""
from copy import deepcopy
from dataclasses import dataclass, field, replace
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import inspect, select
from app.modules.calificaciones.grading_visuals import EvaluationVisualInput, describe_evaluation_material

from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.evaluaciones.models import Evaluacion
from app.modules.evaluaciones.visual_render import ResolvedVisualBlock, resolve_visual_material
from app.modules.evaluaciones.visual_schemas import VisualManifest
from app.modules.evaluaciones.visual_service import get_content_revision, inspect_resource_bytes


@dataclass(frozen=True)
class GradingVisualContext:
    evaluation: object
    blueprint: dict
    visuals: tuple[ResolvedVisualBlock, ...] = ()
    version_id: UUID | None = None
    content_hash: str | None = None
    agent_visuals: tuple[EvaluationVisualInput, ...] = ()
    revision: object | None = field(default=None, repr=False)


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


async def read_grading_definition(db, evaluation, delivery, *, expected_reference: dict | None = None) -> GradingVisualContext:
    """Read immutable educational metadata without requiring image storage.

    Historical notes remain readable during a storage incident. This is not an
    inference/publication readiness check; those callers use load_grading_context.
    Current access/release policy is deliberately not part of the snapshot.
    """
    _check_scope(evaluation, delivery)
    version_id = getattr(delivery, 'contenido_version_id', None)
    if version_id is None:
        if expected_reference and (expected_reference.get('contenido_version_id') or expected_reference.get('contenido_hash')):
            raise HTTPException(409, 'El trabajo y la entrega no tienen la misma versión. Conserva la evidencia y solicita revisión.')
        return GradingVisualContext(evaluation=evaluation, blueprint=evaluation_to_grading_blueprint(evaluation))
    revision = await get_content_revision(db, evaluation.id, version_id)
    if expected_reference is not None and (
            expected_reference.get('contenido_version_id') != str(version_id)
            or expected_reference.get('contenido_hash') != revision.content_hash):
        raise HTTPException(409, 'El material del trabajo no coincide con la entrega conservada. No se calificará con otra versión.')
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
    blueprint = evaluation_to_grading_blueprint(frozen)
    blueprint.update(contenido_version_id=str(version_id), contenido_hash=revision.content_hash)
    return GradingVisualContext(evaluation=frozen, blueprint=blueprint, version_id=version_id,
                                content_hash=revision.content_hash, revision=revision)


async def load_grading_context(db, evaluation, delivery, *, expected_reference: dict | None = None) -> GradingVisualContext:
    if getattr(delivery, 'contenido_version_id', None) is None:
        await grading_job_reference(db, evaluation, delivery)
    context = await read_grading_definition(db, evaluation, delivery, expected_reference=expected_reference)
    if context.revision is None:
        return context
    try:
        visuals = tuple(await resolve_visual_material(db, evaluation.id, context.revision))
    except ValueError as exc:
        raise HTTPException(409, 'No pudimos reunir todo el material de la pregunta. Conserva la evidencia y revisa las figuras antes de calificar.') from exc
    agent_visuals = tuple(EvaluationVisualInput(
        block_id=str(item.block.id), question_ids=tuple(str(value) for value in item.block.pregunta_ids),
        kind=item.block.tipo, description=item.block.descripcion, caption=item.block.pie or '', text=item.block.texto or '',
        resource_id=str(item.block.recurso_id) if item.block.recurso_id else None,
        structured_data_json=(item.block.tabla or item.block.grafica).model_dump_json() if item.block.tabla or item.block.grafica else '',
        image_bytes=item.image_bytes,
        image_mime=inspect_resource_bytes(item.image_bytes, clase='imagen')['mime'] if item.image_bytes else 'image/png',
    ) for item in visuals)
    describe_evaluation_material(agent_visuals, context.blueprint)
    return replace(context, visuals=visuals, agent_visuals=agent_visuals)
