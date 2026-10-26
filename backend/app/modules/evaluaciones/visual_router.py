"""Authorized private evaluation files, never a public asset library."""
import asyncio
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.permissions import get_current_user, require_any_permission_now, require_permission_now
from app.db.session import get_db
from app.modules.evaluaciones import service
from app.modules.evaluaciones.models import EvaluacionRecurso
from app.modules.evaluaciones.visual_schemas import VisualCropRequest, VisualManifest, VisualProposalRequest, VisualUploadRequest
from app.modules.evaluaciones.visual_service import MAX_RESOURCE_BYTES, get_content_revision, read_resource_bytes, stage_resource
from app.modules.evaluaciones.visual_serialization import authorized_content_revision
from app.modules.materias.service import ensure_can_manage_materia
from app.modules.users.models import User
from app.services.storage_service import PRIVATE_MIME_EXTENSIONS, read_upload_limited

router = APIRouter(tags=["evaluaciones"])


@router.get('/evaluaciones/contenido-visual/capacidades')
async def visual_capabilities(current_user: User = Depends(get_current_user)) -> dict:
    require_any_permission_now(current_user, 'evaluations.create', 'evaluations.update')
    return {'importacion': settings.EVALUATION_VISUAL_IMPORT_ENABLED,
            'documento': settings.EVALUATION_DOCUMENT_STRUCTURE_ENABLED,
            'editor': settings.EVALUATION_VISUAL_EDITOR_ENABLED,
            'generacion': settings.EVALUATION_VISUAL_EDITOR_ENABLED and settings.EVALUATION_VISUAL_GENERATION_ENABLED,
            'max_bytes': MAX_RESOURCE_BYTES}


async def _proposal_scope(db, request, user):
    require_permission_now(user, 'evaluations.update' if request.evaluacion_id else 'evaluations.create')
    if not settings.EVALUATION_VISUAL_EDITOR_ENABLED:
        raise HTTPException(409, 'Añadir material todavía no está habilitado. Tu borrador se conserva.')
    subject = await ensure_can_manage_materia(db, request.materia_id, user)
    if request.evaluacion_id:
        evaluation = await service.ensure_can_manage_evaluation(db, request.evaluacion_id, user)
        if evaluation.materia_id != request.materia_id:
            raise HTTPException(404, 'Evaluación no disponible en esta materia')
        if evaluation.contenido_version_id != request.expected_version_id:
            raise HTTPException(409, 'La evaluación cambió. Conserva tu edición y abre la versión actual.')
    return subject


@router.post('/evaluaciones/recursos/recortar', status_code=201)
async def crop_resource(request: VisualCropRequest, current_user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)) -> dict:
    from app.modules.evaluaciones.visual_generation import crop_proposal_bytes, proposal_block
    subject = await _proposal_scope(db, request, current_user)
    source = await _resource_or_404(db, request.source_resource_id)
    if (source.propietario_id != subject.profesor_id or source.materia_id != request.materia_id
            or source.evaluacion_id != request.evaluacion_id):
        raise HTTPException(404, 'Página no disponible para esta evaluación')
    try:
        content = await asyncio.to_thread(crop_proposal_bytes, await read_resource_bytes(source), request.region)
    except ValueError as exc:
        raise HTTPException(422, 'Selecciona una región legible de una página PNG, JPEG o WebP.') from exc
    resource = await stage_resource(db, propietario_id=subject.profesor_id,
        request=VisualUploadRequest.model_validate(request.model_dump(include=set(VisualUploadRequest.model_fields))),
        content=content, clase=request.tipo, origen='subido',
        procedencia={'source_resource_id': str(source.id), 'region': list(request.region)})
    await db.commit()
    return {'bloque': proposal_block(request, resource.id).model_dump(mode='json')}


