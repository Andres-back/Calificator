"""Contratos de criterios de aprendizaje."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class TeacherIntent(BaseModel):
    que_evaluar: str = Field(min_length=3, max_length=2000)
    como_evaluar: str = Field(default="", max_length=2000)
    grado: str = Field(default="", max_length=80)
    tipo_evidencia: str = Field(default="", max_length=120)
    prioridades: list[str] = Field(default_factory=list, max_length=12)
    restricciones: str = Field(default="", max_length=2000)


class LearningCriterionLevelInput(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    descripcion: str = Field(min_length=1, max_length=1000)
    desde: Decimal | None = None
    hasta: Decimal | None = None


class LearningCriterionInput(BaseModel):
    stable_key: str | None = Field(default=None, max_length=80)
    nombre: str = Field(min_length=2, max_length=180)
    descripcion: str = Field(min_length=3, max_length=3000)
    evidencia_esperada: str = Field(min_length=3, max_length=3000)
    peso_porcentaje: Decimal = Field(ge=0, le=100)
    puntaje_maximo: Decimal | None = Field(default=None, ge=0)
    niveles: list[LearningCriterionLevelInput] = Field(default_factory=list, max_length=8)
    source_refs: list[dict[str, Any]] = Field(default_factory=list, max_length=50)
    official_standard_refs: list[dict[str, Any]] = Field(default_factory=list, max_length=30)

    @field_validator("stable_key")
    @classmethod
    def normalize_key(cls, value: str | None) -> str | None:
        normalized = (value or "").strip().lower()
        if not normalized:
            return None
        if not all(character.isalnum() or character in "-_" for character in normalized):
            raise ValueError("La clave del criterio solo admite letras, números, guion y guion bajo")
        return normalized


class LearningCriteriaSetCreate(BaseModel):
    titulo: str = Field(min_length=2, max_length=180)
    descripcion: str | None = Field(default=None, max_length=3000)
    intencion_docente: TeacherIntent
    criterios: list[LearningCriterionInput] = Field(default_factory=list, max_length=50)


class LearningCriteriaVersionUpdate(BaseModel):
    revision_esperada: int = Field(ge=1)
    titulo: str | None = Field(default=None, min_length=2, max_length=180)
    descripcion: str | None = Field(default=None, max_length=3000)
    intencion_docente: TeacherIntent | None = None
    criterios: list[LearningCriterionInput] | None = Field(default=None, max_length=50)

    @model_validator(mode="after")
    def require_change(self) -> "LearningCriteriaVersionUpdate":
        if self.titulo is None and self.descripcion is None and self.intencion_docente is None and self.criterios is None:
            raise ValueError("Incluye al menos un cambio")
        return self


class LearningCriteriaApproveRequest(BaseModel):
    revision_esperada: int = Field(ge=1)
    reconocer_advertencias: bool = False


class LearningCriteriaCloneRequest(BaseModel):
    source_version_id: UUID | None = None


class LearningSourceTextCreate(BaseModel):
    titulo: str = Field(min_length=2, max_length=255)
    contenido: str = Field(min_length=3, max_length=30000)
    visible_to_student: bool = False


class LearningSourceReferenceCreate(BaseModel):
    tipo: Literal["material_existente", "estandar_oficial"]
    reference_id: UUID
    titulo: str = Field(min_length=2, max_length=255)
    visible_to_student: bool = False


class LearningSourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tipo: str
    orden: int
    display_name: str
    mime_type: str | None = None
    size_bytes: int | None = None
    page_count: int | None = None
    extraction_status: str
    visible_to_student: bool
    error: str | None = None
    created_at: datetime


class LearningCriterionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    stable_key: str
    orden: int
    nombre: str
    descripcion: str
    evidencia_esperada: str
    peso_porcentaje: Decimal
    puntaje_maximo: Decimal | None = None
    niveles: list[dict[str, Any]]
    source_refs: list[dict[str, Any]]
    official_standard_refs: list[dict[str, Any]]


class LearningCriteriaVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    set_id: UUID
    version_number: int
    revision: int
    estado: str
    intencion_docente: dict[str, Any]
    cobertura: dict[str, Any]
    criterios: list[LearningCriterionRead]
    fuentes: list[LearningSourceRead]
    approved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class LearningCriteriaSetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    materia_id: UUID
    profesor_id: UUID
    titulo: str
    descripcion: str | None
    estado: str
    current_version_id: UUID | None
    version_trabajo: LearningCriteriaVersionRead | None = None
    version_aprobada: LearningCriteriaVersionRead | None = None
    usos: int = 0
    created_at: datetime
    updated_at: datetime


class LearningCriteriaListRead(BaseModel):
    items: list[LearningCriteriaSetRead]
    total: int
    limit: int
    offset: int


class LearningCriteriaProposalRequest(BaseModel):
    regenerar: bool = False


class LearningCriteriaProposalRead(BaseModel):
    job_id: UUID
    version_id: UUID
    estado: str


class LearningCriteriaApplyRequest(BaseModel):
    target_type: Literal["evaluacion", "recurso"]
    target_id: UUID


class LearningCriteriaApplicationRead(BaseModel):
    id: UUID
    version_id: UUID
    target_type: str
    target_id: UUID
    snapshot_hash: str
    snapshot: dict[str, Any]
    applied_at: datetime
