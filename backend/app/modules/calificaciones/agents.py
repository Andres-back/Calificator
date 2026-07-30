import json
import time
import uuid
from dataclasses import dataclass, field, asdict
from typing import Any
from uuid import UUID

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.analytics.usage_logger import log_ai_usage

logger = get_logger(__name__)

# ── Tipos compartidos ──────────────────────────────────────────────────────────

# Text grading calls are fast and fit in 60s. Multimodal calls (image +
# long prompt) on qwen3.7-plus routinely need 90-120s, so we use a
# separate timeout for the chat_multimodal path.
DEFAULT_TIMEOUT = 60
DEFAULT_MULTIMODAL_TIMEOUT = 180


@dataclass
class AgentContext:
    """Contexto completo que recibe cada agente para calificar."""

    evaluacion_nombre: str
    nota_maxima: float
    blueprint: dict
    rag_context: str = ""
    student_response_text: str = ""
    image_bytes: bytes | None = None
    image_mime: str = "image/jpeg"


@dataclass
class AgentResult:
    """Resultado estructurado devuelto por un agente."""

    nota_sugerida: float | None
    confianza: float
    feedback_estudiante: str
    criterios: list[dict] = field(default_factory=list)
    alertas: list[str] = field(default_factory=list)
    requiere_revision_docente: bool = True
    proveedor: str = ""
    modelo: str = ""
    tiempo_ms: int = 0
    raw_output: dict | None = None
    error: str | None = None


# ── Cliente OpenCode ───────────────────────────────────────────────────────────


class OpenCodeClient:
    """Cliente HTTP para la API de OpenCode (compatible con OpenAI chat format).

    Registra automáticamente cada llamada en ai_usage_events.
    """

    def __init__(
        self,
        *,
        tracking: dict | None = None,
    ) -> None:
        self.api_key = str(settings.OPEN_CODE_API_KEY)
        self.base_url = str(settings.OPEN_CODE_BASE_URL).rstrip("/")
        self._client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT)
        self._tracking = tracking or {}

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
    ) -> None:
        """Registra una llamada en el ledger (fire-and-forget)."""
        completed_at = time.monotonic()
        latency_ms = int((completed_at - started_at) * 1000)
        await log_ai_usage(
            calificacion_id=self._tracking.get("calificacion_id"),
            evaluacion_id=self._tracking.get("evaluacion_id"),
            pipeline_run_id=self._tracking.get("pipeline_run_id"),
            feature="grading",
            stage=stage,
            provider="opencode",
            model=model,
            attempt_number=self._tracking.get("attempt_number", 1),
            status=status,
            latency_ms=latency_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            image_count=image_count,
            error_code=error_code,
        )

    async def chat(
        self,
        model: str,
        messages: list[dict],
        json_mode: bool = True,
        max_tokens: int = 2048,
        temperature: float = 0.3,
        timeout: int | None = None,
    ) -> dict[str, Any]:
        """Llamada chat completions. Devuelve el dict completo del response.

        Uses DEFAULT_TIMEOUT (60s) for text-only calls; multimodal callers
        should pass ``timeout=DEFAULT_MULTIMODAL_TIMEOUT`` (180s).
        """
        start = time.monotonic()
        body: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        request_timeout = timeout if timeout is not None else DEFAULT_TIMEOUT
        try:
            resp = await self._client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
                timeout=request_timeout,
            )
            if resp.status_code == 401:
                raise RuntimeError("OpenCode API key invalid o expirada")
            resp.raise_for_status()
            data = resp.json()
            usage = data.get("usage", {}) or {}
            await self._log_call(
                stage="text",
                model=model,
                status="success",
                started_at=start,
                input_tokens=usage.get("input_tokens") or usage.get("prompt_tokens"),
                output_tokens=usage.get("output_tokens") or usage.get("completion_tokens"),
            )
            return data
        except httpx.TimeoutException as exc:
            await self._log_call(stage="text", model=model, status="timeout", started_at=start, error_code="provider_timeout")
            raise
        except Exception as exc:
            await self._log_call(stage="text", model=model, status="failed", started_at=start, error_code=str(exc)[:60])
            raise

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
    ) -> dict[str, Any]:
        """Chat completions con imagen incluida (multimodal).

        Uses DEFAULT_MULTIMODAL_TIMEOUT (180s) by default because qwen3.7-plus
        takes 90-120s on real photos. Pass ``timeout`` to override.
        """
        import base64

        b64 = base64.b64encode(image_bytes).decode()
        start = time.monotonic()

        msg: dict = {
            "role": "user",
            "content": [
                {"type": "text", "text": text},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{image_mime};base64,{b64}"},
                },
            ],
        }
        try:
            data = await self.chat(
                model=model,
                messages=[msg],
                json_mode=json_mode,
                max_tokens=max_tokens,
                temperature=temperature,
                timeout=timeout or DEFAULT_MULTIMODAL_TIMEOUT,
            )
            await self._log_call(
                stage="vision",
                model=model,
                status="success",
                started_at=start,
                image_count=1,
                input_tokens=(data.get("usage") or {}).get("input_tokens"),
                output_tokens=(data.get("usage") or {}).get("output_tokens"),
            )
            return data
        except Exception as exc:
            await self._log_call(stage="vision", model=model, status="failed", started_at=start, error_code=str(exc)[:60])
            raise

    async def close(self) -> None:
        await self._client.aclose()