@router.post('/evaluaciones/recursos/estructurado', status_code=201)
async def structured_resource(request: VisualProposalRequest, current_user: User = Depends(get_current_user),
                              db: AsyncSession = Depends(get_db)) -> dict:
    from app.modules.evaluaciones.visual_generation import proposal_block
    from app.modules.evaluaciones.visual_render import render_structured_visual
    subject = await _proposal_scope(db, request, current_user)
    value = request.tabla or request.grafica
    if value is None:
        raise HTTPException(422, 'Completa los datos de la tabla o gráfica antes de previsualizar.')
    try:
        content = await asyncio.to_thread(render_structured_visual, value)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    resource = await stage_resource(db, propietario_id=subject.profesor_id,
        request=VisualUploadRequest.model_validate(request.model_dump(include=set(VisualUploadRequest.model_fields))),
        content=content, clase='render_' + request.tipo, origen='subido')
    await db.commit()
    return {'bloque': proposal_block(request, resource.id, table=request.tabla, chart=request.grafica).model_dump(mode='json')}


@router.post('/evaluaciones/recursos/generar', status_code=202)
async def generate_resource(request: VisualProposalRequest, current_user: User = Depends(get_current_user),
                            db: AsyncSession = Depends(get_db)) -> dict:
    from app.modules.jobs import service as jobs
    await _proposal_scope(db, request, current_user)
    if not settings.EVALUATION_VISUAL_GENERATION_ENABLED:
        raise HTTPException(409, 'Crear material con IA todavía no está habilitado. Puedes subir una imagen o introducir los datos.')
    # One owner lock serializes idempotency and admission, before paid work.
    await db.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:owner, 101))'), {'owner': str(current_user.id)})
    existing = (await db.execute(text('SELECT user_id,input_json FROM ai_jobs WHERE id=:id'), {'id': request.request_key})).mappings().first()
    proposal = request.model_dump(mode='json')
    if existing:
        previous = existing['input_json'].get('proposal')
        try:
            previous = VisualProposalRequest.model_validate(previous).model_dump(mode='json')
        except ValidationError:
            previous = None
        if existing['user_id'] != current_user.id or previous != proposal:
            raise HTTPException(409, 'Esta solicitud ya corresponde a otro material. Inicia una nueva propuesta.')
        return {'job_id': request.request_key}
    active = await db.scalar(text("SELECT count(*) FROM ai_jobs WHERE user_id=:user AND tipo='evaluacion_visual' AND estado IN ('queued','running','retrying')"), {'user': current_user.id})
    if active >= 2:
        raise HTTPException(409, 'Ya tienes dos propuestas en preparación. Espera o cancela una antes de pedir otra.')
    config = await jobs._resolve_job_ai_config(db, tipo='evaluacion_visual', feature='generacion_imagenes', user_id=current_user.id)
    if request.fondo_transparente:
        from app.services.image_router import supports_transparent_background
        if not supports_transparent_background(config.get('image')):
            raise HTTPException(422, 'La ruta de imágenes configurada no ofrece fondo transparente. Puedes usar la biblioteca o subir un PNG sin fondo.')
    payload = {'proposal': proposal, '_ai_config': config, '_single_image_attempt': True}
    job_id = await jobs.create_job(db, user_id=current_user.id, tipo='evaluacion_visual',
        input_json=payload, job_id=request.request_key)
    await db.commit()
    try:
        jobs.dispatch_persisted_job({'id': job_id, 'tipo': 'evaluacion_visual', 'user_id': current_user.id, 'input_json': payload})
    except Exception:
        # The recovery task republishes this already-durable job.
        pass
    return {'job_id': job_id}


def _is_manager(user: User, owner_id: UUID) -> bool:
    return user.rol == "admin" or user.id == owner_id


async def _resource_or_404(db: AsyncSession, resource_id: UUID) -> EvaluacionRecurso:
    resource = await db.get(EvaluacionRecurso, resource_id)
    if resource is None:
        raise HTTPException(404, "Material no disponible")
    return resource


async def _file_response(resource: EvaluacionRecurso, *, attachment: bool = False) -> Response:
    extension = PRIVATE_MIME_EXTENSIONS.get(resource.mime)
    if extension is None:
        raise HTTPException(409, "El formato del material necesita revisión.")
    content = await read_resource_bytes(resource)
    disposition = "attachment" if attachment else "inline"
    return Response(content, media_type=resource.mime, headers={
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
        "Content-Disposition": f'{disposition}; filename="material{extension}"',
    })


