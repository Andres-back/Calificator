"""Fuentes privadas para construir criterios de aprendizaje."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.criterios_aprendizaje import authorization
from app.modules.criterios_aprendizaje.audit import audit_criteria_event
from app.modules.criterios_aprendizaje.models import LearningCriterionSource
from app.modules.criterios_aprendizaje.schemas import (
    LearningSourceReferenceCreate,
    LearningSourceTextCreate,
)
from app.modules.dba.models import DBACatalog
from app.modules.users.models import User
from app.services.document_bundle_service import DocumentBundleError, build_document_bundle
from app.services.storage_service import resolve_private_upload_path, save_private_upload


EDITABLE_STATES = {"borrador", "requiere_revision"}


def _ensure_editable(state: str) -> None:
    if state not in EDITABLE_STATES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Las fuentes solo pueden modificarse en un borrador",
        )


async def _next_order(db: AsyncSession, version_id: UUID) -> int:
    value = await db.scalar(
        select(func.max(LearningCriterionSource.orden)).where(
            LearningCriterionSource.version_id == version_id,
        )
    )
    return int(value or 0) + 1


async def add_file_source(
    db: AsyncSession,
    *,
    version_id: UUID,
    uploads: list[UploadFile],
    rotations: list[int] | None,
    visible_to_student: bool,
    actor: User,
) -> LearningCriterionSource:
    version, criterion_set = await authorization.get_version_for_management(db, version_id, actor)
    _ensure_editable(version.estado)
    try:
        bundle = await build_document_bundle(uploads, rotations=rotations)
    except DocumentBundleError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    content_hash = hashlib.sha256(bundle.content).hexdigest()
    duplicate = await db.scalar(
        select(LearningCriterionSource.id).where(
            LearningCriterionSource.version_id == version.id,
            LearningCriterionSource.content_hash == content_hash,
            LearningCriterionSource.deleted_at.is_(None),
        )
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este material ya está agregado al borrador")

    private_key: str | None = None
    try:
        private_key = await save_private_upload(
            bundle.content,
            bundle.mime,
            subfolder=f"learning-criteria/{criterion_set.id}/{version.id}",
        )
        row = LearningCriterionSource(
            version_id=version.id,
            tipo=bundle.source_type,
            orden=await _next_order(db, version.id),
            display_name=bundle.filename,
            private_file_key=private_key,
            mime_type=bundle.mime,
            size_bytes=len(bundle.content),
            page_count=bundle.page_count,
            reference_json={"nombres_originales": bundle.original_names},
            extraction_status="pendiente",
            content_hash=content_hash,
            visible_to_student=visible_to_student,
        )
        db.add(row)
        version.revision += 1
        await db.commit()
        await db.refresh(row)
    except Exception:
        await db.rollback()
        if private_key:
            resolve_private_upload_path(private_key).unlink(missing_ok=True)
        raise
    await audit_criteria_event(
        db,
        event="source_added",
        actor_id=actor.id,
        set_id=criterion_set.id,
        version_id=version.id,
        extra={"source_id": str(row.id), "source_type": row.tipo, "page_count": row.page_count},
    )
    return row


async def add_text_source(
    db: AsyncSession,
    *,
    version_id: UUID,
    payload: LearningSourceTextCreate,
    actor: User,
) -> LearningCriterionSource:
    version, criterion_set = await authorization.get_version_for_management(db, version_id, actor)
    _ensure_editable(version.estado)
    content = payload.contenido.strip()
    content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
    duplicate = await db.scalar(
        select(LearningCriterionSource.id).where(
            LearningCriterionSource.version_id == version.id,
            LearningCriterionSource.content_hash == content_hash,
            LearningCriterionSource.deleted_at.is_(None),
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Este texto ya está agregado al borrador")
    row = LearningCriterionSource(
        version_id=version.id,
        tipo="texto",
        orden=await _next_order(db, version.id),
        display_name=payload.titulo.strip(),
        mime_type="text/plain",
        size_bytes=len(content.encode("utf-8")),
        page_count=1,
        reference_json={"contenido": content},
        extraction_status="lista",
        content_hash=content_hash,
        visible_to_student=payload.visible_to_student,
    )
    db.add(row)
    version.revision += 1
    await db.commit()
    await db.refresh(row)
    await audit_criteria_event(
        db,
        event="source_added",
        actor_id=actor.id,
        set_id=criterion_set.id,
        version_id=version.id,
        extra={"source_id": str(row.id), "source_type": "texto", "page_count": 1},
    )
    return row


async def add_reference_source(
    db: AsyncSession,
    *,
    version_id: UUID,
    payload: LearningSourceReferenceCreate,
    actor: User,
) -> LearningCriterionSource:
    version, criterion_set = await authorization.get_version_for_management(db, version_id, actor)
    _ensure_editable(version.estado)
    reference: dict[str, str]
    title: str
    if payload.tipo == "estandar_oficial":
        standard = await db.get(DBACatalog, payload.reference_id)
        if standard is None or not standard.activo:
            raise HTTPException(status_code=404, detail="Estándar oficial no encontrado")
        title = standard.descripcion[:255]
        reference = {"id": str(standard.id), "codigo": standard.codigo or ""}
    else:
        material = (
            await db.execute(
                text(
                    "SELECT id, titulo FROM materiales_generados "
                    "WHERE id=:id AND materia_id=:materia_id AND profesor_id=:profesor_id"
                ),
                {"id": payload.reference_id, "materia_id": criterion_set.materia_id, "profesor_id": criterion_set.profesor_id},
            )
        ).mappings().first()
        if material is None:
            raise HTTPException(status_code=404, detail="Material de referencia no encontrado")
        title = str(material["titulo"])
        reference = {"id": str(material["id"])}
    fingerprint = hashlib.sha256(f"{payload.tipo}:{payload.reference_id}".encode()).hexdigest()
    duplicate = await db.scalar(
        select(LearningCriterionSource.id).where(
            LearningCriterionSource.version_id == version.id,
            LearningCriterionSource.content_hash == fingerprint,
            LearningCriterionSource.deleted_at.is_(None),
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Esta referencia ya está agregada al borrador")
    row = LearningCriterionSource(
        version_id=version.id,
        tipo=payload.tipo,
        orden=await _next_order(db, version.id),
        display_name=title or payload.titulo.strip(),
        page_count=1,
        reference_json=reference,
        extraction_status="lista",
        content_hash=fingerprint,
        visible_to_student=payload.visible_to_student,
    )
    db.add(row)
    version.revision += 1
    await db.commit()
    await db.refresh(row)
    await audit_criteria_event(
        db,
        event="source_added",
        actor_id=actor.id,
        set_id=criterion_set.id,
        version_id=version.id,
        extra={"source_id": str(row.id), "source_type": row.tipo},
    )
    return row


async def delete_source(db: AsyncSession, *, source_id: UUID, actor: User) -> None:
    source, version, criterion_set = await authorization.get_source_for_management(db, source_id, actor)
    _ensure_editable(version.estado)
    file_key = source.private_file_key
    source.deleted_at = datetime.now(timezone.utc)
    source.extraction_status = "eliminada"
    version.revision += 1
    await db.commit()

    # Una nueva versión puede reutilizar el archivo de la anterior. Solo se
    # elimina físicamente cuando no existe otra referencia activa.
    if file_key:
        other_references = int(
            await db.scalar(
                select(func.count(LearningCriterionSource.id)).where(
                    LearningCriterionSource.private_file_key == file_key,
                    LearningCriterionSource.deleted_at.is_(None),
                )
            )
            or 0
        )
        if other_references == 0:
            path = resolve_private_upload_path(file_key)
            path.unlink(missing_ok=True)
    await audit_criteria_event(
        db,
        event="source_removed",
        actor_id=actor.id,
        set_id=criterion_set.id,
        version_id=version.id,
        extra={"source_id": str(source.id), "source_type": source.tipo},
    )


def source_private_path(source: LearningCriterionSource) -> Path:
    if not source.private_file_key:
        raise HTTPException(status_code=404, detail="Esta fuente no contiene un archivo")
    path = resolve_private_upload_path(source.private_file_key)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="El archivo de referencia no está disponible")
    return path
