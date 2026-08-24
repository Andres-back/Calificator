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


class JobRead(BaseModel):
    id: UUID
    tipo: str
    estado: str
    progreso: int
    resultado_json: dict
    timings_ms: PipelineTimings = Field(default_factory=PipelineTimings)
    terminal_reason: str | None = None
    fallbacks: list[JobFallback] = Field(default_factory=list)
    pipeline_run_id: UUID | None = None
    deadline_ms: int | None = None
    slow_after_ms: int | None = None
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

    model_config = {"from_attributes": True}
