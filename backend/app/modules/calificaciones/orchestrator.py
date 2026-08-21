"""Orquestador de calificación multi-agente.

Pipeline:
  1. Vision Agent (qwen3.7-plus; fallbacks qwen3.6-plus/mimo-v2.5) → extrae evidencia
  2. Entrega visual: Qwen 3.7+ y Qwen 3.6+ califican viendo la evidencia original
  3. Entrega digital: DeepSeek V4 califica el texto; Qwen actúa como contingencia
  4. Comparator → compara A vs B y produce la nota final

Los graders A y B corren en paralelo via asyncio.gather para minimizar latencia.
"""
from __future__ import annotations

import asyncio
import re
import unicodedata
import uuid
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
from app.modules.evaluaciones.modality_service import (
    normalize_question_modalities,
    question_numbers_by_section,
)
from app.modules.rag.context_builder import build_context_for_grading, format_context_as_text
from app.services.image_preprocessing import prepare_orientation_variants

logger = get_logger(__name__)

# ── Modelos por defecto (configurables) ─────────────────────────────────────────

DEFAULT_VISION_MODEL = settings.PHOTO_GRADING_VISION_MODEL
DEFAULT_GRADER_A_MODEL = settings.PHOTO_GRADING_TEXT_MODEL
DEFAULT_GRADER_B_MODEL = settings.PHOTO_GRADING_TEXT_REVIEW_MODEL
DEFAULT_COMPARATOR_MODEL = settings.PHOTO_GRADING_COMPARATOR_MODEL


def _question_key(value: Any) -> str:
    return str(value).strip().lower()


def _evidence_coverage(blueprint: dict, vision_payload: dict) -> dict:
    questions = normalize_question_modalities(
        blueprint.get("preguntas", []),
        blueprint.get("modalidad"),
    )
    expected = question_numbers_by_section(questions)["fisica"]
    detected_raw = vision_payload.get("preguntas_detectadas", [])
    detected = detected_raw if isinstance(detected_raw, list) else []
    detected_keys = {_question_key(value) for value in detected}
    missing = [value for value in expected if _question_key(value) not in detected_keys]

    numeric_missing = sorted(
        int(value)
        for value in missing
        if str(value).strip().isdigit()
    )
    longest_block = 0
    current_block = 0
    previous: int | None = None
    for value in numeric_missing:
        current_block = current_block + 1 if previous is not None and value == previous + 1 else 1
        longest_block = max(longest_block, current_block)
        previous = value

    missing_ratio = len(missing) / len(expected) if expected else 0.0
    significant = bool(
        expected
        and len(missing) >= 2
        and (longest_block >= 2 or missing_ratio >= 0.3)
    )
    return {
        "esperadas": expected,
        "detectadas": detected,
        "faltantes": missing,
        "bloque_faltante_maximo": longest_block,
        "cobertura": round(1 - missing_ratio, 3) if expected else 1.0,
        "requiere_revision": significant,
    }

def _ordered_unique_models(*models: str) -> list[str]:
    """Conserva el orden de contingencia sin repetir modelos."""
    ordered: list[str] = []
    for model in models:
        candidate = str(model or "").strip()
        if candidate and candidate not in ordered:
            ordered.append(candidate)
    return ordered


def _vision_result_is_usable(result: AgentResult | None) -> bool:
    if result is None or result.error or not result.raw_output:
        return False
    return bool(
        result.raw_output.get("usable")
        and str(result.raw_output.get("texto_extraido") or "").strip()
    )


