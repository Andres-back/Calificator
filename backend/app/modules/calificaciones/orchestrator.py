"""Orquestador de calificación multi-agente.

Pipeline:
  1. Vision Agent (qwen3.7-plus; fallbacks qwen3.6-plus/mimo-v2.5) → extrae evidencia
  2. DeepSeek V4 Flash produce el desglose transparente sobre la extracción
  3. Un verificador Flash compacto comprueba puntajes y fórmula
  4. DeepSeek V4 Pro arbitra solo discrepancias, baja confianza o fallos

La imagen se procesa una sola vez; los modelos textuales reciben únicamente evidencia normalizada.
"""
from __future__ import annotations

import re
import time
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
    verification_agent,
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

logger = get_logger(__name__)

# ── Modelos por defecto (configurables) ─────────────────────────────────────────

DEFAULT_VISION_MODEL = settings.PHOTO_GRADING_VISION_MODEL
DEFAULT_GRADER_A_MODEL = settings.PHOTO_GRADING_TEXT_MODEL
DEFAULT_VERIFIER_MODEL = settings.PHOTO_GRADING_VERIFIER_MODEL
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
    timeout: int | None = None,
    max_attempts: int | None = None,
    stage: str = "grading_primary",
) -> AgentResult:
    """Ejecuta una cascada dentro de OpenCode sin cambiar de proveedor."""
    last_result: AgentResult | None = None
    for model in _ordered_unique_models(*models):
        last_result = await grader_agent(
            ctx,
            model=model,
            multimodal=multimodal,
            client=client,
            timeout=timeout,
            max_attempts=max_attempts,
            stage=stage,
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


async def _run_grader_until_complete(
    ctx: AgentContext,
    *,
    models: list[str],
    client: OpenCodeClient,
    stage: str = "grading_primary",
) -> AgentResult:
    """Espera la cascada sin abandonar una inferencia aceptada por duración."""
    return await _run_grader_cascade(
        ctx,
        models=_ordered_unique_models(*models),
        multimodal=False,
        client=client,
        timeout=None,
        max_attempts=max(1, int(settings.PHOTO_GRADING_MODEL_MAX_ATTEMPTS)),
        stage=stage,
    )


def _arbitration_reason(primary: AgentResult, verifier: AgentResult) -> str | None:
    """Decide si el modelo Pro aporta valor; el consenso normal nunca lo invoca."""
    if verifier.nota_sugerida is None or verifier.error:
        return "verifier_failure"
    if primary.nota_sugerida is None or primary.error:
        return "primary_failure"
    delta = abs(float(primary.nota_sugerida) - float(verifier.nota_sugerida))
    if delta >= float(settings.PHOTO_GRADING_ARBITRATION_SCORE_DELTA):
        return "score_discrepancy"
    min_confidence = min(float(primary.confianza or 0), float(verifier.confianza or 0))
    if min_confidence < float(settings.PHOTO_GRADING_ARBITRATION_MIN_CONFIDENCE):
        return "low_confidence"
    verifier_requested = bool(
        verifier.requiere_revision_docente
        or (verifier.raw_output or {}).get("requiere_arbitraje")
    )
    if verifier_requested:
        return "verifier_requested"
    if primary.requiere_revision_docente:
        return "primary_requested"
    return None

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
        if question_type not in {"opcion_multiple", "verdadero_falso", "completar", "numerica", "respuesta_corta", "emparejamiento"}:
            continue
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
    ai_config: dict | None = None,
    vision_model: str = DEFAULT_VISION_MODEL,
    grader_a_model: str = DEFAULT_GRADER_A_MODEL,
    verifier_model: str = DEFAULT_VERIFIER_MODEL,
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
        vision_model: Modelo OpenCode Go para visión (default: deepseek-v4-flash-vision-exp).
        grader_a_model: Modelo Flash que genera el desglose completo.
        verifier_model: Modelo Flash de verificación compacta.
        grader_b_model: Modelo Pro de contingencia si el principal falla.
        comparator_model: Modelo Pro de arbitraje excepcional.

    Returns:
        GradingResult con nota final consolidada.
    """
    pipeline_run_id = str(uuid.uuid4())
    pipeline_started = time.monotonic()
    ai_snapshot: dict = dict(ai_config) if ai_config else {}
    resolved_open_code_key = ""
    fallback_open_code_key = ""
    personal_open_code_route = False
    if user_id is not None or ai_snapshot:
        try:
            from app.services.ai_configuration_resolver import resolve_ai_configuration
            from app.services.ai_credentials_service import get_effective_ai_credentials, get_teacher_ai_credential

            if not ai_snapshot:
                ai_snapshot = await resolve_ai_configuration(
                    db, feature="calificacion_foto", teacher_id=user_id
                )
            selected = ai_snapshot.get("primary") or {}
            fallback = ai_snapshot.get("fallback") or {}
            if selected.get("provider") == "open_code" and selected.get("model"):
                vision_model = str(selected["model"])
            effective_credentials = await get_effective_ai_credentials(db)
            institutional_open_code_key = effective_credentials.open_code_key
            resolved_open_code_key = institutional_open_code_key
            personal_open_code_route = (
                selected.get("provider") == "open_code"
                and selected.get("credential_source") == "teacher"
            )
            if personal_open_code_route:
                teacher_secret = (
                    await get_teacher_ai_credential(
                        db, teacher_id=user_id, provider_id="open_code"
                    )
                    if user_id is not None
                    else ""
                )
                resolved_open_code_key = teacher_secret
                if (
                    fallback.get("provider") == "open_code"
                    and fallback.get("credential_source") == "institutional"
                ):
                    if teacher_secret:
                        fallback_open_code_key = institutional_open_code_key
                    else:
                        resolved_open_code_key = institutional_open_code_key
                        ai_snapshot = {
                            **ai_snapshot,
                            "runtime_fallback": {
                                "reason": "teacher_credential_unavailable",
                                "credential_source": "institutional",
                            },
                        }
        except Exception as exc:
            logger.warning("Grading AI configuration unavailable; using institutional defaults: %s", type(exc).__name__)
    client = OpenCodeClient(tracking={
        "pipeline_run_id": pipeline_run_id,
        "evaluacion_id": str(evaluacion_id),
        "calificacion_id": None,  # se asigna después de crear la calificación
        "teacher_id": str(user_id) if user_id else None,
        "_ai_config": ai_snapshot,
    })
    if personal_open_code_route or resolved_open_code_key:
        client.api_key = resolved_open_code_key
    if fallback_open_code_key:
        client.fallback_api_key = fallback_open_code_key
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
        vision_requires_review = False

        image_mime_for_grading = image_mime
        applied_rotation = 0

        if image_bytes:
            ctx = AgentContext(
                evaluacion_nombre=blueprint.get("nombre", ""),
                nota_maxima=float(blueprint.get("nota_maxima", 5)),
                blueprint=blueprint,
                rag_context=rag_context,
                image_bytes=image_bytes,
                image_mime=image_mime,
            )
            vision_result = await vision_agent(
                ctx,
                model=vision_model,
                client=client,
            )
            if (
                vision_result.error
                and settings.PHOTO_GRADING_CROSS_PROVIDER_FALLBACK_ENABLED
            ):
                logger.warning(
                    "OpenCode Go vision exhausted; trying explicit cross-provider fallback"
                )
                cross_provider_result = await vision_router_agent(ctx)
                if _vision_result_is_usable(cross_provider_result):
                    vision_result = cross_provider_result

            if vision_result.error:
                failure_payload = dict(vision_result.raw_output or {})
                temporary = bool(failure_payload.get("vision_failure_temporary"))
                return _technical_failure_result(
                    blueprint,
                    "vision_failed_temporary" if temporary else "vision_failed_permanent",
                    "extraction",
                    pipeline_status="failed_temporary" if temporary else "failed_permanent",
                    alertas=vision_result.alertas or ["La evidencia requiere intervención docente."],
                    raw_output={
                        "orchestrator": "vision_failed",
                        "vision_result": failure_payload,
                    },
                )

            if vision_result.raw_output:
                physical_text = str(
                    vision_result.raw_output.get("texto_extraido") or ""
                )
                raw_answers = vision_result.raw_output.get(
                    "respuestas_detectadas", []
                )
                physical_answers = [
                    answer for answer in raw_answers
                    if isinstance(answer, dict)
                    and answer.get("legible", True)
                    and not answer.get("requiere_revision", False)
                ]
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
                extraction_meta = vision_result.raw_output.get("vision_extraction")
                if isinstance(extraction_meta, dict):
                    applied_rotation = int(
                        extraction_meta.get("rotation_applied") or 0
                    )
                    vision_requires_review = bool(extraction_meta.get("requires_review"))
                if not vision_result.raw_output.get("usable", True):
                    return _technical_failure_result(
                        blueprint,
                        "image_not_usable",
                        "vision",
                        alertas=vision_result.alertas or ["Imagen no utilizable"],
                        raw_output={
                            "orchestrator": "vision_failed",
                            "vision_result": vision_result.raw_output,
                        },
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
            image_bytes=None,
            image_mime=image_mime_for_grading,
        )

        # La evidencia visual ya quedó transcrita y normalizada. El camino
        # habitual usa un desglose Flash completo y una verificación Flash
        # compacta. El modelo Pro solo aparece cuando existe una razón concreta.
        grading_a = await _run_grader_until_complete(
            ctx_grading,
            models=[grader_a_model],
            client=client,
            stage="grading_primary",
        )
        arbiter_invoked = False
        arbiter_reason: str | None = None
        secondary_mode = "fast_verifier"

        if grading_a.nota_sugerida is None:
            # Contingencia excepcional: si Flash no produjo ningún desglose, Pro
            # intenta rescatar una única valoración; seguirá marcada para revisión.
            arbiter_invoked = True
            arbiter_reason = "primary_failure"
            secondary_mode = "pro_recovery"
            grading_b = await _run_grader_until_complete(
                ctx_grading,
                models=[grader_b_model],
                client=client,
                stage="grading_secondary",
            )
        else:
            grading_b = await verification_agent(
                ctx_grading,
                grading_a,
                model=verifier_model,
                client=client,
                timeout=None,
                max_attempts=max(
                    1,
                    int(settings.PHOTO_GRADING_MODEL_MAX_ATTEMPTS),
                ),
            )
            arbiter_reason = _arbitration_reason(grading_a, grading_b)
            arbiter_invoked = arbiter_reason is not None

        if grading_a.nota_sugerida is None and grading_b.nota_sugerida is None:
            router_grading: AgentResult | None = None
            if settings.PHOTO_GRADING_CROSS_PROVIDER_FALLBACK_ENABLED:
                logger.warning("OpenCode graders unavailable, trying configured grader router")
                router_grading = await router_grader_agent(ctx_grading)
                if router_grading.nota_sugerida is not None:
                    grading_a = router_grading
                    grading_b = router_grading

            if grading_a.nota_sugerida is None and grading_b.nota_sugerida is None:
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

        # El comparador solo hace una llamada externa cuando force_arbitration es
        # verdadero. En consenso cercano consolida localmente y termina de inmediato.
        final = await comparator_agent(
            grading_a,
            grading_b,
            model=comparator_model,
            force_arbitration=bool(
                arbiter_invoked
                and grading_a.nota_sugerida is not None
            ),
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
                "El árbitro no devolvió datos estructurados; se conservó el resultado seguro disponible.",
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
            or vision_requires_review
        )

        # Los fallos dobles ya se manejaron antes del comparador.
        # Construir raw_model_output con trazabilidad completa
        fallbacks: list[dict[str, str]] = []
        if grading_a.error:
            fallbacks.append({"stage": "grading_primary", "reason": "grader_error"})
        if grading_b.error:
            fallbacks.append({"stage": "grading_secondary", "reason": "grader_error"})
        if comparator_failed:
            fallbacks.append({"stage": "consolidation", "reason": "comparator_error"})
        vision_trace = (
            vision_result.raw_output.get("vision_extraction", {})
            if vision_result and isinstance(vision_result.raw_output, dict)
            else {}
        )
        vision_prepare_ms = max(0, int(vision_trace.get("preparation_ms") or 0))
        vision_parsing_ms = max(0, int(vision_trace.get("parsing_ms") or 0))
        vision_total_ms = vision_result.tiempo_ms if vision_result else 0
        timings_ms = {
            "queue": 0,
            "prepare": vision_prepare_ms,
            "extraction": max(0, vision_total_ms - vision_prepare_ms - vision_parsing_ms),
            "parsing": vision_parsing_ms,
            "primary": grading_a.tiempo_ms,
            "secondary": grading_b.tiempo_ms,
            "consolidation": final.tiempo_ms,
            "persistence": 0,
            "total": max(0, int((time.monotonic() - pipeline_started) * 1000)),
        }
        raw_output = {
            "orchestrator": "multi_agent_v2",
            "provider_policy": "opencode_go_primary",
            "evidence_mode": "multimodal" if image_bytes else "digital_text",
            "objective_validation": objective_validation,
            "objective_score_floor": float(deterministic_floor),
            "objective_floor_applied": objective_floor_applied,
            "pipeline_run_id": pipeline_run_id,
            "timings_ms": timings_ms,
            "fallbacks": fallbacks,
            "terminal_reason": "review_required" if requiere_revision else "success",
            "deadline_ms": None,
            "slow_after_ms": int(settings.PHOTO_GRADING_SLOW_WARNING_SECONDS) * 1000,
            "strategy": {
                "vision_model": vision_result.modelo if vision_result else None,
                "primary_mode": "full_explainable_flash",
                "secondary_mode": secondary_mode,
                "arbiter_invoked": arbiter_invoked,
                "arbiter_reason": arbiter_reason,
            },
            "evidence_coverage": coverage_analysis,
            "vision": {
                "proveedor": vision_result.proveedor if vision_result else None,
                "modelo": vision_result.modelo if vision_result else None,
                "tiempo_ms": vision_result.tiempo_ms if vision_result else 0,
                "usable": vision_result.raw_output.get("usable") if vision_result and vision_result.raw_output else None,
                "rotation_applied": applied_rotation,
                "extraction": vision_result.raw_output.get("vision_extraction"),
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
