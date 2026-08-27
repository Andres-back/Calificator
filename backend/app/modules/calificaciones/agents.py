import asyncio
import json
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.analytics.usage_logger import log_ai_usage
from app.modules.calificaciones.breakdown_policy import build_component_scaffold, sanitize_component_payload
from app.services.image_preprocessing import prepare_orientation_variants
from app.services.llm_router import LLMRouter
from app.services.vision_service import interpret_image
from app.services.vision_extractor import VisionExtractionError, VisionExtractor

logger = get_logger(__name__)

# ── Tipos compartidos ──────────────────────────────────────────────────────────

# Short text calls use 60s. Grading and multimodal calls can need 90-120s,
# so graders explicitly use the extended timeout.
DEFAULT_TIMEOUT = 60
DEFAULT_MULTIMODAL_TIMEOUT = 180
OPEN_CODE_MAX_ATTEMPTS = 3
OPEN_CODE_RETRY_BASE_SECONDS = 0.5
OPEN_CODE_RETRY_MAX_SECONDS = 10.0
OPEN_CODE_RETRYABLE_STATUS_CODES = frozenset({408, 425, 429, 500, 502, 503, 504})
OPEN_CODE_ANTHROPIC_MODEL_PREFIXES = ("qwen", "minimax-m")

CANONICAL_AI_STAGES = {
    "vision": "extraction",
    "text": "structure",
    "grading_primary": "grading_primary",
    "grading_secondary": "grading_secondary",
    "targeted_recheck": "targeted_recheck",
    "consolidation": "consolidation",
}


def _canonical_stage(stage: str) -> str:
    return CANONICAL_AI_STAGES.get(stage, stage if stage in CANONICAL_AI_STAGES.values() else "structure")


def inference_http_timeout() -> httpx.Timeout:
    """Protege el transporte sin abandonar una inferencia aceptada.

    OpenCode puede seguir calculando aunque el cliente cierre por read-timeout. Por eso
    conexión, escritura y pool son finitos, mientras la lectura espera la respuesta.
    """
    return httpx.Timeout(
        connect=max(1.0, float(settings.AI_PROVIDER_CONNECT_TIMEOUT_SECONDS)),
        read=None,
        write=max(1.0, float(settings.AI_PROVIDER_WRITE_TIMEOUT_SECONDS)),
        pool=max(1.0, float(settings.AI_PROVIDER_POOL_TIMEOUT_SECONDS)),
    )


def _opencode_protocol(model: str) -> str:
    """Return the wire protocol documented for an OpenCode Go model."""
    model_id = model.rsplit("/", 1)[-1].lower()
    if model_id.startswith(OPEN_CODE_ANTHROPIC_MODEL_PREFIXES):
        return "messages"
    return "chat_completions"


def _opencode_thinking(model: str) -> dict[str, str] | None:
    """Keep the experimental vision model from spending the output budget on hidden reasoning."""
    model_id = model.rsplit("/", 1)[-1].lower()
    if model_id == "deepseek-v4-flash-vision-exp":
        return {"type": "disabled"}
    return None


def _to_anthropic_content(content: Any) -> Any:
    if isinstance(content, str):
        return content
    blocks: list[dict[str, Any]] = []
    for block in content if isinstance(content, list) else [content]:
        if not isinstance(block, dict):
            blocks.append({"type": "text", "text": str(block)})
            continue
        if block.get("type") == "text":
            text_value = str(block.get("text") or "")
            if text_value:
                blocks.append({"type": "text", "text": text_value})
            continue
        if block.get("type") == "image":
            blocks.append(block)
            continue
        if block.get("type") != "image_url":
            continue
        image_url = block.get("image_url")
        url = image_url.get("url") if isinstance(image_url, dict) else image_url
        if not isinstance(url, str):
            continue
        if url.startswith("data:") and ";base64," in url:
            header, encoded = url.split(",", 1)
            blocks.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": header[5:].split(";", 1)[0],
                    "data": encoded,
                },
            })
        else:
            blocks.append({
                "type": "image",
                "source": {"type": "url", "url": url},
            })
    return blocks


def _to_anthropic_messages(messages: list[dict]) -> tuple[str | None, list[dict]]:
    system_parts: list[str] = []
    normalized: list[dict] = []
    for message in messages:
        role = str(message.get("role") or "user")
        content = message.get("content", "")
        if role == "system":
            if isinstance(content, str) and content:
                system_parts.append(content)
            continue
        normalized.append({
            "role": "assistant" if role == "assistant" else "user",
            "content": _to_anthropic_content(content),
        })
    return ("\n\n".join(system_parts) or None), normalized