async def _run_grader_cascade(
    ctx: AgentContext,
    *,
    models: list[str],
    multimodal: bool,
    client: OpenCodeClient,
) -> AgentResult:
    """Ejecuta una cascada dentro de OpenCode sin cambiar de proveedor."""
    last_result: AgentResult | None = None
    for model in _ordered_unique_models(*models):
        last_result = await grader_agent(
            ctx,
            model=model,
            multimodal=multimodal,
            client=client,
        )
        if last_result.nota_sugerida is not None:
            return last_result
        logger.warning(
            "OpenCode grader %s no produjo una nota; probando contingencia",
            model,
        )
    return last_result or AgentResult(
        nota_sugerida=None,
        confianza=0,
        feedback_estudiante="",
        proveedor="opencode",
        modelo="sin_modelo",
        error="grader_cascade_empty",
        requiere_revision_docente=True,
    )


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
    expected_letter = expected_match.group(1) if expected_match else None
    expected_value = expected_match.group(2).strip() if expected_match else expected_normalized

    # OCR suele devolver toda la lista de opciones y marcar solo el valor
    # elegido. Esa marca tiene prioridad sobre la primera letra de la lista.
    raw_detected = str(detected or "")
    marked_pattern = re.compile(
        r"(?:^|[,;\n])\s*(?:([a-z])\s*[\)\].:\-]\s*)?"
        r"([^,;\n]+?)\s*(?:\(|\[)?(?:seleccionado|marcado|elegido)\b",
        re.IGNORECASE,
    )
    marked = list(marked_pattern.finditer(raw_detected))
    if marked:
        selected = marked[-1]
        selected_letter = selected.group(1).lower() if selected.group(1) else None
        selected_value = _normalize_answer(selected.group(2))
        if expected_letter and selected_letter:
            return expected_letter == selected_letter
        return bool(expected_value) and (
            selected_value == expected_value
            or selected_value.endswith(f" {expected_value}")
        )

    detected_match = re.match(r"^([a-z])(?:\s+|$)(.*)$", detected_normalized)
    option_labels = re.findall(r"(?:^|[,;\n])\s*[a-z]\s*[\)\].:\-]", raw_detected, re.I)
    simple_selection = len(option_labels) <= 1 and not re.search(r"[,;\n]", raw_detected)
    if expected_match and detected_match and simple_selection:
        return expected_letter == detected_match.group(1)
    detected_value = detected_match.group(2).strip() if detected_match else detected_normalized
    return bool(expected_value) and expected_value == detected_value


def parse_numbered_answers(response_text: str | None) -> list[dict]:
    """Extrae respuestas tipo ``P1: ...`` sin pedirle al LLM que las invente."""
    if not response_text:
        return []
    pattern = re.compile(
        r"(?im)^\s*(?:p(?:regunta)?\s*)?(\d+)\s*[\).:\-]\s*(.+?)\s*$"
    )
    return [
        {"pregunta": int(match.group(1)), "respuesta": match.group(2).strip()}
        for match in pattern.finditer(response_text)
        if match.group(2).strip()
    ]