# ── Agentes de visión ──────────────────────────────────────────────────────────

VISION_PROMPT = """Eres un extractor de contenido de imágenes de respuestas de estudiantes.

## Contexto de la evaluación
{preguntas_context}

Analiza la imagen y extrae:
1. Todo el texto escrito visible
2. Identifica a qué pregunta corresponde cada respuesta
3. Evalúa la calidad de la imagen

Devuelve SOLO JSON con este formato:
{
  "texto_extraido": "texto completo extraído de la imagen",
  "preguntas_detectadas": [],
  "respuestas_detectadas": [],
  "calidad_imagen": {"borroso": "bajo|medio|alto", "iluminacion": "buena|mala", "recorte": "completo|parcial|cortado"},
  "usable": true,
  "alertas": []
}
"""


async def vision_agent(
    ctx: AgentContext,
    model: str = "mimo-v2.5",
    client: OpenCodeClient | None = None,
) -> AgentResult:
    """Agente de visión: extrae texto estructurado de una imagen de respuesta."""
    preguntas_context = ""
    blueprint_preguntas = ctx.blueprint.get("preguntas", []) if ctx.blueprint else []
    if blueprint_preguntas:
        preguntas_context = "Preguntas del examen:\n" + "\n".join(
            f"{p.get('numero', i+1)}. {p.get('texto', p.get('enunciado', '?'))}"
            for i, p in enumerate(blueprint_preguntas)
        )
    if not ctx.image_bytes:
        return AgentResult(
            nota_sugerida=None, confianza=0, feedback_estudiante="",
            proveedor="vision", modelo=model, error="No hay imagen para procesar",
        )

    own_client = False
    if client is None:
        client = OpenCodeClient()
        own_client = True

    try:
        start = time.monotonic()
        vision_text = VISION_PROMPT.replace("{preguntas_context}", preguntas_context)
        raw = await client.chat_multimodal(
            model=model, text=vision_text,
            image_bytes=ctx.image_bytes, image_mime=ctx.image_mime,
            json_mode=True, max_tokens=1024,
        )
        ms = int((time.monotonic() - start) * 1000)
        content = raw["choices"][0]["message"]["content"]
        parsed = json.loads(content) if isinstance(content, str) else content
        usable = parsed.get("usable", True)
        alertas = parsed.get("alertas", [])
        texto = parsed.get("texto_extraido", "")

        if not usable:
            return AgentResult(
                nota_sugerida=None, confianza=0,
                feedback_estudiante="La imagen no pudo procesarse. Revisión docente requerida.",
                alertas=alertas or ["Imagen no utilizable"],
                proveedor="vision", modelo=model, tiempo_ms=ms,
                raw_output=parsed, requiere_revision_docente=True,
            )
        logger.info("Vision agent OK: modelo=%s %dms texto=%d chars", model, ms, len(texto))
        return AgentResult(
            nota_sugerida=None, confianza=1.0, feedback_estudiante="",
            alertas=alertas, proveedor="vision", modelo=model,
            tiempo_ms=ms, raw_output=parsed, requiere_revision_docente=False,
        )

    except Exception as exc:
        logger.error("Vision agent %s failed: %s", model, exc)
        return AgentResult(nota_sugerida=None, confianza=0, feedback_estudiante="", proveedor="vision", modelo=model, error=str(exc))
    finally:
        if own_client:
            await client.close()


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


