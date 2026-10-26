"""Independent editorial copies on the existing durable queue. Never calls AI."""
from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import timezone
import hashlib
from types import SimpleNamespace
from uuid import UUID, uuid5

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from app.core.config import settings

from app.core.permissions import require_permission_now
from app.modules.authorization.models import AuditEvent
from app.modules.authorization.service import effective_permissions
from app.modules.dba.models import DBAPersonalizado
from app.modules.evaluaciones.copy_schemas import CopyRequest
from app.modules.evaluaciones.modality_service import normalize_question_modalities
from app.modules.evaluaciones.models import Evaluacion, EvaluacionBlueprint, EvaluacionContenidoVersion, EvaluacionRecurso
from app.modules.evaluaciones.print_settings import PrintSettings, validate_print_scope
from app.modules.evaluaciones.service import ensure_can_manage_evaluation
from app.modules.evaluaciones.visual_schemas import VisualCoverage, VisualManifest
from app.modules.evaluaciones.visual_service import _snapshot, content_hash, get_content_revision, read_resource_bytes
from app.modules.jobs import service as jobs
from app.modules.materias.service import ensure_can_manage_materia
from app.modules.users.models import User
from app.services.storage_service import PRIVATE_MIME_EXTENSIONS, resolve_private_upload_path

JOB_TYPE = 'evaluacion_copia'
MAX_COPY_BYTES = 200 * 1024 * 1024
RESOURCE_FIELDS = ('id', 'clase', 'origen', 'storage_key', 'sha256', 'mime', 'bytes_size', 'ancho', 'alto', 'paginas', 'estado', 'seguridad_contenido')
DBA_FIELDS = ('id', 'area', 'grado', 'enunciado', 'evidencias_aprendizaje', 'ejemplo', 'fuente', 'activo')
EDITORIAL_FIELDS = ('nombre', 'descripcion', 'tipo_origen', 'modalidad', 'nota_maxima', 'preguntas', 'respuestas_esperadas', 'criterios', 'dba_ids', 'dba_personalizado_ids', 'metas_profesor', 'configuracion_impresion', 'politica_intento', 'intentos_permitidos', 'tiempo_limite_minutos', 'estructura_documento')


def _permissions(actor):
    require_permission_now(actor, 'evaluations.read')
    require_permission_now(actor, 'evaluations.create')


def _request_data(request):
    data = request.model_dump(mode='json')
    if data.get('recuperacion_documental') is None:
        data.pop('recuperacion_documental', None)  # Preserve identities of legacy admissions.
    return data


def _utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


async def _job(db, job_id):
    row = (await db.execute(text('SELECT * FROM ai_jobs WHERE id=:id'), {'id': job_id})).mappings().first()
    return dict(row) if row else None


def _public(row):
    return {'job_id': row['id'], 'estado': row['estado'], 'progreso': row['progreso'],
            'materia_destino_id': row['input_json']['target_id'],
            'evaluacion_id': (row['resultado_json'] or {}).get('evaluacion_id'), 'error': row['error'],
            'solicitud': row['input_json'].get('request')}


async def latest_copy(db, source_id, actor, recovery=False):
    _permissions(actor)
    await ensure_can_manage_evaluation(db, source_id, actor)
    if recovery:
        require_permission_now(actor, 'evaluations.update')
    row = (await db.execute(text("SELECT * FROM ai_jobs WHERE tipo=:kind AND user_id=:actor AND input_json->>'source_id'=:source "
        "AND (COALESCE(input_json->'request'->'recuperacion_documental','null'::jsonb)<>'null'::jsonb)=:recovery ORDER BY created_at DESC,id DESC LIMIT 1"),
        {'kind': JOB_TYPE, 'actor': actor.id, 'source': str(source_id), 'recovery': recovery})).mappings().first()
    if row:
        await ensure_can_manage_materia(db, UUID(row['input_json']['target_id']), actor)
    return _public(row) if row else None


