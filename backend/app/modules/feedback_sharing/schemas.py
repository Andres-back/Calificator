"""Entradas estrictas; el visitante nunca elige identidad ni alcance."""
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class PreviewInput(Input):
    calificacion_ids: list[UUID] = Field(min_length=1, max_length=100)

    @field_validator("calificacion_ids")
    @classmethod
    def unique_ids(cls, values):
        if len(set(values)) != len(values):
            raise ValueError("Selecciona cada estudiante una sola vez")
        return values


class Selection(Input):
    calificacion_id: UUID
    fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")


class DeliveryReviewInput(Input):
    calificacion_id: UUID
    source_fingerprint: str = Field(pattern=r'^[a-f0-9]{64}$')
    scope: Literal['summary', 'detail'] = 'summary'
    feedback_text: str = Field(min_length=1, max_length=6000)
    request_id: UUID


class FeedbackMessageInput(Input):
    calificacion_id: UUID
    source_fingerprint: str = Field(pattern=r'^[a-f0-9]{64}$')
    feedback_text: str = Field(min_length=1, max_length=6000)
    request_id: UUID


class SelectedInput(Input):
    selecciones: list[Selection] = Field(min_length=1, max_length=100)

    @field_validator("selecciones")
    @classmethod
    def unique_selection(cls, values):
        if len({value.calificacion_id for value in values}) != len(values):
            raise ValueError("Selecciona cada resultado una sola vez")
        return values


class AccessCreate(SelectedInput):
    request_id: UUID
    duracion_dias: StrictInt = Field(default=3, ge=1, le=30)
    evidencia: bool = False


class AccessAction(Input):
    expected_version: StrictInt = Field(ge=1)
    request_id: UUID


class ReactivateInput(AccessAction):
    duracion_dias: StrictInt = Field(default=3, ge=1, le=30)
    fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")
    evidencia: bool = False


class RenewInput(AccessAction):
    confirmar_reemplazo: bool


class QuestionInput(Input):
    request_id: UUID
    mensaje: str = Field(min_length=1, max_length=2000)


class BatchSelection(Input):
    calificacion_id: UUID
    source_fingerprint: str = Field(pattern=r'^[a-f0-9]{64}$')
    feedback_text: str = Field(min_length=1, max_length=6000)
    scope: Literal['summary', 'detail'] = 'summary'


class BatchPublishInput(Input):
    request_id: UUID
    selecciones: list[BatchSelection] = Field(min_length=1, max_length=25)

    @field_validator('selecciones')
    @classmethod
    def unique_grades(cls, values):
        if len({item.calificacion_id for item in values}) != len(values):
            raise ValueError('Selecciona cada estudiante una sola vez')
        return values


class AccessCopiesInput(Input):
    access_ids: list[UUID] = Field(min_length=1, max_length=100)

    @field_validator('access_ids')
    @classmethod
    def unique_accesses(cls, values):
        if len(set(values)) != len(values):
            raise ValueError('Selecciona cada enlace una sola vez')
        return values
