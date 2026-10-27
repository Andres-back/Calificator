"""Recover retained educational transcription into a reviewed independent copy.

No model, evidence or grade reads. The caller keeps the durable copy transaction.
"""
from copy import deepcopy
import re
import unicodedata
from uuid import UUID, uuid5

from fastapi import HTTPException
from sqlalchemy import select, text

from app.core.permissions import require_permission_now
from app.modules.evaluaciones.document_import import build_document_inventory
from app.modules.evaluaciones.document_schemas import EvaluationDocument
from app.modules.evaluaciones.document_structure import assert_document_ready, validate_document_scope
from app.modules.evaluaciones.models import EvaluacionRecurso
from app.modules.evaluaciones.service import ensure_can_manage_evaluation
from app.modules.evaluaciones.visual_service import _snapshot, content_hash, get_content_revision, read_resource_bytes


def _permissions(actor):
    require_permission_now(actor, 'evaluations.read')
    require_permission_now(actor, 'evaluations.update')


def _normalized(value):
    value = re.sub(r'^\s*(?:\d+|[A-Za-z])[.)]\s*', '', value)
    return ''.join(character for character in unicodedata.normalize('NFKD', value).casefold()
        if character.isalnum())


def recovery_questions(evaluation):
    return [{**deepcopy(question), 'contenido_id': str(question.get('contenido_id')
        or uuid5(evaluation.id, f'recovery:question:{question["numero"]}'))} for question in evaluation.preguntas or []]


def propose_document(evaluation, inventory):
    questions = recovery_questions(evaluation)
    by_text = {}
    for question in questions:
        by_text.setdefault(_normalized(str(question.get('enunciado') or '')), []).append(question)
    nodes, represented, section = [], set(), None
    def add(kind, source_id=None, **fields):
        node = {'id': str(uuid5(evaluation.id, f'recovery:node:{len(nodes)}:{source_id or kind}')),
            'padre_id': fields.pop('padre_id', section), 'orden': len(nodes), 'tipo': kind,
            'fuente_ids': [source_id] if source_id else [], **fields}
        nodes.append(node)
        return node['id']
    for entry in inventory:
        value, source_id = entry['texto'], entry['id']
        matches = by_text.get(_normalized(value), [])
        if len(matches) == 1 and matches[0]['contenido_id'] not in represented:
            question = matches[0]; represented.add(question['contenido_id'])
            printed = re.match(r'^\s*(\d+|[A-Za-z])[.)]', value)
            add('pregunta', source_id, pregunta_id=question['contenido_id'], etiqueta_original=printed[1] if printed else str(question['numero']))
        elif len(value) <= 500 and re.match(r'^\s*(?:secci[oó]n|cap[ií]tulo|parte|lectura|actividad|debate)\b', value, re.I):
            section = add('seccion', source_id, padre_id=None, titulo=value)
        else:
            for offset in range(0, len(value), 60000):
                add('texto', source_id, proposito='recuadro', texto=value[offset:offset + 60000])
    warnings = []
    for question in questions:
        if question['contenido_id'] not in represented:
            node = add('pregunta', pregunta_id=question['contenido_id'], etiqueta_original=str(question['numero']))
            warnings.append({'nodo_id': node, 'mensaje': 'Ubica esta pregunta en su sección comparándola con la transcripción.'})
    if not nodes:
        raise HTTPException(409, 'No hay contenido educativo conservado para recuperar.')
    warnings.append({'nodo_id': nodes[0]['id'], 'mensaje': 'La organización es una propuesta sin IA. Compara todo el contenido y las figuras con el original antes de confirmarla.'})
    return EvaluationDocument.model_validate({'nodos': nodes, 'revision': {
        'detectados': [entry['id'] for entry in inventory], 'conservados': [entry['id'] for entry in inventory],
        'avisos': warnings, 'estado': 'requiere_revision', 'confirmado': False}})