async def read_copy(db, job_id, actor):
    _permissions(actor)
    row = await _job(db, job_id)
    if not row or row['tipo'] != JOB_TYPE or row['user_id'] != actor.id:
        raise HTTPException(404, 'Copia no disponible')
    if row['input_json'].get('request', {}).get('recuperacion_documental'):
        require_permission_now(actor, 'evaluations.update')
    await ensure_can_manage_materia(db, UUID(row['input_json']['target_id']), actor)
    return _public(row)


def _legacy_links(value):
    if isinstance(value, list):
        return any(_legacy_links(item) for item in value)
    if isinstance(value, dict):
        return any((key in {'imagen_url', 'image_url', 'archivo_url', 'src', 'url'} and isinstance(item, str) and bool(item))
                   or _legacy_links(item) for key, item in value.items())
    return False


async def request_copy(db, source_id, request: CopyRequest, actor):
    _permissions(actor)
    recovery = request.recuperacion_documental
    if recovery:
        require_permission_now(actor, 'evaluations.update')
        if not settings.EVALUATION_DOCUMENT_STRUCTURE_ENABLED:
            raise HTTPException(409, 'La recuperación documental aún no está habilitada. Tu evaluación no cambia.')
    fingerprint = content_hash({'source_id': str(source_id), 'request': _request_data(request)})
    # Serialize duplicate admissions before either allocates a job or files.
    lock = int.from_bytes(hashlib.sha256(request.request_key.bytes).digest()[:8], 'big', signed=True)
    await db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': lock})
    previous = await _job(db, request.request_key)
    if previous:
        if previous['tipo'] != JOB_TYPE or previous['user_id'] != actor.id:
            raise HTTPException(404, 'Solicitud no disponible')
        if previous['input_json'].get('fingerprint') != fingerprint:
            raise HTTPException(409, 'La solicitud ya corresponde a otra copia. Vuelve a abrir la opción para iniciar una nueva.')
        await ensure_can_manage_materia(db, UUID(previous['input_json']['target_id']), actor)
        if previous['estado'] in {'requires_review', 'failed', 'failed_permanent', 'cancelled'}:
            if previous['attempt_count'] >= max(1, min(3, settings.AI_JOB_MAX_ATTEMPTS)):
                raise HTTPException(409, 'No pudimos completar esta copia. Revisa el material original antes de iniciar otra.')
            await db.execute(text("UPDATE ai_jobs SET estado='queued', error=NULL, progreso=0, claim_token=NULL, lease_expires_at=NULL, resultado_json=resultado_json-'_copy_cleaned' WHERE id=:id"), {'id': request.request_key})
            await db.commit()
            _dispatch(request.request_key, actor.id)
            previous = await _job(db, request.request_key)
        return _public(previous)
    source = await ensure_can_manage_evaluation(db, source_id, actor)
    target = await ensure_can_manage_materia(db, request.materia_destino_id, actor, admission=True)
    if (source.materia_id == target.id and not recovery) or source.profesor_id != target.profesor_id:
        raise HTTPException(422, 'Elige otra materia activa del mismo docente.')
    source = await db.scalar(select(Evaluacion).options(selectinload(Evaluacion.blueprint)).where(
        Evaluacion.id == source_id, Evaluacion.deleted_at.is_(None)).with_for_update(of=Evaluacion).execution_options(populate_existing=True))
    if source is None:
        raise HTTPException(404, 'Evaluación no disponible')
    if _utc(source.updated_at) != _utc(request.expected_updated_at) or source.contenido_version_id != request.expected_content_version_id:
        raise HTTPException(409, 'La evaluación cambió. Abre su versión actual antes de copiarla.')
    if source.material_origen_id or source.tipo_actividad:
        raise HTTPException(422, 'Este recurso interactivo se reutiliza desde Recursos. No crearemos una copia incompleta.')
    revision = await get_content_revision(db, source.id, source.contenido_version_id) if source.contenido_version_id else None
    snapshot = deepcopy(revision.snapshot_json) if revision else _snapshot(source)
    if recovery:
        from app.modules.evaluaciones.document_recovery import validate_recovery
        recovered = await validate_recovery(db, source, request, actor)
        snapshot.update(preguntas=recovered['preguntas'], estructura_documento=recovery.documento.model_dump(mode='json'))
        # No second legacy reading authority beside the recovered document.
        if snapshot.get('blueprint'):
            snapshot['blueprint']['reglas_feedback'] = {key: value for key, value in snapshot['blueprint'].get('reglas_feedback', {}).items() if key != 'lectura'}
    if revision is None:
        # Same effective response modes as the legacy publication path, with no
        # changes to wording, points or keys when introducing a content version.
        snapshot['preguntas'] = normalize_question_modalities(snapshot.get('preguntas'), snapshot.get('modalidad'))
    snapshot.update({field: getattr(source, field) for field in ('politica_intento', 'intentos_permitidos', 'tiempo_limite_minutos')})
    if _legacy_links(snapshot.get('preguntas')):
        raise HTTPException(422, 'Esta evaluación conserva imágenes enlazadas sin archivo propio. Guarda sus figuras en el editor antes de copiarla.')
    try:
        manifest = VisualManifest.model_validate(snapshot['contenido_visual']) if snapshot.get('contenido_visual') else None
        ids = {UUID(value) for value in revision.recurso_ids} if revision else set()
    except (ValueError, TypeError) as exc:
        raise HTTPException(409, 'No pudimos comprobar el material completo. Revisa las figuras del original antes de copiarlo.') from exc
    if manifest:
        ids.update(manifest.recurso_ids)
        if manifest.original_recurso_id:
            ids.add(manifest.original_recurso_id)
    resources = list(await db.scalars(select(EvaluacionRecurso).where(EvaluacionRecurso.id.in_(ids)).order_by(EvaluacionRecurso.id))) if ids else []
    if len(resources) != len(ids) or len(resources) > 500 or sum(row.bytes_size for row in resources) > MAX_COPY_BYTES:
        raise HTTPException(409, 'Falta material o la copia supera 200 MB o 500 materiales. Revisa las figuras antes de continuar.')
    for resource in resources:
        if (resource.evaluacion_id, resource.materia_id, resource.propietario_id) != (source.id, source.materia_id, source.profesor_id):
            raise HTTPException(404, 'Material no disponible para esta evaluación')
        await read_resource_bytes(resource)
    custom_ids = {UUID(value) for value in snapshot.get('dba_personalizado_ids', [])}
    custom = list(await db.scalars(select(DBAPersonalizado).where(DBAPersonalizado.id.in_(custom_ids)))) if custom_ids else []
    if len(custom) != len(custom_ids) or any((row.materia_id, row.profesor_id) != (source.materia_id, source.profesor_id) for row in custom):
        raise HTTPException(409, 'Revisa los criterios personalizados antes de copiar la evaluación.')
    encode = lambda rows, fields: [{field: str(getattr(row, field)) if isinstance(getattr(row, field), UUID) else getattr(row, field) for field in fields} for row in rows]
    payload = {'schema': 128, 'fingerprint': fingerprint, 'source_id': str(source.id), 'source_version_id': str(source.contenido_version_id) if source.contenido_version_id else None,
               'request': _request_data(request),
               'target_id': str(target.id), 'owner_id': str(source.profesor_id), 'snapshot': snapshot,
               'resources': encode(resources, RESOURCE_FIELDS), 'custom_dba': encode(custom, DBA_FIELDS),
               'name': request.nombre or source.nombre, 'coverage': deepcopy(revision.coverage_json) if revision else VisualCoverage().model_dump(mode='json')}
    await jobs.create_job(db, user_id=actor.id, tipo=JOB_TYPE, job_id=request.request_key, input_json=payload)
    db.add(AuditEvent(actor_id=actor.id, event='evaluation_copy_requested', entity_type='evaluacion', entity_id=str(source.id), metadata_json={'job_id': str(request.request_key), 'target_id': str(target.id)}))
    await db.commit()
    _dispatch(request.request_key, actor.id)
    return _public(await _job(db, request.request_key))


