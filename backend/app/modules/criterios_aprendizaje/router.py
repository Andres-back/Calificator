"""Rutas canónicas de criterios de aprendizaje."""
from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.criterios_aprendizaje import application_service, authorization, generation_service, service, source_service
from app.modules.criterios_aprendizaje.schemas import (
    LearningCriteriaApproveRequest,
    LearningCriteriaApplicationRead,
    LearningCriteriaApplyRequest,
    LearningCriteriaCloneRequest,
    LearningCriteriaListRead,
    LearningCriteriaSetCreate,
    LearningCriteriaSetRead,
    LearningCriteriaProposalRead,
    LearningCriteriaProposalRequest,
    LearningCriteriaVersionUpdate,
    LearningSourceRead,
    LearningSourceReferenceCreate,
    LearningSourceTextCreate,
)
from app.modules.users.models import User


router = APIRouter(tags=["criterios-aprendizaje"])


def _require_write_enabled() -> None:
    if not settings.CRITERIA_WRITE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La edición de criterios de aprendizaje aún no está habilitada",
        )


def _parse_rotations(raw: str | None, expected: int) -> list[int] | None:
    if raw is None or not raw.strip():
        return None
    try:
        value = json.loads(raw)
        rotations = value if isinstance(value, list) else [value]
        normalized = [int(item) for item in rotations]
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=422, detail="Las rotaciones no tienen un formato válido") from exc
    if len(normalized) != expected:
        raise HTTPException(status_code=422, detail="Debe enviarse una rotación por cada archivo")
    return normalized


@router.get("/criterios-aprendizaje/capacidades")
async def learning_criteria_capabilities(
    _current_user: User = Depends(get_current_user),
) -> dict[str, bool]:
    return {
        "ui": settings.CRITERIA_UI,
        "write": settings.CRITERIA_UI and settings.CRITERIA_WRITE,
        "generation": settings.CRITERIA_UI and settings.CRITERIA_WRITE and settings.CRITERIA_GENERATION,
    }


