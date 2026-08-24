"""Extractor visual desacoplado, multipágina y observable."""
from __future__ import annotations

import asyncio
import base64
import json
import re
import time
from io import BytesIO
from typing import Any, Literal
from uuid import uuid4

import httpx
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.analytics.usage_logger import log_ai_usage
from app.services.ai_credentials_service import get_effective_ai_credentials
from app.services.image_preprocessing import prepare_orientation_variants

logger = get_logger(__name__)
RETRYABLE_HTTP = {429, 502, 503, 504}
RETRYABLE_ERRORS = (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError)


class ExtractedAnswer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    question_id: str | None = None
    question_number: int | str
    answer: str | None = None
    confidence: float = Field(0, ge=0, le=1)
    page: int = Field(ge=1)
    source_pages: list[int] = Field(default_factory=list)
    legible: bool = True
    blank: bool = False
    needs_review: bool = False
    correction_detected: bool = False

    @model_validator(mode="after")
    def preserve_uncertainty(self) -> "ExtractedAnswer":
        if not self.legible:
            self.answer, self.blank, self.needs_review = None, False, True
        elif self.blank:
            self.answer = None
        if not self.source_pages:
            self.source_pages = [self.page]
        return self


class VisionPageResult(BaseModel):
    page: int
    status: Literal["extracted", "requires_review", "failed_temporary", "failed_permanent"]
    duration_ms: int = 0
    parsing_ms: int = 0
    size_bytes: int = 0
    page_text: str = ""
    document_quality: float = Field(0, ge=0, le=1)
    answers: list[ExtractedAnswer] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    error_code: str | None = None
    model: str = ""
    fallback_used: bool = False
    rotation_applied: int = 0


class VisionExtraction(BaseModel):
    student_detected: bool = False
    document_quality: float = Field(0, ge=0, le=1)
    pages_processed: int = 0
    answers: list[ExtractedAnswer] = Field(default_factory=list)
    pages: list[VisionPageResult] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    requires_review: bool = False
    provider: str = "opencode"
    primary_model: str
    fallback_used: bool = False
    rotation_applied: int = 0
    fallback_model: str | None = None
    failure_reason: str | None = None
    duration_ms: int = 0
    preparation_ms: int = 0
    parsing_ms: int = 0

    def legacy_payload(self) -> dict[str, Any]:
        text = "\n\n".join(
            f"=== PÁGINA {p.page} ===\n{p.page_text}" for p in self.pages if p.page_text
        )
        return {
            "texto_extraido": text,
            "paginas_detectadas": [p.page for p in self.pages if p.status.startswith("extract") or p.status == "requires_review"],
            "preguntas_detectadas": [a.question_number for a in self.answers],
            "respuestas_detectadas": [{
                "pregunta": a.question_number, "pagina": a.page,
                "paginas_origen": a.source_pages, "respuesta": a.answer,
                "legible": a.legible, "sin_respuesta": a.blank,
                "confianza": a.confidence, "requiere_revision": a.needs_review,
            } for a in self.answers],
            "calidad_imagen": {"confianza": self.document_quality, "paginas": len(self.pages)},
            "usable": bool(text or self.answers),
            "alertas": self.warnings,
            "rotation_applied": self.rotation_applied,
            "vision_extraction": self.model_dump(mode="json"),
        }


class VisionExtractionError(RuntimeError):
    def __init__(self, code: str, temporary: bool = False) -> None:
        super().__init__(code)
        self.code, self.temporary = code, temporary


def _pages(content: bytes, mime: str) -> list[tuple[int, bytes, str, bool]]:
    if not content:
        raise VisionExtractionError("vision_invalid_file")
    try:
        if mime == "application/pdf":
            import fitz
            output = []
            with fitz.open(stream=content, filetype="pdf") as document:
                if not document.page_count or document.page_count > settings.MAX_GRADING_PDF_PAGES:
                    raise VisionExtractionError("vision_invalid_pdf")
                for number, page in enumerate(document, 1):
                    raw = page.get_pixmap(dpi=max(96, settings.GRADING_PDF_RENDER_DPI), alpha=False).tobytes("png")
                    prepared = prepare_orientation_variants(raw, "image/png", max_side=settings.VISION_MAX_IMAGE_SIDE)[0]
                    output.append((number, prepared.data, prepared.mime, False))
            return output
        if not mime.startswith("image/"):
            raise VisionExtractionError("vision_invalid_file")
        prepared = prepare_orientation_variants(content, mime, max_side=settings.VISION_MAX_IMAGE_SIDE)[0]
        with Image.open(BytesIO(prepared.data)) as image:
            image.verify()
        return [(1, prepared.data, prepared.mime, True)]
    except VisionExtractionError:
        raise
    except Exception as exc:
        raise VisionExtractionError("vision_invalid_file") from exc