async def read_recovery(db, evaluation_id, actor, source_job_id: UUID | None = None):
    _permissions(actor)
    evaluation = await ensure_can_manage_evaluation(db, evaluation_id, actor)
    rows = list((await db.execute(text("SELECT id,created_at,resultado_json FROM ai_jobs WHERE tipo='evaluacion_digitalizacion' "
        "AND resultado_json->>'evaluacion_id'=:evaluation AND input_json->>'materia_id'=:subject "
        "AND user_id IN (:owner,:actor) ORDER BY created_at,id"),
        {'evaluation': str(evaluation.id), 'subject': str(evaluation.materia_id), 'owner': evaluation.profesor_id, 'actor': actor.id})).mappings())
    rows = [row for row in rows if isinstance((row['resultado_json'] or {}).get('normalized_extraction'), dict)
        and isinstance(row['resultado_json']['normalized_extraction'].get('text'), str)
        and row['resultado_json'].get('materia_id', str(evaluation.materia_id)) == str(evaluation.materia_id)]
    if source_job_id:
        rows = [row for row in rows if row['id'] == source_job_id]
        if not rows:
            raise HTTPException(404, 'Fuente documental no disponible para esta evaluación.')
    if len(rows) != 1:
        return {'disponible': False, 'fuentes': [{'id': str(row['id']), 'fecha': row['created_at']} for row in rows],
            'mensaje': 'Elige la digitalización que corresponde.' if rows else 'No conservamos una transcripción recuperable. Sube el original para crear una nueva evaluación.'}
    from app.modules.evaluaciones.digitalize_service import _strip_student_answer_annotations
    row = rows[0]
    snapshot = (await get_content_revision(db, evaluation.id, evaluation.contenido_version_id)).snapshot_json if evaluation.contenido_version_id else _snapshot(evaluation)
    retained = _strip_student_answer_annotations(row['resultado_json']['normalized_extraction']['text'])
    try:
        inventory = build_document_inventory(retained)
        document = propose_document(evaluation, inventory)
    except ValueError as exc:
        raise HTTPException(422, 'La fuente supera los límites o necesita revisión. Conservamos el original.') from exc
    original_available = False
    resources = await db.scalars(select(EvaluacionRecurso).where(EvaluacionRecurso.evaluacion_id == evaluation.id,
        EvaluacionRecurso.propietario_id == evaluation.profesor_id, EvaluacionRecurso.materia_id == evaluation.materia_id,
        EvaluacionRecurso.clase == 'original', EvaluacionRecurso.estado == 'ready'))
    for resource in resources:
        try:
            await read_resource_bytes(resource)
            original_available = True; break
        except HTTPException:
            continue
    return {'disponible': True, 'fuentes': [], 'source_job_id': str(row['id']),
        'source_fingerprint': content_hash({'job': str(row['id']), 'texto': retained, 'source': snapshot}),
        'material_ids': [block['id'] for block in (snapshot.get('contenido_visual') or {}).get('bloques', [])],
        'texto': retained, 'documento': document.model_dump(mode='json'), 'preguntas': recovery_questions(evaluation),
        'original_disponible': original_available,
        'mensaje': 'Solo recuperamos el texto conservado. Compara las figuras con tu original; no se han reconstruido.',
        'expected_updated_at': evaluation.updated_at, 'expected_content_version_id': evaluation.contenido_version_id}


async def validate_recovery(db, evaluation, request, actor):
    _permissions(actor)
    recovery = request.recuperacion_documental
    if evaluation.materia_id != request.materia_destino_id:
        raise HTTPException(422, 'La recuperación organizada crea una copia en la misma materia.')
    source = await read_recovery(db, evaluation.id, actor, recovery.source_job_id)
    if not source['disponible'] or source['source_fingerprint'] != recovery.source_fingerprint:
        raise HTTPException(409, 'La fuente cambió. Vuelve a comparar la propuesta antes de crear la copia.')
    document = recovery.documento
    try:
        assert_document_ready(document)
        if document.puntuacion_secciones is not None:
            raise ValueError('La recuperación conserva los máximos originales. Configura puntajes después en la copia.')
        if set(document.revision.detectados) != set(source['documento']['revision']['detectados']):
            raise ValueError('Compara todo el inventario de origen antes de confirmar.')
        validate_document_scope(document, source['preguntas'], material_ids=source['material_ids'])
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return source