@router.get(
    "/materias/{materia_id}/criterios-aprendizaje",
    response_model=LearningCriteriaListRead,
)
async def list_learning_criteria(
    materia_id: UUID,
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rows, total = await service.list_sets(
        db, materia_id=materia_id, actor=current_user, limit=limit, offset=offset
    )
    return {"items": rows, "total": total, "limit": limit, "offset": offset}


@router.post(
    "/materias/{materia_id}/criterios-aprendizaje",
    response_model=LearningCriteriaSetRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_learning_criteria(
    materia_id: UUID,
    payload: LearningCriteriaSetCreate,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_write_enabled()
    row = await service.create_set(
        db,
        materia_id=materia_id,
        payload=payload,
        actor=current_user,
        idempotency_key=idempotency_key,
    )
    return await service.serialize_set(db, row)


@router.get(
    "/criterios-aprendizaje/{set_id}",
    response_model=LearningCriteriaSetRead,
)
async def get_learning_criteria(
    set_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await service.get_set(db, set_id=set_id, actor=current_user)


@router.patch(
    "/criterios-aprendizaje/versiones/{version_id}",
    response_model=LearningCriteriaSetRead,
)
async def update_learning_criteria_version(
    version_id: UUID,
    payload: LearningCriteriaVersionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_write_enabled()
    row = await service.update_version(db, version_id=version_id, payload=payload, actor=current_user)
    return await service.serialize_set(db, row)


@router.post(
    "/criterios-aprendizaje/versiones/{version_id}/aprobar",
    response_model=LearningCriteriaSetRead,
)
async def approve_learning_criteria_version(
    version_id: UUID,
    payload: LearningCriteriaApproveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_write_enabled()
    row = await service.approve_version(
        db,
        version_id=version_id,
        revision_expected=payload.revision_esperada,
        acknowledge_warnings=payload.reconocer_advertencias,
        actor=current_user,
    )
    return await service.serialize_set(db, row)


@router.post(
    "/criterios-aprendizaje/{set_id}/versiones",
    response_model=LearningCriteriaSetRead,
    status_code=status.HTTP_201_CREATED,
)
async def clone_learning_criteria_version(
    set_id: UUID,
    payload: LearningCriteriaCloneRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_write_enabled()
    row = await service.clone_version(
        db,
        set_id=set_id,
        source_version_id=payload.source_version_id,
        actor=current_user,
    )
    return await service.serialize_set(db, row)


@router.post(
    "/criterios-aprendizaje/{set_id}/archivar",
    response_model=LearningCriteriaSetRead,
)
async def archive_learning_criteria(
    set_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_write_enabled()
    row = await service.archive_set(db, set_id=set_id, actor=current_user)
    return await service.serialize_set(db, row)


@router.post(
    "/criterios-aprendizaje/versiones/{version_id}/fuentes/archivo",
    response_model=LearningSourceRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_learning_file_source(
    version_id: UUID,
    archivo: list[UploadFile] = File(...),
    rotaciones: str | None = Form(default=None),
    visible_to_student: bool = Form(default=False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    _require_write_enabled()
    return await source_service.add_file_source(
        db,
        version_id=version_id,
        uploads=archivo,
        rotations=_parse_rotations(rotaciones, len(archivo)),
        visible_to_student=visible_to_student,
        actor=current_user,
    )


@router.post(
    "/criterios-aprendizaje/versiones/{version_id}/fuentes/texto",
    response_model=LearningSourceRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_learning_text_source(
    version_id: UUID,
    payload: LearningSourceTextCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    _require_write_enabled()
    return await source_service.add_text_source(
        db, version_id=version_id, payload=payload, actor=current_user
    )


@router.post(
    "/criterios-aprendizaje/versiones/{version_id}/fuentes/referencia",
    response_model=LearningSourceRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_learning_reference_source(
    version_id: UUID,
    payload: LearningSourceReferenceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    _require_write_enabled()
    return await source_service.add_reference_source(
        db, version_id=version_id, payload=payload, actor=current_user
    )


@router.get("/criterios-aprendizaje/fuentes/{source_id}")
async def get_learning_source_content(
    source_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    source, _version, _criterion_set = await authorization.get_source_for_management(
        db, source_id, current_user
    )
    if source.tipo == "texto":
        return PlainTextResponse(str((source.reference_json or {}).get("contenido") or ""))
    if source.tipo in {"material_existente", "estandar_oficial"}:
        raise HTTPException(status_code=409, detail="Abre esta referencia desde su módulo de origen")
    return FileResponse(
        source_service.source_private_path(source),
        media_type=source.mime_type or "application/octet-stream",
        filename=source.display_name,
    )


@router.delete(
    "/criterios-aprendizaje/fuentes/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_learning_source(
    source_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    _require_write_enabled()
    await source_service.delete_source(db, source_id=source_id, actor=current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/criterios-aprendizaje/versiones/{version_id}/proponer",
    response_model=LearningCriteriaProposalRead,
    status_code=status.HTTP_202_ACCEPTED,
)
async def propose_learning_criteria(
    version_id: UUID,
    payload: LearningCriteriaProposalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_write_enabled()
    if not settings.CRITERIA_GENERATION:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La propuesta asistida aún no está habilitada; puedes crear los criterios manualmente",
        )
    job_id, state = await generation_service.queue_proposal(
        db,
        version_id=version_id,
        regenerate=payload.regenerar,
        actor=current_user,
    )
    return {"job_id": job_id, "version_id": version_id, "estado": state}


@router.post(
    "/criterios-aprendizaje/versiones/{version_id}/aplicar",
    response_model=LearningCriteriaApplicationRead,
)
async def apply_learning_criteria_version(
    version_id: UUID,
    payload: LearningCriteriaApplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    _require_write_enabled()
    row = await application_service.apply_version(
        db,
        version_id=version_id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        actor_id=current_user.id,
    )
    return {
        "id": row.id,
        "version_id": row.version_id,
        "target_type": row.target_type,
        "target_id": row.target_id,
        "snapshot_hash": row.snapshot_hash,
        "snapshot": row.snapshot_json,
        "applied_at": row.applied_at,
    }
