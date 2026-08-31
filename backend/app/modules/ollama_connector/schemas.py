from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PairingCodeRead(BaseModel):
    code: str
    expires_at: datetime


class ConnectorPairRequest(BaseModel):
    code: str = Field(min_length=8, max_length=40)
    name: str = Field(min_length=2, max_length=120)
    platform: str = Field(default="windows", pattern="^windows$")
    version: str | None = Field(default=None, max_length=40)


class ConnectorPairRead(BaseModel):
    connector_id: UUID
    token: str


class ConnectorModelWrite(BaseModel):
    model_id: str = Field(min_length=1, max_length=240)
    capabilities: list[str] = Field(default_factory=lambda: ["text"])


class ConnectorModelsUpdate(BaseModel):
    models: list[ConnectorModelWrite] = Field(max_length=200)


class ConnectorRead(BaseModel):
    id: UUID
    name: str
    platform: str
    version: str | None
    status: str
    active: bool
    last_seen_at: datetime | None
    models: list[ConnectorModelWrite] = Field(default_factory=list)


class ConnectorJobClaimRead(BaseModel):
    job_id: UUID
    lease_token: str
    feature: str
    model: str
    payload: dict
    lease_expires_at: datetime


class ConnectorLeaseRequest(BaseModel):
    lease_token: str = Field(min_length=20, max_length=200)


class ConnectorJobCompleteRequest(ConnectorLeaseRequest):
    result: dict


class ConnectorJobFailRequest(ConnectorLeaseRequest):
    error_code: str = Field(min_length=1, max_length=80)