def _parse_json(value: Any) -> tuple[dict[str, Any], bool]:
    if isinstance(value, dict):
        return value, False
    if not isinstance(value, str):
        raise VisionExtractionError("vision_invalid_schema")
    text, repaired = value.strip(), False
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.I)
        repaired = True
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < start:
        raise VisionExtractionError("vision_invalid_schema")
    if start or end != len(text) - 1:
        text, repaired = text[start:end + 1], True
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        fixed = re.sub(r",\s*([}\]])", r"\1", text)
        if fixed == text:
            raise VisionExtractionError("vision_invalid_schema")
        data, repaired = json.loads(fixed), True
    if not isinstance(data, dict):
        raise VisionExtractionError("vision_invalid_schema")
    return data, repaired


def _normalize(raw: dict[str, Any], page: int, size: int) -> VisionPageResult:
    answers = []
    for item in raw.get("answers", raw.get("respuestas_detectadas", [])) or []:
        if not isinstance(item, dict):
            continue
        number = item.get("question_number", item.get("pregunta", item.get("numero")))
        if number is None:
            continue
        answer = item.get("answer", item.get("respuesta"))
        answers.append(ExtractedAnswer(
            question_id=item.get("question_id"), question_number=number,
            answer=None if answer is None else str(answer),
            confidence=float(item.get("confidence", item.get("confianza", 0)) or 0),
            page=page, legible=bool(item.get("legible", answer is not None)),
            blank=bool(item.get("blank", item.get("sin_respuesta", False))),
            needs_review=bool(item.get("needs_review", item.get("requiere_revision", False))),
            correction_detected=bool(item.get("correction_detected", False)),
        ))
    quality = raw.get("document_quality", raw.get("confidence", 0))
    if isinstance(quality, dict):
        quality = quality.get("confidence", 0)
    warnings = raw.get("warnings", raw.get("alertas", [])) or []
    if not isinstance(warnings, list):
        warnings = [warnings]
    review = any(answer.needs_review for answer in answers)
    return VisionPageResult(
        page=page, status="requires_review" if review else "extracted",
        size_bytes=size, document_quality=max(0, min(1, float(quality or 0))),
        page_text=str(raw.get("page_text") or raw.get("texto_extraido") or "").strip(),
        answers=answers, warnings=[str(item) for item in warnings],
    )


def _merge(pages: list[VisionPageResult]) -> list[ExtractedAnswer]:
    merged: dict[str, ExtractedAnswer] = {}
    for page in pages:
        for answer in page.answers:
            key = str(answer.question_id or answer.question_number).lower()
            if key not in merged:
                merged[key] = answer.model_copy(deep=True)
                continue
            current = merged[key]
            current.source_pages = sorted(set(current.source_pages + answer.source_pages))
            current.confidence = min(current.confidence, answer.confidence)
            if not current.legible or not answer.legible:
                current.answer, current.legible, current.needs_review = None, False, True
            elif current.answer and answer.answer and answer.answer not in current.answer:
                current.answer = answer.answer if current.answer in answer.answer else f"{current.answer}\n{answer.answer}"
            elif answer.answer:
                current.answer = answer.answer
    return list(merged.values())


