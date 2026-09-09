from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PipelineTimings(BaseModel):
    queue: int = 0
    prepare: int = 0
    extraction: int = 0
    structure: int = 0
    primary: int = 0
    secondary: int = 0
    consolidation: int = 0
    persistence: int = 0
    total: int = 0


class JobFallback(BaseModel):
    stage: str
    reason: str
    previous_candidate: str | None = None


class JobSummary(BaseModel):
    total: int = 0
    queued: int = 0
    running: int = 0
    retrying: int = 0
    success: int = 0
    requires_review: int = 0
    failed_permanent: int = 0
    cancelled: int = 0


class JobRead(BaseModel):
    id: UUID
    tipo: str
    estado: str
    progreso: int
    parent_job_id: UUID | None = None
    entrega_id: UUID | None = None
    stage: str | None = None
    attempt_count: int = 0
    heartbeat_at: datetime | None = None
    lease_expires_at: datetime | None = None
    resultado_json: dict
    timings_ms: PipelineTimings = Field(default_factory=PipelineTimings)
    terminal_reason: str | None = None
    fallbacks: list[JobFallback] = Field(default_factory=list)
    pipeline_run_id: UUID | None = None
    deadline_ms: int | None = None
    slow_after_ms: int | None = None
    elapsed_ms: int = 0
    summary: JobSummary | None = None
    error: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None

    model_config = {"from_attributes": True}


class JobEstadoRead(BaseModel):
    id: UUID
    estado: str
    progreso: int
    error: str | None
    stage: str | None = None
    attempt_count: int = 0

    model_config = {"from_attributes": True}


class JobItemRead(BaseModel):
    job_id: UUID
    entrega_id: UUID | None = None
    estudiante_id: UUID | None = None
    estado: str
    stage: str | None = None
    progreso: int
    attempt_count: int = 0
    error_code: str | None = None


class JobItemsPage(BaseModel):
    items: list[JobItemRead] = Field(default_factory=list)
    total: int = 0
    limit: int
    offset: int


class JobRetryRequest(BaseModel):
    job_ids: list[UUID] | None = Field(default=None, max_length=100)


class JobRetryRead(BaseModel):
    requested: int
    enqueued: int
    skipped: int