@router.post("/evaluaciones/recursos", status_code=201)
async def upload_resource(
    materia_id: UUID = Form(...), request_key: UUID = Form(...), file: UploadFile = File(...),
    evaluacion_id: UUID | None = Form(None), borrador_id: UUID | None = Form(None),
    clase: Literal["imagen", "dibujo"] = Form("imagen"),
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> dict:
    require_any_permission_now(current_user, "evaluations.create", "evaluations.update")
    if not settings.EVALUATION_VISUAL_EDITOR_ENABLED:
        raise HTTPException(409, "La carga de imágenes todavía no está habilitada. Tu borrador sigue disponible.")
    subject = await ensure_can_manage_materia(db, materia_id, current_user)
    if evaluacion_id is not None:
        require_permission_now(current_user, "evaluations.update")
        await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    else:
        require_permission_now(current_user, "evaluations.create")
    try:
        request = VisualUploadRequest(materia_id=materia_id, evaluacion_id=evaluacion_id, borrador_id=borrador_id, request_key=request_key)
    except ValidationError as exc:
        raise HTTPException(422, "Selecciona una evaluación o un borrador para añadir el material.") from exc
    content = await read_upload_limited(file, MAX_RESOURCE_BYTES)
    resource = await stage_resource(db, propietario_id=subject.profesor_id, request=request,
        content=content, clase=clase, origen="subido")
    await db.commit()
    return {field: getattr(resource, field) for field in (
        "id", "estado", "mime", "bytes_size", "ancho", "alto", "seguridad_contenido",
    )}


@router.get("/evaluaciones/recursos/{recurso_id}/propuesta")
async def preview_resource_proposal(
    recurso_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> Response:
    require_any_permission_now(current_user, "evaluations.create", "evaluations.update")
    resource = await _resource_or_404(db, recurso_id)
    if not _is_manager(current_user, resource.propietario_id):
        raise HTTPException(403, "No tienes acceso a este material")
    await ensure_can_manage_materia(db, resource.materia_id, current_user)
    if resource.evaluacion_id:
        await service.ensure_can_manage_evaluation(db, resource.evaluacion_id, current_user)
    return await _file_response(resource, attachment=resource.clase == "original")


async def _authorized_revision(db: AsyncSession, evaluation_id: UUID, version_id: UUID | None, user: User):
    return await authorized_content_revision(db, evaluation_id, version_id, user)


@router.get("/evaluaciones/{evaluacion_id}/recursos/{recurso_id}")
async def read_evaluation_resource(
    evaluacion_id: UUID, recurso_id: UUID, version_id: UUID | None = None,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> Response:
    require_permission_now(current_user, "evaluations.read")
    evaluation, revision = await _authorized_revision(db, evaluacion_id, version_id, current_user)
    if str(recurso_id) not in revision.recurso_ids:
        raise HTTPException(404, "Material no disponible en esta versión")
    resource = await _resource_or_404(db, recurso_id)
    if resource.evaluacion_id != evaluation.id or resource.estado != "ready":
        raise HTTPException(404, "Material no disponible en esta evaluación")
    if not _is_manager(current_user, evaluation.profesor_id):
        manifest = VisualManifest.model_validate(revision.snapshot_json["contenido_visual"])
        permitted = any(block.recurso_id == recurso_id for block in manifest.for_student().bloques)
        if not permitted or resource.clase == "original" or resource.seguridad_contenido != "publicable_confirmado":
            raise HTTPException(403, "Este material es exclusivo del docente")
    return await _file_response(resource, attachment=resource.clase == "original")


@router.get("/evaluaciones/{evaluacion_id}/original")
async def download_evaluation_original(
    evaluacion_id: UUID, version_id: UUID | None = None,
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> Response:
    require_permission_now(current_user, "evaluations.read")
    evaluation = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    selected_version = version_id or evaluation.contenido_version_id
    if selected_version is None:
        raise HTTPException(404, "No hay un original conservado para esta evaluación")
    revision = await get_content_revision(db, evaluation.id, selected_version)
    if revision.source_resource_id is None:
        raise HTTPException(404, "No hay un original conservado para esta versión")
    resource = await _resource_or_404(db, revision.source_resource_id)
    if resource.evaluacion_id != evaluation.id or resource.clase != "original" or resource.estado != "ready":
        raise HTTPException(404, "Documento original no disponible")
    return await _file_response(resource, attachment=True)
