"""Strict, provider-independent contracts for maximum question scores."""
from datetime import datetime
from decimal import Decimal
import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


def score_decimal(value) -> Decimal:
    if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
        raise ValueError('Escribe un número de puntos válido.')
    text = str(value).strip()
    if len(text) > 32 or not re.fullmatch(r'(?:\d+(?:[.,]\d{1,4})?|[.,]\d{1,4})', text):
        raise ValueError('Usa un número positivo con hasta cuatro decimales, sin separador de miles.')
    result = Decimal(text.replace(',', '.'))
    if not result.is_finite() or result <= 0 or result > Decimal('9999.99'):
        raise ValueError('Los puntos deben ser mayores que cero y no superar la escala permitida.')
    return result


class ScoreGroup(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str = Field(min_length=1, max_length=80)
    titulo: str = Field(min_length=1, max_length=160)
    claves: list[str] = Field(min_length=1, max_length=100)
    presupuesto: Decimal
    fijados: dict[str, Decimal] = Field(default_factory=dict)

    @field_validator('presupuesto', mode='before')
    @classmethod
    def valid_budget(cls, value):
        return score_decimal(value)

    @field_validator('fijados', mode='before')
    @classmethod
    def valid_locks(cls, value):
        if not isinstance(value, dict) or len(value) > 100:
            raise ValueError('Revisa los puntos fijados de este bloque.')
        return {key: score_decimal(points) for key, points in value.items()}

    @field_validator('claves')
    @classmethod
    def valid_keys(cls, value):
        if any(not key or len(key) > 160 for key in value) or len(set(value)) != len(value):
            raise ValueError('Cada pregunta debe aparecer una sola vez dentro del bloque.')
        return value


class ScorePlan(BaseModel):
    model_config = ConfigDict(extra='forbid')
    schema_version: Literal[1] = 1
    modo: Literal['total', 'tipo', 'seccion', 'bloques']
    grupos: list[ScoreGroup] = Field(min_length=1, max_length=100)


class ScorePlanUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    plan: ScorePlan
    expected_updated_at: datetime
    expected_content_version_id: UUID | None = None


class ScoreSelection(BaseModel):
    model_config = ConfigDict(extra='forbid')
    calificacion_id: UUID
    fingerprint: str = Field(pattern=r'^[a-f0-9]{64}$')


class ScoreApplyRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    request_id: UUID
    definition_fingerprint: str = Field(pattern=r'^[a-f0-9]{64}$')
    confirmar: Literal[True]
    selecciones: list[ScoreSelection] = Field(min_length=1, max_length=100)

    @field_validator('confirmar', mode='before')
    @classmethod
    def explicit_confirmation(cls, value):
        if value is not True:
            raise ValueError('Confirma expresamente la actualización de estas notas.')
        return value

    @field_validator('selecciones')
    @classmethod
    def unique_selections(cls, values):
        if len({item.calificacion_id for item in values}) != len(values):
            raise ValueError('Selecciona cada calificación una sola vez.')
        return values
