from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.shared.enums import (
    BlueprintNivelContexto,
    EvaluacionEstado,
    EvaluacionModalidad,
    EvaluacionTipoOrigen,
    PoliticaIntento,
)


class EvaluacionCreate(BaseModel):
    materia_id: UUID
    nombre: str = Field(min_length=2, max_length=220)
    descripcion: str | None = None
    tipo_origen: EvaluacionTipoOrigen = EvaluacionTipoOrigen.NATIVA
    modalidad: EvaluacionModalidad = EvaluacionModalidad.ONLINE
    nota_maxima: Decimal = Field(default=Decimal("5.0"), gt=0)
    politica_intento: PoliticaIntento | None = None
    intentos_permitidos: int | None = Field(default=None, gt=0)
    tiempo_limite_minutos: int | None = Field(default=None, gt=0)
    dba_ids: list[UUID] = Field(default_factory=list)
    dba_personalizado_ids: list[UUID] = Field(default_factory=list)
    metas_profesor: list[str] = Field(default_factory=list)
    criterios: list[dict[str, Any]] = Field(default_factory=list)
    preguntas: list[dict[str, Any]] = Field(default_factory=list)
    respuestas_esperadas: list[dict[str, Any]] = Field(default_factory=list)


class EvaluacionUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=220)
    descripcion: str | None = None
    nota_maxima: Decimal | None = Field(default=None, gt=0)
    modalidad: EvaluacionModalidad | None = None
    politica_intento: PoliticaIntento | None = None
    intentos_permitidos: int | None = Field(default=None, gt=0)
    tiempo_limite_minutos: int | None = Field(default=None, gt=0)
    dba_ids: list[UUID] | None = None
    dba_personalizado_ids: list[UUID] | None = None
    metas_profesor: list[str] | None = None
    criterios: list[dict[str, Any]] | None = None
    preguntas: list[dict[str, Any]] | None = None
    respuestas_esperadas: list[dict[str, Any]] | None = None
    estado: EvaluacionEstado | None = None