class VisionExtractor:
    def __init__(self, tracking: dict[str, Any] | None = None, primary_model: str | None = None) -> None:
        self.tracking = tracking or {}
        self.base_url = settings.OPEN_CODE_BASE_URL.rstrip("/")
        self.primary_model = primary_model or settings.VISION_MODEL

    async def _keys(self) -> list[str]:
        effective = await get_effective_ai_credentials()
        return list(dict.fromkeys(key for key in (effective.open_code_key, settings.OPEN_CODE_API_KEY) if key))

    def _prompt(self, blueprint: dict[str, Any], page: int, total: int, purpose: str) -> str:
        allowed = ("nombre", "preguntas", "respuestas_esperadas", "criterios", "rubrica", "modalidad")
        context = {key: blueprint.get(key) for key in allowed if blueprint.get(key) is not None}
        action = "Extrae respuestas sin calificarlas." if purpose == "student_response" else "Transcribe preguntas, opciones, instrucciones y respuestas visibles."
        return f"""Eres VisionExtractor. {action} Página {page} de {total}.
Contexto: {json.dumps(context, ensure_ascii=False)}
Transcribe solo lo visible. No completes, infieras ni corrijas. Conserva errores ortográficos.
Distingue vacío de ilegible. Ilegible: answer=null, legible=false, needs_review=true.
Informa tachones, correcciones y preguntas ausentes. Devuelve SOLO JSON:
{{"student_detected":true,"document_quality":0.0,"page_text":"","answers":[{{"question_id":null,"question_number":1,"answer":null,"confidence":0.0,"legible":false,"blank":false,"needs_review":true,"correction_detected":false}}],"warnings":[]}}"""

    async def _event(self, event: str, request_id: str, model: str, attempt: int, started: float, page: int, size: int, status: str, error: str | None = None, usage: dict | None = None, http_status: int | None = None) -> None:
        duration = int((time.monotonic() - started) * 1000)
        logger.info(event, extra={
            "grading_id": self.tracking.get("calificacion_id"), "entrega_id": self.tracking.get("entrega_id"),
            "model": model, "provider": "opencode", "duration_ms": duration,
            "page": page, "size_bytes": size, "retry_count": attempt - 1, "error_code": error,
            "http_status": http_status,
            "total_pages": getattr(self, "_total_pages", None),
        })
        await log_ai_usage(
            request_id=request_id, pipeline_run_id=self.tracking.get("pipeline_run_id"),
            calificacion_id=self.tracking.get("calificacion_id"), evaluacion_id=self.tracking.get("evaluacion_id"),
            feature="grading", stage="extraction", provider="opencode", model=model,
            attempt_number=attempt, status=status, latency_ms=duration,
            input_tokens=(usage or {}).get("prompt_tokens"), output_tokens=(usage or {}).get("completion_tokens"),
            image_count=1, error_code=error,
        )

    async def _one(self, item: tuple[int, bytes, str, bool], total: int, blueprint: dict, purpose: str) -> VisionPageResult:
        page, prepared_data, prepared_mime, allow_rotation = item
        models = [self.primary_model] + (settings.vision_fallback_models if settings.VISION_FALLBACK_ENABLED else [])
        keys = await self._keys()
        if not keys:
            raise VisionExtractionError("vision_auth_missing")
        if allow_rotation:
            variants = prepare_orientation_variants(
                prepared_data,
                prepared_mime,
                max_side=settings.VISION_MAX_IMAGE_SIDE,
            )
            candidates = [(variant.rotation_degrees, variant.data, variant.mime) for variant in variants]
        else:
            candidates = [(0, prepared_data, prepared_mime)]
        last_error = "vision_provider_failed"
        last_size = len(prepared_data)
        for rotation, data, mime in candidates:
            last_size = len(data)
            try_next_orientation = False
            for model_index, model in enumerate(dict.fromkeys(models)):
                for attempt in range(1, settings.VISION_MAX_RETRIES + 2):
                    started, request_id = time.monotonic(), str(uuid4())
                    response = None
                    await self._event("vision.request_started", request_id, model, attempt, started, page, len(data), "started")
                    try:
                        body = {
                            "model": model,
                            "temperature": 0,
                            "max_tokens": settings.VISION_MAX_TOKENS,
                            "response_format": {"type": "json_object"},
                            "messages": [{"role": "user", "content": [
                                {"type": "text", "text": self._prompt(blueprint, page, total, purpose)},
                                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{base64.b64encode(data).decode()}"}},
                            ]}],
                        }
                        timeout = httpx.Timeout(
                            connect=settings.AI_PROVIDER_CONNECT_TIMEOUT_SECONDS,
                            read=settings.VISION_TIMEOUT_SECONDS,
                            write=settings.AI_PROVIDER_WRITE_TIMEOUT_SECONDS,
                            pool=settings.AI_PROVIDER_POOL_TIMEOUT_SECONDS,
                        )
                        async with httpx.AsyncClient(timeout=timeout) as client:
                            for key_index, key in enumerate(keys):
                                response = await client.post(
                                    f"{self.base_url}/chat/completions",
                                    headers={"Authorization": f"Bearer {key}"},
                                    json=body,
                                )
                                if response.status_code != 401 or key_index == len(keys) - 1:
                                    break
                        assert response is not None
                        if response.status_code in RETRYABLE_HTTP:
                            raise VisionExtractionError(f"vision_http_{response.status_code}", True)
                        if response.status_code in {401, 403}:
                            raise VisionExtractionError("vision_auth_failed")
                        response.raise_for_status()
                        payload = response.json()
                        parsing_started = time.monotonic()
                        raw, repaired = _parse_json(payload["choices"][0]["message"]["content"])
                        result = _normalize(raw, page, len(data))
                        result.parsing_ms = int((time.monotonic() - parsing_started) * 1000)
                        if not result.page_text and not result.answers:
                            last_error = "vision_no_content"
                            try_next_orientation = True
                            await self._event(
                                "vision.request_failed", request_id, model, attempt,
                                started, page, len(data), "failed", last_error,
                                usage=payload.get("usage"), http_status=response.status_code,
                            )
                            break
                        result.duration_ms = int((time.monotonic() - started) * 1000)
                        result.model = model
                        result.fallback_used = model_index > 0
                        result.rotation_applied = rotation
                        if repaired:
                            result.warnings.append("JSON reparado localmente una sola vez.")
                        if rotation:
                            result.warnings.append(f"Orientación corregida automáticamente ({rotation:+d}°).")
                        await self._event(
                            "vision.request_completed", request_id, model, attempt,
                            started, page, len(data), "success",
                            usage=payload.get("usage"), http_status=response.status_code,
                        )
                        return result
                    except VisionExtractionError as exc:
                        last_error = exc.code
                        retry = exc.temporary and attempt <= settings.VISION_MAX_RETRIES
                    except RETRYABLE_ERRORS as exc:
                        last_error = "vision_timeout" if isinstance(exc, httpx.TimeoutException) else "vision_transport"
                        retry = attempt <= settings.VISION_MAX_RETRIES
                    except Exception:
                        last_error, retry = "vision_invalid_schema", False
                    await self._event(
                        "vision.retry" if retry else "vision.request_failed",
                        request_id, model, attempt, started, page, len(data),
                        "retry" if retry else "failed", last_error,
                        http_status=response.status_code if response is not None else None,
                    )
                    if retry:
                        await asyncio.sleep(min(0.5 * attempt, 2))
                        continue
                    break
                if try_next_orientation:
                    break
                if model_index + 1 < len(models):
                    logger.warning("vision.fallback", extra={
                        "primary_model": models[0],
                        "fallback_model": models[model_index + 1],
                        "failure_reason": last_error,
                        "page": page,
                    })
            if not try_next_orientation:
                break
        temporary = last_error in {
            "vision_timeout", "vision_transport", "vision_http_429",
            "vision_http_502", "vision_http_503", "vision_http_504",
        }
        return VisionPageResult(
            page=page,
            status="failed_temporary" if temporary else "failed_permanent",
            size_bytes=last_size,
            error_code=last_error,
            model=models[-1],
            fallback_used=len(models) > 1,
            warnings=["Página no extraída automáticamente."],
        )
    async def extract(self, content: bytes, mime: str, *, blueprint: dict | None = None, purpose: Literal["student_response", "evaluation_document"] = "student_response") -> VisionExtraction:
        started = time.monotonic()
        preparation_started = time.monotonic()
        prepared = _pages(content, mime)
        preparation_ms = int((time.monotonic() - preparation_started) * 1000)
        self._total_pages = len(prepared)
        semaphore = asyncio.Semaphore(max(1, settings.VISION_MAX_CONCURRENCY))
        async def run(item: tuple[int, bytes, str, bool]) -> VisionPageResult:
            async with semaphore:
                return await self._one(item, len(prepared), blueprint or {}, purpose)
        try:
            gathered = await asyncio.wait_for(
                asyncio.gather(*(run(item) for item in prepared)),
                timeout=max(1, settings.VISION_TOTAL_TIMEOUT_SECONDS),
            )
        except asyncio.TimeoutError as exc:
            raise VisionExtractionError("vision_failed_temporary", True) from exc
        results = sorted(gathered, key=lambda item: item.page)
        success = [item for item in results if item.status in {"extracted", "requires_review"}]
        if not success:
            temporary = any(item.status == "failed_temporary" for item in results)
            raise VisionExtractionError("vision_failed_temporary" if temporary else "vision_failed_permanent", temporary)
        answers, failures = _merge(success), [item for item in results if item not in success]
        warnings = [warning for item in results for warning in item.warnings]
        if failures:
            warnings.append("Faltan páginas; revisión docente obligatoria.")
        fallback = next((item for item in results if item.fallback_used), None)
        return VisionExtraction(
            student_detected=any(answer.answer is not None for answer in answers),
            document_quality=round(sum(item.document_quality for item in success) / len(success), 4),
            pages_processed=len(results), answers=answers, pages=results, warnings=warnings,
            requires_review=bool(failures) or any(answer.needs_review for answer in answers),
            primary_model=self.primary_model, fallback_used=fallback is not None,
            rotation_applied=next((item.rotation_applied for item in success if item.rotation_applied), 0),
            fallback_model=fallback.model if fallback else None,
            failure_reason=failures[0].error_code if failures else None,
            duration_ms=int((time.monotonic() - started) * 1000),
            preparation_ms=preparation_ms,
            parsing_ms=sum(item.parsing_ms for item in results),
        )