def _dispatch(job_id, actor_id):
    try:
        jobs.dispatch_persisted_job({'id': job_id, 'tipo': JOB_TYPE, 'user_id': actor_id, 'input_json': {'schema': 128}})
    except Exception:
        # The committed queued job is recovered with the same identity.
        pass


def _remap(value, identities):
    if isinstance(value, str):
        return identities.get(value, value)
    if isinstance(value, list):
        return [_remap(item, identities) for item in value]
    if isinstance(value, dict):
        return {identities.get(key, key): _remap(item, identities) for key, item in value.items()}
    return value


def _copy_key(job_id, resource):
    extension = PRIVATE_MIME_EXTENSIONS.get(resource['mime'])
    if not extension:
        raise HTTPException(409, 'El material utiliza un formato no compatible con una copia segura.')
    return f'.private/evaluation-copies/{job_id}/{uuid5(job_id, resource["id"])}{extension}'


def _write_copy(key, data, digest):
    path = resolve_private_upload_path(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file() and path.stat().st_size == len(data) and hashlib.sha256(path.read_bytes()).hexdigest() == digest:
        return
    temporary = resolve_private_upload_path(key + '.part')
    with temporary.open('wb') as target:
        target.write(data)
    temporary.replace(path)


async def perform_copy(db, job_id: UUID, token: str):
    row = await _job(db, job_id)
    if not row or row['tipo'] != JOB_TYPE:
        raise HTTPException(404, 'Copia no disponible')
    if row['estado'] == 'success':
        return UUID(row['resultado_json']['evaluacion_id'])
    # Locks the durable operation for the entire atomic final transaction.
    await jobs.lock_owned_job(db, job_id, token)
    payload = row['input_json']
    actor = await db.get(User, row['user_id'])
    if actor is None or actor.estado != 'activo':
        raise HTTPException(403, 'La cuenta que solicitó la copia ya no está activa.')
    actor._effective_permissions = await effective_permissions(db, actor)
    _permissions(actor)
    target = await ensure_can_manage_materia(db, UUID(payload['target_id']), actor)
    if str(target.profesor_id) != payload['owner_id']:
        raise HTTPException(403, 'La materia destino cambió de propietario.')
    source = await db.get(Evaluacion, UUID(payload['source_id']))
    if source is None or str(source.profesor_id) != payload['owner_id']:
        raise HTTPException(403, 'La evaluación origen ya no pertenece al mismo docente.')
    if payload.get('request', {}).get('recuperacion_documental'):
        from app.modules.evaluaciones.document_recovery import validate_recovery
        await ensure_can_manage_evaluation(db, source.id, actor)
        await validate_recovery(db, source, CopyRequest.model_validate(payload['request']), actor)
    identities = {item['id']: str(uuid5(job_id, item['id'])) for item in payload['resources'] + payload['custom_dba']}
    snapshot = deepcopy(payload['snapshot'])
    for i, question in enumerate(snapshot.get('preguntas', [])):
        old = str(question.get('contenido_id') or f'question:{i}')
        question['contenido_id'] = old
        identities[old] = str(uuid5(job_id, old))
    if snapshot.get('blueprint'):
        for question in snapshot['blueprint'].get('preguntas', []):
            matches = [item for item in snapshot.get('preguntas', []) if item.get('numero') == question.get('numero')]
            if len(matches) == 1:
                question['contenido_id'] = matches[0]['contenido_id']
                if matches[0].get('modalidad_respuesta'):
                    question['modalidad_respuesta'] = matches[0]['modalidad_respuesta']
    for block in (snapshot.get('contenido_visual') or {}).get('bloques', []):
        identities[str(block['id'])] = str(uuid5(job_id, str(block['id'])))
    for node in (snapshot.get('estructura_documento') or {}).get('nodos', []):
        identities[str(node['id'])] = str(uuid5(job_id, str(node['id'])))
    snapshot = _remap(snapshot, identities)
    snapshot['nombre'] = payload['name']
    if snapshot.get('blueprint'):
        snapshot['blueprint']['contexto_rag'] = []
    new_id = uuid5(job_id, 'evaluation')
    copied = Evaluacion(id=new_id, materia_id=target.id, profesor_id=target.profesor_id,
                         estado='borrador', recepcion_habilitada=False,
                         **{field: snapshot[field] for field in EDITORIAL_FIELDS if field in snapshot})
    db.add(copied); await db.flush()
    if snapshot.get('blueprint'):
        copied.blueprint = EvaluacionBlueprint(evaluacion_id=copied.id, **snapshot['blueprint'])
    for item in payload['custom_dba']:
        db.add(DBAPersonalizado(id=UUID(identities[item['id']]), materia_id=target.id, profesor_id=target.profesor_id,
                               **{field: item[field] for field in DBA_FIELDS if field != 'id'}))
    for item in payload['resources']:
        content = await read_resource_bytes(SimpleNamespace(**item))
        key = _copy_key(job_id, item)
        # Destination bytes are deterministic per operation; a crash can reuse
        # verified staging, never a random second copy or a source filename.
        await asyncio.to_thread(_write_copy, key, content, item['sha256'])
        resource = EvaluacionRecurso(id=UUID(identities[item['id']]), propietario_id=target.profesor_id,
            materia_id=target.id, evaluacion_id=copied.id, request_key=UUID(identities[item['id']]), job_id=job_id,
            storage_key=key, procedencia_json={'copy_job': str(job_id), 'source_resource_id': item['id']},
            **{field: item[field] for field in RESOURCE_FIELDS if field not in {'id', 'storage_key', 'estado'}}, estado='ready')
        db.add(resource)
    await db.flush()
    manifest = VisualManifest.model_validate(snapshot['contenido_visual']) if snapshot.get('contenido_visual') else None
    print_config = PrintSettings.model_validate(snapshot['configuracion_impresion']) if snapshot.get('configuracion_impresion') else None
    validate_print_scope(print_config, copied.preguntas, snapshot.get('contenido_visual'))
    if snapshot.get('estructura_documento'):
        from app.modules.evaluaciones.document_schemas import EvaluationDocument
        from app.modules.evaluaciones.document_structure import validate_document_scope
        validate_document_scope(EvaluationDocument.model_validate(snapshot['estructura_documento']), copied.preguntas,
            material_ids=[block.id for block in manifest.bloques] if manifest else [])
    if payload['source_version_id'] is not None or snapshot.get('estructura_documento'):
        revision = EvaluacionContenidoVersion(evaluacion_id=copied.id, numero_version=1, autor_id=actor.id,
            content_hash=content_hash(snapshot), motivo='Copia independiente de evaluación', origen='copia',
            snapshot_json=snapshot, coverage_json=_remap(payload['coverage'], identities), recurso_ids=[identities[item['id']] for item in payload['resources']],
            source_resource_id=manifest.original_recurso_id if manifest else None)
        db.add(revision); await db.flush(); copied.contenido_version_id = revision.id
    # A text-only legacy source stays on its working editing/publication
    # contract. Its admitted snapshot is durable in the job; adding figures
    # later creates versions through the normal editor, not a fake manifest.
    db.add(AuditEvent(actor_id=actor.id, event='evaluation_copied', entity_type='evaluacion', entity_id=str(copied.id),
                      metadata_json={'source_id': payload['source_id'], 'source_version_id': payload['source_version_id'], 'job_id': str(job_id)}))
    if not await jobs.finish_job(db, job_id, estado='success', resultado_json={'claim_token': token, 'evaluacion_id': str(copied.id), 'materia_id': str(target.id)}):
        raise jobs.JobOwnershipLost('La copia ya no posee el trabajo')
    await db.commit()
    return copied.id


async def cleanup_failed_files(db, job_id):
    """Never delete a file after an uncertain commit that may reference it."""
    row = await _job(db, job_id)
    if not row or row['tipo'] != JOB_TYPE:
        return
    for item in row['input_json'].get('resources', []):
        key = _copy_key(job_id, item)
        referenced = await db.scalar(select(EvaluacionRecurso.id).where(EvaluacionRecurso.storage_key == key))
        if referenced is None:
            for candidate in (key, key + '.part'):
                try:
                    resolve_private_upload_path(candidate).unlink(missing_ok=True)
                except OSError:
                    pass
