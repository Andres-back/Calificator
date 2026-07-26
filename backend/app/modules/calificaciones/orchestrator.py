"""Orquestador de calificación multi-agente.

Pipeline:
  1. Vision Agent (mimo-v2.5)       → extrae texto de la imagen
  2. Grader A  (deepseek-v4-flash)  → califica basado en texto extraído + blueprint
  3. Grader B  (qwen3.7-plus, multimodal) → recibe imagen directo + blueprint y califica
  4. Comparator → compara A vs B, produce nota final con doble verificación

Los graders A y B corren en paralelo via asyncio.gather para minimizar latencia.
"""
from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.modules.calificaciones.agents import (
    AgentContext,
    OpenCodeClient,
    vision_agent,
    grader_agent,
    comparator_agent,
    AgentResult,
)
from app.modules.calificaciones.schemas import GradingResult
from app.modules.rag.context_builder import build_context_for_grading, format_context_as_text

logger = get_logger(__name__)

# ── Modelos por defecto (configurables) ─────────────────────────────────────────

DEFAULT_VISION_MODEL = "mimo-v2.5"
DEFAULT_GRADER_A_MODEL = "deepseek-v4-flash"
DEFAULT_GRADER_B_MODEL = "qwen3.7-plus"
DEFAULT_COMPARATOR_MODEL = "deepseek-v4-flash"