def _normalize_anthropic_response(data: dict[str, Any]) -> dict[str, Any]:
    content = data.get("content") or []
    if isinstance(content, str):
        text_value = content
        reasoning = ""
    else:
        text_value = "".join(
            str(block.get("text") or "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        )
        reasoning = "\n".join(
            str(block.get("thinking") or block.get("text") or "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "thinking"
        )
    usage = data.get("usage") or {}
    message = {"role": "assistant", "content": text_value}
    if reasoning:
        message["reasoning_content"] = reasoning
    return {
        "id": data.get("id"),
        "model": data.get("model"),
        "choices": [{
            "message": message,
            "finish_reason": data.get("stop_reason"),
        }],
        "usage": {
            "input_tokens": usage.get("input_tokens"),
            "output_tokens": usage.get("output_tokens"),
        },
        "_opencode_protocol": "messages",
    }


def _prepare_multimodal_images(
    file_bytes: bytes,
    mime_type: str,
) -> list[tuple[bytes, str, int]]:
    if mime_type != "application/pdf":
        return [(file_bytes, mime_type, 1)]
    try:
        import fitz
        images: list[tuple[bytes, str, int]] = []
        with fitz.open(stream=file_bytes, filetype="pdf") as document:
            page_count = len(document)
            if page_count == 0:
                raise ValueError("El PDF no contiene paginas")
            max_pages = max(1, int(settings.MAX_GRADING_PDF_PAGES))
            if page_count > max_pages:
                raise ValueError(
                    f"El PDF tiene {page_count} paginas; el maximo permitido es {max_pages}"
                )
            dpi = max(72, int(settings.GRADING_PDF_RENDER_DPI))
            for page_number, page in enumerate(document, start=1):
                pixmap = page.get_pixmap(dpi=dpi, alpha=False)
                page_png = pixmap.tobytes("png")
                prepared_page = prepare_orientation_variants(
                    page_png,
                    "image/png",
                    max_side=2200,
                )[0]
                images.append((prepared_page.data, prepared_page.mime, page_number))
        return images
    except Exception as exc:
        logger.warning("Error convirtiendo PDF a imagenes: %s", exc)
        raise ValueError("No fue posible preparar el PDF para calificar") from exc


def _parse_json_content(content: Any) -> dict[str, Any]:
    if isinstance(content, dict):
        return content
    if not isinstance(content, str):
        raise ValueError("El proveedor no devolvio un objeto JSON")
    candidate = content.strip()
    if candidate.startswith("```"):
        first_newline = candidate.find("\n")
        candidate = candidate[first_newline + 1:] if first_newline >= 0 else candidate
        if candidate.rstrip().endswith("```"):
            candidate = candidate.rstrip()[:-3]
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start < 0 or end < start:
        raise ValueError("El proveedor no devolvio JSON valido")
    parsed = json.loads(candidate[start:end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("La respuesta JSON no es un objeto")
    return parsed


def _bounded_retry_after_seconds(value: str | None) -> float | None:
    """Parsea Retry-After (segundos o fecha HTTP) y limita la espera."""
    if not value:
        return None
    try:
        delay = float(value)
    except ValueError:
        try:
            retry_at = parsedate_to_datetime(value)
            if retry_at.tzinfo is None:
                retry_at = retry_at.replace(tzinfo=timezone.utc)
            delay = (retry_at - datetime.now(timezone.utc)).total_seconds()
        except (TypeError, ValueError, OverflowError):
            return None
    return min(max(delay, 0.0), OPEN_CODE_RETRY_MAX_SECONDS)


def _retry_delay_seconds(
    attempt_number: int,
    response: httpx.Response | None = None,
) -> float:
    if response is not None:
        retry_after = _bounded_retry_after_seconds(response.headers.get("Retry-After"))
        if retry_after is not None:
            return retry_after
    exponential = OPEN_CODE_RETRY_BASE_SECONDS * (2 ** max(attempt_number - 1, 0))
    return min(exponential, OPEN_CODE_RETRY_MAX_SECONDS)


def _is_retryable_transport_error(exc: Exception) -> bool:
    return isinstance(
        exc,
        (
            httpx.TimeoutException,
            httpx.NetworkError,
            httpx.RemoteProtocolError,
        ),
    )


@dataclass
class AgentContext:
    """Contexto completo que recibe cada agente para calificar."""

    evaluacion_nombre: str
    nota_maxima: float
    blueprint: dict
    rag_context: str = ""
    student_response_text: str = ""
    objective_validation: list[dict] = field(default_factory=list)
    image_bytes: bytes | None = None
    image_mime: str = "image/jpeg"


@dataclass
class AgentResult:
    """Resultado estructurado devuelto por un agente."""

    nota_sugerida: float | None
    confianza: float
    feedback_estudiante: str
    criterios: list[dict] = field(default_factory=list)
    componentes: list[dict] = field(default_factory=list)
    alertas: list[str] = field(default_factory=list)
    requiere_revision_docente: bool = True
    proveedor: str = ""
    modelo: str = ""
    tiempo_ms: int = 0
    raw_output: dict | None = None
    error: str | None = None


# ── Cliente OpenCode ───────────────────────────────────────────────────────────


class OpenCodeClient:
    """Cliente HTTP de OpenCode Go con sus protocolos Chat Completions y Messages.

    Registra automáticamente cada llamada en ai_usage_events.
    """

    def __init__(
        self,
        *,
        tracking: dict | None = None,
    ) -> None:
        self.api_key = str(settings.OPEN_CODE_API_KEY)
        self.fallback_api_key = ""
        self._fallback_used = False
        self.base_url = str(settings.OPEN_CODE_BASE_URL).rstrip("/")
        self._client = httpx.AsyncClient(timeout=inference_http_timeout())
        self._tracking = tracking or {}

    def _routing_telemetry(self) -> dict[str, Any]:
        snapshot = self._tracking.get("_ai_config") or {}
        primary = snapshot.get("primary") or {}
        return {
            "routing_origin": primary.get("credential_source"),
            "config_hash": snapshot.get("config_hash"),
            "config_version": snapshot.get("teacher_config_version") or snapshot.get("global_config_version"),
            "fallback_used": self._fallback_used or bool(snapshot.get("runtime_fallback")),
        }

    async def _log_call(
        self,
        *,
        stage: str,
        model: str,
        status: str,
        started_at: float,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        image_count: int = 0,
        error_code: str | None = None,
        attempt_number: int = 1,
    ) -> None:
        """Registra una llamada en el ledger (fire-and-forget)."""
        completed_at = time.monotonic()
        latency_ms = int((completed_at - started_at) * 1000)
        await log_ai_usage(
            calificacion_id=self._tracking.get("calificacion_id"),
            evaluacion_id=self._tracking.get("evaluacion_id"),
            pipeline_run_id=self._tracking.get("pipeline_run_id"),
            feature="grading",
            stage=_canonical_stage(stage),
            provider="opencode",
            model=model,
            attempt_number=attempt_number,
            status=status,
            latency_ms=latency_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            image_count=image_count,
            error_code=error_code,
            **self._routing_telemetry(),
        )

    async def chat(
        self,
        model: str,
        messages: list[dict],
        json_mode: bool = True,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        timeout: int | None = None,
        max_attempts: int | None = None,
        stage: str = "text",
        image_count: int = 0,
    ) -> dict[str, Any]:
        """Llamada chat completions. Devuelve el dict completo del response.

        Uses DEFAULT_TIMEOUT (60s) for text-only calls; multimodal callers
        should pass ``timeout=DEFAULT_MULTIMODAL_TIMEOUT`` (180s).
        """
        protocol = _opencode_protocol(model)
        if protocol == "messages":
            system_prompt, normalized_messages = _to_anthropic_messages(messages)
            body: dict[str, Any] = {
                "model": model,
                "messages": normalized_messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            if system_prompt:
                body["system"] = system_prompt
            endpoint = "messages"
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            }
        else:
            body = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
            thinking = _opencode_thinking(model)
            if thinking:
                body["thinking"] = thinking
            if json_mode:
                body["response_format"] = {"type": "json_object"}
            endpoint = "chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

        request_timeout = inference_http_timeout()
        attempt_limit = max(1, max_attempts if max_attempts is not None else OPEN_CODE_MAX_ATTEMPTS)
        for attempt_number in range(1, attempt_limit + 1):
            attempt_started = time.monotonic()
            try:
                response = await self._client.post(
                    f"{self.base_url}/{endpoint}",
                    headers=headers,
                    json=body,
                    timeout=request_timeout,
                )
                if response.status_code == 401:
                    raise RuntimeError("OpenCode API key invalid o expirada")
                if (
                    response.status_code in OPEN_CODE_RETRYABLE_STATUS_CODES
                    and attempt_number < attempt_limit
                ):
                    await self._log_call(
                        stage=stage, model=model, status="retry",
                        started_at=attempt_started,
                        attempt_number=attempt_number,
                        image_count=image_count,
                        error_code=f"http_{response.status_code}",
                    )
                    delay = _retry_delay_seconds(attempt_number, response)
                    logger.warning(
                        "OpenCode transitorio HTTP %s; reintento %s/%s en %.2fs",
                        response.status_code,
                        attempt_number + 1,
                        attempt_limit,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                response.raise_for_status()
                data = response.json()
                if protocol == "messages":
                    data = _normalize_anthropic_response(data)
                usage = data.get("usage", {}) or {}
                await self._log_call(
                    stage=_canonical_stage(stage),
                    model=model,
                    status="success",
                    started_at=attempt_started,
                    attempt_number=attempt_number,
                    input_tokens=usage.get("input_tokens") or usage.get("prompt_tokens"),
                    output_tokens=usage.get("output_tokens") or usage.get("completion_tokens"),
                    image_count=image_count,
                )
                return data
            except Exception as exc:
                if (
                    _is_retryable_transport_error(exc)
                    and attempt_number < attempt_limit
                ):
                    await self._log_call(
                        stage=stage, model=model, status="retry",
                        started_at=attempt_started,
                        attempt_number=attempt_number,
                        image_count=image_count,
                        error_code=type(exc).__name__[:60],
                    )
                    delay = _retry_delay_seconds(attempt_number)
                    logger.warning(
                        "OpenCode error transitorio %s; reintento %s/%s en %.2fs",
                        type(exc).__name__,
                        attempt_number + 1,
                        attempt_limit,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                status_value = (
                    "timeout" if isinstance(exc, httpx.TimeoutException) else "failed"
                )
                error_code = (
                    "provider_timeout"
                    if isinstance(exc, httpx.TimeoutException)
                    else str(exc)[:60]
                )
                await self._log_call(
                    stage=_canonical_stage(stage),
                    model=model,
                    status=status_value,
                    started_at=attempt_started,
                    attempt_number=attempt_number,
                    error_code=error_code,
                    image_count=image_count,
                )
                if self.fallback_api_key and not self._fallback_used:
                    self._fallback_used = True
                    self.api_key = self.fallback_api_key
                    fallbacks = self._tracking.setdefault("fallbacks", [])
                    if isinstance(fallbacks, list):
                        fallbacks.append(
                            {
                                "stage": _canonical_stage(stage),
                                "reason": "teacher_provider_failed",
                                "credential_source": "institutional",
                            }
                        )
                    logger.warning(
                        "OpenCode personal falló; usando fallback institucional autorizado"
                    )
                    return await self.chat(
                        model=model,
                        messages=messages,
                        json_mode=json_mode,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        timeout=timeout,
                        max_attempts=max_attempts,
                        stage=stage,
                        image_count=image_count,
                    )
                raise

        raise RuntimeError("OpenCode retry loop termino sin respuesta")

    async def chat_multimodal(
        self,
        model: str,
        text: str,
        image_bytes: bytes,
        image_mime: str = "image/jpeg",
        json_mode: bool = True,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        timeout: int | None = None,
        max_attempts: int | None = None,
        stage: str = "extraction",
    ) -> dict[str, Any]:
        """Chat completions con imagen incluida (multimodal).

        Uses DEFAULT_MULTIMODAL_TIMEOUT (180s) by default because qwen3.7-plus
        takes 90-120s on real photos. Pass ``timeout`` to override.

        Si el MIME es PDF, renderiza y envia cada pagina como una imagen
        numerada para que ninguna respuesta quede fuera del analisis.
        """
        import base64
        images = _prepare_multimodal_images(image_bytes, image_mime)
        content: list[dict[str, Any]] = [{"type": "text", "text": text}]
        total_pages = len(images)
        for image_data, mime_type, page_number in images:
            if total_pages > 1:
                content.append({
                    "type": "text",
                    "text": f"Pagina {page_number} de {total_pages}",
                })
            b64 = base64.b64encode(image_data).decode()
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{b64}"},
            })

        msg: dict = {
            "role": "user",
            "content": content,
        }
        return await self.chat(
            model=model,
            messages=[msg],
            json_mode=json_mode,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=timeout,
            max_attempts=max_attempts,
            stage=stage,
            image_count=total_pages,
        )

    async def close(self) -> None:
        await self._client.aclose()


# ── Agentes de visión ──────────────────────────────────────────────────────────

VISION_PROMPT = """Eres un extractor de contenido de imágenes de respuestas de estudiantes.

## Contexto de la evaluación
{preguntas_context}

Antes de extraer, identifica si la hoja está girada y léela en la orientación correcta. La foto puede contener un taller impreso ya resuelto y respuestas manuscritas.

Analiza la imagen y extrae:
1. Todo el texto escrito visible
2. Identifica a qué pregunta corresponde cada respuesta
3. Evalúa la calidad de la imagen
4. Si recibes varias páginas, léelas en el orden indicado y trátalas como un solo trabajo.
5. Une preguntas o procedimientos que continúan en la página siguiente.
6. Si una pregunta aparece solapada en dos páginas, devuélvela una sola vez usando la versión más completa.
7. Devuelve una entrada en respuestas_detectadas por cada respuesta numerada visible e indica su página.
8. En opción múltiple conserva la letra y el valor seleccionados; no califiques.

Devuelve SOLO JSON con este formato:
{
  "texto_extraido": "texto completo extraído de la imagen",
  "paginas_detectadas": [1, 2],
  "preguntas_detectadas": [1, 2],
  "respuestas_detectadas": [
    {"pregunta": 1, "pagina": 1, "respuesta": "respuesta visible, incluyendo letra y valor si aplica"},
    {"pregunta": 2, "pagina": 2, "respuesta": "respuesta visible"}
  ],
  "calidad_imagen": {"borroso": "bajo|medio|alto", "iluminacion": "buena|mala", "recorte": "completo|parcial|cortado"},
  "usable": true,
  "alertas": []
}
"""


async def vision_agent(
    ctx: AgentContext,
    model: str = "deepseek-v4-flash-vision-exp",
    client: OpenCodeClient | None = None,
    prompt_override: str | None = None,
    timeout: int | None = None,
    max_attempts: int | None = None,
) -> AgentResult:
    """Extrae evidencia estructurada; nunca decide la nota."""
    del timeout, max_attempts
    if not ctx.image_bytes:
        return AgentResult(
            nota_sugerida=None, confianza=0, feedback_estudiante="",
            proveedor="opencode", modelo=model, error="No hay imagen para procesar",
        )
    tracking = getattr(client, "_tracking", {}) if client else {}
    purpose = "evaluation_document" if prompt_override else "student_response"
    started = time.monotonic()
    try:
        extraction = await VisionExtractor(tracking=tracking, primary_model=model, api_key=client.api_key if client else None).extract(
            ctx.image_bytes,
            ctx.image_mime,
            blueprint=ctx.blueprint,
            purpose=purpose,
        )
        parsed = extraction.legacy_payload()
        return AgentResult(
            nota_sugerida=None,
            confianza=extraction.document_quality,
            feedback_estudiante="",
            alertas=extraction.warnings,
            proveedor=extraction.provider,
            modelo=extraction.fallback_model or extraction.primary_model,
            tiempo_ms=extraction.duration_ms,
            raw_output=parsed,
            requiere_revision_docente=extraction.requires_review,
        )
    except VisionExtractionError as exc:
        logger.error("Vision extraction failed: %s", exc.code)
        return AgentResult(
            nota_sugerida=None, confianza=0, feedback_estudiante="",
            proveedor="opencode", modelo=model,
            tiempo_ms=int((time.monotonic() - started) * 1000),
            raw_output={
                "usable": False,
                "alertas": ["La evidencia no pudo extraerse automáticamente."],
                "vision_error_code": exc.code,
                "vision_failure_temporary": exc.temporary,
            },
            error=exc.code,
            requiere_revision_docente=True,
        )


async def vision_router_agent(ctx: AgentContext) -> AgentResult:
    """Fallback de visión usando la cascada OpenAI/Groq configurada."""
    if not ctx.image_bytes:
        return AgentResult(
            nota_sugerida=None,
            confianza=0,
            feedback_estudiante="",
            proveedor="vision_router",
            modelo="sin_imagen",
            error="No hay imagen para procesar",
        )

    preguntas = ctx.blueprint.get("preguntas", []) if ctx.blueprint else []
    context_hint = "Preguntas del examen:\n" + "\n".join(
        f"{question.get('numero', index + 1)}. "
        f"{question.get('texto', question.get('enunciado', '?'))}"
        for index, question in enumerate(preguntas)
    )
    start = time.monotonic()
    try:
        parsed = await interpret_image(
            ctx.image_bytes,
            mime_type=ctx.image_mime,
            context_hint=context_hint,
        )
        elapsed_ms = int((time.monotonic() - start) * 1000)
        quality = parsed.get("image_quality") or {}
        text = str(parsed.get("text_or_visual_content") or "").strip()
        usable = bool(quality.get("is_usable", bool(text))) and bool(text)
        warnings = list(parsed.get("warnings") or [])
        detected_answers = parsed.get("detected_answers") or []
        normalized_answers: list[dict[str, Any]] = []
        if isinstance(detected_answers, dict):
            detected_answers = [
                {"pregunta": key, "respuesta": value}
                for key, value in detected_answers.items()
            ]
        for index, answer in enumerate(detected_answers, start=1):
            if isinstance(answer, dict):
                question_number = (
                    answer.get("pregunta")
                    or answer.get("numero")
                    or answer.get("question")
                    or index
                )
                response_value = (
                    answer.get("respuesta")
                    or answer.get("answer")
                    or answer.get("texto")
                    or answer.get("text")
                    or ""
                )
            else:
                response_value = str(answer)
                numbered = re.match(r"^\s*(\d+)\s*[.):-]?\s*(.*)$", response_value)
                question_number = int(numbered.group(1)) if numbered else index
                response_value = numbered.group(2) if numbered else response_value
            normalized_answers.append({
                "pregunta": question_number,
                "respuesta": str(response_value).strip(),
            })

        normalized = {
            "texto_extraido": text,
            "preguntas_detectadas": parsed.get("detected_questions") or [],
            "respuestas_detectadas": normalized_answers,
            "calidad_imagen": quality,
            "usable": usable,
            "alertas": warnings,
        }
        return AgentResult(
            nota_sugerida=None,
            confianza=float(parsed.get("confidence") or (1.0 if usable else 0.0)),
            feedback_estudiante="",
            alertas=warnings,
            requiere_revision_docente=not usable,
            proveedor="vision_router",
            modelo="openai_groq_cascade",
            tiempo_ms=elapsed_ms,
            raw_output=normalized,
        )
    except Exception as exc:
        logger.error("Configured vision router failed: %s", exc)
        return AgentResult(
            nota_sugerida=None,
            confianza=0,
            feedback_estudiante="",
            requiere_revision_docente=True,
            proveedor="vision_router",
            modelo="openai_groq_cascade",
            error=type(exc).__name__,
        )

# ── Agentes de calificación ─────────────────────────────────────────────────────

GRADER_PROMPT_TEMPLATE = """Eres el módulo de calificación de XCalificator.
Tu tarea es calificar la respuesta de un estudiante usando el Mapa de Evaluación.

No inventes criterios.
No cambies la nota máxima ({nota_maxima}).
No evalúes contenidos que no estén en el Mapa de Evaluación.

## Evaluación
Nombre: {evaluacion_nombre}
Preguntas del examen: {preguntas}
DBA: {dba_text}
Metas del profesor: {metas}
Criterios y pesos: {criterios}
Respuestas esperadas: {respuestas_esperadas}
Validación objetiva determinística: {objective_validation}
Errores comunes: {errores_comunes}

REGLAS OBLIGATORIAS:
- La validación objetiva determinística ya comparó las respuestas detectadas contra la clave oficial.
- Toda entrada con "correcta": true debe recibir el puntaje completo de esa pregunta; no la reinterpretes.
- "Sí", "es igual" y "verdadero" son equivalentes en verdadero/falso; la letra o el valor correctos son equivalentes en opción múltiple.
- Si no hay puntajes explícitos por pregunta, distribuye la nota máxima de forma uniforme entre las preguntas.
- Evalúa las preguntas abiertas por separado y verifica toda operación aritmética antes de asignar la nota.
- Si recibes varias páginas, califica el trabajo completo en conjunto y respeta su orden.
- Une procedimientos que continúan en otra página y no dupliques preguntas visibles en fotografías solapadas.
- Si recibes una imagen girada, oriéntala mentalmente antes de leer y distingue siempre el ejercicio impreso de la respuesta manuscrita.

## Contexto adicional (RAG)
{rag_context}

## Componentes esperados
Usa exactamente estas claves. Devuelve una valoración independiente por cada componente; no omitas ni inventes claves.
{componentes_esperados}

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
  "componentes": [
    {{"clave": "pregunta:1", "respuesta_estudiante": "...", "puntaje": <número>, "estado": "correcta|parcial|incorrecta|sin_respuesta|ilegible|no_evaluable", "explicacion": "Razón verificable y concreta", "confianza": <0.0-1.0>, "paginas": [1]}}
  ],
  "feedback_estudiante": "...",
  "alertas": [],
  "requiere_revision_docente": true
}}
"""


async def grader_agent(
    ctx: AgentContext,
    model: str = "deepseek-v4-flash-vision-exp",
    multimodal: bool = False,
    client: OpenCodeClient | None = None,
    timeout: int | None = None,
    max_attempts: int | None = None,
    stage: str = "grading_primary",
    max_tokens: int | None = None,
) -> AgentResult:
    """Agente calificador. Califica la respuesta del estudiante contra el blueprint."""
    nota_maxima = ctx.nota_maxima
    prompt = GRADER_PROMPT_TEMPLATE.format(
        evaluacion_nombre=ctx.evaluacion_nombre,
        nota_maxima=nota_maxima,
        preguntas=json.dumps(ctx.blueprint.get("preguntas", []), ensure_ascii=False),
        dba_text=json.dumps(ctx.blueprint.get("dba", []), ensure_ascii=False),
        metas=json.dumps(ctx.blueprint.get("metas", []), ensure_ascii=False),
        criterios=json.dumps(ctx.blueprint.get("criterios", []), ensure_ascii=False),
        respuestas_esperadas=json.dumps(ctx.blueprint.get("respuestas_esperadas", []), ensure_ascii=False),
        objective_validation=json.dumps(ctx.objective_validation, ensure_ascii=False),
        errores_comunes=json.dumps(ctx.blueprint.get("errores_comunes", []), ensure_ascii=False),
        rag_context=ctx.rag_context or "(sin contexto adicional)",
        componentes_esperados=json.dumps([{**item, "puntos_maximos": float(item["puntos_maximos"])} for item in build_component_scaffold(ctx.blueprint)], ensure_ascii=False),
        student_response=ctx.student_response_text[:5000],
    )
    own_client = False
    if client is None:
        client = OpenCodeClient()
        own_client = True

    start = time.monotonic()
    try:
        if multimodal and ctx.image_bytes:
            raw = await client.chat_multimodal(
                model=model, text=prompt,
                image_bytes=ctx.image_bytes, image_mime=ctx.image_mime,
                json_mode=True, max_tokens=max_tokens or settings.PHOTO_GRADING_PRIMARY_MAX_TOKENS,
                timeout=timeout, max_attempts=max_attempts, stage=stage,
            )
        else:
            raw = await client.chat(
                model=model, messages=[{"role": "user", "content": prompt}],
                json_mode=True, max_tokens=max_tokens or settings.PHOTO_GRADING_PRIMARY_MAX_TOKENS,
                timeout=timeout,
                max_attempts=max_attempts, stage=stage,
            )
        ms = int((time.monotonic() - start) * 1000)
        content = raw["choices"][0]["message"]["content"]
        parsed = _parse_json_content(content)

        raw_score = parsed.get("nota_sugerida")
        if raw_score is None:
            logger.error("Grader agent %s returned no score", model)
            return AgentResult(
                nota_sugerida=None, confianza=0, feedback_estudiante="",
                proveedor="opencode", modelo=model,
                error="grader_missing_score", requiere_revision_docente=True,
                tiempo_ms=ms, raw_output=parsed,
            )

        result = AgentResult(
            nota_sugerida=float(raw_score),
            confianza=float(parsed.get("confianza", 0.5)),
            feedback_estudiante=parsed.get("feedback_estudiante", ""),
            criterios=parsed.get("criterios", []),
            componentes=[sanitize_component_payload(item) for item in parsed.get("componentes", []) if isinstance(item, dict)],
            alertas=parsed.get("alertas", []),
            requiere_revision_docente=parsed.get("requiere_revision_docente", True),
            proveedor="opencode", modelo=model, tiempo_ms=ms,
            raw_output=parsed,
        )
        logger.info("Grader agent OK: modelo=%s %dms nota=%.2f confianza=%.2f", model, ms, result.nota_sugerida, result.confianza)
        return result

    except Exception as exc:
        logger.error("Grader agent %s failed: %s", model, exc)
        return AgentResult(
            nota_sugerida=None,
            confianza=0,
            feedback_estudiante="",
            proveedor="opencode",
            modelo=model,
            error=type(exc).__name__,
            requiere_revision_docente=True,
            tiempo_ms=max(0, int((time.monotonic() - start) * 1000)),
        )
    finally:
        if own_client:
            await client.close()


VERIFIER_PROMPT_TEMPLATE = """Eres el verificador rápido de XCalificator.
No reconstruyas toda la retroalimentación. Comprueba de manera independiente que el puntaje
por componente, la suma y la nota propuesta sean compatibles con la evidencia extraída.

Evaluación: {evaluacion_nombre}
Nota máxima: {nota_maxima}
Preguntas y referencias: {preguntas}
Validación objetiva local: {objective_validation}
Componentes esperados: {componentes_esperados}
Respuesta extraída del estudiante:
{student_response}

Propuesta principal:
{primary_result}

Devuelve SOLO JSON válido y compacto:
{{
  "nota_sugerida": <número entre 0 y la nota máxima>,
  "confianza": <0 a 1>,
  "componentes_verificados": [
    {{"componente_id": "...", "puntos_obtenidos": 0, "puntos_maximos": 0, "estado": "correcta|parcial|incorrecta|no_evaluable"}}
  ],
  "discrepancias": ["..."],
  "requiere_arbitraje": true|false,
  "alertas": ["..."]
}}
"""


async def verification_agent(
    ctx: AgentContext,
    primary: AgentResult,
    model: str = "deepseek-v4-flash-vision-exp",
    client: OpenCodeClient | None = None,
    timeout: int | None = None,
    max_attempts: int | None = None,
) -> AgentResult:
    """Valida el desglose principal con una salida compacta y sin reenviar la imagen."""
    own_client = False
    if client is None:
        client = OpenCodeClient()
        own_client = True
    prompt = VERIFIER_PROMPT_TEMPLATE.format(
        evaluacion_nombre=ctx.evaluacion_nombre,
        nota_maxima=ctx.nota_maxima,
        preguntas=json.dumps(ctx.blueprint.get("preguntas", []), ensure_ascii=False),
        objective_validation=json.dumps(ctx.objective_validation, ensure_ascii=False),
        componentes_esperados=json.dumps(
            [
                {**item, "puntos_maximos": float(item["puntos_maximos"])}
                for item in build_component_scaffold(ctx.blueprint)
            ],
            ensure_ascii=False,
        ),
        student_response=ctx.student_response_text[:5000],
        primary_result=json.dumps(
            {
                "nota_sugerida": primary.nota_sugerida,
                "confianza": primary.confianza,
                "componentes": primary.componentes,
            },
            ensure_ascii=False,
        ),
    )
    started = time.monotonic()
    try:
        raw = await client.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            json_mode=True,
            max_tokens=max(256, int(settings.PHOTO_GRADING_VERIFIER_MAX_TOKENS)),
            temperature=0.1,
            timeout=timeout,
            max_attempts=max_attempts,
            stage="grading_secondary",
        )
        elapsed_ms = int((time.monotonic() - started) * 1000)
        content = raw["choices"][0]["message"]["content"]
        parsed = _parse_json_content(content)
        raw_score = parsed.get("nota_sugerida")
        if raw_score is None:
            return AgentResult(
                nota_sugerida=None,
                confianza=0,
                feedback_estudiante="",
                proveedor="opencode",
                modelo=model,
                error="verifier_missing_score",
                requiere_revision_docente=True,
                raw_output=parsed,
                tiempo_ms=elapsed_ms,
            )
        components = parsed.get("componentes_verificados") or parsed.get("componentes") or []
        return AgentResult(
            nota_sugerida=float(raw_score),
            confianza=float(parsed.get("confianza", 0.5)),
            feedback_estudiante="",
            componentes=[
                sanitize_component_payload(item)
                for item in components
                if isinstance(item, dict)
            ],
            alertas=[str(item) for item in parsed.get("alertas", [])],
            requiere_revision_docente=bool(parsed.get("requiere_arbitraje", False)),
            proveedor="opencode",
            modelo=model,
            tiempo_ms=elapsed_ms,
            raw_output=parsed,
        )
    except Exception as exc:
        logger.error("Verification agent %s failed: %s", model, exc)
        return AgentResult(
            nota_sugerida=None,
            confianza=0,
            feedback_estudiante="",
            proveedor="opencode",
            modelo=model,
            error=type(exc).__name__,
            requiere_revision_docente=True,
            tiempo_ms=max(0, int((time.monotonic() - started) * 1000)),
        )
    finally:
        if own_client:
            await client.close()

async def router_grader_agent(ctx: AgentContext) -> AgentResult:
    """Calificador de respaldo mediante la cascada configurada de proveedores."""
    prompt = GRADER_PROMPT_TEMPLATE.format(
        evaluacion_nombre=ctx.evaluacion_nombre,
        nota_maxima=ctx.nota_maxima,
        preguntas=json.dumps(ctx.blueprint.get("preguntas", []), ensure_ascii=False),
        dba_text=json.dumps(ctx.blueprint.get("dba", []), ensure_ascii=False),
        metas=json.dumps(ctx.blueprint.get("metas", []), ensure_ascii=False),
        criterios=json.dumps(ctx.blueprint.get("criterios", []), ensure_ascii=False),
        respuestas_esperadas=json.dumps(
            ctx.blueprint.get("respuestas_esperadas", []),
            ensure_ascii=False,
        ),
        objective_validation=json.dumps(ctx.objective_validation, ensure_ascii=False),
        errores_comunes=json.dumps(
            ctx.blueprint.get("errores_comunes", []),
            ensure_ascii=False,
        ),
        rag_context=ctx.rag_context or "(sin contexto adicional)",
        componentes_esperados=json.dumps([{**item, "puntos_maximos": float(item["puntos_maximos"])} for item in build_component_scaffold(ctx.blueprint)], ensure_ascii=False),
        student_response=ctx.student_response_text[:5000],
    )
    start = time.monotonic()
    try:
        router = LLMRouter()
        parsed = await router.generate_json("grading_photo", prompt)
        raw_score = parsed.get("nota_sugerida")
        if raw_score is None:
            return AgentResult(
                nota_sugerida=None,
                confianza=0,
                feedback_estudiante="",
                requiere_revision_docente=True,
                proveedor="llm_router",
                modelo="configured_cascade",
                error="router_missing_score",
                raw_output=parsed,
            )
        result = AgentResult(
            nota_sugerida=float(raw_score),
            confianza=float(parsed.get("confianza", 0.5)),
            feedback_estudiante=parsed.get("feedback_estudiante", ""),
            criterios=parsed.get("criterios", []),
            componentes=[sanitize_component_payload(item) for item in parsed.get("componentes", []) if isinstance(item, dict)],
            alertas=parsed.get("alertas", []),
            requiere_revision_docente=parsed.get(
                "requiere_revision_docente",
                True,
            ),
            proveedor="llm_router",
            modelo="configured_cascade",
            tiempo_ms=int((time.monotonic() - start) * 1000),
            raw_output=parsed,
        )
        logger.info(
            "Router grader OK: %dms nota=%.2f confianza=%.2f",
            result.tiempo_ms,
            result.nota_sugerida,
            result.confianza,
        )
        return result
    except Exception as exc:
        logger.error("Configured grader router failed: %s", exc)
        return AgentResult(
            nota_sugerida=None,
            confianza=0,
            feedback_estudiante="",
            requiere_revision_docente=True,
            proveedor="llm_router",
            modelo="configured_cascade",
            error=type(exc).__name__,
        )

# ── Agente comparador ───────────────────────────────────────────────────────────

COMPARATOR_PROMPT = """Eres el módulo comparador de calificaciones de XCalificator.

Recibes DOS calificaciones independientes para la misma respuesta de un estudiante.
Tu tarea es:
1. Comparar ambas calificaciones
2. Identificar discrepancias significativas (diferencia > {umbral} puntos)
3. Si hay discrepancia, proponer una nota final razonada
4. Si están cerca (< umbral), promediar

## Calificación A ({model_a})
{grading_a}

## Calificación B ({model_b})
{grading_b}

Devuelve SOLO JSON válido:
{{
  "nota_final": <número>,
  "discrepancia": true|false,
  "diferencia": <número>,
  "analisis": "...",
  "feedback_integrado": "...",
  "usa_promedio": true|false,
  "alerta_docente": "..."
}}
"""


def _select_consensus_feedback(
    grading_a: AgentResult,
    grading_b: AgentResult,
) -> str:
    """Return one clear feedback message instead of concatenating both graders."""
    candidates: list[tuple[str, float, int]] = []
    seen: set[str] = set()
    for index, grading in enumerate((grading_a, grading_b)):
        feedback = " ".join((grading.feedback_estudiante or "").split()).strip()
        normalized = feedback.casefold()
        if not feedback or normalized in seen:
            continue
        seen.add(normalized)
        candidates.append((feedback, float(grading.confianza or 0), index))

    if not candidates:
        return ""

    # Prefer the most reliable evaluator. On equal confidence, keep the more
    # complete message, while preserving evaluator A as the final tie-breaker.
    return max(
        candidates,
        key=lambda item: (item[1], min(len(item[0]), 1600), -item[2]),
    )[0]


async def comparator_agent(
    grading_a: AgentResult,
    grading_b: AgentResult,
    umbral: float = 0.5,
    model: str = "deepseek-v4-pro",
    force_arbitration: bool = False,
) -> AgentResult:
    """Compara dos calificaciones independientes y produce una nota final."""
    score_a = grading_a.nota_sugerida
    score_b = grading_b.nota_sugerida

    if score_a is None and score_b is None:
        return AgentResult(
            nota_sugerida=None,
            confianza=0,
            feedback_estudiante="",
            alertas=["Ningun evaluador automatico produjo una nota valida."],
            requiere_revision_docente=True,
            proveedor="comparator",
            modelo="sin_resultado",
            error="all_graders_failed",
        )

    if (score_a is None or score_b is None) and not force_arbitration:
        valid = grading_b if score_a is None else grading_a
        return AgentResult(
            nota_sugerida=valid.nota_sugerida,
            confianza=valid.confianza,
            feedback_estudiante=valid.feedback_estudiante,
            criterios=valid.criterios,
            componentes=valid.componentes,
            alertas=valid.alertas + ["Solo uno de los evaluadores produjo una nota."],
            requiere_revision_docente=True,
            proveedor="comparator",
            modelo="resultado_parcial",
            raw_output={"discrepancia": True, "resultado_parcial": True},
        )

    valid_scores = [float(score) for score in (score_a, score_b) if score is not None]
    diff = abs(score_a - score_b) if score_a is not None and score_b is not None else umbral

    if (
        not force_arbitration
        and not grading_a.error
        and not grading_b.error
        and diff < umbral
    ):
        nota_final = round(sum(valid_scores) / len(valid_scores), 2)
        confianza = round((grading_a.confianza + grading_b.confianza) / 2, 2)
        feedback = _select_consensus_feedback(grading_a, grading_b)
        logger.info("Comparator: consenso automatico diff=%.2f nota=%.2f", diff, nota_final)
        return AgentResult(
            nota_sugerida=nota_final, confianza=confianza, feedback_estudiante=feedback,
            criterios=grading_a.criterios or grading_b.criterios,
            componentes=grading_a.componentes or grading_b.componentes,
            alertas=grading_a.alertas + grading_b.alertas,
            requiere_revision_docente=False, proveedor="comparator", modelo="consenso",
            raw_output={"discrepancia": False, "diferencia": diff, "nota_final": nota_final,
                        "grading_a": {"nota": grading_a.nota_sugerida, "modelo": grading_a.modelo},
                        "grading_b": {"nota": grading_b.nota_sugerida, "modelo": grading_b.modelo}},
        )

    client = OpenCodeClient()
    try:
        grading_a_str = json.dumps({"nota_sugerida": grading_a.nota_sugerida, "confianza": grading_a.confianza, "feedback": grading_a.feedback_estudiante[:300], "criterios": grading_a.criterios, "componentes": grading_a.componentes, "alertas": grading_a.alertas, "error": grading_a.error}, ensure_ascii=False)
        grading_b_str = json.dumps({"nota_sugerida": grading_b.nota_sugerida, "confianza": grading_b.confianza, "feedback": grading_b.feedback_estudiante[:300], "criterios": grading_b.criterios, "componentes": grading_b.componentes, "alertas": grading_b.alertas, "error": grading_b.error}, ensure_ascii=False)
        prompt = COMPARATOR_PROMPT.format(
            umbral=umbral,
            model_a=grading_a.modelo,
            model_b=grading_b.modelo,
            grading_a=grading_a_str,
            grading_b=grading_b_str,
        )
        start = time.monotonic()
        raw = await client.chat(
            model=model, messages=[{"role": "user", "content": prompt}],
            json_mode=True, max_tokens=1024,
            timeout=None,
            max_attempts=1,
            stage="consolidation",
        )
        ms = int((time.monotonic() - start) * 1000)
        content = raw["choices"][0]["message"]["content"]
        parsed = _parse_json_content(content)
        nota_final = float(parsed.get("nota_final", valid_scores[0]))
        discrepancy = parsed.get("discrepancia", diff >= umbral)
        logger.info("Comparator via LLM: diff=%.2f nota=%.2f discrepancia=%s", diff, nota_final, discrepancy)
        return AgentResult(
            nota_sugerida=nota_final, confianza=grading_a.confianza if not grading_a.error else grading_b.confianza,
            feedback_estudiante=parsed.get("feedback_integrado", ""),
            criterios=grading_a.criterios or grading_b.criterios,
            componentes=grading_a.componentes or grading_b.componentes,
            alertas=grading_a.alertas + grading_b.alertas,
            requiere_revision_docente=discrepancy or grading_a.requiere_revision_docente or grading_b.requiere_revision_docente,
            proveedor="comparator",
            modelo=model if force_arbitration or discrepancy else "consenso",
            tiempo_ms=ms,
            raw_output={"discrepancia": discrepancy, "diferencia": diff, "nota_final": nota_final,
                        "grading_a": {"nota": grading_a.nota_sugerida, "modelo": grading_a.modelo},
                        "grading_b": {"nota": grading_b.nota_sugerida, "modelo": grading_b.modelo}},
        )
    except Exception as exc:
        logger.error("Comparator agent failed: %s", exc)
        nota_final = round(sum(valid_scores) / len(valid_scores), 2)
        return AgentResult(nota_sugerida=nota_final, confianza=0, feedback_estudiante="", proveedor="comparator", modelo="fallback", error=str(exc))
    finally:
        await client.close()
