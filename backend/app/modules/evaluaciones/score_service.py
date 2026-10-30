"""Score definitions are versioned separately from accepting previous grades."""
from copy import deepcopy
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from app.core.permissions import require_permission_now
from app.modules.calificaciones.breakdown_policy import build_component_scaffold
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.evaluaciones.models import Evaluacion, EvaluacionContenidoVersion
from app.modules.evaluaciones.score_allocation import compile_allocation
from app.modules.evaluaciones.score_schemas import ScorePlan, ScorePlanUpdate
from app.modules.evaluaciones.visual_service import _snapshot, content_hash, get_content_revision


async def _authorize(db, evaluation_id, actor, *permissions):
    from app.modules.evaluaciones.service import ensure_can_manage_evaluation
    if actor.rol not in {'profesor', 'admin'}:
        raise HTTPException(403, 'Solo el docente responsable puede repartir los puntos.')
    for permission in permissions:
        require_permission_now(actor, permission)
    return await ensure_can_manage_evaluation(db, evaluation_id, actor)


def _scaffold(evaluation):
    try:
        return build_component_scaffold(evaluation_to_grading_blueprint(evaluation))
    except ValueError as exc:
        raise HTTPException(409, 'El documento necesita revisión antes de repartir los puntos. Conservamos su contenido y sus notas.') from exc


def _definition_fingerprint(evaluation):
    return content_hash({'id': str(evaluation.id), 'version': str(evaluation.contenido_version_id),
        'updated_at': evaluation.updated_at.isoformat(), 'definition': _snapshot(evaluation)})


def academic_fingerprint(snapshot):
    """Weights/print/release policy are not a change of educational content."""
    data = deepcopy(snapshot)
    data.pop('configuracion_impresion', None)
    if data.get('nota_maxima') is not None:
        data['nota_maxima'] = format(Decimal(str(data['nota_maxima'])).normalize(), 'f')
    for question in data.get('preguntas', []):
        question.pop('puntaje', None)
    blueprint = data.get('blueprint') or {}
    for question in blueprint.get('preguntas', []):
        question.pop('puntaje', None)
    for field in ['reparto_puntajes', 'respuestas_liberadas']:
        blueprint.get('reglas_feedback', {}).pop(field, None)
    if data.get('estructura_documento'):
        data['estructura_documento'].pop('puntuacion_secciones', None)
    return content_hash(data)


def _read_plan(evaluation):
    components = _scaffold(evaluation)
    keys = [item['clave'] for item in components]
    if not components or any(item['tipo'] != 'pregunta' for item in components) or len(set(keys)) != len(keys) or len(keys) > 100:
        raise HTTPException(422, 'Esta evaluación necesita preguntas identificadas antes de repartir sus puntos.')
    rules = evaluation.blueprint.reglas_feedback if evaluation.blueprint else {}
    raw = (rules or {}).get('reparto_puntajes')
    # A new equitable proposal is not saved until the teacher explicitly accepts
    # its current/proposed preview. Existing canonical maxima remain visible.
    plan = raw or {'schema_version': 1, 'modo': 'total', 'grupos': [{
        'id': 'total', 'titulo': 'Todas las preguntas', 'claves': keys,
        'presupuesto': str(evaluation.nota_maxima), 'fijados': {}}]}
    questions = evaluation.preguntas
    by_content = {str(question.get('contenido_id')): item['clave'] for question, item in zip(questions, components)}
    section_for = {}
    document = evaluation.estructura_documento or {}
    nodes = {node['id']: node for node in document.get('nodos', [])}
    for node in nodes.values():
        if node.get('tipo') != 'pregunta':
            continue
        parent = nodes.get(node.get('padre_id'))
        if parent and parent.get('tipo') == 'seccion':
            section_for[by_content.get(str(node.get('pregunta_id')))] = (parent['id'], parent.get('titulo', 'Sección'))
    return {'plan': plan, 'nota_maxima': str(evaluation.nota_maxima),
        'contenido_version_id': str(evaluation.contenido_version_id) if evaluation.contenido_version_id else None,
        'updated_at': evaluation.updated_at, 'definition_fingerprint': _definition_fingerprint(evaluation),
        'preguntas': [{'clave': item['clave'], 'numero': item['numero'], 'titulo': item['titulo'],
            'tipo': str(questions[index].get('tipo', 'abierta')), 'puntaje': str(item['puntos_maximos']),
            'seccion_id': section_for.get(item['clave'], (None, None))[0],
            'seccion_titulo': section_for.get(item['clave'], (None, None))[1]} for index, item in enumerate(components)]}


async def read_score_plan(db, evaluation_id, actor):
    return _read_plan(await _authorize(db, evaluation_id, actor, 'evaluations.read'))


