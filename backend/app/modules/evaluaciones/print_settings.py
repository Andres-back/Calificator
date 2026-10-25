"""Data-only, opt-in presentation. Never inferred from marks or answer keys."""

from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictFloat,
    StrictInt,
    model_validator,
)


class PrintContract(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ResponseSpace(PrintContract):
    lineas: int | None = Field(default=None, ge=1, le=12, strict=True)
    dibujo_mm: int | None = Field(default=None, ge=30, le=100, strict=True)


class MaterialLayout(PrintContract):
    ancho_porcentaje: int = Field(default=35, ge=25, le=100, strict=True)
    disposicion: Literal["apilada", "lateral"] = "apilada"
    alineacion: Literal["inicio", "centro", "fin"] = "centro"
    convertir_color_confirmado: bool = Field(default=False, strict=True)

    @model_validator(mode="after")
    def lateral_width(self):
        if self.disposicion == "lateral" and self.ancho_porcentaje > 50:
            raise ValueError(
                "La figura lateral puede ocupar como máximo la mitad del ancho."
            )
        return self


class PrintSettings(PrintContract):
    schema_version: Literal[1] = 1
    distribucion: Literal["compacta", "media", "amplia"] = "compacta"
    fuente_pt: StrictInt | StrictFloat | None = Field(default=None, ge=10, le=18)
    blanco_negro: bool = Field(default=True, strict=True)
    meta_paginas: int | None = Field(default=None, ge=1, le=20, strict=True)
    respuestas: dict[UUID, ResponseSpace] = Field(default_factory=dict, max_length=500)
    materiales: dict[UUID, MaterialLayout] = Field(default_factory=dict, max_length=500)

    @model_validator(mode="before")
    @classmethod
    def no_alias_duplicates(cls, value):
        if isinstance(value, dict):
            if "schema_version" in value and type(value["schema_version"]) is not int:
                raise ValueError("Versión de impresión inválida.")
            for field in ("respuestas", "materiales"):
                if not isinstance(value.get(field, {}), dict):
                    raise ValueError(
                        "Los ajustes deben identificar la pregunta o el material."
                    )
                keys = list(value.get(field, {}).keys())
                normalized = [str(UUID(str(key))) for key in keys]
                if len(normalized) != len(set(normalized)):
                    raise ValueError(
                        "No repitas ajustes para la misma pregunta o material."
                    )
        return value


@dataclass(frozen=True)
class ResolvedPrintSettings:
    distribucion: str
    fuente_pt: float
    lineas_abierta: int
    blanco_negro: bool
    configuracion: PrintSettings


def resolve_print_settings(
    value: PrintSettings | dict | None,
) -> ResolvedPrintSettings | None:
    if value is None:
        return None
    settings = (
        value
        if isinstance(value, PrintSettings)
        else PrintSettings.model_validate(value)
    )
    font, lines = {"compacta": (10.5, 2), "media": (12, 3), "amplia": (14, 5)}[
        settings.distribucion
    ]
    return ResolvedPrintSettings(
        settings.distribucion,
        float(settings.fuente_pt or font),
        lines,
        settings.blanco_negro,
        settings,
    )


def validate_print_scope(
    settings: PrintSettings | None, questions: list[dict], manifest: dict | None
) -> None:
    if settings is None:
        return
    ids = {
        str(question.get("contenido_id"))
        for question in questions
        if isinstance(question, dict)
    }
    blocks = {str(block["id"]) for block in (manifest or {}).get("bloques", [])}
    if not {str(key) for key in settings.respuestas}.issubset(ids):
        raise ValueError(
            "Hay un ajuste de espacio para una pregunta que ya no está. Conservamos tu edición."
        )
    if not {str(key) for key in settings.materiales}.issubset(blocks):
        raise ValueError(
            "Hay un ajuste para un material que ya no está. Conservamos tu edición."
        )
