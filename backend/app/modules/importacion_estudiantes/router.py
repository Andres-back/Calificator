from __future__ import annotations

import hashlib
from uuid import UUID
from sqlalchemy import select, text

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.permissions import get_current_user
from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.modules.importacion_estudiantes import service
from app.modules.importacion_estudiantes.models import ImportacionEstudiantesLote
from app.modules.importacion_estudiantes.schemas import ConfirmacionRead, ExistingEnrollmentRequest, ExistingStudentRead, LoteCreated, LoteRead, LoteUpdate, TemporaryPasswordRead
from app.modules.jobs import service as jobs_service
from app.modules.materias.service import ensure_can_manage_materia
from app.modules.users.models import User
from app.services.storage_service import UploadTooLargeError, read_upload_limited, save_private_upload, validate_mime

router = APIRouter(prefix="/materias", tags=["importacion-estudiantes"])
MAX_ROSTER_PHOTO = 20 * 1024 * 1024


@router.post("/{materia_id}/importaciones-estudiantes", response_model=LoteCreated, status_code=status.HTTP_202_ACCEPTED)
async def create_import(
    materia_id: UUID,
    archivo: UploadFile = File(...),
    actor: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit(limit=10, window_seconds=3600, scope="roster-import")),
) -> dict:
    await ensure_can_manage_materia(db, materia_id, actor)
    try:
        content = await read_upload_limited(archivo, MAX_ROSTER_PHOTO)
    except UploadTooLargeError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    try:
        mime = validate_mime(content, archivo.filename or "lista.jpg")
    except ValueError as exc:
        raise HTTPException(status_code=415, detail="Sube una fotografía JPG, PNG o WEBP válida") from exc
    if not mime.startswith("image/"):
        raise HTTPException(status_code=415, detail="Sube una fotografía JPG, PNG o WEBP")
    file_key = await save_private_upload(content, mime, subfolder="roster-imports")
    try:
        lote = ImportacionEstudiantesLote(materia_id=materia_id, creado_por=actor.id, archivo_key=file_key, archivo_nombre=(archivo.filename or "lista.jpg")[:255], archivo_sha256=hashlib.sha256(content).hexdigest(), estado="procesando")
        db.add(lote)
        await db.flush()
        job_id = await jobs_service.create_job(db, user_id=actor.id, tipo="importacion_estudiantes", input_json={"lote_id": str(lote.id), "materia_id": str(materia_id), "archivo_sha256": lote.archivo_sha256})
        lote.job_id = job_id
        await db.commit()
    except Exception:
        await db.rollback()
        service.delete_private_photo_key(file_key)
        raise
    try:
        jobs_service.dispatch_persisted_job({"id": job_id, "user_id": actor.id, "tipo": "importacion_estudiantes", "input_json": {"lote_id": str(lote.id)}})
    except Exception:
        # El recuperador vuelve a publicar el trabajo persistido.
        pass
    return {"id": lote.id, "job_id": job_id, "estado": lote.estado}


@router.get("/{materia_id}/importaciones-estudiantes", response_model=list[LoteRead])
async def list_imports(materia_id: UUID, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await ensure_can_manage_materia(db, materia_id, actor)
    return list((await db.scalars(select(ImportacionEstudiantesLote).options(selectinload(ImportacionEstudiantesLote.filas)).where(ImportacionEstudiantesLote.materia_id == materia_id, ImportacionEstudiantesLote.estado.in_(["procesando", "revision", "error"])).order_by(ImportacionEstudiantesLote.created_at.desc()).limit(10))).all())


@router.get("/{materia_id}/importaciones-estudiantes/{lote_id}", response_model=LoteRead)
async def read_import(materia_id: UUID, lote_id: UUID, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    lote = await service.get_lote(db, lote_id, actor)
    if lote.materia_id != materia_id:
        raise HTTPException(status_code=404, detail="Importación no encontrada")
    return lote


@router.put("/{materia_id}/importaciones-estudiantes/{lote_id}", response_model=LoteRead)
async def update_import(materia_id: UUID, lote_id: UUID, payload: LoteUpdate, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    lote = await service.get_lote(db, lote_id, actor)
    if lote.materia_id != materia_id:
        raise HTTPException(status_code=404, detail="Importación no encontrada")
    updated = await service.replace_rows(db, lote, payload.filas, actor)
    await db.commit()
    return updated


@router.delete("/{materia_id}/importaciones-estudiantes/{lote_id}", status_code=204)
async def cancel_import(materia_id: UUID, lote_id: UUID, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    lote = await service.get_lote(db, lote_id, actor)
    if lote.materia_id != materia_id or lote.estado == "confirmado":
        raise HTTPException(status_code=409, detail="La importación confirmada no se puede cancelar")
    lote.estado = "cancelado"
    key = lote.archivo_key
    lote.archivo_key = None
    if lote.job_id:
        await db.execute(
            text("UPDATE ai_jobs SET estado='cancelled' WHERE id=:id AND user_id=:user_id AND estado IN ('queued','running','retrying')"),
            {"id": str(lote.job_id), "user_id": str(lote.creado_por)},
        )
    await db.commit()
    if key:
        service.delete_private_photo_key(key)


@router.post("/{materia_id}/importaciones-estudiantes/{lote_id}/confirmar", response_model=ConfirmacionRead)
async def confirm_import(materia_id: UUID, lote_id: UUID, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    lote = await service.get_lote(db, lote_id, actor)
    if lote.materia_id != materia_id:
        raise HTTPException(status_code=404, detail="Importación no encontrada")
    key = lote.archivo_key
    result = await service.confirm_lote(db, lote_id, actor)
    lote.archivo_key = None
    await db.commit()
    if key:
        service.delete_private_photo_key(key)
    return result


@router.get("/{materia_id}/estudiantes-existentes", response_model=list[ExistingStudentRead])
async def list_existing(materia_id: UUID, q: str = Query(default="", max_length=80), actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    materia = await ensure_can_manage_materia(db, materia_id, actor)
    return await service.searchable_students(db, materia, q.strip())


@router.post("/{materia_id}/estudiantes-existentes/matricular")
async def enroll_existing(materia_id: UUID, payload: ExistingEnrollmentRequest, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await service.enroll_existing(db, materia_id, payload.estudiante_ids, actor)
    await db.commit()
    return result


@router.post("/{materia_id}/estudiantes/{student_id}/clave-temporal", response_model=TemporaryPasswordRead)
async def reset_student_password(materia_id: UUID, student_id: UUID, actor: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await service.reset_temporary_password(db, materia_id, student_id, actor)
    await db.commit()
    return result