async def _locked_scope(db, evaluation_id):
    # Match evidence replacement's grade-before-evaluation lock order. Locking
    # the evaluation first could deadlock against a replacement holding a grade.
    query = select(Calificacion).where(Calificacion.evaluacion_id == evaluation_id).order_by(Calificacion.id)
    grades = list(await db.scalars(query.options(selectinload(Calificacion.entrega)).with_for_update().execution_options(populate_existing=True)))
    evaluation = await db.scalar(select(Evaluacion).where(Evaluacion.id == evaluation_id, Evaluacion.deleted_at.is_(None)).with_for_update().execution_options(populate_existing=True))
    if evaluation is None:
        raise HTTPException(404, 'Evaluación no disponible.')
    current_ids = set(await db.scalars(select(Calificacion.id).where(Calificacion.evaluacion_id == evaluation_id)))
    if current_ids != {grade.id for grade in grades}:
        raise HTTPException(409, 'Llegaron entregas nuevas. Conserva el reparto y consulta de nuevo antes de guardar.')
    return evaluation, grades


async def _ensure_idle(db, evaluation_id):
    busy = await db.scalar(text("""SELECT EXISTS (
        SELECT 1 FROM entregas WHERE evaluacion_id=CAST(CAST(:id AS text) AS uuid)
            AND estado IN ('en_progreso','recibida','procesando'))
        OR EXISTS (SELECT 1 FROM ai_jobs j WHERE j.estado IN ('queued','running','retrying')
            AND (j.input_json->>'evaluacion_id'=CAST(:id AS text) OR EXISTS
                (SELECT 1 FROM entregas e WHERE e.id=j.entrega_id AND e.evaluacion_id=CAST(CAST(:id AS text) AS uuid))))"""), {'id': str(evaluation_id)})
    if busy:
        raise HTTPException(409, 'Hay entregas calificándose. Conservamos el reparto; espera a que terminen antes de guardarlo.')


def _check_expected(evaluation, timestamp, version):
    def naive(value):
        return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value
    if timestamp is None or naive(evaluation.updated_at) != naive(timestamp) or evaluation.contenido_version_id != version:
        raise HTTPException(409, 'La evaluación cambió. Conservamos tu reparto; consulta la versión actual antes de guardar.')


async def save_scoring_definition(db, evaluation_id, request: ScorePlanUpdate, *, actor_id: UUID):
    evaluation, _ = await _locked_scope(db, evaluation_id)
    _check_expected(evaluation, request.expected_updated_at, request.expected_content_version_id)
    await _ensure_idle(db, evaluation_id)
    components = _scaffold(evaluation)
    if any(item['tipo'] != 'pregunta' for item in components):
        raise HTTPException(422, 'Revisa las preguntas antes de repartir sus puntos.')
    try:
        weights = compile_allocation(request.plan, [item['clave'] for item in components], evaluation.nota_maxima)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    if not evaluation.blueprint or len(evaluation.preguntas) != len(components):
        raise HTTPException(409, 'La estructura necesita revisión antes de repartir puntos. Conservamos sus notas.')
    previous = await get_content_revision(db, evaluation_id, evaluation.contenido_version_id) if evaluation.contenido_version_id else None
    if previous is None:
        before = _snapshot(evaluation)
        before.update(contenido_visual=None, claves_pendientes_revision=[], recursos=[])
        previous = EvaluacionContenidoVersion(evaluacion_id=evaluation_id, numero_version=1,
            autor_id=actor_id, content_hash=content_hash(before), snapshot_json=before, coverage_json={}, recurso_ids=[],
            motivo='Estado observado antes del primer cambio de reparto', origen='estado_observado', legacy_baseline=True)
        db.add(previous)
        await db.flush()
    # Freeze the observed old context for unversioned legacy deliveries before
    # replacing maxima. No student image, extraction, grade or note is rewritten.
    deliveries = list(await db.scalars(select(Entrega).where(Entrega.evaluacion_id == evaluation_id, Entrega.contenido_version_id.is_(None)).with_for_update()))
    if not previous.legacy_baseline and deliveries:
        raise HTTPException(409, 'Hay entregas anteriores sin versión comprobada. Revísalas antes de cambiar el reparto.')
    for delivery in deliveries:
        delivery.contenido_version_id = previous.id
    questions = deepcopy(evaluation.preguntas)
    for item, question in zip(components, questions):
        question['puntaje'] = format(weights[item['clave']], 'f')
    plan = request.plan.model_dump(mode='json')
    evaluation.preguntas = questions
    evaluation.blueprint.preguntas = deepcopy(questions)
    evaluation.blueprint.reglas_feedback = {**(evaluation.blueprint.reglas_feedback or {}), 'reparto_puntajes': plan}
    if (evaluation.estructura_documento or {}).get('puntuacion_secciones'):
        document = deepcopy(evaluation.estructura_documento)
        document['puntuacion_secciones'] = None
        evaluation.estructura_documento = document
    snapshot = _snapshot(evaluation)
    for name, default in [('contenido_visual', None), ('recursos', []), ('claves_pendientes_revision', [])]:
        snapshot[name] = deepcopy(previous.snapshot_json.get(name, default))
    if academic_fingerprint(snapshot) != academic_fingerprint(previous.snapshot_json):
        raise HTTPException(409, 'El contenido cambió además de los puntos. Guarda esa revisión desde el editor; conservamos las notas anteriores.')
    revision = EvaluacionContenidoVersion(evaluacion_id=evaluation_id, numero_version=previous.numero_version + 1,
        autor_id=actor_id, previous_version_id=previous.id, source_resource_id=previous.source_resource_id,
        content_hash=content_hash(snapshot), snapshot_json=snapshot, coverage_json=deepcopy(previous.coverage_json),
        recurso_ids=list(previous.recurso_ids), motivo='Reparto de puntos guardado; notas anteriores conservadas', origen='edicion')
    db.add(revision)
    await db.flush()
    evaluation.contenido_version_id = revision.id
    evaluation.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    from app.modules.evaluaciones.service import get_evaluation_or_404
    return await get_evaluation_or_404(db, evaluation_id)


