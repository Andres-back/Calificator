from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, Field


class FormulaRead(BaseModel):
    puntos_obtenidos: Decimal
    puntos_posibles: Decimal
    nota_maxima: Decimal
    nota_base: Decimal
    ajuste_global: Decimal
    nota_antes_redondeo: Decimal
    regla_redondeo: str
    decimales: int
    nota_final: Decimal


class ComponenteRead(BaseModel):
    id: UUID
    clave: str
    orden: int
    tipo: str
    numero: str | None = None
    titulo: str
    respuesta_estudiante: str | None = None
    respuesta_referencia: str | None = None
    referencia_oculta: bool = False
    puntos_obtenidos: Decimal | None = None
    puntos_maximos: Decimal
    estado: str
    explicacion: str = ""
    explicacion_estudiante: str | None = None
    origen: str = ""
    requiere_revision: bool = False
    evidencia_paginas: list[int] = Field(default_factory=list)
    valoraciones: list[dict] = Field(default_factory=list)


class DesgloseDocenteRead(BaseModel):
    id: UUID
    calificacion_id: UUID
    version: int
    origen: str
    cobertura_estado: str
    formula: FormulaRead
    ajuste_global_detalle: dict | None = None
    requiere_revision: bool
    bloqueos: list[str] = Field(default_factory=list)
    procedencia: dict = Field(default_factory=dict)
    componentes: list[ComponenteRead]
    created_at: datetime


class DesgloseEstudianteRead(BaseModel):
    id: UUID
    calificacion_id: UUID
    version: int
    origen: str
    cobertura_estado: str
    formula: FormulaRead
    ajuste_global_detalle: dict | None = None
    nota_publicada: Decimal
    claves_liberadas: bool
    requiere_revision: bool
    componentes: list[ComponenteRead]
    created_at: datetime


class CambioComponente(BaseModel):
    componente_id: UUID
    puntos_obtenidos: Decimal = Field(ge=0)
    estado: Literal["correcta", "parcial", "incorrecta", "sin_respuesta"]
    motivo_interno: str = Field(min_length=3, max_length=1000)
    explicacion_estudiante: str = Field(min_length=3, max_length=2000)


class AjusteGlobal(BaseModel):
    valor: Decimal
    motivo_interno: str = Field(min_length=3, max_length=1000)
    explicacion_estudiante: str = Field(min_length=3, max_length=2000)


class ActualizarDesglose(BaseModel):
    version_esperada: int = Field(ge=1)
    cambios_componentes: list[CambioComponente] = Field(default_factory=list)
    ajuste_global: AjusteGlobal | None = None


class ResumenVersion(BaseModel):
    id: UUID
    version: int
    origen: str
    nota_final: Decimal
    activo: bool
    actor_nombre: str | None = None
    created_at: datetime


class LiberarRespuestas(BaseModel):
    liberadas: bool
