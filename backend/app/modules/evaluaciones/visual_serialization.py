"""Read projections after evaluation authorization, independent of feature flags."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.modules.evaluaciones.models import EvaluacionRecurso, EvaluacionContenidoVersion
from app.modules.evaluaciones.visual_schemas import VisualManifest
from app.modules.evaluaciones.visual_service import get_content_revision, content_hash
from app.modules.evaluaciones.document_structure import document_read_fields


async def authorized_content_revision(db, evaluation_id, version_id, user):
    from app.modules.evaluaciones import service
    from app.modules.calificaciones.models import Entrega

    await service.ensure_can_read_evaluation(db, evaluation_id, user)
    evaluation = await service.get_evaluation_or_404(db, evaluation_id)
    selected = version_id or getattr(evaluation, 'contenido_version_id', None)
    if selected is None:
        raise HTTPException(404, 'Esta evaluación no tiene material visual guardado')
    manager = user.rol == 'admin' or evaluation.profesor_id == user.id
    if not manager and selected != evaluation.contenido_version_id:
        delivery = await db.scalar(select(Entrega.id).where(
            Entrega.evaluacion_id == evaluation.id, Entrega.estudiante_id == user.id,
            Entrega.contenido_version_id == selected,
        ))
        if delivery is None:
            raise HTTPException(403, 'No tienes acceso a esta versión de la evaluación')
    return evaluation, await get_content_revision(db, evaluation.id, selected)


async def batch_visual_read_fields(db, evaluations, *, student: bool) -> dict:
    """Authorized rows only; two bounded queries instead of one per evaluation."""
    selected = {value.contenido_version_id: value.id for value in evaluations
                if getattr(value, 'contenido_version_id', None)}
    if not selected:
        return {}
    rows = await db.scalars(select(EvaluacionContenidoVersion).where(EvaluacionContenidoVersion.id.in_(selected)))
    revisions = {row.id: row for row in rows if row.evaluacion_id == selected.get(row.id)}
    for version in selected:
        revision = revisions.get(version)
        if revision is None:
            raise HTTPException(404, 'Versión de evaluación no disponible')
        if revision.content_hash != content_hash(revision.snapshot_json):
            raise HTTPException(409, 'No pudimos comprobar esta versión completa. Conserva la evidencia y solicita revisión.')
    resource_ids = set()
    if student:
        for revision in revisions.values():
            raw = revision.snapshot_json.get('contenido_visual')
            if raw:
                resource_ids.update(block.recurso_id for block in VisualManifest.model_validate(raw).for_student().bloques if block.recurso_id)
    resources = list(await db.scalars(select(EvaluacionRecurso).where(
        EvaluacionRecurso.id.in_(resource_ids), EvaluacionRecurso.evaluacion_id.in_(selected.values()),
        EvaluacionRecurso.estado == 'ready', EvaluacionRecurso.clase != 'original',
        EvaluacionRecurso.seguridad_contenido == 'publicable_confirmado'))) if resource_ids else []
    return {value.id: await visual_read_fields(db, value, student=student,
        prepared_revision=revisions[value.contenido_version_id], prepared_resources=resources)
        for value in evaluations if getattr(value, 'contenido_version_id', None)}


async def visual_read_fields(db: AsyncSession, evaluation, *, student: bool, prepared_revision=None, prepared_resources=None) -> dict:
    version_id = getattr(evaluation, 'contenido_version_id', None)
    if version_id is None:
        return {}
    revision = prepared_revision if prepared_revision is not None else await get_content_revision(db, evaluation.id, version_id)
    raw = revision.snapshot_json.get('contenido_visual')
    if raw is None:  # Honest legacy baseline, not a reconstructed historical image.
        try:
            document = document_read_fields(revision.snapshot_json, student=student)
        except ValueError as exc:
            raise HTTPException(409, 'El documento de esta versión necesita revisión docente.') from exc
        return {'contenido_version_id': version_id, 'contenido_visual': None, **document}
    manifest = VisualManifest.model_validate(raw)
    if not student:
        try:
            document = document_read_fields(revision.snapshot_json, student=False,
                material_ids=[block.id for block in manifest.bloques])
        except ValueError as exc:
            raise HTTPException(409, 'No pudimos comprobar la organización de este documento.') from exc
        return {'contenido_version_id': version_id, 'contenido_visual': manifest.model_dump(mode='json'),
                'claves_visuales_pendientes': revision.snapshot_json.get('claves_pendientes_revision', []), **document}
    projection = manifest.for_student()
    resource_ids = {block.recurso_id for block in projection.bloques if block.recurso_id is not None}
    allowed: set[UUID] = set()
    if resource_ids:
        resources = prepared_resources if prepared_resources is not None else await db.scalars(select(EvaluacionRecurso).where(
            EvaluacionRecurso.id.in_(resource_ids), EvaluacionRecurso.evaluacion_id == evaluation.id,
            EvaluacionRecurso.estado == 'ready', EvaluacionRecurso.clase != 'original',
            EvaluacionRecurso.seguridad_contenido == 'publicable_confirmado',
        ))
        # Keep the projection safe even if a repository implementation is replaced.
        allowed = {resource.id for resource in resources
                   if resource.id in resource_ids and resource.evaluacion_id == evaluation.id and resource.estado == 'ready'
                   and resource.clase != 'original' and resource.seguridad_contenido == 'publicable_confirmado'}
    projection.bloques = [block for block in projection.bloques
                          if block.recurso_id is None or block.recurso_id in allowed]
    try:
        document = document_read_fields(revision.snapshot_json, student=True,
            material_ids=[block.id for block in projection.bloques])
    except ValueError as exc:
        raise HTTPException(409, 'El documento necesita material revisado antes de consultarlo.') from exc
    return {'contenido_version_id': version_id, 'contenido_visual': projection.model_dump(mode='json'), **document}
