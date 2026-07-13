"""Servicio de calificación por foto/texto usando Vision + LLM."""
from __future__ import annotations

import json
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.modules.calificaciones.schemas import GradingResult
from app.modules.rag.context_builder import (
    build_context_for_grading,
    format_context_as_text,
)
from app.services.llm_router import LLMRouter
from app.services.vision_service import interpret_image

logger = get_logger(__name__)

GRADING_PROMPT_TEMPLATE = """
Eres el módulo de calificación de XCalificator.

No inventes criterios.
No cambies la nota máxima ({nota_maxima}).
No evalúes contenidos que no estén en el Mapa de Evaluación.

## Evaluación
Nombre: {evaluacion_nombre}
DBA: {dba_text}
Metas del profesor: {metas}
Criterios y pesos: {criterios}
Respuestas esperadas: {respuestas_esperadas}
Errores comunes: {errores_comunes}

## Contexto adicional (RAG)
{rag_context}

## Respuesta del estudiante
{student_response}

Devuelve SOLO JSON válido con este esquema:
{{
  "nota_sugerida": <número>,
  "nota_maxima": {nota_maxima},
  "confianza": <0.0-1.0>,
  "criterios": [
    {{"nombre": "...", "puntaje": <número>, "maximo": <número>, "observacion": "..."}}
  ],
  "feedback_estudiante": "...",
  "alertas": [],
  "requiere_revision_docente": true
}}
"""


async def grade_submission(
    db: AsyncSession,
    *,
    evaluacion_id: UUID,
    materia_id: UUID,
    blueprint: dict,
    student_response_text: str | None = None,
    image_bytes: bytes | None = None,
    image_mime: str = "image/jpeg",
    user_id: UUID | None = None,
) -> GradingResult:
    """
    Califica una entrega.
    1. Si hay imagen, llama a Vision Router.
    2. Recupera contexto RAG.
    3. Llama a LLM con el blueprint completo.
    4. Devuelve GradingResult.
    """
    # 1. Interpretar imagen si existe
    visual_text = ""
    if image_bytes:
        vision_result = await interpret_image(image_bytes, image_mime)
        visual_text = vision_result.get("text_or_visual_content", "")
        if not vision_result.get("image_quality", {}).get("is_usable", True):
            return GradingResult(
                nota_sugerida=Decimal("0"),
                nota_maxima=Decimal(str(blueprint.get("nota_maxima", 5))),
                confianza=0.0,
                alertas=["Imagen no utilizable: " + ", ".join(vision_result.get("warnings", []))],
                feedback_estudiante="La imagen no pudo ser procesada. El docente debe revisar manualmente.",
                requiere_revision_docente=True,
            )

    student_response = visual_text or student_response_text or "(sin respuesta)"

    # 2. Contexto RAG
    rag_chunks = await build_context_for_grading(
        db,
        materia_id=materia_id,
        evaluacion_nombre=blueprint.get("nombre", ""),
        student_response=student_response,
    )
    rag_context = format_context_as_text(rag_chunks)

    # 3. Construir prompt
    nota_maxima = blueprint.get("nota_maxima", 5.0)
    prompt = GRADING_PROMPT_TEMPLATE.format(
        evaluacion_nombre=blueprint.get("nombre", ""),
        nota_maxima=nota_maxima,
        dba_text=json.dumps(blueprint.get("dba", []), ensure_ascii=False),
        metas=json.dumps(blueprint.get("metas", []), ensure_ascii=False),
        criterios=json.dumps(blueprint.get("criterios", []), ensure_ascii=False),
        respuestas_esperadas=json.dumps(blueprint.get("respuestas_esperadas", []), ensure_ascii=False),
        errores_comunes=json.dumps(blueprint.get("errores_comunes", []), ensure_ascii=False),
        rag_context=rag_context or "(sin contexto adicional)",
        student_response=student_response[:3000],
    )

    # 4. Llamada LLM
    llm = LLMRouter(user_id=user_id)
    raw = await llm.generate_json("grading", prompt)

    # 5. Parsear resultado
    return _parse_grading_result(raw, nota_maxima)


def _parse_grading_result(raw: dict, nota_maxima: float) -> GradingResult:
    try:
        return GradingResult(
            nota_sugerida=Decimal(str(raw.get("nota_sugerida", 0))),
            nota_maxima=Decimal(str(raw.get("nota_maxima", nota_maxima))),
            confianza=float(raw.get("confianza", 0.5)),
            criterios=raw.get("criterios", []),
            feedback_estudiante=raw.get("feedback_estudiante", ""),
            alertas=raw.get("alertas", []),
            requiere_revision_docente=raw.get("requiere_revision_docente", True),
            raw_model_output=raw,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to parse grading result: %s | raw: %s", exc, raw)
        return GradingResult(
            nota_sugerida=Decimal("0"),
            nota_maxima=Decimal(str(nota_maxima)),
            confianza=0.0,
            alertas=["Error al procesar resultado IA. Revisión docente requerida."],
            feedback_estudiante="",
            requiere_revision_docente=True,
        )
