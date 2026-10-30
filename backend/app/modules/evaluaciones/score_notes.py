"""Explicit, recoverable application of saved weights; never invokes an AI."""
from copy import deepcopy
from collections import Counter
from decimal import Decimal
import hashlib

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.modules.calificaciones.breakdown_models import CalificacionAjuste, CalificacionComponente, CalificacionDesglose
from app.modules.calificaciones.breakdown_policy import calculate_formula
from app.modules.calificaciones.breakdown_service import get_active_breakdown
from app.modules.calificaciones.models import Calificacion
from app.modules.evaluaciones.grading_visual_context import read_grading_definition
from app.modules.evaluaciones.score_allocation import reweight_points
from app.modules.evaluaciones.score_models import EvaluationScoreOperation
from app.modules.evaluaciones.score_service import (
    _authorize, _definition_fingerprint, _ensure_idle, _locked_scope, _scaffold, academic_fingerprint,
)
from app.modules.evaluaciones.visual_service import content_hash, get_content_revision
from app.modules.feedback_sharing.invalidations import suspend_grade_publications
from app.modules.users.models import User

_COMPONENT_FIELDS = (
    'clave', 'orden', 'tipo', 'numero', 'titulo', 'respuesta_estudiante', 'respuesta_referencia',
    'puntos_obtenidos', 'puntos_maximos', 'estado', 'explicacion_verificable',
    'explicacion_estudiante', 'origen', 'requiere_revision', 'evidencia_json', 'valoraciones_json',
)
_DONE = {'sugerida', 'requiere_revision', 'confirmada', 'ajustada', 'publicada'}
_KNOWN = {'correcta', 'parcial', 'incorrecta', 'sin_respuesta'}


def _score(value):
    return format(Decimal(str(value)).quantize(Decimal('.01')), 'f') if value is not None else None


def _component_values(component):
    return {name: deepcopy(getattr(component, name)) for name in _COMPONENT_FIELDS}


def _note_fingerprint(grade, active, definition):
    return content_hash(jsonable_encoder({'id': grade.id, 'updated_at': grade.updated_at,
        'estado': grade.estado, 'nota_sugerida': grade.nota_sugerida, 'nota_confirmada': grade.nota_confirmada,
        'feedback': grade.feedback, 'resultado': grade.resultado_json,
        'delivery_version': grade.entrega.contenido_version_id if grade.entrega else None,
        'desglose': {'id': active.id, 'version': active.version, 'ajuste': active.ajuste_global,
            'componentes': [_component_values(component) for component in active.componentes]},
        'definition': definition}, custom_encoder={Decimal: lambda value: format(value.normalize(), 'f')}))


