from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.shared.enums import CalificacionEstado, EntregaTipo


# ── Entregas ────────────────────────────────────────────────────────────────────

class EntregaCreate(BaseModel):
    evaluacion_id: UUID
    tipo: EntregaTipo
    respuesta_texto: str | None = None
    # archivo_url se setea internamente después del upload


class EntregaOnlineCreate(BaseModel):
    respuesta_texto: str = Field(..., min_length=1)


class EntregaRead(BaseModel):
    id: UUID
    evaluacion_id: UUID
    estudiante_id: UUID
    materia_id: UUID
    tipo: str
    estado: str
    respuesta_texto: str | None
    archivo_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Calificaciones ──────────────────────────────────────────────────────────────

class GradingResult(BaseModel):
    nota_sugerida: Decimal
    nota_maxima: Decimal
    confianza: float = Field(ge=0.0, le=1.0)
    criterios: list[dict] = []
    feedback_estudiante: str = ""
    alertas: list[str] = []
    requiere_revision_docente: bool = True
    raw_model_output: dict = {}


class CalificacionRead(BaseModel):
    id: UUID
    evaluacion_id: UUID
    estudiante_id: UUID
    materia_id: UUID
    nota_sugerida: Decimal | None
    nota_confirmada: Decimal | None
    confianza: Decimal | None
    feedback: str | None
    estado: str
    revisado_por_docente: bool
    resultado_json: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConfirmarNota(BaseModel):
    nota_confirmada: Decimal = Field(ge=0)


class AjustarNota(BaseModel):
    nota_confirmada: Decimal = Field(ge=0)
    feedback: str | None = None


# ── Lote ───────────────────────────────────────────────────────────────────────

class LoteFotoEntry(BaseModel):
    estudiante_id: UUID
    filename: str


class LoteFotoRequest(BaseModel):
    evaluacion_id: UUID
    entries: list[LoteFotoEntry]


class LoteFotoRead(BaseModel):
    calificaciones: list[CalificacionRead]
    errores: list[dict]

    model_config = {"from_attributes": True}


# ── Modo Salón ──────────────────────────────────────────────────────────────────

class SalonSesionCreate(BaseModel):
    evaluacion_id: UUID


class SalonSesionRead(BaseModel):
    sesion_id: str
    evaluacion_id: UUID
    estudiantes_pendientes: int
    estado: str = "activa"


class SalonFotoRequest(BaseModel):
    estudiante_id: UUID
    # imagen viene como multipart/form-data


class SalonEstudianteRead(BaseModel):
    estudiante_id: UUID
    estado: str
    error_msg: str | None = None

    model_config = {"from_attributes": True}


class SalonEstudianteUpdate(BaseModel):
    estado: str
    error_msg: str | None = None


class SalonResumen(BaseModel):
    sesion_id: str
    evaluacion_id: UUID
    estudiantes: list[SalonEstudianteRead]
    total: int
    pendientes: int
    calificados: int
    confirmados: int
    omitidos: int


class BoletinItem(BaseModel):
    evaluacion_id: UUID
    evaluacion_nombre: str
    nota_confirmada: Decimal | None
    nota_sugerida: Decimal | None
    nota_maxima: Decimal
    estado: str
    feedback: str | None

    model_config = {"from_attributes": True}


class MateriaResumenAcademico(BaseModel):
    materia_id: UUID
    materia_nombre: str
    promedio: float
    total_notas: int


class ResumenAcademico(BaseModel):
    mejor: MateriaResumenAcademico | None
    por_mejorar: MateriaResumenAcademico | None
    promedio_general: float | None
    total_materias: int
    total_notas: int