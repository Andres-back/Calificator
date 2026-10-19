"""Authorized private evaluation files, never a public asset library."""
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.permissions import get_current_user, require_any_permission_now, require_permission_now
from app.db.session import get_db
from app.modules.evaluaciones import service
from app.modules.evaluaciones.models import EvaluacionRecurso
from app.modules.evaluaciones.visual_schemas import VisualManifest, VisualUploadRequest
from app.modules.evaluaciones.visual_service import MAX_RESOURCE_BYTES, get_content_revision, read_resource_bytes, stage_resource
from app.modules.evaluaciones.visual_serialization import authorized_content_revision
from app.modules.materias.service import ensure_can_manage_materia
from app.modules.users.models import User
from app.services.storage_service import PRIVATE_MIME_EXTENSIONS, read_upload_limited

router = APIRouter(tags=["evaluaciones"])


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