async def grader_agent(
    ctx: AgentContext,
    model: str = "deepseek-v4-flash",
    multimodal: bool = False,
    client: OpenCodeClient | None = None,
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
        errores_comunes=json.dumps(ctx.blueprint.get("errores_comunes", []), ensure_ascii=False),
        rag_context=ctx.rag_context or "(sin contexto adicional)",
        student_response=ctx.student_response_text[:5000],
    )
    own_client = False
    if client is None:
        client = OpenCodeClient()
        own_client = True

    try:
        start = time.monotonic()
        if multimodal and ctx.image_bytes:
            raw = await client.chat_multimodal(
                model=model, text=prompt,
                image_bytes=ctx.image_bytes, image_mime=ctx.image_mime,
                json_mode=True, max_tokens=4096,
            )
        else:
            raw = await client.chat(
                model=model, messages=[{"role": "user", "content": prompt}],
                json_mode=True, max_tokens=4096,
            )
        ms = int((time.monotonic() - start) * 1000)
        content = raw["choices"][0]["message"]["content"]
        parsed = json.loads(content) if isinstance(content, str) else content
        reasoning = raw["choices"][0]["message"].get("reasoning_content", "")

        raw_score = parsed.get("nota_sugerida")
        if raw_score is None:
            logger.error("Grader agent %s returned no score", model)
            return AgentResult(
                nota_sugerida=None, confianza=0, feedback_estudiante="",
                proveedor="opencode", modelo=model,
                error="grader_missing_score", requiere_revision_docente=True,
            )

        result = AgentResult(
            nota_sugerida=float(raw_score),
            confianza=float(parsed.get("confianza", 0.5)),
            feedback_estudiante=parsed.get("feedback_estudiante", ""),
            criterios=parsed.get("criterios", []),
            alertas=parsed.get("alertas", []),
            requiere_revision_docente=parsed.get("requiere_revision_docente", True),
            proveedor="opencode", modelo=model, tiempo_ms=ms,
            raw_output={**parsed, "_reasoning": reasoning} if reasoning else parsed,
        )
        logger.info("Grader agent OK: modelo=%s %dms nota=%.2f confianza=%.2f", model, ms, result.nota_sugerida, result.confianza)
        return result

    except Exception as exc:
        logger.error("Grader agent %s failed: %s", model, exc)
        return AgentResult(nota_sugerida=None, confianza=0, feedback_estudiante="", proveedor="opencode", modelo=model, error=str(exc), requiere_revision_docente=True)
    finally:
        if own_client:
            await client.close()


# ── Agente comparador ───────────────────────────────────────────────────────────

