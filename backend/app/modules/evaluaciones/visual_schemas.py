"""Versioned, data-only contract for evaluation visuals.

Resource identifiers are opaque references, never URLs or storage paths. These
validators do not authorize an identifier: persistence must check ownership,
readiness and publication safety before accepting or serving any resource.
Legacy question dictionaries remain untouched until explicit visual editing.
"""
from __future__ import annotations

from math import isfinite
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictFloat, StrictInt, StringConstraints, model_validator

ShortText = Annotated[str, StringConstraints(strict=True, min_length=1, max_length=500)]
CellText = Annotated[str, StringConstraints(strict=True, max_length=2000)]
FiniteNumber = StrictInt | StrictFloat
VisualKind = Literal["texto", "imagen", "dibujo", "formula", "tabla", "grafica"]
ContentSafety = Literal["privado_original", "pendiente_revision", "publicable_confirmado"]


class VisualContract(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class VisualSource(VisualContract):
    pagina: int | None = Field(default=None, ge=1, strict=True)
    # Normalized page coordinates, independent of render resolution.
    region: tuple[float, float, float, float] | None = None
    ancla_ooxml: ShortText | None = None
    extractor_version: ShortText | None = None

    @model_validator(mode="after")
    def valid_region(self) -> VisualSource:
        if self.region is not None:
            left, top, right, bottom = self.region
            if self.pagina is None or not (0 <= left < right <= 1 and 0 <= top < bottom <= 1):
                raise ValueError("La región necesita página y límites válidos.")
        return self


class VisualTable(VisualContract):
    encabezados: list[ShortText] = Field(min_length=1, max_length=50)
    filas: list[list[CellText]] = Field(min_length=1, max_length=500)
    unidad: ShortText | None = None

    @model_validator(mode="after")
    def rectangular(self) -> VisualTable:
        if any(len(row) != len(self.encabezados) for row in self.filas):
            raise ValueError("Cada fila debe tener una celda por encabezado.")
        return self


class VisualChartSeries(VisualContract):
    nombre: ShortText
    valores: list[FiniteNumber] = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def finite_values(self) -> VisualChartSeries:
        try:
            finite = all(isfinite(value) for value in self.valores)
        except OverflowError:
            finite = False
        if not finite:
            raise ValueError("Los valores de la gráfica deben ser números finitos representables.")
        return self


class VisualChart(VisualContract):
    tipo: Literal["barras", "lineas", "circular"]
    categorias: list[ShortText] = Field(min_length=1, max_length=500)
    series: list[VisualChartSeries] = Field(min_length=1, max_length=20)
    unidad: ShortText | None = None
    eje_x: ShortText | None = None
    eje_y: ShortText | None = None

    @model_validator(mode="after")
    def coherent_values(self) -> VisualChart:
        if any(len(series.valores) != len(self.categorias) for series in self.series):
            raise ValueError("Cada serie necesita un valor por categoría.")
        if self.tipo == "circular":
            if len(self.series) != 1:
                raise ValueError("La gráfica circular admite una sola serie.")
            values = self.series[0].valores
            total = sum(values)
            if any(value < 0 for value in values) or not isfinite(total) or total <= 0:
                raise ValueError("La gráfica circular requiere cantidades no negativas y total positivo.")
        return self


class VisualBlockContent(VisualContract):
    """Only fields permitted in the student view; no original/provenance/key."""

    id: UUID
    tipo: VisualKind
    orden: int = Field(ge=0, strict=True)
    pregunta_ids: list[UUID] = Field(default_factory=list, max_length=500)
    descripcion: str = Field(default="", max_length=4000, strict=True)
    recurso_id: UUID | None = None
    pie: str | None = Field(default=None, max_length=2000, strict=True)
    texto: str | None = Field(default=None, max_length=50000, strict=True)
    tabla: VisualTable | None = None
    grafica: VisualChart | None = None
    legible: bool = True

    @model_validator(mode="after")
    def coherent_kind(self) -> VisualBlockContent:
        if len(set(self.pregunta_ids)) != len(self.pregunta_ids):
            raise ValueError("Una asociación de pregunta no debe repetirse.")
        if self.tipo == "texto":
            valid = bool(self.texto and self.texto.strip()) and self.recurso_id is None and self.tabla is None and self.grafica is None
        elif self.tipo == "tabla":
            valid = self.tabla is not None and self.texto is None and self.grafica is None and self.recurso_id is not None
        elif self.tipo == "grafica":
            valid = self.grafica is not None and self.texto is None and self.tabla is None and self.recurso_id is not None
        else:
            valid = self.recurso_id is not None and self.texto is None and self.tabla is None and self.grafica is None
        if not valid:
            raise ValueError("El contenido no corresponde al tipo de recurso indicado.")
        return self


class VisualBlock(VisualBlockContent):
    procedencia: VisualSource | None = None
    seguridad_contenido: ContentSafety = "pendiente_revision"


class VisualCoverageWarning(VisualContract):
    elemento_id: ShortText | None = None
    bloque_id: UUID | None = None
    pregunta_ids: list[UUID] = Field(default_factory=list, max_length=500)
    pagina: int | None = Field(default=None, ge=1, strict=True)
    motivo: Literal["no_conservado", "ilegible", "asociacion_pendiente", "publicacion_pendiente", "limite", "formato_no_interpretable"]
    mensaje: str = Field(min_length=1, max_length=1000, strict=True)

    @model_validator(mode="after")
    def localized(self) -> VisualCoverageWarning:
        if not (self.elemento_id or self.bloque_id or self.pregunta_ids or self.pagina):
            raise ValueError("El aviso debe indicar qué contenido necesita revisión.")
        return self


class VisualCoverage(VisualContract):
    detectados: list[ShortText] = Field(default_factory=list, max_length=5000)
    conservados: list[ShortText] = Field(default_factory=list, max_length=5000)
    paginas_detectadas: list[Annotated[int, Field(ge=1, strict=True)]] = Field(default_factory=list, max_length=500)
    paginas_conservadas: list[Annotated[int, Field(ge=1, strict=True)]] = Field(default_factory=list, max_length=500)
    avisos: list[VisualCoverageWarning] = Field(default_factory=list, max_length=5000)
    estado: Literal["completa", "requiere_revision"] = "completa"

    @model_validator(mode="after")
    def honest_coverage(self) -> VisualCoverage:
        for values in (self.detectados, self.conservados, self.paginas_detectadas, self.paginas_conservadas):
            if len(set(values)) != len(values):
                raise ValueError("El inventario no admite elementos repetidos.")
        if not set(self.conservados).issubset(self.detectados) or not set(self.paginas_conservadas).issubset(self.paginas_detectadas):
            raise ValueError("No se puede conservar un elemento ausente del inventario.")
        missing = set(self.detectados) - set(self.conservados)
        missing_pages = set(self.paginas_detectadas) - set(self.paginas_conservadas)
        if self.estado == "completa" and (missing or missing_pages or self.avisos):
            raise ValueError("La cobertura completa no puede tener omisiones ni avisos pendientes.")
        warned = {warning.elemento_id for warning in self.avisos}
        warned_pages = {warning.pagina for warning in self.avisos}
        if missing - warned or missing_pages - warned_pages:
            raise ValueError("Cada omisión necesita un aviso localizado.")
        return self


class StudentVisualContent(VisualContract):
    schema_version: Literal[1] = 1
    bloques: list[VisualBlockContent] = Field(default_factory=list, max_length=5000)


class VisualManifest(VisualContract):
    schema_version: Literal[1] = 1
    pregunta_ids: list[UUID] = Field(default_factory=list, max_length=500)
    recurso_ids: list[UUID] = Field(default_factory=list, max_length=5000)
    original_recurso_id: UUID | None = None
    bloques: list[VisualBlock] = Field(default_factory=list, max_length=5000)
    cobertura: VisualCoverage = Field(default_factory=VisualCoverage)

    @model_validator(mode="after")
    def valid_references(self) -> VisualManifest:
        block_ids = [block.id for block in self.bloques]
        for values in (self.pregunta_ids, self.recurso_ids, block_ids):
            if len(set(values)) != len(values):
                raise ValueError("Los identificadores no deben repetirse.")
        questions, resources = set(self.pregunta_ids), set(self.recurso_ids)
        for block in self.bloques:
            if not set(block.pregunta_ids).issubset(questions):
                raise ValueError("El bloque referencia una pregunta que no pertenece al manifiesto.")
            if block.recurso_id is not None and block.recurso_id not in resources:
                raise ValueError("El recurso del bloque no pertenece al manifiesto.")
            if block.recurso_id == self.original_recurso_id and block.recurso_id is not None and block.seguridad_contenido == "publicable_confirmado":
                raise ValueError("El original privado no puede publicarse como estímulo.")
            if not block.pregunta_ids and not any(warning.bloque_id == block.id and warning.motivo == "asociacion_pendiente" for warning in self.cobertura.avisos):
                raise ValueError("Un bloque sin asociación necesita revisión localizada.")
            if not block.legible and not any(warning.bloque_id == block.id and warning.motivo == "ilegible" for warning in self.cobertura.avisos):
                raise ValueError("Un bloque ilegible necesita revisión localizada.")
            if block.seguridad_contenido == "pendiente_revision" and not any(warning.bloque_id == block.id and warning.motivo == "publicacion_pendiente" for warning in self.cobertura.avisos):
                raise ValueError("Confirma que el contenido no revela soluciones antes de publicarlo.")
        for warning in self.cobertura.avisos:
            if warning.bloque_id is not None and warning.bloque_id not in block_ids:
                raise ValueError("El aviso referencia un bloque desconocido.")
            if not set(warning.pregunta_ids).issubset(questions):
                raise ValueError("El aviso referencia una pregunta desconocida.")
            if warning.elemento_id is not None and warning.elemento_id not in self.cobertura.detectados:
                raise ValueError("El aviso referencia un elemento desconocido.")
        return self

    def for_student(self) -> StudentVisualContent:
        """Allowlist projection, after the caller has authorized this revision.

        The database/resource service must additionally check every resource's
        stored safety status; a client-supplied flag is never authorization.
        """
        return StudentVisualContent(bloques=[
            VisualBlockContent.model_validate(block.model_dump(exclude={"procedencia", "seguridad_contenido"}))
            for block in self.bloques
            if block.seguridad_contenido == "publicable_confirmado"
            and (self.original_recurso_id is None or block.recurso_id != self.original_recurso_id)
        ])


class VisualUploadRequest(VisualContract):
    materia_id: UUID
    evaluacion_id: UUID | None = None
    borrador_id: UUID | None = None
    request_key: UUID

    @model_validator(mode="after")
    def one_scope(self) -> VisualUploadRequest:
        if (self.evaluacion_id is None) == (self.borrador_id is None):
            raise ValueError("Indica una evaluación o un borrador, no ambos.")
        return self


class VisualProposalRequest(VisualUploadRequest):
    pregunta_id: UUID
    tipo: Literal["imagen", "dibujo", "tabla", "grafica"]
    descripcion: str = Field(min_length=3, max_length=4000, strict=True)
    expected_version_id: UUID | None = None
    tabla: VisualTable | None = None
    grafica: VisualChart | None = None

    @model_validator(mode="after")
    def explicit_version_and_data(self) -> VisualProposalRequest:
        if self.evaluacion_id is not None and self.expected_version_id is None:
            raise ValueError("Indica la versión que estás editando.")
        if (self.tabla is not None and self.tipo != "tabla") or (self.grafica is not None and self.tipo != "grafica"):
            raise ValueError("Los datos no corresponden al recurso solicitado.")
        return self
