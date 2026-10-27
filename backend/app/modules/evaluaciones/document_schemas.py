"""Closed educational document contract, independent of private grading rules."""
from __future__ import annotations

from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

PointBudget = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
QuestionWeight = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=6)]


class DocumentContract(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)


class DocumentWarning(DocumentContract):
    elemento_id: str | None = Field(default=None, max_length=500, strict=True)
    nodo_id: UUID | None = None
    mensaje: str = Field(min_length=1, max_length=1000, strict=True)

    @model_validator(mode='after')
    def located(self):
        if not self.elemento_id and self.nodo_id is None:
            raise ValueError('Indica qué parte del documento necesita revisión.')
        return self


class DocumentExclusion(DocumentContract):
    elemento_id: str = Field(min_length=1, max_length=500, strict=True)
    motivo: str = Field(min_length=3, max_length=1000, strict=True)
    confirmado: bool = Field(default=False, strict=True)

    @model_validator(mode='after')
    def nonblank(self):
        if not self.elemento_id.strip() or len(self.motivo.strip()) < 3:
            raise ValueError('Confirma qué contenido retiraste y por qué.')
        return self


class DocumentReview(DocumentContract):
    detectados: list[str] = Field(default_factory=list, max_length=5000)
    conservados: list[str] = Field(default_factory=list, max_length=5000)
    avisos: list[DocumentWarning] = Field(default_factory=list, max_length=5000)
    exclusiones: list[DocumentExclusion] = Field(default_factory=list, max_length=5000)
    estado: Literal['completa', 'requiere_revision'] = 'requiere_revision'
    confirmado: bool = Field(default=False, strict=True)

    @model_validator(mode='after')
    def honest_coverage(self):
        for values in (self.detectados, self.conservados):
            if len(set(values)) != len(values) or any(not value.strip() or len(value) > 500 for value in values):
                raise ValueError('El inventario documental necesita identificadores únicos y válidos.')
        if not set(self.conservados).issubset(self.detectados):
            raise ValueError('No se puede conservar un elemento ausente del inventario.')
        excluded = {item.elemento_id for item in self.exclusiones}
        if (len(excluded) != len(self.exclusiones) or not excluded.issubset(self.detectados)
                or excluded.intersection(self.conservados)):
            raise ValueError('Las exclusiones deben corresponder al origen y no al contenido conservado.')
        missing = set(self.detectados) - set(self.conservados) - {
            item.elemento_id for item in self.exclusiones if item.confirmado}
        warned = {warning.elemento_id for warning in self.avisos}
        if missing - warned:
            raise ValueError('Cada omisión del documento necesita un aviso localizado.')
        if self.estado == 'completa' and (missing or self.avisos or not self.confirmado):
            raise ValueError('Revisa y confirma todo el documento antes de declararlo completo.')
        return self


class SectionScoring(DocumentContract):
    modo: Literal['por_seccion'] = 'por_seccion'
    presupuestos: dict[UUID, PointBudget] = Field(min_length=1, max_length=5000)
    pesos_base: dict[UUID, QuestionWeight] = Field(min_length=1, max_length=500)
    ajustes: dict[UUID, PointBudget] = Field(default_factory=dict, max_length=500)
    confirmado: bool = Field(default=False, strict=True)


class PublicDocumentNode(DocumentContract):
    id: UUID
    padre_id: UUID | None = None
    orden: int = Field(ge=0, strict=True)
    tipo: Literal['seccion', 'texto', 'pregunta', 'material']
    titulo: str | None = Field(default=None, min_length=1, max_length=500, strict=True)
    etiqueta_original: str | None = Field(default=None, min_length=1, max_length=40, strict=True)
    proposito: Literal['instruccion', 'lectura', 'actividad', 'recuadro'] | None = None
    texto: str | None = Field(default=None, min_length=1, max_length=60000, strict=True)
    pregunta_id: UUID | None = None
    bloque_id: UUID | None = None

    @model_validator(mode='after')
    def coherent_kind(self):
        populated = {key for key in ('titulo', 'proposito', 'texto', 'pregunta_id', 'bloque_id')
                     if getattr(self, key) is not None}
        required = {'seccion': {'titulo'}, 'texto': {'proposito', 'texto'},
                    'pregunta': {'pregunta_id'}, 'material': {'bloque_id'}}[self.tipo]
        if populated != required or (self.etiqueta_original and self.tipo not in {'seccion', 'pregunta'}):
            raise ValueError('El contenido no corresponde al tipo de bloque del documento.')
        if any(not value.strip() for value in (self.titulo, self.texto, self.etiqueta_original) if value is not None):
            raise ValueError('El título y el texto no pueden estar vacíos.')
        return self


class DocumentNode(PublicDocumentNode):
    fuente_ids: list[str] = Field(default_factory=list, max_length=5000)

    @model_validator(mode='after')
    def valid_sources(self):
        if len(set(self.fuente_ids)) != len(self.fuente_ids) or any(not value.strip() or len(value) > 500 for value in self.fuente_ids):
            raise ValueError('Revisa las referencias al contenido de origen.')
        return self


class PublicEvaluationDocument(DocumentContract):
    schema_version: Literal[1] = 1
    nodos: list[PublicDocumentNode] = Field(min_length=1, max_length=5000)


class EvaluationDocument(PublicEvaluationDocument):
    schema_version: Literal[1] = 1
    nodos: list[DocumentNode] = Field(min_length=1, max_length=5000)
    puntuacion_secciones: SectionScoring | None = None
    revision: DocumentReview = Field(default_factory=DocumentReview)

    @model_validator(mode='after')
    def coherent_tree(self):
        by_id = {node.id: node for node in self.nodos}
        if len(by_id) != len(self.nodos):
            raise ValueError('Los identificadores del documento no deben repetirse.')
        positions = set()
        sources = set()
        for node in self.nodos:
            position = (node.padre_id, node.orden)
            if position in positions:
                raise ValueError('Cada bloque necesita una posición distinta dentro de su sección.')
            positions.add(position)
            sources.update(node.fuente_ids)
            parent, visited, depth = node.padre_id, {node.id}, 1
            while parent is not None:
                if parent in visited or parent not in by_id:
                    raise ValueError('Revisa la jerarquía: hay un ciclo o una sección que falta.')
                ancestor = by_id[parent]
                if ancestor.tipo != 'seccion':
                    raise ValueError('Solo una sección puede contener otros bloques.')
                visited.add(parent)
                depth += 1
                if depth > 8:
                    raise ValueError('La profundidad del documento supera ocho niveles.')
                parent = ancestor.padre_id
        if sources - set(self.revision.detectados):
            raise ValueError('El documento referencia contenido de origen desconocido.')
        if sources.intersection(item.elemento_id for item in self.revision.exclusiones):
            raise ValueError('Un contenido excluido no puede seguir asociado a un bloque.')
        if self.revision.estado == 'completa' and set(self.revision.conservados) - sources:
            raise ValueError('Falta asociar contenido conservado a una parte del documento.')
        for warning in self.revision.avisos:
            if warning.nodo_id is not None and warning.nodo_id not in by_id:
                raise ValueError('El aviso referencia un bloque que no pertenece al documento.')
            if warning.elemento_id is not None and warning.elemento_id not in self.revision.detectados:
                raise ValueError('El aviso referencia contenido de origen desconocido.')
        return self
