from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, PrivateAttr

from app.shared.enums import MaterialTipo


class HerramientaBaseRequest(BaseModel):
    materia_id: UUID | None = None
    titulo: str
    grado: str | None = None
    area: str | None = None
    tema: str
    instrucciones_adicionales: str | None = None
    dba_ids: list[UUID] = Field(default_factory=list)
    dba_personalizado_ids: list[UUID] = Field(default_factory=list)
    _contexto_dba_rag: str = PrivateAttr(default="")
    _alineacion_esperada: dict = PrivateAttr(default_factory=dict)


class SopaLetrasRequest(HerramientaBaseRequest):
    palabras_clave: list[str] = Field(default_factory=list)
    tamanio_grilla: int = Field(default=15, ge=10, le=20)


class CrucigramaRequest(HerramientaBaseRequest):
    cantidad_preguntas: int = Field(default=10, ge=5, le=20)


class UnirColumnasRequest(HerramientaBaseRequest):
    cantidad_pares: int = Field(default=6, ge=3, le=12)


class EmparejarRequest(HerramientaBaseRequest):
    cantidad_pares: int = Field(default=6, ge=3, le=12)


class CuentoRequest(HerramientaBaseRequest):
    personajes: list[str] = Field(default_factory=list)
    longitud: str = "corto"  # corto | medio | largo


class ParaColorearRequest(HerramientaBaseRequest):
    estilo: str = "simple"  # simple | detallado


class GuiaRequest(HerramientaBaseRequest):
    objetivos: list[str] = Field(default_factory=list)
    cantidad_actividades: int = Field(default=5, ge=2, le=15)


class TallerRequest(HerramientaBaseRequest):
    cantidad_puntos: int = Field(default=5, ge=2, le=15)
    # alias: cantidad_ejercicios accepts same value
    cantidad_ejercicios: int | None = Field(default=None, ge=2, le=15)


class ExamenRequest(HerramientaBaseRequest):
    cantidad_preguntas: int = Field(default=10, ge=3, le=30)
    tipos_pregunta: list[str] = Field(default_factory=lambda: ["opcion_multiple", "abierta"])


class RubricaRequest(HerramientaBaseRequest):
    criterios: list[str] = Field(default_factory=list)
    escala: list[str] = Field(default_factory=lambda: ["Excelente", "Bueno", "Regular", "Insuficiente"])


class FichaRequest(HerramientaBaseRequest):
    cantidad_ejercicios: int = Field(default=6, ge=2, le=15)


class QuizRapidoRequest(HerramientaBaseRequest):
    cantidad_preguntas: int = Field(default=8, ge=3, le=20)


class LecturaComprensivaRequest(HerramientaBaseRequest):
    cantidad_preguntas: int = Field(default=5, ge=2, le=15)


class MapaConceptualRequest(HerramientaBaseRequest):
    pass


class FlashcardsRequest(HerramientaBaseRequest):
    cantidad_tarjetas: int = Field(default=10, ge=3, le=30)


class PlanRefuerzoRequest(HerramientaBaseRequest):
    nombre_estudiante: str
    dificultades: list[str] = Field(default_factory=list)
    calificacion_actual: float | None = None


class ExamenFromChatPregunta(BaseModel):
    enunciado: str
    tipo: str = "opcion_multiple"
    opciones: list[str] = Field(default_factory=list)
    respuesta_correcta: str | list | int | None = None
    opciones_correctas: list[int] | None = None
    puntaje: float = 1.0
    dba_relacionado: str | None = None
    justificacion: str | None = None


class ExamenFromChatRequest(BaseModel):
    materia_id: UUID
    titulo: str
    preguntas: list[ExamenFromChatPregunta]


class MaterialRead(BaseModel):
    id: UUID
    tipo: str
    titulo: str
    materia_id: UUID | None = None
    materia_nombre: str | None = None
    contenido_json: dict
    archivo_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MaterialListItem(BaseModel):
    id: UUID
    tipo: str
    titulo: str
    materia_id: UUID | None = None
    materia_nombre: str | None = None
    archivo_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