async def save_score_plan(db, evaluation_id, request, actor):
    await _authorize(db, evaluation_id, actor, 'evaluations.read', 'evaluations.update')
    return await save_scoring_definition(db, evaluation_id, request, actor_id=actor.id)


def score_only_plan(evaluation, data) -> ScorePlan | None:
    """Recognize a truly maximum-only legacy PATCH, never a content bypass."""
    if 'preguntas' not in data or not isinstance(data['preguntas'], list):
        return None
    proposed = jsonable_encoder(data)
    old_questions = jsonable_encoder(evaluation.preguntas)
    if len(proposed['preguntas']) != len(old_questions):
        return None
    changed = False
    for old, new in zip(old_questions, proposed['preguntas']):
        if {key: value for key, value in old.items() if key != 'puntaje'} != {key: value for key, value in new.items() if key != 'puntaje'}:
            return None
        changed |= str(old.get('puntaje')) != str(new.get('puntaje'))
    if not changed:
        return None
    for name, value in proposed.items():
        if name == 'preguntas':
            continue
        current = jsonable_encoder(getattr(evaluation, name, None))
        if name == 'estructura_documento' and current is not None and value is not None:
            from app.modules.evaluaciones.document_schemas import EvaluationDocument
            current = EvaluationDocument.model_validate(current).model_dump(mode='json')
            value = EvaluationDocument.model_validate(value).model_dump(mode='json')
        if value != current:
            return None
    keys = [item['clave'] for item in _scaffold(evaluation)]
    existing = (evaluation.blueprint.reglas_feedback or {}).get('reparto_puntajes') if evaluation.blueprint else None
    if existing:
        # A legacy editor must not silently discard established block budgets.
        # It may submit explicit values within them; reallocating between blocks
        # belongs to the dedicated, previewed allocation editor.
        plan = ScorePlan.model_validate(deepcopy(existing))
        values = {key: question.get('puntaje') for key, question in zip(keys, proposed['preguntas'])}
        plan = ScorePlan.model_validate({**plan.model_dump(mode='json'), 'grupos': [
            {**group.model_dump(mode='json'), 'fijados': {key: values[key] for key in group.claves}} for group in plan.grupos]})
        compile_allocation(plan, keys, evaluation.nota_maxima)
        return plan
    return ScorePlan.model_validate({'schema_version': 1, 'modo': 'total', 'grupos': [{
        'id': 'editor', 'titulo': 'Puntos fijados desde el editor', 'claves': keys,
        'presupuesto': str(evaluation.nota_maxima), 'fijados': {key: question.get('puntaje') for key, question in zip(keys, proposed['preguntas'])}}]})


# Keep a small public service facade; note application has its own transaction
# module and cannot accidentally run when merely saving an allocation.
async def preview_score_changes(db, evaluation_id, actor, **options):
    from app.modules.evaluaciones.score_notes import preview_score_changes as preview
    return await preview(db, evaluation_id, actor, **options)


async def apply_score_changes(db, evaluation_id, request, actor):
    from app.modules.evaluaciones.score_notes import apply_score_changes as apply
    return await apply(db, evaluation_id, request, actor)


async def read_score_operation(db, evaluation_id, request_id, actor):
    from app.modules.evaluaciones.score_notes import read_score_operation as read
    return await read(db, evaluation_id, request_id, actor)