class EvaluacionBlueprintRead(BaseModel):
    id: UUID
    evaluacion_id: UUID
    nivel_contexto: BlueprintNivelContexto
    dba: list[dict[str, Any]]
    metas: list[str]
    criterios: list[dict[str, Any]]
    preguntas: list[dict[str, Any]]
    respuestas_esperadas: list[dict[str, Any]]
    errores_comunes: list[str]
    contexto_rag: list[dict[str, Any]]
    reglas_feedback: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EvaluacionRead(BaseModel):
    id: UUID
    materia_id: UUID
    profesor_id: UUID
    nombre: str
    descripcion: str | None
    tipo_origen: EvaluacionTipoOrigen
    modalidad: EvaluacionModalidad | None
    material_origen_id: UUID | None = None
    tipo_actividad: str | None = None
    recepcion_habilitada: bool = False
    politica_intento: str | None
    intentos_permitidos: int | None
    nota_maxima: Decimal
    estado: EvaluacionEstado
    fecha_publicacion: datetime | None
    tiempo_limite_minutos: int | None
    dba_ids: list[str]
    dba_personalizado_ids: list[str]
    metas_profesor: list[str]
    criterios: list[dict[str, Any]]
    preguntas: list[dict[str, Any]]
    respuestas_esperadas: list[dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    blueprint: EvaluacionBlueprintRead | None = None

    model_config = ConfigDict(from_attributes=True)


class DigitalizarEvaluacionExternaRequest(BaseModel):
    materia_id: UUID
    nombre: str = Field(min_length=2, max_length=220)
    descripcion: str | None = None
    nota_maxima: Decimal = Field(default=Decimal("5.0"), gt=0)
    modalidad: EvaluacionModalidad = EvaluacionModalidad.FISICA
    dba_ids: list[UUID] = Field(default_factory=list)
    dba_personalizado_ids: list[UUID] = Field(default_factory=list)
    metas_profesor: list[str] = Field(default_factory=list)
    criterios: list[dict[str, Any]] = Field(default_factory=list)
    estructura_detectada: dict[str, Any] = Field(default_factory=dict)


class EvaluacionSorpresaCreate(BaseModel):
    materia_id: UUID
    nombre: str = Field(min_length=2, max_length=220)
    descripcion: str | None = None
    nota_maxima: Decimal = Field(default=Decimal("5.0"), gt=0)
    dba_ids: list[UUID] = Field(default_factory=list)
    dba_personalizado_ids: list[UUID] = Field(default_factory=list)
    metas_profesor: list[str] = Field(default_factory=list)
    criterios: list[dict[str, Any]] = Field(default_factory=list)


class EvaluacionEstructuraValidacion(BaseModel):
    criterios: list[dict[str, Any]] | None = None
    preguntas: list[dict[str, Any]] | None = None
    respuestas_esperadas: list[dict[str, Any]] | None = None
    errores_comunes: list[str] | None = None
    contexto_rag: list[dict[str, Any]] | None = None
    reglas_feedback: dict[str, Any] | None = None


class EvaluacionEstadoRead(BaseModel):
    id: UUID
    estado: EvaluacionEstado

    model_config = ConfigDict(from_attributes=True)


TIPOS_PREGUNTA_IA = Literal[
    "opcion_multiple",
    "abierta",
    "verdadero_falso",
    "completar",
]


class EvaluacionGenerarRequest(BaseModel):
    materia_id: UUID
    nombre: str = Field(min_length=2, max_length=220)
    tema: str = Field(min_length=3, max_length=500)
    descripcion: str | None = None
    modalidad: EvaluacionModalidad = EvaluacionModalidad.ONLINE
    nota_maxima: Decimal = Field(default=Decimal("5.0"), gt=0)
    cantidad_preguntas: int = Field(default=10, ge=3, le=30)
    tipos_pregunta: list[TIPOS_PREGUNTA_IA] = Field(
        default_factory=lambda: ["opcion_multiple", "abierta"],
        min_length=1,
    )
    dba_ids: list[UUID] = Field(default_factory=list)
    dba_personalizado_ids: list[UUID] = Field(default_factory=list)
    metas_profesor: list[str] = Field(default_factory=list)
    criterios_docente: list[str] = Field(default_factory=list)
    instrucciones_adicionales: str | None = Field(default=None, max_length=2000)
    politica_intento: PoliticaIntento | None = None
    intentos_permitidos: int | None = Field(default=None, gt=0)
    tiempo_limite_minutos: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def require_dba_alignment(self) -> "EvaluacionGenerarRequest":
        if not self.dba_ids and not self.dba_personalizado_ids:
            raise ValueError("Selecciona al menos un DBA para generar la evaluacion")
        if len(set(self.dba_ids)) != len(self.dba_ids):
            raise ValueError("No repitas DBA oficiales")
        if len(set(self.dba_personalizado_ids)) != len(self.dba_personalizado_ids):
            raise ValueError("No repitas DBA personalizados")
        return self


class CriterioGeneradoIA(BaseModel):
    nombre: str = Field(min_length=3)
    descripcion: str = Field(min_length=5)
    dba_ids: list[UUID] = Field(min_length=1)


class PreguntaGeneradaIA(BaseModel):
    numero: int = Field(ge=1)
    tipo: TIPOS_PREGUNTA_IA
    enunciado: str = Field(min_length=5)
    opciones: list[str] = Field(default_factory=list)
    respuesta_esperada: Any
    puntaje_relativo: Decimal = Field(default=Decimal("1"), gt=0)
    dba_ids: list[UUID] = Field(min_length=1)
    justificacion_alineacion: str = Field(min_length=5)
    fuente_contexto_ids: list[UUID] = Field(default_factory=list)


class EvaluacionContenidoIA(BaseModel):
    instrucciones: str = Field(min_length=5)
    metas_aprendizaje: list[str] = Field(min_length=1)
    criterios: list[CriterioGeneradoIA] = Field(min_length=1)
    preguntas: list[PreguntaGeneradaIA] = Field(min_length=1)
    errores_comunes: list[str] = Field(default_factory=list)
    reglas_feedback: dict[str, Any] = Field(default_factory=dict)
