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
import re
import unicodedata
import uuid
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.calificaciones.agents import (
    AgentContext,
    OpenCodeClient,
    vision_agent,
    vision_router_agent,
    grader_agent,
    router_grader_agent,
    comparator_agent,
    AgentResult,
)
from app.modules.calificaciones.schemas import GradingResult
from app.modules.rag.context_builder import build_context_for_grading, format_context_as_text

logger = get_logger(__name__)

# ── Modelos por defecto (configurables) ─────────────────────────────────────────

DEFAULT_VISION_MODEL = "qwen3.6-plus"
DEFAULT_GRADER_A_MODEL = "qwen3.6-plus"
DEFAULT_GRADER_B_MODEL = "qwen3.7-plus"
DEFAULT_COMPARATOR_MODEL = "deepseek-v4-flash"


def _normalize_answer(value: Any) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    without_accents = "".join(
        char for char in normalized if not unicodedata.combining(char)
    )
    return re.sub(r"[^a-z0-9]+", " ", without_accents.lower()).strip()


def _truth_value(value: Any) -> bool | None:
    normalized = _normalize_answer(value)
    if normalized.startswith(("verdadero", "true", "si", "es igual")):
        return True
    if normalized.startswith(("falso", "false", "no", "no es igual")):
        return False
    return None


def _choice_matches(expected: Any, detected: Any) -> bool:
    expected_normalized = _normalize_answer(expected)
    detected_normalized = _normalize_answer(detected)
    expected_match = re.match(r"^([a-z])(?:\s+|$)(.*)$", expected_normalized)
    detected_match = re.match(r"^([a-z])(?:\s+|$)(.*)$", detected_normalized)
    if expected_match and detected_match:
        return expected_match.group(1) == detected_match.group(1)
    expected_value = expected_match.group(2).strip() if expected_match else expected_normalized
    detected_value = detected_match.group(2).strip() if detected_match else detected_normalized
    if bool(expected_value) and expected_value == detected_value:
        return True
    if expected_value:
        selected_pattern = rf"\b{re.escape(expected_value)}\b\s*(seleccionado|marcado|elegido)"
        return re.search(selected_pattern, detected_normalized) is not None
    return False


def build_objective_validation(
    blueprint: dict,
    detected_answers: list[dict] | None,
) -> list[dict]:
    """Compara respuestas verificables contra la clave oficial sin delegarlo al LLM."""
    questions = {
        str(question.get("numero")): question
        for question in blueprint.get("preguntas", [])
        if question.get("numero") is not None
    }
    expected = {
        str(answer.get("numero")): answer.get("respuesta")
        for answer in blueprint.get("respuestas_esperadas", [])
        if answer.get("numero") is not None
    }
    detected = {
        str(answer.get("pregunta", answer.get("numero"))): answer.get("respuesta")
        for answer in (detected_answers or [])
        if answer.get("pregunta", answer.get("numero")) is not None
    }
    validation: list[dict] = []
    for number, question in questions.items():
        question_type = str(question.get("tipo") or "").lower()
        if number not in expected or number not in detected:
            continue
        expected_answer = expected[number]
        detected_answer = detected[number]
        if question_type == "verdadero_falso":
            expected_truth = _truth_value(expected_answer)
            detected_truth = _truth_value(detected_answer)
            correct = (
                expected_truth is not None
                and detected_truth is not None
                and expected_truth == detected_truth
            )
        elif question_type == "opcion_multiple":
            correct = _choice_matches(expected_answer, detected_answer)
        else:
            correct = _normalize_answer(expected_answer) == _normalize_answer(detected_answer)
            if not correct:
                continue
        validation.append({
            "numero": int(number) if number.isdigit() else number,
            "tipo": question_type,
            "respuesta_detectada": detected_answer,
            "respuesta_esperada": expected_answer,
            "correcta": correct,
            "fuente": "clave_oficial",
        })
    return validation


