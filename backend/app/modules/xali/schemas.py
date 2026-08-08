from __future__ import annotations

from datetime import datetime
from uuid import UUID

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class XaliMessage(BaseModel):
    materia_id: UUID | None = None
    mensaje: str


class XaliResponse(BaseModel):
    respuesta: str
    materia_id: UUID | None


class XaliEvaluacionEntregadaRead(BaseModel):
    evaluacion_id: UUID
    materia_id: UUID
    materia_nombre: str
    evaluacion_nombre: str
    entrega_id: UUID
    estado_calificacion: str
    nota_confirmada: Decimal | None
    puede_chatear: bool


class XaliEvaluationChatRequest(BaseModel):
    mensaje: str = Field(..., min_length=1, max_length=2000)


class XaliEvaluationChatContext(BaseModel):
    evaluacion_entregada: bool
    calificacion_confirmada: bool


class XaliEvaluationChatResponse(BaseModel):
    respuesta: str
    contexto_usado: XaliEvaluationChatContext


XaliStudentResourceType = Literal["explicacion", "practica", "plan_estudio", "reto"]


class XaliStudentResourceRequest(BaseModel):
    tipo: XaliStudentResourceType


class XaliStudentResourceResponse(BaseModel):
    id: UUID
    evaluacion_id: UUID
    tipo: XaliStudentResourceType
    titulo: str
    contenido: str
    created_at: datetime
    updated_at: datetime
    contexto_usado: XaliEvaluationChatContext


class ChatMessageRead(BaseModel):
    id: UUID
    role: str
    mensaje: str
    created_at: datetime

    model_config = {"from_attributes": True}
