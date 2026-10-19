"""Read projections after evaluation authorization, independent of feature flags."""
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.modules.evaluaciones.models import EvaluacionRecurso
from app.modules.evaluaciones.visual_schemas import VisualManifest
from app.modules.evaluaciones.visual_service import get_content_revision


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


async def visual_read_fields(db: AsyncSession, evaluation, *, student: bool) -> dict:
    version_id = getattr(evaluation, 'contenido_version_id', None)
    if version_id is None:
        return {}
    revision = await get_content_revision(db, evaluation.id, version_id)
    raw = revision.snapshot_json.get('contenido_visual')
    if raw is None:  # Honest legacy baseline, not a reconstructed historical image.
        return {'contenido_version_id': version_id, 'contenido_visual': None}
    manifest = VisualManifest.model_validate(raw)
    if not student:
        return {'contenido_version_id': version_id, 'contenido_visual': manifest.model_dump(mode='json')}
    projection = manifest.for_student()
    resource_ids = {block.recurso_id for block in projection.bloques if block.recurso_id is not None}
    allowed: set[UUID] = set()
    if resource_ids:
        resources = await db.scalars(select(EvaluacionRecurso).where(
            EvaluacionRecurso.id.in_(resource_ids), EvaluacionRecurso.evaluacion_id == evaluation.id,
            EvaluacionRecurso.estado == 'ready', EvaluacionRecurso.clase != 'original',
            EvaluacionRecurso.seguridad_contenido == 'publicable_confirmado',
        ))
        # Keep the projection safe even if a repository implementation is replaced.
        allowed = {resource.id for resource in resources
                   if resource.evaluacion_id == evaluation.id and resource.estado == 'ready'
                   and resource.clase != 'original' and resource.seguridad_contenido == 'publicable_confirmado'}
    projection.bloques = [block for block in projection.bloques
                          if block.recurso_id is None or block.recurso_id in allowed]
    return {'contenido_version_id': version_id, 'contenido_visual': projection.model_dump(mode='json')}