def objective_score_floor(blueprint: dict, validation: list[dict]) -> Decimal:
    """Puntaje mínimo garantizado por respuestas verificadas como correctas."""
    questions = blueprint.get("preguntas", [])
    if not questions:
        return Decimal("0")
    nota_maxima = Decimal(str(blueprint.get("nota_maxima", 5)))
    explicit_weights: dict[str, Decimal] = {}
    try:
        if all(question.get("puntaje") is not None for question in questions):
            explicit_weights = {
                str(question.get("numero")): Decimal(str(question["puntaje"]))
                for question in questions
            }
    except (ArithmeticError, ValueError, TypeError):
        explicit_weights = {}
    equal_weight = nota_maxima / Decimal(len(questions))
    floor = sum(
        (
            explicit_weights.get(str(item["numero"]), equal_weight)
            for item in validation
            if item.get("correcta") is True
        ),
        Decimal("0"),
    )
    return min(nota_maxima, floor).quantize(Decimal("0.01"))


def _technical_failure_result(
    blueprint: dict,
    motivo_revision: str,
    failure_stage: str,
    *,
    pipeline_status: str = "requires_review",
    alertas: list[str] | None = None,
    raw_output: dict | None = None,
) -> GradingResult:
    payload = dict(raw_output or {})
    payload.update({
        "pipeline_status": pipeline_status,
        "failure_stage": failure_stage,
        "motivo_revision": motivo_revision,
    })
    return GradingResult(
        nota_sugerida=None,
        nota_maxima=Decimal(str(blueprint.get("nota_maxima", 5))),
        confianza=0.0,
        criterios=[],
        alertas=alertas or [],
        feedback_estudiante="",
        requiere_revision_docente=True,
        motivo_revision=motivo_revision,
        raw_model_output=payload,
    )




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
        vision_model: Modelo para visión (default: qwen3.6-plus).
        grader_a_model: Modelo para calificador primario (default: qwen3.6-plus).
        grader_b_model: Modelo para re-calificador (default: qwen3.7-plus).
        comparator_model: Modelo para comparador (default: deepseek-v4-flash).

    Returns:
        GradingResult con nota final consolidada.
    """
    pipeline_run_id = str(uuid.uuid4())
    client = OpenCodeClient(tracking={
        "pipeline_run_id": pipeline_run_id,
        "evaluacion_id": str(evaluacion_id),
        "calificacion_id": None,  # se asigna después de crear la calificación
    })
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
        objective_validation: list[dict] = []
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
                fallback_vision_model = (
                    "mimo-v2.5"
                    if vision_model == "qwen3.6-plus"
                    else "qwen3.6-plus"
                )
                logger.warning(
                    "Vision agent %s failed, trying %s",
                    vision_model,
                    fallback_vision_model,
                )
                vision_result = await vision_agent(
                    ctx,
                    model=fallback_vision_model,
                    client=client,
                )

            if (
                vision_result.error
                and settings.PHOTO_GRADING_CROSS_PROVIDER_FALLBACK_ENABLED
            ):
                logger.warning("OpenCode vision unavailable, trying configured vision router")
                vision_result = await vision_router_agent(ctx)

            if vision_result.raw_output and not vision_result.error:
                texto_extraido = (
                    vision_result.raw_output.get("texto_extraido", "")
                    or student_response_text
                    or ""
                )
                objective_validation = build_objective_validation(
                    blueprint,
                    vision_result.raw_output.get("respuestas_detectadas", []),
                )

                if not vision_result.raw_output.get("usable", True):
                    return _technical_failure_result(
                        blueprint,
                        "image_not_usable",
                        "vision",
                        alertas=vision_result.alertas or ["Imagen no utilizable"],
                        raw_output={"orchestrator": "vision_failed", "vision_result": vision_result.raw_output},
                    )

        if image_bytes and not texto_extraido.strip():
            return _technical_failure_result(
                blueprint,
                "vision_failed",
                "extraction",
                raw_output={"orchestrator": "vision_failed"},
            )

        # ── Paso 3: Calificación dual (en paralelo) ──────────────────
        ctx_grading = AgentContext(
            evaluacion_nombre=blueprint.get("nombre", ""),
            nota_maxima=float(blueprint.get("nota_maxima", 5)),
            blueprint=blueprint,
            rag_context=rag_context,
            student_response_text=texto_extraido.strip(),
            objective_validation=objective_validation,
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

        if (
            grading_a.nota_sugerida is None
            and grading_b.nota_sugerida is None
        ):
            router_grading: AgentResult | None = None
            if settings.PHOTO_GRADING_CROSS_PROVIDER_FALLBACK_ENABLED:
                logger.warning("OpenCode graders unavailable, trying configured grader router")
                router_grading = await router_grader_agent(ctx_grading)
                if router_grading.nota_sugerida is not None:
                    grading_a = router_grading
                    grading_b = router_grading

            if (
                grading_a.nota_sugerida is None
                and grading_b.nota_sugerida is None
            ):
                logger.error("Todos los calificadores habilitados fallaron sin producir una nota")
                failure_details = {
                    "orchestrator": "all_graders_failed",
                    "grader_a_failed": grading_a.error is not None,
                    "grader_b_failed": grading_b.error is not None,
                    "cross_provider_fallback_enabled": (
                        settings.PHOTO_GRADING_CROSS_PROVIDER_FALLBACK_ENABLED
                    ),
                }
                if router_grading is not None:
                    failure_details["router_grader_failed"] = router_grading.error is not None
                return _technical_failure_result(
                    blueprint,
                    "all_graders_failed",
                    "grading",
                    alertas=["Los evaluadores de IA no pudieron completar la calificacion."],
                    raw_output=failure_details,
                )

        # ── Paso 4: Comparación ──────────────────────────────────────
        final = await comparator_agent(
            grading_a,
            grading_b,
            model=comparator_model,
        )

        # ── Paso 5: Armado del resultado final ───────────────────────
        nota_maxima = Decimal(str(blueprint.get("nota_maxima", 5)))
        if final.nota_sugerida is None:
            return _technical_failure_result(
                blueprint,
                "all_graders_failed",
                "grading",
                alertas=["No se obtuvo una nota automatica valida."],
                raw_output={"orchestrator": "comparator_without_score"},
            )
        nota_sugerida = Decimal(str(final.nota_sugerida))
        deterministic_floor = objective_score_floor(blueprint, objective_validation)
        objective_floor_applied = nota_sugerida < deterministic_floor
        if objective_floor_applied:
            nota_sugerida = deterministic_floor
            final.alertas = [
                *final.alertas,
                "La nota se elevó al mínimo garantizado por respuestas verificadas como correctas.",
            ]

        # Si ambos fallaron, marcar revisión docente
        requiere_revision = (
            final.requiere_revision_docente
            or grading_a.nota_sugerida is None
            or grading_b.nota_sugerida is None
            or objective_floor_applied
        )

        # Los fallos dobles ya se manejaron antes del comparador.
        # Construir raw_model_output con trazabilidad completa
        raw_output = {
            "orchestrator": "multi_agent_v2",
            "objective_validation": objective_validation,
            "objective_score_floor": float(deterministic_floor),
            "objective_floor_applied": objective_floor_applied,
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
                "error_type": "grader_error" if grading_a.error else None,
            },
            "grader_b": {
                "modelo": grading_b.modelo,
                "nota": grading_b.nota_sugerida,
                "confianza": grading_b.confianza,
                "tiempo_ms": grading_b.tiempo_ms,
                "criterios": grading_b.criterios,
                "error_type": "grader_error" if grading_b.error else None,
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
        return _technical_failure_result(
            blueprint,
            "pipeline_error",
            "unknown",
            pipeline_status="failed",
            alertas=["Ocurrio un error tecnico durante el procesamiento."],
            raw_output={
                "orchestrator": "error",
                "error_type": type(exc).__name__,
            },
        )
    finally:
        await client.close()