COMPARATOR_PROMPT = """Eres el módulo comparador de calificaciones de XCalificator.

Recibes DOS calificaciones independientes para la misma respuesta de un estudiante.
Tu tarea es:
1. Comparar ambas calificaciones
2. Identificar discrepancias significativas (diferencia > {umbral} puntos)
3. Si hay discrepancia, proponer una nota final razonada
4. Si están cerca (< umbral), promediar

## Calificación A (DeepSeek V4 Flash)
{grading_a}

## Calificación B (Qwen 3.7 Plus)
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


async def comparator_agent(
    grading_a: AgentResult,
    grading_b: AgentResult,
    umbral: float = 0.5,
    model: str = "deepseek-v4-flash",
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

    if score_a is None or score_b is None:
        valid = grading_b if score_a is None else grading_a
        return AgentResult(
            nota_sugerida=valid.nota_sugerida,
            confianza=valid.confianza,
            feedback_estudiante=valid.feedback_estudiante,
            criterios=valid.criterios,
            alertas=valid.alertas + ["Solo uno de los evaluadores produjo una nota."],
            requiere_revision_docente=True,
            proveedor="comparator",
            modelo="resultado_parcial",
            raw_output={"discrepancia": True, "resultado_parcial": True},
        )

    diff = abs(score_a - score_b)

    if not grading_a.error and not grading_b.error and diff < umbral:
        nota_final = round((score_a + score_b) / 2, 2)
        confianza = round((grading_a.confianza + grading_b.confianza) / 2, 2)
        feedbacks = [g for g in [grading_a.feedback_estudiante, grading_b.feedback_estudiante] if g]
        feedback = " | ".join(feedbacks) if feedbacks else ""
        logger.info("Comparator: consenso automatico diff=%.2f nota=%.2f", diff, nota_final)
        return AgentResult(
            nota_sugerida=nota_final, confianza=confianza, feedback_estudiante=feedback,
            criterios=grading_a.criterios or grading_b.criterios,
            alertas=grading_a.alertas + grading_b.alertas,
            requiere_revision_docente=False, proveedor="comparator", modelo="consenso",
            raw_output={"discrepancia": False, "diferencia": diff, "nota_final": nota_final,
                        "grading_a": {"nota": grading_a.nota_sugerida, "modelo": grading_a.modelo},
                        "grading_b": {"nota": grading_b.nota_sugerida, "modelo": grading_b.modelo}},
        )

    client = OpenCodeClient()
    try:
        grading_a_str = json.dumps({"nota_sugerida": grading_a.nota_sugerida, "confianza": grading_a.confianza, "feedback": grading_a.feedback_estudiante[:300], "criterios": grading_a.criterios, "alertas": grading_a.alertas, "error": grading_a.error}, ensure_ascii=False)
        grading_b_str = json.dumps({"nota_sugerida": grading_b.nota_sugerida, "confianza": grading_b.confianza, "feedback": grading_b.feedback_estudiante[:300], "criterios": grading_b.criterios, "alertas": grading_b.alertas, "error": grading_b.error}, ensure_ascii=False)
        prompt = COMPARATOR_PROMPT.format(umbral=umbral, grading_a=grading_a_str, grading_b=grading_b_str)
        start = time.monotonic()
        raw = await client.chat(model=model, messages=[{"role": "user", "content": prompt}], json_mode=True, max_tokens=1024)
        ms = int((time.monotonic() - start) * 1000)
        content = raw["choices"][0]["message"]["content"]
        parsed = json.loads(content) if isinstance(content, str) else content
        nota_final = float(parsed.get("nota_final", score_a))
        discrepancy = parsed.get("discrepancia", diff >= umbral)
        logger.info("Comparator via LLM: diff=%.2f nota=%.2f discrepancia=%s", diff, nota_final, discrepancy)
        return AgentResult(
            nota_sugerida=nota_final, confianza=grading_a.confianza if not grading_a.error else grading_b.confianza,
            feedback_estudiante=parsed.get("feedback_integrado", ""),
            criterios=grading_a.criterios or grading_b.criterios,
            alertas=grading_a.alertas + grading_b.alertas,
            requiere_revision_docente=discrepancy or grading_a.requiere_revision_docente or grading_b.requiere_revision_docente,
            proveedor="comparator", modelo=model if discrepancy else "consenso", tiempo_ms=ms,
            raw_output={"discrepancia": discrepancy, "diferencia": diff, "nota_final": nota_final,
                        "grading_a": {"nota": grading_a.nota_sugerida, "modelo": grading_a.modelo},
                        "grading_b": {"nota": grading_b.nota_sugerida, "modelo": grading_b.modelo}},
        )
    except Exception as exc:
        logger.error("Comparator agent failed: %s", exc)
        nota_final = round((score_a + score_b) / 2, 2)
        return AgentResult(nota_sugerida=nota_final, confianza=0, feedback_estudiante="", proveedor="comparator", modelo="fallback", error=str(exc))
    finally:
        await client.close()
