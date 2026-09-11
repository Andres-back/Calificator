"""Canonical map between administrative AI controls and runtime consumers.

The registry is descriptive: mutable provider/model choices remain in
``ai_feature_routing`` and are resolved by ``AIConfigService``.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True, slots=True)
class AIStage:
    function_id: str
    function_label: str
    stage_id: str
    label: str
    runtime_feature: str | None
    capability: str
    consumer: str
    condition: str
    editable: bool = True
    inherits_from: str | None = None
    supported_providers: tuple[str, ...] = ()

    def as_dict(self) -> dict[str, object]:
        return asdict(self)


STAGES: tuple[AIStage, ...] = (
    AIStage("calificacion", "Calificación", "prepare", "Preparación de evidencia", None, "deterministic", "grading.evidence_preparation", "Siempre", False),
    AIStage("calificacion", "Calificación", "extraction", "Extracción visual", "calificacion.extraccion", "vision", "grading.vision_extractor", "Foto o PDF escaneado", True, "calificacion_foto", ("open_code", "ollama")),
    AIStage("calificacion", "Calificación", "grading_primary", "Valoración principal", "calificacion.valoracion", "text", "grading.primary_evaluator", "Siempre", True, "calificacion_texto", ("open_code",)),
    AIStage("calificacion", "Calificación", "grading_secondary", "Verificación", "calificacion.verificacion", "text", "grading.secondary_evaluator", "Cuando la política de verificación lo exige", True, "calificacion_texto", ("open_code",)),
    AIStage("calificacion", "Calificación", "targeted_recheck", "Revisión adicional", "calificacion.revision_adicional", "text", "grading.targeted_recheck", "Solo discrepancias o baja confianza", True, "calificacion_texto", ("open_code",)),
    AIStage("calificacion", "Calificación", "consolidation", "Consolidación", None, "deterministic", "grading.consolidator", "Siempre", False),
    AIStage("digitalizacion", "Digitalización", "prepare", "Preparación del documento", None, "deterministic", "digitalization.document_preparation", "Siempre", False),
    AIStage("digitalizacion", "Digitalización", "extraction", "Lectura visual/OCR", "digitalizacion.extraccion", "vision", "digitalization.extractor", "Foto o PDF escaneado", True, "evaluacion_digitalizar", ("open_code",)),
    AIStage("digitalizacion", "Digitalización", "structure", "Estructuración de preguntas", "digitalizacion.estructura", "text", "digitalization.structure_builder", "Siempre", True, "generacion_preguntas", ("open_code", "openai", "groq", "ollama")),
    AIStage("evaluaciones", "Evaluaciones y rúbricas", "content", "Generación del contenido", "generacion_preguntas", "text", "evaluations.generator", "Cuando se solicita ayuda de IA", True, None, ("open_code", "openai", "groq", "ollama")),
    AIStage("recursos", "Recursos educativos", "content", "Generación del recurso", "herramientas_educativas", "text", "tools.generators", "Según la herramienta", True, None, ("open_code", "openai", "groq", "ollama")),
    AIStage("recursos", "Recursos educativos", "image", "Ilustración", "generacion_imagenes", "image", "tools.image_router", "Cuento o material para colorear", True, None, ("openai_image", "cloudflare_image")),
    AIStage("presentaciones", "Presentaciones", "content", "Guion y contenido", "presentaciones.contenido", "text", "presentations.content_generator", "Siempre", True, "presentaciones", ("open_code", "openai", "groq", "ollama")),
    AIStage("presentaciones", "Presentaciones", "images", "Ilustraciones", "presentaciones.imagenes", "image", "presentations.image_router", "Cuando el diseño requiere imagen", True, "generacion_imagenes", ("openai_image", "cloudflare_image")),
    AIStage("presentaciones", "Presentaciones", "export", "Render y exportación", None, "deterministic", "presentations.exporter", "Siempre", False),
    AIStage("xali", "Asistente Xali", "retrieval", "Recuperación de contexto", "rag", "embedding", "xali.rag", "Cuando existe contexto recuperable", True, None, ("openai",)),
    AIStage("xali", "Asistente Xali", "answer", "Respuesta", "xali", "text", "xali.chat", "Siempre", True, None, ("open_code", "openai", "groq", "ollama")),
)


def all_stages() -> list[dict[str, object]]:
    return [stage.as_dict() for stage in STAGES]


def editable_runtime_features() -> set[str]:
    return {
        str(stage.runtime_feature)
        for stage in STAGES
        if stage.editable and stage.runtime_feature
    }


def stage_for(function_id: str, stage_id: str) -> AIStage | None:
    return next(
        (stage for stage in STAGES if stage.function_id == function_id and stage.stage_id == stage_id),
        None,
    )