async def orchestrate_grading(
    db: AsyncSession,
    *,
    evaluacion_id: UUID,
    materia_id: UUID,
    blueprint: dict,
    image_bytes: bytes | None = None,
    image_mime: str = "image/jpeg",
    student_response_text: str | None = None,
    user_id: UUID | None = None,
    vision_model: str = DEFAULT_VISION_MODEL,
    grader_a_model: str = DEFAULT_GRADER_A_MODEL,
    grader_b_model: str = DEFAULT_GRADER_B_MODEL,
    comparator_model: str = DEFAULT_COMPARATOR_MODEL,
) -> GradingResult:
    """Orquesta el pipeline completo de calificación multi-agente.

    Args:
        db: Sesión de BD (para RAG).
        evaluacion_id: UUID de la evaluación.
        materia_id: UUID de la materia.
        blueprint: Mapa de evaluación (dict).
        image_bytes: Bytes de la imagen (opcional).
        image_mime: MIME type de la imagen.
        student_response_text: Respuesta texto del estudiante (opcional).
        user_id: ID del usuario (para auditoría).
        vision_model: Modelo para visión (default: mimo-v2.5).
        grader_a_model: Modelo para calificador primario (default: deepseek-v4-flash).
        grader_b_model: Modelo para re-calificador (default: qwen3.7-plus).
        comparator_model: Modelo para comparador (default: deepseek-v4-flash).

    Returns:
        GradingResult con nota final consolidada.
    """
    client = OpenCodeClient()
    try:
        # ── Paso 1: RAG (común para todos) ───────────────────────────
        rag_chunks = await build_context_for_grading(
            db,
            materia_id=materia_id,
            evaluacion_nombre=blueprint.get("nombre", ""),
            student_response=blueprint.get("student_response", student_response_text or ""),
        )
        rag_context = format_context_as_text(rag_chunks)

        # ── Paso 2: Visión (si hay imagen) ───────────────────────────
        texto_extraido = student_response_text or ""
        vision_result: AgentResult | None = None

        if image_bytes:
            ctx = AgentContext(
                evaluacion_nombre=blueprint.get("nombre", ""),
                nota_maxima=float(blueprint.get("nota_maxima", 5)),
                blueprint=blueprint,
                rag_context=rag_context,
                image_bytes=image_bytes,
                image_mime=image_mime,
            )
            vision_result = await vision_agent(ctx, model=vision_model, client=client)

            if vision_result.error:
                # Si el vision agent falla, intentar con qwen3.6-plus como fallback
                logger.warning("Vision agent %s failed, trying fallback", vision_model)
                vision_result = await vision_agent(ctx, model="qwen3.6-plus", client=client)

            if vision_result.raw_output and not vision_result.error:
                texto_extraido = (
                    vision_result.raw_output.get("texto_extraido", "")
                    or student_response_text
                    or ""
                )
                if not vision_result.raw_output.get("usable", True):
                    return GradingResult(
                        nota_sugerida=Decimal("0"),
                        nota_maxima=Decimal(str(blueprint.get("nota_maxima", 5))),
                        confianza=0.0,
                        criterios=[],
                        alertas=vision_result.alertas or ["Imagen no utilizable"],
                        feedback_estudiante="La imagen no pudo procesarse. El docente debe revisar manualmente.",
                        requiere_revision_docente=True,
                        raw_model_output={
                            "orchestrator": "vision_failed",
                            "vision_result": vision_result.raw_output,
                        },
                    )

        # ── Paso 3: Calificación dual (en paralelo) ──────────────────
        ctx_grading = AgentContext(
            evaluacion_nombre=blueprint.get("nombre", ""),
            nota_maxima=float(blueprint.get("nota_maxima", 5)),
            blueprint=blueprint,
            rag_context=rag_context,
            student_response_text=texto_extraido or "(sin respuesta)",
            image_bytes=image_bytes,
            image_mime=image_mime,
        )

        grader_a_task = grader_agent(
            ctx_grading,
            model=grader_a_model,
            multimodal=False,
            client=client,
        )
        grader_b_task = grader_agent(
            ctx_grading,
            model=grader_b_model,
            multimodal=True,  # Qwen recibe la imagen directo
            client=client,
        )

        grading_a, grading_b = await asyncio.gather(grader_a_task, grader_b_task)

        # ── Paso 4: Comparación ──────────────────────────────────────
        final = await comparator_agent(
            grading_a,
            grading_b,
            model=comparator_model,
        )

        # ── Paso 5: Armado del resultado final ───────────────────────
        nota_sugerida = Decimal(str(final.nota_sugerida))
        nota_maxima = Decimal(str(blueprint.get("nota_maxima", 5)))

        # Si ambos fallaron, marcar revisión docente
        requiere_revision = (
            final.requiere_revision_docente
            or (grading_a.error is not None and grading_b.error is not None)
        )

        # Si ambos están en error, nota 0 con alertas
        if grading_a.error and grading_b.error:
            logger.error("Ambos calificadores fallaron: A=%s B=%s", grading_a.error, grading_b.error)
            return GradingResult(
                nota_sugerida=Decimal("0"),
                nota_maxima=nota_maxima,
                confianza=0.0,
                alertas=["Ambos calificadores IA fallaron. Revisión docente requerida."],
                feedback_estudiante="",
                requiere_revision_docente=True,
                raw_model_output={
                    "orchestrator": "both_graders_failed",
                    "grader_a_error": grading_a.error,
                    "grader_b_error": grading_b.error,
                },
            )

        # Construir raw_model_output con trazabilidad completa
        raw_output = {
            "orchestrator": "multi_agent_v2",
            "vision": {
                "modelo": vision_result.modelo if vision_result else None,
                "tiempo_ms": vision_result.tiempo_ms if vision_result else 0,
                "usable": vision_result.raw_output.get("usable") if vision_result and vision_result.raw_output else None,
            } if vision_result and not vision_result.error else None,
            "grader_a": {
                "modelo": grading_a.modelo,
                "nota": grading_a.nota_sugerida,
                "confianza": grading_a.confianza,
                "tiempo_ms": grading_a.tiempo_ms,
                "criterios": grading_a.criterios,
                "error": grading_a.error,
            },
            "grader_b": {
                "modelo": grading_b.modelo,
                "nota": grading_b.nota_sugerida,
                "confianza": grading_b.confianza,
                "tiempo_ms": grading_b.tiempo_ms,
                "criterios": grading_b.criterios,
                "error": grading_b.error,
            },
            "comparator": {
                "modelo": final.modelo,
                "nota_final": final.nota_sugerida,
                "discrepancia": final.raw_output.get("discrepancia", False) if final.raw_output else False,
                "analisis": final.raw_output.get("analisis", "") if final.raw_output else "",
            },
        }

        return GradingResult(
            nota_sugerida=nota_sugerida,
            nota_maxima=nota_maxima,
            confianza=final.confianza,
            criterios=final.criterios or grading_a.criterios or grading_b.criterios,
            feedback_estudiante=final.feedback_estudiante or grading_a.feedback_estudiante or grading_b.feedback_estudiante,
            alertas=final.alertas,
            requiere_revision_docente=requiere_revision,
            raw_model_output=raw_output,
        )

    except Exception as exc:
        logger.exception("Orchestrator error: %s", exc)
        return GradingResult(
            nota_sugerida=Decimal("0"),
            nota_maxima=Decimal(str(blueprint.get("nota_maxima", 5))),
            confianza=0.0,
            alertas=[f"Error en orquestador: {exc}"],
            feedback_estudiante="",
            requiere_revision_docente=True,
            raw_model_output={"orchestrator": "error", "error": str(exc)},
        )
    finally:
        await client.close()