async def _proposal(db, evaluation, grade, actor, definition, *, lock=False, multiple_attempts=False):
    current = grade.nota_confirmada if grade.nota_confirmada is not None else grade.nota_sugerida
    row = {'calificacion_id': str(grade.id), 'elegible': False, 'nota_actual': _score(current),
        'nota_propuesta': None, 'fingerprint': None, 'motivo': None}

    def excluded(message):
        return {**row, 'motivo': message}, None, None

    if grade.estado not in _DONE or current is None or not grade.entrega:
        return excluded('Esta entrega todavía no tiene una calificación vigente que podamos actualizar.')
    if multiple_attempts:
        return excluded('Tiene varios intentos en esta evaluación. Se conservan para no cambiar qué intento cuenta; revísalos individualmente.')
    if grade.estado == 'publicada' and 'grading.publish' not in getattr(actor, '_effective_permissions', set()):
        return excluded('Necesitas permiso de publicación para actualizar una nota que ya está publicada.')
    if not evaluation.contenido_version_id or not (evaluation.blueprint.reglas_feedback or {}).get('reparto_puntajes'):
        return excluded('Guarda primero el reparto que deseas aplicar.')
    if grade.entrega.contenido_version_id is None:
        return excluded('Falta conservar la versión anterior de esta entrega. Su nota no cambiará.')
    if lock:
        # The legacy breakdown editor can lock a breakdown before updating its
        # grade. Never wait in the opposite order: skip a concurrently edited row.
        active = await db.scalar(select(CalificacionDesglose).where(
            CalificacionDesglose.calificacion_id == grade.id, CalificacionDesglose.activo.is_(True),
        ).options(selectinload(CalificacionDesglose.componentes)).with_for_update(skip_locked=True).execution_options(populate_existing=True))
    else:
        active = await get_active_breakdown(db, grade.id)
    if active is None:
        return excluded('Falta el desglose o se está editando. Conservamos la nota; consulta de nuevo.')
    marker = (active.procedencia_json or {}).get('reparto_puntajes') or {}
    if (grade.estado == 'ajustada' or (grade.resultado_json or {}).get('origen_nota') == 'manual_docente'
            or active.origen == 'manual' or (active.origen == 'docente' and marker.get('version') != active.version)
            or active.ajuste_global != 0 or (active.procedencia_json or {}).get('ajuste_global_detalle')
            or any(component.origen in {'docente', 'manual'} for component in active.componentes)
            or (grade.nota_confirmada is not None and grade.nota_confirmada != active.nota_final)):
        return excluded('Tiene un ajuste manual del docente. Se conserva y debe revisarse individualmente.')
    if active.nota_maxima != evaluation.nota_maxima or active.cobertura_estado == 'inconsistente':
        return excluded('La escala o el desglose anterior necesitan revisión. No cambiaremos esta nota automáticamente.')
    if any(component.puntos_obtenidos is None or component.estado not in _KNOWN for component in active.componentes):
        return excluded('Hay respuestas sin puntuar. Conservamos los pendientes; no los convertimos en cero.')
    try:
        context = await read_grading_definition(db, evaluation, grade.entrega)
        target = await get_content_revision(db, evaluation.id, evaluation.contenido_version_id)
        if context.revision is None or academic_fingerprint(context.revision.snapshot_json) != academic_fingerprint(target.snapshot_json):
            return excluded('El contenido también cambió. Revisa esta entrega antes de usar otro reparto.')
        scaffold = {item['clave']: item for item in _scaffold(evaluation)}
        if len(active.componentes) != len(scaffold) or {component.clave for component in active.componentes} != set(scaffold):
            return excluded('No coinciden todas las preguntas del desglose con este reparto.')
        components = []
        changed = False
        for old in active.componentes:
            item = scaffold[old.clave]
            if old.tipo != 'pregunta' or old.titulo != item['titulo'] or old.respuesta_referencia != (str(item['respuesta_referencia']) if item['respuesta_referencia'] is not None else None):
                return excluded('No pudimos comprobar la misma pregunta y referencia. Conservamos su nota.')
            new_maximum = Decimal(str(item['puntos_maximos']))
            points = reweight_points(old.puntos_obtenidos, old.puntos_maximos, new_maximum)
            component = _component_values(old)
            component.update(puntos_obtenidos=points, puntos_maximos=new_maximum)
            components.append(component)
            changed |= old.puntos_maximos != new_maximum
        if not changed:
            return excluded('Sus puntos ya coinciden con este reparto.')
        formula = calculate_formula(components, evaluation.nota_maxima, 0, active.decimales)
    except (HTTPException, ValueError, ArithmeticError):
        return excluded('No pudimos comprobar todos los datos anteriores. Su nota se conserva para revisión.')
    return {**row, 'elegible': True, 'nota_propuesta': _score(formula['nota_final']),
        'fingerprint': _note_fingerprint(grade, active, definition)}, active, components


