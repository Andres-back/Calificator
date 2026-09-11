"""Canonical educational-tool catalogue shared by API and admin controls."""
from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True, slots=True)
class ToolDefinition:
    tool_id: str
    label: str
    category: str
    description: str
    uses_ai: bool = True
    aliases: tuple[str, ...] = ()
    uses_image_ai: bool = False

    def as_dict(self) -> dict[str, object]:
        value = asdict(self)
        value["aliases"] = list(self.aliases)
        return value


TOOLS: tuple[ToolDefinition, ...] = (
    ToolDefinition("crucigrama", "Crucigrama", "Juego", "Palabras cruzadas con pistas."),
    ToolDefinition("sopa_letras", "Sopa de letras", "Juego", "Palabras ocultas y pistas."),
    ToolDefinition("unir_columnas", "Relacionar pares", "Juego", "Relaciona conceptos y definiciones.", aliases=("emparejar",)),
    ToolDefinition("cuento", "Cuento", "Material", "Relato educativo con comprensión.", uses_image_ai=True),
    ToolDefinition("para_colorear", "Para colorear", "Material", "Ilustración educativa imprimible.", uses_image_ai=True),
    ToolDefinition("guia", "Guía de aprendizaje", "Material", "Aprendizaje guiado paso a paso."),
    ToolDefinition("taller", "Taller", "Material", "Práctica gradual con soluciones."),
    ToolDefinition("examen", "Examen", "Evaluación", "Banco de preguntas para evaluación."),
    ToolDefinition("rubrica", "Rúbrica", "Evaluación", "Criterios, pesos y niveles."),
    ToolDefinition("ficha", "Ficha didáctica", "Material", "Hoja de trabajo para reforzar."),
    ToolDefinition("quiz_rapido", "Quiz rápido", "Evaluación", "Repaso breve de conceptos."),
    ToolDefinition("lectura_comprensiva", "Lectura comprensiva", "Material", "Lectura y preguntas por niveles."),
    ToolDefinition("mapa_conceptual", "Mapa conceptual", "Material", "Conceptos y relaciones jerárquicas."),
    ToolDefinition("flashcards", "Flashcards", "Material", "Tarjetas de estudio."),
    ToolDefinition("plan_refuerzo", "Plan de refuerzo", "Material", "Plan individual de apoyo."),
)

_BY_ID = {tool.tool_id: tool for tool in TOOLS}
_ALIASES = {alias: tool.tool_id for tool in TOOLS for alias in tool.aliases}


def canonical_tool_id(value: str) -> str:
    return _ALIASES.get(value, value)


def get_tool(value: str) -> ToolDefinition | None:
    return _BY_ID.get(canonical_tool_id(value))


def all_tools() -> list[dict[str, object]]:
    return [tool.as_dict() for tool in TOOLS]