def merge_detected_answers(
    blueprint: dict,
    online_answers: list[dict],
    physical_answers: list[dict],
) -> list[dict]:
    """Elige la evidencia correspondiente a la modalidad declarada por pregunta."""
    online = {
        str(item.get("pregunta", item.get("numero"))): item
        for item in online_answers
    }
    physical = {
        str(item.get("pregunta", item.get("numero"))): item
        for item in physical_answers
    }
    merged: list[dict] = []
    for question in blueprint.get("preguntas", []):
        number = str(question.get("numero"))
        mode = question.get("modalidad_respuesta")
        if mode == "online":
            item = online.get(number)
        elif mode in {"fisica", "archivo"}:
            item = physical.get(number)
        else:
            item = online.get(number) or physical.get(number)
        if item:
            merged.append(item)
    return merged


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
        vision_model: Modelo OpenCode Go para visión (default: qwen3.7-plus).
        grader_a_model: Modelo textual OpenCode Go (default: deepseek-v4-flash).
        grader_b_model: Segundo modelo textual OpenCode Go (default: deepseek-v4-pro).
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
        online_text = student_response_text or ""
        texto_extraido = online_text
        online_answers = parse_numbered_answers(online_text)
        physical_answers: list[dict] = []
        objective_validation = build_objective_validation(
            blueprint,
            online_answers,
        )
        vision_result: AgentResult | None = None
        coverage_analysis: dict | None = None

        image_bytes_for_grading = image_bytes
        image_mime_for_grading = image_mime
        applied_rotation = 0

        if image_bytes:
            vision_variants = prepare_orientation_variants(image_bytes, image_mime)
            vision_models = _ordered_unique_models(
                vision_model,
                settings.PHOTO_GRADING_VISION_FALLBACK_MODEL,
                settings.PHOTO_GRADING_VISION_LAST_RESORT_MODEL,
            )
            ctx: AgentContext | None = None
            # Primero prueba el mejor modelo en todas las orientaciones. Solo después
            # consume los modelos de contingencia, evitando latencia innecesaria.
            for candidate_model in vision_models:
                for variant in vision_variants:
                    ctx = AgentContext(
                        evaluacion_nombre=blueprint.get("nombre", ""),
                        nota_maxima=float(blueprint.get("nota_maxima", 5)),
                        blueprint=blueprint,
                        rag_context=rag_context,
                        image_bytes=variant.data,
                        image_mime=variant.mime,
                    )
                    vision_result = await vision_agent(
                        ctx,
                        model=candidate_model,
                        client=client,
                    )
                    if _vision_result_is_usable(vision_result):
                        image_bytes_for_grading = variant.data
                        image_mime_for_grading = variant.mime
                        applied_rotation = variant.rotation_degrees
                        if vision_result.raw_output is not None:
                            vision_result.raw_output["rotation_applied"] = applied_rotation
                        break
                    logger.warning(
                        "OpenCode vision model %s did not produce usable evidence "
                        "at rotation %+d",
                        candidate_model,
                        variant.rotation_degrees,
                    )
                if _vision_result_is_usable(vision_result):
                    break

            if (
                not _vision_result_is_usable(vision_result)
                and settings.PHOTO_GRADING_CROSS_PROVIDER_FALLBACK_ENABLED
                and ctx is not None
            ):
                logger.warning(
                    "OpenCode Go vision exhausted; trying explicit cross-provider fallback"
                )
                cross_provider_result = await vision_router_agent(ctx)
                if _vision_result_is_usable(cross_provider_result):
                    vision_result = cross_provider_result
            if vision_result and vision_result.raw_output and not vision_result.error:
                physical_text = vision_result.raw_output.get("texto_extraido", "")
                physical_answers = vision_result.raw_output.get(
                    "respuestas_detectadas",
                    [],
                )
                coverage_analysis = _evidence_coverage(
                    blueprint,
                    vision_result.raw_output,
                )
                if online_text.strip() and physical_text.strip():
                    texto_extraido = (
                        "=== RESPUESTAS ONLINE ===\n"
                        f"{online_text.strip()}\n\n"
                        "=== EVIDENCIA FISICA INTERPRETADA ===\n"
                        f"{physical_text.strip()}"
                    )
                else:
                    texto_extraido = physical_text or online_text
                objective_validation = build_objective_validation(
                    blueprint,
                    merge_detected_answers(
                        blueprint,
                        online_answers,
                        physical_answers,
                    ),
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
            image_bytes=image_bytes_for_grading,
            image_mime=image_mime_for_grading,
        )

        if image_bytes:
            # Una foto/PDF se califica completamente con modelos visuales.
            # Ambos evaluadores reciben la evidencia original.
            grader_a_models = [
                vision_model,
                settings.PHOTO_GRADING_VISION_LAST_RESORT_MODEL,
            ]
            grader_b_models = [
                settings.PHOTO_GRADING_VISION_FALLBACK_MODEL,
                settings.PHOTO_GRADING_VISION_LAST_RESORT_MODEL,
            ]
            graders_are_multimodal = True
            selected_comparator_model = vision_model
        else:
            # DeepSeek se reserva para respuestas ya digitalizadas. Si su salida
            # estructurada falla, Qwen mantiene la calificación disponible.
            grader_a_models = [grader_a_model, vision_model]
            grader_b_models = [
                grader_b_model,
                settings.PHOTO_GRADING_VISION_FALLBACK_MODEL,
            ]
            graders_are_multimodal = False
            selected_comparator_model = comparator_model

        grader_a_task = _run_grader_cascade(
            ctx_grading,
            models=grader_a_models,
            multimodal=graders_are_multimodal,
            client=client,
        )
        grader_b_task = _run_grader_cascade(
            ctx_grading,
            models=grader_b_models,
            multimodal=graders_are_multimodal,
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
            model=selected_comparator_model,
        )
        comparator_failed = bool(final.error)
        if comparator_failed and final.nota_sugerida is not None:
            valid_graders = [
                grader
                for grader in (grading_a, grading_b)
                if grader.nota_sugerida is not None
            ]
            final.confianza = round(
                sum(grader.confianza for grader in valid_graders) / len(valid_graders),
                2,
            )
            final.criterios = final.criterios or next(
                (grader.criterios for grader in valid_graders if grader.criterios),
                [],
            )
            final.feedback_estudiante = final.feedback_estudiante or next(
                (
                    grader.feedback_estudiante
                    for grader in valid_graders
                    if grader.feedback_estudiante
                ),
                "",
            )
            final.alertas = [
                *final.alertas,
                "El comparador no devolvió datos estructurados; se usó el promedio de los evaluadores.",
            ]
            final.requiere_revision_docente = True

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

        coverage_requires_review = bool(
            coverage_analysis and coverage_analysis.get("requiere_revision")
        )
        if coverage_requires_review:
            missing = coverage_analysis.get("faltantes", [])
            final.alertas = [
                *final.alertas,
                (
                    "No se detectó un bloque completo de preguntas en la evidencia "
                    f"({', '.join(map(str, missing))}). Verifica que estén todas las hojas."
                ),
            ]

        # Si ambos fallaron o faltan bloques de evidencia, marcar revisión docente
        requiere_revision = (
            final.requiere_revision_docente
            or grading_a.nota_sugerida is None
            or grading_b.nota_sugerida is None
            or objective_floor_applied
            or coverage_requires_review
        )

        # Los fallos dobles ya se manejaron antes del comparador.
        # Construir raw_model_output con trazabilidad completa
        raw_output = {
            "orchestrator": "multi_agent_v2",
            "provider_policy": "opencode_go_primary",
            "evidence_mode": "multimodal" if image_bytes else "digital_text",
            "objective_validation": objective_validation,
            "objective_score_floor": float(deterministic_floor),
            "objective_floor_applied": objective_floor_applied,
            "evidence_coverage": coverage_analysis,
            "vision": {
                "proveedor": vision_result.proveedor if vision_result else None,
                "modelo": vision_result.modelo if vision_result else None,
                "tiempo_ms": vision_result.tiempo_ms if vision_result else 0,
                "usable": vision_result.raw_output.get("usable") if vision_result and vision_result.raw_output else None,
                "rotation_applied": applied_rotation,
            } if vision_result and not vision_result.error else None,
            "grader_a": {
                "proveedor": grading_a.proveedor,
                "modelo": grading_a.modelo,
                "nota": grading_a.nota_sugerida,
                "confianza": grading_a.confianza,
                "tiempo_ms": grading_a.tiempo_ms,
                "criterios": grading_a.criterios,
                "componentes": grading_a.componentes,
                "error_type": "grader_error" if grading_a.error else None,
            },
            "grader_b": {
                "proveedor": grading_b.proveedor,
                "modelo": grading_b.modelo,
                "nota": grading_b.nota_sugerida,
                "confianza": grading_b.confianza,
                "tiempo_ms": grading_b.tiempo_ms,
                "criterios": grading_b.criterios,
                "componentes": grading_b.componentes,
                "error_type": "grader_error" if grading_b.error else None,
            },
            "comparator": {
                "proveedor": final.proveedor,
                "modelo": final.modelo,
                "nota_final": final.nota_sugerida,
                "discrepancia": (
                    final.raw_output.get("discrepancia", comparator_failed)
                    if final.raw_output
                    else comparator_failed
                ),
                "fallback_applied": comparator_failed,
                "error_type": "comparator_error" if comparator_failed else None,
            },
        }

        return GradingResult(
            nota_sugerida=nota_sugerida,
            nota_maxima=nota_maxima,
            confianza=final.confianza,
            criterios=final.criterios or grading_a.criterios or grading_b.criterios,
            componentes=final.componentes or grading_a.componentes or grading_b.componentes,
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
