"""Compare conserved grading weights before admitting an explicit teacher retry.

No evidence reads, provider calls, writes, or historical revision replacements.
The caller owns the grade/delivery locks before validating a proposed adoption.
"""
from dataclasses import dataclass
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.modules.calificaciones.breakdown_policy import build_component_scaffold
from app.modules.evaluaciones import grading_visual_context
from app.modules.evaluaciones.models import Evaluacion
from app.modules.evaluaciones.score_service import academic_fingerprint
from app.modules.evaluaciones.visual_service import content_hash


_MESSAGES = {
    'sin_cambios': 'Usaremos los mismos puntos que tiene guardados esta entrega.',
    'puntajes_actualizados': 'El reparto de puntos cambió. Confirma los puntos actuales antes de enviar.',
    'contenido_modificado': 'También cambió el contenido de la evaluación. Usaremos la versión original de esta entrega, no las preguntas ni soluciones nuevas.',
    'version_no_disponible': 'No pudimos comprobar la versión de esta entrega. Conservamos la evidencia; revisa la evaluación antes de volver a calificar.',
}


@dataclass(frozen=True)
class AcceptedReprocessingContext:
    evaluation: object
    target_version: UUID | None = None
    metadata: dict | None = None


def _response(state, source_id, target_id, *, fingerprint=None, changes=None):
    return {'estado': state, 'version_entrega_id': source_id,
            'version_objetivo_id': target_id, 'fingerprint': fingerprint,
            'requiere_confirmacion': state == 'puntajes_actualizados',
            'cambios': changes or [], 'mensaje': _MESSAGES[state]}


def _maximum(value):
    maximum = Decimal(str(value))
    if not maximum.is_finite() or maximum <= 0:
        raise ValueError('Invalid conserved maximum')
    return maximum


def _points(value):
    return format(value.normalize(), 'f')


async def _comparison(db, evaluation, grade, actor_id):
    delivery = grade.entrega
    source_id = getattr(delivery, 'contenido_version_id', None)
    target_id = getattr(evaluation, 'contenido_version_id', None)
    unavailable = _response('version_no_disponible', source_id, target_id)
    if delivery is None or delivery.evaluacion_id != evaluation.id:
        return unavailable, None
    if source_id is None and target_id is None:
        return _response('sin_cambios', None, None), None
    if source_id is None or target_id is None:
        return unavailable, None
    try:
        source = await grading_visual_context.get_content_revision(db, evaluation.id, source_id)
        target = source if source_id == target_id else await grading_visual_context.get_content_revision(db, evaluation.id, target_id)
        if academic_fingerprint(source.snapshot_json) != academic_fingerprint(target.snapshot_json):
            return _response('contenido_modificado', source_id, target_id), None
        original = await grading_visual_context.read_grading_definition(db, evaluation, delivery)
        current = original if source_id == target_id else await grading_visual_context.read_grading_definition(
            db, evaluation, SimpleNamespace(evaluacion_id=evaluation.id, contenido_version_id=target_id))
        old_components = build_component_scaffold(original.blueprint)
        new_components = build_component_scaffold(current.blueprint)
        keys = [component['clave'] for component in old_components]
        if (not keys or len(keys) > 100 or len(keys) != len(set(keys))
                or keys != [component['clave'] for component in new_components]
                or any(item['tipo'] != 'pregunta' for item in old_components + new_components)):
            return unavailable, None
        maxima = [(_maximum(old['puntos_maximos']), _maximum(new['puntos_maximos']))
                  for old, new in zip(old_components, new_components)]
        changes = [{'numero': str(old['numero']), 'puntaje_anterior': _points(before), 'puntaje_actual': _points(after)}
                   for old, (before, after) in zip(old_components, maxima) if before != after]
        if not changes:
            return _response('sin_cambios', source_id, target_id), None
        version = grade.updated_at
        from app.modules.calificaciones.revision_service import normalized_version
        fingerprint = content_hash({
            'actor_id': str(actor_id), 'calificacion_id': str(grade.id),
            'entrega_id': str(delivery.id), 'version_nota': normalized_version(version).isoformat(),
            'origen': {'id': str(source_id), 'hash': source.content_hash},
            'destino': {'id': str(target_id), 'hash': target.content_hash},
            'maximos': [{'clave': key, 'anterior': _points(before), 'actual': _points(after)}
                        for key, (before, after) in zip(keys, maxima)],
        })
        metadata = {'version_anterior_id': str(source_id), 'hash_anterior': source.content_hash,
                    'version_objetivo_id': str(target_id), 'hash_objetivo': target.content_hash,
                    'fingerprint': fingerprint}
        return _response('puntajes_actualizados', source_id, target_id,
                         fingerprint=fingerprint, changes=changes), metadata
    except HTTPException as exc:
        if exc.status_code not in {404, 409}:
            raise
        return unavailable, None
    except (ValueError, ArithmeticError, KeyError, TypeError, AttributeError):
        return unavailable, None


async def read_reprocessing_context(db, evaluation, grade, *, actor_id):
    response, _ = await _comparison(db, evaluation, grade, actor_id)
    return response


async def validate_reprocessing_target(db, evaluation, grade, *, actor_id,
                                     use_current=False, target_version=None, context_fingerprint=None):
    """Hold evaluation stable after caller's grade -> delivery locks.

    A saved receipt must be returned before calling this function: an accepted
    request has already changed the source pin and cannot be compared again.
    """
    current = await db.scalar(select(Evaluacion).options(selectinload(Evaluacion.blueprint)).where(
        Evaluacion.id == evaluation.id, Evaluacion.deleted_at.is_(None),
    ).with_for_update(read=True).execution_options(populate_existing=True))
    if current is None:
        raise HTTPException(404, 'Evaluación no disponible')
    from app.modules.calificaciones.service import ensure_evaluation_active
    ensure_evaluation_active(current)
    response, metadata = await _comparison(db, current, grade, actor_id)
    if response['estado'] == 'version_no_disponible':
        raise HTTPException(409, response['mensaje'])
    supplied = use_current or target_version is not None or context_fingerprint is not None
    if response['estado'] == 'puntajes_actualizados':
        if (not use_current or target_version != response['version_objetivo_id']
                or not context_fingerprint or context_fingerprint != response['fingerprint']):
            raise HTTPException(409, 'El reparto de puntos cambió. Actualiza la propuesta y confirma los puntos actuales antes de enviar. No se ha vuelto a calificar.')
        return AcceptedReprocessingContext(current, target_version, metadata)
    if supplied:
        raise HTTPException(409, 'La propuesta de puntos ya no corresponde a esta entrega. Consulta de nuevo antes de enviar; conservamos la evidencia y la nota.')
    return AcceptedReprocessingContext(current)
