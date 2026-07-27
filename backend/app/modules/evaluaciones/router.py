from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user
from app.db.session import get_db
from app.modules.evaluaciones import generation_service, service
from app.modules.evaluaciones.schemas import (
    DigitalizarEvaluacionExternaRequest,
    EvaluacionBlueprintRead,
    EvaluacionCreate,
    EvaluacionRead,
    EvaluacionEstadoRead,
    EvaluacionEstructuraValidacion,
    EvaluacionGenerarRequest,
    EvaluacionSorpresaCreate,
    EvaluacionUpdate,
)
from app.modules.users.models import User

router = APIRouter(tags=["evaluaciones"])


@router.post(
    "/evaluaciones/generar-borrador",
    response_model=EvaluacionRead,
    status_code=status.HTTP_201_CREATED,
)
async def generate_evaluation_draft(
    payload: EvaluacionGenerarRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await generation_service.generate_evaluation_draft(db, payload, current_user)


@router.post("/evaluaciones/externa/digitalizar", response_model=EvaluacionRead, status_code=status.HTTP_201_CREATED)
async def digitalize_external_evaluation(
    payload: DigitalizarEvaluacionExternaRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.digitalize_external_evaluation(db, payload, current_user)


@router.post("/evaluaciones/sorpresa", response_model=EvaluacionRead, status_code=status.HTTP_201_CREATED)
async def create_surprise_evaluation(
    payload: EvaluacionSorpresaCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.create_surprise_evaluation(db, payload, current_user)


@router.post("/evaluaciones", response_model=EvaluacionRead, status_code=status.HTTP_201_CREATED)
async def create_evaluation(
    payload: EvaluacionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.create_evaluation(db, payload, current_user)


@router.get("/materias/{materia_id}/evaluaciones", response_model=list[EvaluacionRead])
async def list_evaluations_for_materia(
    materia_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[object]:
    return await service.list_evaluations_for_materia(db, materia_id, current_user)


@router.get("/evaluaciones/{evaluacion_id}", response_model=EvaluacionRead)
async def get_evaluation(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    return await service.ensure_can_read_evaluation(db, evaluacion_id, current_user)


@router.patch("/evaluaciones/{evaluacion_id}", response_model=EvaluacionRead)
async def update_evaluation(
    evaluacion_id: UUID,
    payload: EvaluacionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.update_evaluation(db, evaluacion, payload)


@router.post("/evaluaciones/{evaluacion_id}/crear-blueprint", response_model=EvaluacionBlueprintRead)
async def rebuild_blueprint(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.rebuild_blueprint(db, evaluacion)


@router.post("/evaluaciones/{evaluacion_id}/publicar", response_model=EvaluacionEstadoRead)
async def publish_evaluation(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.publish_evaluation(db, evaluacion)


@router.post("/evaluaciones/{evaluacion_id}/cerrar", response_model=EvaluacionEstadoRead)
async def close_evaluation(
    evaluacion_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.close_evaluation(db, evaluacion)


@router.patch("/evaluaciones/{evaluacion_id}/validar-estructura", response_model=EvaluacionRead)
async def validate_structure(
    evaluacion_id: UUID,
    payload: EvaluacionEstructuraValidacion,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> object:
    evaluacion = await service.ensure_can_manage_evaluation(db, evaluacion_id, current_user)
    return await service.validate_structure(db, evaluacion, payload)
