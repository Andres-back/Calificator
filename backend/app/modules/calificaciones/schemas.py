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
    nota_sugerida: Decimal | None
    nota_maxima: Decimal
    confianza: float = Field(ge=0.0, le=1.0)
    criterios: list[dict] = Field(default_factory=list)
    feedback_estudiante: str = ""
    alertas: list[str] = Field(default_factory=list)
    requiere_revision_docente: bool = True
    motivo_revision: str | None = None
    raw_model_output: dict = Field(default_factory=dict)


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

class LoteAsincronoRead(BaseModel):
    job_id: UUID
    estado: str
    entrega_ids: list[UUID]


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


# ── Timeline / Auditoría ─────────────────────────────────────────────────────────

class CalificacionTimelineEvent(BaseModel):
    tipo: str  # 'confirmada' | 'ajustada' | 'rechazada' | 'sugerida' | 'anulada'
    nota_anterior: Decimal | None = None
    nota_nueva: Decimal | None = None
    feedback: str | None = None
    actor_id: UUID | None = None
    actor_nombre: str | None = None
    timestamp: datetime | None = None
    detalle: str | None = None


# ── Detalle de calificación ──────────────────────────────────────────────────────

class CalificacionDetalleRead(BaseModel):
    id: UUID
    evaluacion_id: UUID
    evaluacion_nombre: str = ""
    materia_id: UUID
    materia_nombre: str = ""
    estudiante_id: UUID
    estudiante_nombre: str = ""
    estudiante_email: str = ""
    nota_sugerida: Decimal | None
    nota_confirmada: Decimal | None
    nota_maxima: Decimal | None
    confianza: Decimal | None
    feedback: str | None
    estado: str
    revisado_por_docente: bool
    resultado_json: dict = {}
    entrega_tipo: str | None = None
    entrega_archivo_url: str | None = None
    entrega_respuesta_texto: str | None = None
    entrega_created_at: datetime | None = None
    timeline: list[CalificacionTimelineEvent] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Batch ────────────────────────────────────────────────────────────────────────

class BatchConfirmItem(BaseModel):
    calificacion_id: UUID
    nota_confirmada: Decimal = Field(ge=0)


class BatchConfirmRequest(BaseModel):
    items: list[BatchConfirmItem]


class BatchAjustarItem(BaseModel):
    calificacion_id: UUID
    nota_confirmada: Decimal = Field(ge=0)
    feedback: str | None = None


class BatchAjustarRequest(BaseModel):
    items: list[BatchAjustarItem]


class BatchResultItem(BaseModel):
    calificacion_id: UUID
    success: bool
    error: str | None = None


class BatchResult(BaseModel):
    results: list[BatchResultItem]
    total: int
    exitosos: int
    fallidos: int


# ── Incidencias ──────────────────────────────────────────────────────────────────

class IncidenciaCreate(BaseModel):
    tipo: str = Field(..., pattern=r'^(imagen_no_usable|vision_failed|grader_error|discrepancia_alta|confianza_baja|docente_rechazo)$')
    descripcion: str = Field(..., min_length=1, max_length=2000)
    metadata_json: dict = {}


class IncidenciaRead(BaseModel):
    id: UUID
    calificacion_id: UUID
    tipo: str
    descripcion: str
    estado: str
    metadata_json: dict = {}
    resolucion: str | None = None
    resuelto_por: UUID | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResolverIncidencia(BaseModel):
    resolucion: str = Field(..., min_length=1, max_length=2000)