async def preview_score_changes(db, evaluation_id, actor, *, limit=100, cursor=None):
    evaluation = await _authorize(db, evaluation_id, actor, 'evaluations.read', 'grading.read')
    limit = min(100, max(1, limit))
    definition = _definition_fingerprint(evaluation)
    query = select(Calificacion, User.nombre).join(User, User.id == Calificacion.estudiante_id).where(
        Calificacion.evaluacion_id == evaluation_id).options(selectinload(Calificacion.entrega)).order_by(Calificacion.id).limit(min(100, max(1, limit)) + 1)
    if cursor:
        query = query.where(Calificacion.id > cursor)
    results = list((await db.execute(query)).all())
    page, more = results[:limit], len(results) > limit
    counts = dict((await db.execute(select(Calificacion.estudiante_id, func.count()).where(
        Calificacion.evaluacion_id == evaluation_id, Calificacion.estado != 'anulada').group_by(Calificacion.estudiante_id))).all())
    rows = []
    for grade, name in page:
        row, _, _ = await _proposal(db, evaluation, grade, actor, definition, multiple_attempts=counts.get(grade.estudiante_id, 0) > 1)
        rows.append({**row, 'nombre': name})
    return {'definition_fingerprint': definition, 'resultados': rows,
        'siguiente_cursor': str(page[-1][0].id) if more and page else None,
        'aviso': 'Solo se actualizan los casos que confirmes. Los ajustes manuales y pendientes se conservan. Si cambia una nota, sus enlaces anteriores se pausan hasta revisar la nueva devolución.'}


async def _receipt(db, actor_id, request_id):
    return await db.scalar(select(EvaluationScoreOperation).where(
        EvaluationScoreOperation.actor_id == actor_id, EvaluationScoreOperation.request_id == request_id))


async def read_score_operation(db, evaluation_id, request_id, actor):
    await _authorize(db, evaluation_id, actor, 'evaluations.read', 'grading.read', 'grading.grade')
    receipt = await _receipt(db, actor.id, request_id)
    if receipt is None or receipt.evaluacion_id != evaluation_id:
        raise HTTPException(404, 'Todavía no hay un resultado confirmado para esta solicitud.')
    return deepcopy(receipt.resultado_json)


async def _apply_one(db, evaluation, grade, active, components, actor, request_id):
    previous_score = grade.nota_confirmada if grade.nota_confirmada is not None else grade.nota_sugerida
    previous_context = grade.entrega.contenido_version_id
    for old, component in zip(active.componentes, components):
        metadata = deepcopy((old.evidencia_json or {}).get('reparto_puntajes') or {})
        original = metadata.get('explicacion_original', old.explicacion_verificable)
        student_original = metadata.get('explicacion_estudiante_original', old.explicacion_estudiante)
        metadata.update(request_id=str(request_id), maximo_anterior=str(old.puntos_maximos),
            valoraciones_maximo_original=metadata.get('valoraciones_maximo_original', str(old.puntos_maximos)),
            explicacion_original=original, explicacion_estudiante_original=student_original)
        component['evidencia_json']['reparto_puntajes'] = metadata
        points = format(component['puntos_obtenidos'].normalize(), 'f')
        maximum = format(component['puntos_maximos'].normalize(), 'f')
        prefix = f'Con el reparto confirmado, esta respuesta obtiene {points} de {maximum} puntos. '
        component['explicacion_verificable'] = prefix + (original or 'Se conserva la valoración anterior.')
        component['explicacion_estudiante'] = prefix + (student_original or original or 'Se conserva la valoración anterior.')
    formula = calculate_formula(components, evaluation.nota_maxima, 0, active.decimales)
    provenance = deepcopy(active.procedencia_json or {})
    provenance.update(version_anterior=active.version, reparto_puntajes={'request_id': str(request_id), 'version': active.version + 1,
        'contenido_version_anterior': str(previous_context), 'contenido_version_id': str(evaluation.contenido_version_id)})
    active.activo = False
    await db.flush()
    new = CalificacionDesglose(calificacion_id=grade.id, version=active.version + 1, origen='docente', activo=True,
        cobertura_estado=active.cobertura_estado, requiere_revision=active.requiere_revision,
        bloqueos_json=list(active.bloqueos_json or []), procedencia_json=provenance, creado_por=actor.id, **formula)
    new.componentes = [CalificacionComponente(**component) for component in components]
    db.add(new)
    await db.flush()
    reason = 'Reparto de puntos confirmado por el docente; se conservan las respuestas y valoraciones originales.'
    db.add(CalificacionAjuste(calificacion_id=grade.id, desglose_anterior_id=active.id, desglose_nuevo_id=new.id,
        tipo='reparto', valor_anterior_json={'nota': _score(previous_score), 'contenido_version_id': str(previous_context)},
        valor_nuevo_json={'nota': _score(new.nota_final), 'contenido_version_id': str(evaluation.contenido_version_id), 'request_id': str(request_id)},
        motivo_interno=reason, explicacion_estudiante=reason, actor_id=actor.id))
    if grade.nota_confirmada is None:
        grade.nota_sugerida = new.nota_final
    else:
        grade.nota_confirmada = new.nota_final
    # The teacher explicitly accepts the new weights for this delivery. The old
    # context remains in the prior breakdown, snapshot, timeline and receipt.
    grade.entrega.contenido_version_id = evaluation.contenido_version_id
    from app.modules.calificaciones.service import _append_timeline_event
    _append_timeline_event(grade, tipo='reparto', nota_anterior=previous_score, nota_nueva=new.nota_final,
        actor_id=actor.id, actor_nombre=actor.nombre, detalle=reason, operacion_id=request_id)
    await suspend_grade_publications(db, grade.id)
    await db.flush()
    return {'calificacion_id': str(grade.id), 'estado': 'applied', 'nota_anterior': _score(previous_score),
        'nota_nueva': _score(new.nota_final), 'desglose_version': new.version}


