from uuid import UUID

from fastapi import APIRouter, Depends, Header, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import require_permission
from app.db.session import get_db
from app.modules.ollama_connector import service
from app.modules.ollama_connector.models import OllamaConnector
from app.modules.ollama_connector.schemas import (
    ConnectorJobClaimRead,
    ConnectorJobCompleteRequest,
    ConnectorJobFailRequest,
    ConnectorLeaseRequest,
    ConnectorModelsUpdate,
    ConnectorPairRead,
    ConnectorPairRequest,
    ConnectorRead,
    PairingCodeRead,
)
from app.modules.users.models import User

router = APIRouter(tags=["ollama-connector"])


async def current_connector(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> OllamaConnector:
    if not authorization or not authorization.lower().startswith("bearer "):
        from fastapi import HTTPException

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Conector no autorizado")
    return await service.authenticate_connector(db, authorization.split(" ", 1)[1])


@router.post("/profesor/ollama-connectors/pairing", response_model=PairingCodeRead, status_code=status.HTTP_201_CREATED)
async def create_pairing(
    teacher: User = Depends(require_permission("ai_settings.personal")),
    db: AsyncSession = Depends(get_db),
) -> PairingCodeRead:
    code, expires_at = await service.create_pairing_code(db, teacher.id)
    return PairingCodeRead(code=code, expires_at=expires_at)


@router.get("/profesor/ollama-connectors", response_model=list[ConnectorRead])
async def get_connectors(
    teacher: User = Depends(require_permission("ai_settings.personal")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    return await service.list_connectors(db, teacher.id)


@router.delete("/profesor/ollama-connectors/{connector_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connector(
    connector_id: UUID,
    teacher: User = Depends(require_permission("ai_settings.personal")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await service.revoke_connector(db, connector_id=connector_id, profesor_id=teacher.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/connector/pair", response_model=ConnectorPairRead, status_code=status.HTTP_201_CREATED)
async def pair(payload: ConnectorPairRequest, db: AsyncSession = Depends(get_db)) -> ConnectorPairRead:
    connector, token = await service.pair_connector(db, **payload.model_dump())
    return ConnectorPairRead(connector_id=connector.id, token=token)


@router.put("/connector/models", status_code=status.HTTP_204_NO_CONTENT)
async def update_models(
    payload: ConnectorModelsUpdate,
    connector: OllamaConnector = Depends(current_connector),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await service.replace_models(db, connector, payload.models)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/connector/jobs/claim", response_model=ConnectorJobClaimRead | None)
async def claim(
    connector: OllamaConnector = Depends(current_connector),
    db: AsyncSession = Depends(get_db),
) -> ConnectorJobClaimRead | None:
    claimed = await service.claim_job(db, connector)
    if not claimed:
        return None
    job, lease_token, payload = claimed
    return ConnectorJobClaimRead(
        job_id=job.id,
        lease_token=lease_token,
        feature=job.feature,
        model=job.model_id,
        payload=payload,
        lease_expires_at=job.lease_expires_at,
    )


@router.post("/connector/jobs/{job_id}/heartbeat", status_code=status.HTTP_204_NO_CONTENT)
async def heartbeat(
    job_id: UUID,
    payload: ConnectorLeaseRequest,
    connector: OllamaConnector = Depends(current_connector),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await service.heartbeat_job(db, connector, job_id, payload.lease_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/connector/jobs/{job_id}/complete", status_code=status.HTTP_202_ACCEPTED)
async def complete(
    job_id: UUID,
    payload: ConnectorJobCompleteRequest,
    connector: OllamaConnector = Depends(current_connector),
    db: AsyncSession = Depends(get_db),
) -> dict:
    accepted = await service.complete_job(db, connector, job_id, payload.lease_token, payload.result)
    return {"status": "accepted" if accepted else "already_completed"}


@router.post("/connector/jobs/{job_id}/fail", status_code=status.HTTP_202_ACCEPTED)
async def fail(
    job_id: UUID,
    payload: ConnectorJobFailRequest,
    connector: OllamaConnector = Depends(current_connector),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await service.fail_job(db, connector, job_id, payload.lease_token, payload.error_code)
    return {"status": "failed"}
