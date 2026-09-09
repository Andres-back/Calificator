"""Contratos estrictos y minimizados para el estudio de impacto."""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class StudyProtocol(StrictModel):
    unidad_analisis: str | None = Field(default=None, max_length=300)
    materias: list[str] = Field(default_factory=list, max_length=50)
    grados: list[str] = Field(default_factory=list, max_length=30)
    condiciones: list[Literal["manual", "asistida"]] = Field(default_factory=list)
    orden: str | None = Field(default=None, max_length=300)
    escala_maxima: float | None = Field(default=None, gt=0)
    categorias_kappa: list[float] = Field(default_factory=list, min_length=0, max_length=20)
    instrumentos: dict[str, str] = Field(default_factory=dict)
    criterios_inclusion: list[str] = Field(default_factory=list, max_length=50)
    criterios_exclusion: list[str] = Field(default_factory=list, max_length=50)

    @field_validator("categorias_kappa")
    @classmethod
    def categories_are_ordered(cls, value: list[float]) -> list[float]:
        if value != sorted(set(value)):
            raise ValueError("Las categorías Kappa deben ser únicas y estar ordenadas")
        return value


class StudyCreate(StrictModel):
    nombre: str = Field(min_length=3, max_length=180)
    protocol: StudyProtocol = Field(default_factory=StudyProtocol)
    teacher_ids: list[UUID] = Field(default_factory=list, max_length=200)
    previous_study_id: UUID | None = None
    synthetic_only: Literal[True] = True


class StudyActivate(StrictModel):
    expected_version: int = Field(ge=1)
    real_data: bool = False
    authorization_reference: str | None = Field(default=None, max_length=500)
    retention_days: int | None = Field(default=None, ge=1, le=3650)


class StudyClose(StrictModel):
    expected_version: int = Field(ge=1)


class StudyGrantWrite(StrictModel):
    expected_version: int = Field(ge=1)
    user_id: UUID
    actions: list[Literal["read", "manage", "export"]] = Field(min_length=1, max_length=3)
    scope: Literal["synthetic", "real"] = "synthetic"
    valid_until: datetime | None = None


class StudyGrantRevoke(StrictModel):
    expected_version: int = Field(ge=1)
    grant_id: UUID
    reason: str = Field(min_length=3, max_length=300)


class TimingPayload(StrictModel):
    type: Literal["timing"]
    duration_ms: int = Field(ge=0, le=86_400_000)
    unit: Literal["ms"] = "ms"
    phase: Literal["preparacion", "revision", "correccion", "finalizacion"]


class GradeComparisonPayload(StrictModel):
    type: Literal["grade_comparison"]
    suggested_initial: float = Field(ge=0)
    confirmed: float = Field(ge=0)
    independent_reference: float | None = Field(default=None, ge=0)
    scale_max: float = Field(gt=0)
    categories_version: str = Field(min_length=1, max_length=80)
    reviewer_saw_ai: bool

    @model_validator(mode="after")
    def scores_fit_scale(self):
        values = [self.suggested_initial, self.confirmed]
        if self.independent_reference is not None:
            values.append(self.independent_reference)
        if any(value > self.scale_max for value in values):
            raise ValueError("Las notas no pueden superar la escala declarada")
        return self


class FeedbackQualityPayload(StrictModel):
    type: Literal["feedback_quality"]
    instrument_version: str = Field(min_length=1, max_length=80)
    correccion: int = Field(ge=1, le=5)
    especificidad: int = Field(ge=1, le=5)
    claridad: int = Field(ge=1, le=5)
    utilidad: int = Field(ge=1, le=5)
    adecuacion: int = Field(ge=1, le=5)
    blinded: bool


class SurveyPayload(StrictModel):
    type: Literal["survey"]
    instrument_version: str = Field(min_length=1, max_length=80)
    responses: dict[str, int] = Field(min_length=1, max_length=100)

    @field_validator("responses")
    @classmethod
    def likert_only(cls, value: dict[str, int]) -> dict[str, int]:
        if any(not key or len(key) > 80 or score < 1 or score > 5 for key, score in value.items()):
            raise ValueError("La encuesta solo acepta ítems identificados y valores Likert de 1 a 5")
        return value


ObservationPayload = Annotated[
    TimingPayload | GradeComparisonPayload | FeedbackQualityPayload | SurveyPayload,
    Field(discriminator="type"),
]


class ObservationWrite(StrictModel):
    external_id: str = Field(min_length=1, max_length=120)
    revision: int = Field(default=1, ge=1)
    supersedes_external_id: str | None = Field(default=None, max_length=120)
    teacher_pseudonym: str = Field(min_length=1, max_length=80)
    work_key: str = Field(min_length=1, max_length=120)
    response_key: str | None = Field(default=None, max_length=120)
    evaluation_id: UUID | None = None
    grade_id: UUID | None = None
    condition: Literal["manual", "asistida"]
    observed_at: datetime
    payload: ObservationPayload
    missing_reason: str | None = Field(default=None, max_length=300)
    exclusion_reason: str | None = Field(default=None, max_length=300)


class ObservationBatch(StrictModel):
    expected_version: int = Field(ge=1)
    instrument_version: str = Field(min_length=1, max_length=80)
    import_id: str = Field(min_length=1, max_length=100)
    digest: str = Field(pattern=r"^[a-f0-9]{64}$")
    rows: list[ObservationWrite] = Field(min_length=1, max_length=1000)


class RetentionApply(StrictModel):
    expected_version: int = Field(ge=1)
    reason: str = Field(min_length=3, max_length=300)
    delete_observations: bool = True


class SurveySubmit(StrictModel):
    study_id: UUID
    expected_version: int = Field(ge=1)
    instrument_version: str = Field(min_length=1, max_length=80)
    external_id: str = Field(min_length=1, max_length=120)
    teacher_pseudonym: str = Field(min_length=1, max_length=80)
    responses: dict[str, int] = Field(min_length=1, max_length=100)
    condition: Literal["manual", "asistida"] = "asistida"
    observed_at: datetime

    @field_validator("responses")
    @classmethod
    def submit_likert_only(cls, value: dict[str, int]) -> dict[str, int]:
        return SurveyPayload(
            type="survey", instrument_version="validation", responses=value
        ).responses