async def apply_score_changes(db, evaluation_id, request, actor):
    await _authorize(db, evaluation_id, actor, 'evaluations.read', 'grading.read', 'grading.grade')
    actor_id = actor.id
    # A request reused for another evaluation must also serialize before reading
    # its receipt; a UUID alone is never authorization.
    lock_key = int.from_bytes(hashlib.sha256(f'{actor_id}:{request.request_id}'.encode()).digest()[:8], 'big', signed=True)
    await db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': lock_key})
    payload = request.model_dump(mode='json')
    request_hash = content_hash(payload)
    receipt = await _receipt(db, actor_id, request.request_id)
    if receipt is not None:
        if receipt.evaluacion_id != evaluation_id or receipt.request_hash != request_hash:
            raise HTTPException(409, 'Esta confirmación ya se usó con otros datos. Consulta su resultado; no repetiremos los cambios.')
        return deepcopy(receipt.resultado_json)
    evaluation, grades = await _locked_scope(db, evaluation_id)
    await _ensure_idle(db, evaluation_id)
    definition = _definition_fingerprint(evaluation)
    if definition != request.definition_fingerprint:
        raise HTTPException(409, 'El reparto cambió. Conservamos las notas; vuelve a consultar la vista previa antes de confirmar.')
    by_id = {grade.id: grade for grade in grades}
    counts = Counter(grade.estudiante_id for grade in grades if grade.estado != 'anulada')
    results = []
    for selection in request.selecciones:
        grade = by_id.get(selection.calificacion_id)
        identity = str(selection.calificacion_id)
        if grade is None:
            results.append({'calificacion_id': identity, 'estado': 'excluded', 'motivo': 'No disponible para esta evaluación.'})
            continue
        try:
            async with db.begin_nested():
                row, active, components = await _proposal(db, evaluation, grade, actor, definition, lock=True, multiple_attempts=counts[grade.estudiante_id] > 1)
                if not row['elegible']:
                    results.append({'calificacion_id': identity, 'estado': 'excluded', 'motivo': row['motivo']})
                elif row['fingerprint'] != selection.fingerprint:
                    results.append({'calificacion_id': identity, 'estado': 'conflict', 'motivo': 'La nota o el mensaje cambiaron. Se conserva la edición más reciente.'})
                else:
                    results.append(await _apply_one(db, evaluation, grade, active, components, actor, request.request_id))
        except (ValueError, HTTPException, IntegrityError):
            results.append({'calificacion_id': identity, 'estado': 'failed', 'motivo': 'No se pudo actualizar este caso. Sus datos anteriores se conservan; consulta de nuevo.'})
    output = {'request_id': str(request.request_id), 'definition_fingerprint': definition, 'resultados': results}
    db.add(EvaluationScoreOperation(request_id=request.request_id, evaluacion_id=evaluation_id, actor_id=actor_id,
        request_hash=request_hash, request_json=payload, resultado_json=output))
    await db.commit()
    return output
