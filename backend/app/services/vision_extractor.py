"""Extractor visual desacoplado, multipágina y observable."""
from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import re
import time
import unicodedata
from io import BytesIO
from typing import Any, Literal
from uuid import uuid4

import httpx
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.analytics.usage_logger import log_ai_usage
from app.services.ai_provider_capacity import ProviderCapacityUnavailable, provider_capacity
from app.services.ai_credentials_service import get_effective_ai_credentials
from app.services.image_preprocessing import prepare_orientation_variants
from app.modules.calificaciones.evidence_preparation import CanonicalEvidencePages
from app.services.answer_evidence_regions import model_answer_regions, rotate_answer_regions, sanitize_answer_regions
from app.services.ollama_provider import OllamaCloudProvider, OllamaProviderError
from app.services.opencode_request import new_opencode_session_id, opencode_headers

logger = get_logger(__name__)
VISION_EXTRACTION_VERSION = 3
RETRYABLE_HTTP = {429, 502, 503, 504}
RETRYABLE_ERRORS = (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError)
_SOLUTION_CONTEXT_KEYS = {
    "answer",
    "answer_key",
    "correct",
    "correct_answer",
    "correcta",
    "es_correcta",
    "expected",
    "expected_answer",
    "respuesta_correcta",
    "respuesta_esperada",
    "respuestas_esperadas",
    "rubrica",
    "rubric",
    "solucion",
    "solution",
}
_GRAPHIC_REQUEST = re.compile(
    r"\b(?:dibuj\w*|traz\w*|grafic\w*|esboz\w*|"
    r"represent\w*\s+(?:graficamente|en\s+(?:el\s+)?(?:plano|sistema)))\b",
    re.IGNORECASE,
)
_NO_VISIBLE_DRAWING = re.compile(
    r"^(?:no\s+(?:se\s+)?(?:observa|ve|distingue)|sin\s+(?:dibujo|trazos)|"
    r"ningun\s+(?:dibujo|trazo))\b",
    re.IGNORECASE,
)


class ExtractedAnswer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    question_id: str | None = None
    question_number: int | str
    answer: str | None = None
    visual_description: str | None = None
    confidence: float = Field(0, ge=0, le=1)
    page: int = Field(ge=1)
    source_pages: list[int] = Field(default_factory=list)
    legible: bool = True
    blank: bool = False
    needs_review: bool = False
    correction_detected: bool = False
    partial: bool = False
    regions: list[dict] = Field(default_factory=list)

    @field_validator("regions", mode="before")
    @classmethod
    def optional_regions(cls, value: object) -> list[dict]:
        return sanitize_answer_regions(value)

    @model_validator(mode="after")
    def preserve_uncertainty(self) -> "ExtractedAnswer":
        if self.visual_description:
            description = self.visual_description.strip()
            self.visual_description = (
                None if _NO_VISIBLE_DRAWING.match(_context_key(description)) else description or None
            )
        if not self.legible:
            self.answer, self.visual_description, self.blank, self.needs_review = None, None, False, True
        elif self.blank:
            self.answer, self.visual_description = None, None
        if not self.source_pages:
            self.source_pages = [self.page]
        return self


class VisionPageResult(BaseModel):
    page: int
    page_role: Literal["reading", "responses", "mixed", "unknown"] = "unknown"
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
    provider: str = ""
    fallback_used: bool = False
    rotation_applied: int = 0


class VisionExtraction(BaseModel):
    source_fingerprint: str | None = None
    student_detected: bool = False
    document_quality: float = Field(0, ge=0, le=1)
    pages_processed: int = 0
    answers: list[ExtractedAnswer] = Field(default_factory=list)
    pages: list[VisionPageResult] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    graphic_uncertain_questions: list[int | str] = Field(default_factory=list)
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
        page_text = "\n\n".join(
            f"=== PÁGINA {p.page} ===\n{p.page_text}" for p in self.pages if p.page_text
        )
        visual_lines = [
            (
                f"Pregunta {answer.question_number} ("
                f"{'página' if len(answer.source_pages) == 1 else 'páginas'} "
                f"{', '.join(map(str, answer.source_pages))}): {answer.visual_description}"
            )
            for answer in self.answers if answer.visual_description
        ]
        visual_lines.extend(
            f"Pregunta {number}: evidencia gráfica NO confirmada; el texto extraído NO confirma ausencia del dibujo. Revisión docente necesaria."
            for number in self.graphic_uncertain_questions
        )
        text = "\n\n".join(part for part in (
            page_text,
            "=== EVIDENCIA GRÁFICA DEL ESTUDIANTE ===\n" + "\n".join(visual_lines)
            if visual_lines else "",
        ) if part)
        return {
            "texto_extraido": text,
            "paginas_detectadas": [p.page for p in self.pages if p.status.startswith("extract") or p.status == "requires_review"],
            "preguntas_detectadas": [a.question_number for a in self.answers],
            "respuestas_detectadas": [{
                "pregunta": a.question_number, "pagina": a.page,
                "paginas_origen": a.source_pages,
                "respuesta": _answer_with_visual_description(a),
                "descripcion_visual": a.visual_description,
                "legible": a.legible, "sin_respuesta": a.blank,
                "respuesta_parcial": a.partial,
                "confianza": a.confidence, "requiere_revision": a.needs_review,
            } for a in self.answers],
            "calidad_imagen": {"confianza": self.document_quality, "paginas": len(self.pages)},
            "usable": bool(text or self.answers),
            "alertas": self.warnings,
            "preguntas_graficas_inciertas": self.graphic_uncertain_questions,
            "rotation_applied": self.rotation_applied,
            "vision_extraction": self.model_dump(mode="json"),
        }


class VisionExtractionError(RuntimeError):
    def __init__(self, code: str, temporary: bool = False) -> None:
        super().__init__(code)
        self.code, self.temporary = code, temporary


def _pages(content: bytes, mime: str, *, canonical_pages: CanonicalEvidencePages | None = None) -> list[tuple[int, bytes, str, bool]]:
    if canonical_pages is not None:
        if not isinstance(canonical_pages, CanonicalEvidencePages):
            raise VisionExtractionError("vision_invalid_file")
        return [(page.number, page.content, page.mime, False) for page in canonical_pages.pages]
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
        if item.get("present") is False:
            continue
        number = item.get("question_number", item.get("pregunta", item.get("numero")))
        if number is None:
            continue
        answer = item.get("answer", item.get("respuesta"))
        visual_description = item.get("visual_description", item.get("descripcion_visual"))
        answers.append(ExtractedAnswer(
            question_id=item.get("question_id"), question_number=number,
            answer=None if answer is None else str(answer),
            visual_description=visual_description,
            confidence=float(item.get("confidence", item.get("confianza", 0)) or 0),
            page=page, legible=bool(item.get("legible", answer is not None or visual_description is not None)),
            blank=bool(item.get("blank", item.get("sin_respuesta", False))),
            needs_review=bool(item.get("needs_review", item.get("requiere_revision", False))),
            correction_detected=bool(item.get("correction_detected", False)),
            partial=bool(item.get("partial", item.get("respuesta_parcial", False))),
            regions=model_answer_regions(item.get("regions"), page=page),
        ))
    quality = raw.get("document_quality", raw.get("confidence", 0))
    if isinstance(quality, dict):
        quality = quality.get("confidence", 0)
    warnings = raw.get("warnings", raw.get("alertas", [])) or []
    if not isinstance(warnings, list):
        warnings = [warnings]
    role = raw.get("page_role", "unknown")
    if role not in {"reading", "responses", "mixed", "unknown"}:
        role = "unknown"
    if role == "reading" and not any(a.answer or a.visual_description for a in answers):
        # A reading-only sheet cannot declare the other sheets' answers illegible.
        answers = []
    review = any(answer.needs_review or answer.partial for answer in answers)
    return VisionPageResult(
        page=page, page_role=role, status="requires_review" if review else "extracted",
        size_bytes=size, document_quality=max(0, min(1, float(quality or 0))),
        page_text=str(raw.get("page_text") or raw.get("texto_extraido") or "").strip(),
        answers=answers, warnings=[str(item) for item in warnings],
    )


def _merge(pages: list[VisionPageResult]) -> list[ExtractedAnswer]:
    grouped: dict[str, list[ExtractedAnswer]] = {}
    for page in sorted(pages, key=lambda item: item.page):
        for answer in page.answers:
            key = str(answer.question_id or answer.question_number).lower()
            grouped.setdefault(key, []).append(answer)
    merged = []
    for candidates in grouped.values():
        observed = [a for a in candidates if a.answer or a.visual_description]
        current = (observed[0] if observed else candidates[0]).model_copy(deep=True)
        current.source_pages = sorted({p for a in candidates for p in a.source_pages})
        current.regions = sanitize_answer_regions([region for answer in candidates for region in answer.regions])
        current.correction_detected = any(a.correction_detected for a in candidates)
        if observed:
            texts = list(dict.fromkeys(a.answer.strip() for a in observed if a.answer and a.answer.strip()))
            drawings = list(dict.fromkeys(a.visual_description.strip() for a in observed if a.visual_description and a.visual_description.strip()))
            current.answer = "\n".join(texts) or None
            current.visual_description = "\n".join(drawings) or None
            current.legible, current.blank = True, False
            current.partial = any(a.partial for a in candidates) or len(observed) != len(candidates) or len(texts) > 1 or len(drawings) > 1
            current.needs_review = current.partial or any(a.needs_review for a in candidates)
            current.confidence = min(a.confidence for a in observed)
        else:
            current.legible = all(a.legible for a in candidates)
            current.blank = current.legible and all(a.blank for a in candidates)
            current.needs_review = not current.legible or any(a.needs_review for a in candidates)
            current.confidence = min(a.confidence for a in candidates)
        merged.append(current)
    return merged


def _answer_with_visual_description(answer: ExtractedAnswer) -> str | None:
    parts = [answer.answer.strip() if answer.answer else ""]
    if answer.visual_description:
        parts.append(f"[Dibujo observado: {answer.visual_description}]")
    return "\n".join(part for part in parts if part) or None


def _graphic_question_numbers(blueprint: dict[str, Any]) -> list[int | str]:
    numbers: list[int | str] = []
    for index, question in enumerate(blueprint.get("preguntas") or [], 1):
        if not isinstance(question, dict):
            continue
        statement = str(
            question.get("enunciado") or question.get("texto") or question.get("pregunta") or ""
        )
        if _GRAPHIC_REQUEST.search(_context_key(statement)):
            numbers.append(question.get("numero") or index)
    return numbers


def _context_key(value: object) -> str:
    normalized = unicodedata.normalize("NFKD", str(value))
    return "".join(char for char in normalized if not unicodedata.combining(char)).casefold()


def _without_solutions(value: Any) -> Any:
    """Crea contexto visual mínimo sin claves, soluciones ni rúbricas anidadas."""
    if isinstance(value, dict):
        return {
            key: _without_solutions(item)
            for key, item in value.items()
            if _context_key(key) not in _SOLUTION_CONTEXT_KEYS
        }
    if isinstance(value, list):
        return [_without_solutions(item) for item in value]
    return value


def build_extraction_context(blueprint: dict[str, Any]) -> dict[str, Any]:
    """Devuelve únicamente estructura útil para leer, nunca para resolver."""
    allowed = ("nombre", "preguntas", "modalidad")
    return _without_solutions({
        key: blueprint.get(key)
        for key in allowed
        if blueprint.get(key) is not None
    })


class VisionExtractor:
    def __init__(
        self,
        tracking: dict[str, Any] | None = None,
        primary_model: str | None = None,
        api_key: str | None = None,
        provider: Literal["open_code", "ollama"] = "open_code",
    ) -> None:
        self.tracking = tracking or {}
        snapshot = self.tracking.get("_ai_config") or {}
        managed = snapshot.get("feature") == "calificacion.extraccion" or self.tracking.get("_require_configured_route")
        if not managed and provider not in {"open_code", "ollama"} and not (snapshot.get("primary") or {}).get("runtime_profile"):
            raise ValueError("Proveedor visual no compatible")
        self.provider = provider
        self.base_url = settings.OPEN_CODE_BASE_URL.rstrip("/")
        self.primary_model = primary_model or settings.VISION_MODEL
        if snapshot.get("feature") == "calificacion.extraccion" or self.tracking.get("_require_configured_route"):
            selected = snapshot.get("primary") or {}
            self.primary_model = str(selected.get("model") or "")
            self.provider = str(selected.get("provider") or provider)
        self.api_key = (api_key or "").strip()
        self._session_id = new_opencode_session_id(
            self.tracking.get("pipeline_run_id")
        )

    async def _keys(self) -> list[str]:
        selected = ((self.tracking.get("_ai_config") or {}).get("primary") or {})
        if selected.get("runtime_profile"):
            from app.db.session import AsyncSessionLocal
            from app.services.ai_credentials_service import resolve_api_credential
            if selected.get("credential_source") == "teacher":
                return [self.api_key] if self.api_key else []
            async with AsyncSessionLocal() as credential_db:
                value = await resolve_api_credential(credential_db, selected.get("connection") or {})
            return [value] if value else []
        effective = await get_effective_ai_credentials()
        configured = (
            (effective.ollama_key, settings.OLLAMA_API_KEY)
            if self.provider == "ollama"
            else (effective.open_code_key, settings.OPEN_CODE_API_KEY)
        )
        return list(dict.fromkeys(key for key in (self.api_key, *configured) if key))

    def _prompt(self, blueprint: dict[str, Any], page: int, total: int, purpose: str) -> str:
        context = build_extraction_context(blueprint)
        action = "Extrae respuestas sin calificarlas." if purpose == "student_response" else "Transcribe preguntas, opciones, instrucciones y respuestas visibles."
        drawing_rule = (
            "Para cada respuesta observa TAMBIÉN dibujos, diagramas, gráficas, trazos, puntos, "
            "círculos y etiquetas añadidos por el estudiante. En visual_description describe "
            "brevemente solo su geometría y relaciones visibles, vinculadas al número de pregunta; "
            "no evalúes si son correctas. Distingue trazos del estudiante de figuras impresas. "
            "Si no puedes distinguirlos, visual_description=null y needs_review=true. "
            "No declares blank=true por faltar texto si hay trazos; solo si el área textual y gráfica "
            "están realmente vacías. Conserva por separado en answer todo el texto manuscrito."
            if purpose == "student_response" else ""
        )
        return f"""Eres VisionExtractor. {action} Página {page} de {total}.
Contexto: {json.dumps(context, ensure_ascii=False)}
PRIORIDAD CRÍTICA: busca las respuestas del estudiante, no te detengas al reconocer
el texto impreso. Inspecciona debajo y al lado de cada pregunta, especialmente líneas
de respuesta con lápiz gris tenue, escritura infantil, palabras separadas, tachones y
respuestas que invaden el margen. Amplía mentalmente la zona inferior de la hoja.
Una respuesta incorrecta sigue siendo una respuesta: transcríbela literalmente.
Solo usa blank=true cuando revisaste toda el área de respuesta y está realmente vacía.
Si observas grafito pero no puedes leerlo, usa legible=false y needs_review=true, nunca blank=true.
Transcribe solo lo visible. No completes, infieras ni corrijas. Conserva errores ortográficos.
Clasifica page_role: reading si solo contiene lectura/material de apoyo sin preguntas ni áreas
de respuesta; responses si contiene preguntas/respuestas; mixed si reúne ambas; unknown si no puedes decidir.
En una hoja reading devuelve answers=[]: NO repitas las preguntas del contexto como si estuvieran
ilegibles o en blanco en esta hoja. Omite preguntas que están en otras hojas, o usa present=false.
No confundas pregunta ausente con respuesta vacía. Solo present=true cuando su área está visible.
El contexto solo sirve para ubicar la pregunta: no copies los números del contexto como si fueran
la respuesta. En operaciones aritméticas transcribe dígito por dígito los operandos escritos por
el estudiante, los productos parciales y el resultado final. Si los operandos visibles difieren
del enunciado, conserva exactamente lo visible y marca needs_review=true. Si un dígito no se
distingue, usa answer=null, legible=false y needs_review=true; nunca lo completes calculando.
{drawing_rule}
{('Opcional: por respuesta, regions=[[x,y,ancho,alto]] puede contener UNA caja normalizada de 0 a 1 que abarque sus trazos y pasos sobre ESTA imagen. Nunca inventes otra hoja o ubicación. Si no estás seguro o falta espacio, omite regions. Prioriza siempre las respuestas completas.' if purpose == 'student_response' else '')}
Distingue vacío de ilegible. Ilegible: answer=null, legible=false, needs_review=true.
Informa tachones, correcciones y preguntas ausentes. Devuelve SOLO JSON:
{{"student_detected":true,"page_role":"unknown","document_quality":0.0,"page_text":"","answers":[{{"question_id":null,"question_number":1,"present":true,"answer":null,"visual_description":null,"confidence":0.0,"legible":false,"blank":false,"needs_review":true,"correction_detected":false}}],"warnings":[]}}"""

    async def _event(self, event: str, request_id: str, model: str, attempt: int, started: float, page: int, size: int, status: str, error: str | None = None, usage: dict | None = None, http_status: int | None = None, selection: dict | None = None, fallback_used: bool = False) -> None:
        duration = int((time.monotonic() - started) * 1000)
        snapshot = self.tracking.get("_ai_config") or {}
        provider = str((selection or {}).get("provider") or self.provider)
        provider = "opencode" if provider == "open_code" else provider
        feature = "evaluacion_digitalizar" if str(snapshot.get("feature") or "").startswith(("digitalizacion", "evaluacion_digitalizar")) else "grading"
        logger.info(event, extra={
            "grading_id": self.tracking.get("calificacion_id"), "entrega_id": self.tracking.get("entrega_id"),
            "model": model, "provider": provider, "duration_ms": duration,
            "page": page, "size_bytes": size, "retry_count": attempt - 1, "error_code": error,
            "http_status": http_status,
            "total_pages": getattr(self, "_total_pages", None),
        })
        await log_ai_usage(
            request_id=request_id, pipeline_run_id=self.tracking.get("pipeline_run_id"),
            calificacion_id=self.tracking.get("calificacion_id"), evaluacion_id=self.tracking.get("evaluacion_id"),
            feature=feature, stage="extraction", provider=provider, model=model,
            attempt_number=attempt, status=status, latency_ms=duration,
            input_tokens=(usage or {}).get("prompt_tokens"), output_tokens=(usage or {}).get("completion_tokens"),
            image_count=1, error_code=error,
            routing_origin=(selection or {}).get("credential_source"),
            config_hash=snapshot.get("config_hash"),
            config_version=snapshot.get("teacher_config_version") or snapshot.get("global_config_version"),
            fallback_used=fallback_used,
        )

    async def _one(self, item: tuple[int, bytes, str, bool], total: int, blueprint: dict, purpose: str) -> VisionPageResult:
        snapshot = self.tracking.get("_ai_config") or {}
        if snapshot.get("feature") == "calificacion.extraccion" or self.tracking.get("_require_configured_route"):
            return await self._managed_one(item, total, blueprint, purpose)
        page, prepared_data, prepared_mime, allow_rotation = item
        models = [self.primary_model]
        snapshot = self.tracking.get("_ai_config") or {}
        configured = (snapshot.get("primary") or {}).get("runtime_profile")
        selections = [s for s in (snapshot.get("primary"), snapshot.get("fallback")) if s and s.get("runtime_profile")]
        if not configured and self.provider == "open_code" and settings.VISION_FALLBACK_ENABLED:
            models.extend(settings.vision_fallback_models)
        routes = [(str(s["model"]), s) for s in selections] if configured else [(m, None) for m in dict.fromkeys(models)]
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
            for model_index, (model, selection) in enumerate(routes):
                connection = (selection or {}).get("connection") or {}
                retries = min(5, max(0, int(connection.get("max_retries", 1)))) if selection else settings.VISION_MAX_RETRIES
                for attempt in range(1, retries + 2):
                    started, request_id = time.monotonic(), str(uuid4())
                    response = None
                    event_route = {"selection": selection, "fallback_used": model_index > 0}
                    await self._event("vision.request_started", request_id, model, attempt, started, page, len(data), "started", **event_route)
                    try:
                        encoded_image = base64.b64encode(data).decode()
                        prompt = self._prompt(blueprint, page, total, purpose)
                        if selection:
                            from app.db.session import AsyncSessionLocal
                            from app.services.ai_credentials_service import resolve_api_credential
                            from app.services.ai_api_connections import call_configured_api
                            if selection.get("credential_source") == "teacher":
                                key = self.api_key
                            else:
                                async with AsyncSessionLocal() as credential_db:
                                    key = await resolve_api_credential(credential_db, selection.get("connection") or {})
                            async with provider_capacity():
                                payload = await call_configured_api(selection, key, [{"role": "user", "content": [
                                    {"type": "text", "text": prompt},
                                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{encoded_image}", "detail": "high"}},
                                ]}], max_tokens=settings.VISION_MAX_TOKENS, json_mode=True, timeout=min(300, max(5, float(connection.get("timeout_seconds") or 120))), session_id=self._session_id)
                            content = payload["choices"][0]["message"]["content"]
                            usage, http_status = payload.get("usage") or {}, 200
                        elif self.provider == "ollama":
                            payload = {}
                            for key in keys:
                                provider = OllamaCloudProvider(
                                    key,
                                    base_url=settings.OLLAMA_CLOUD_BASE_URL,
                                    timeout_seconds=settings.VISION_TIMEOUT_SECONDS,
                                )
                                async with provider_capacity():
                                    payload = await provider.chat(
                                        model=model,
                                        messages=[{
                                            "role": "user",
                                            "content": prompt,
                                            "images": [encoded_image],
                                        }],
                                        options={
                                            "temperature": 0,
                                            "num_predict": settings.VISION_MAX_TOKENS,
                                        },
                                    )
                                break
                            content = str((payload.get("message") or {}).get("content") or payload.get("response") or "")
                            usage = {
                                "prompt_tokens": payload.get("prompt_eval_count"),
                                "completion_tokens": payload.get("eval_count"),
                            }
                            http_status = 200
                        else:
                            body = {
                                "model": model,
                                "temperature": 0,
                                "max_tokens": settings.VISION_MAX_TOKENS,
                                "response_format": {"type": "json_object"},
                                "messages": [{"role": "user", "content": [
                                    {"type": "text", "text": prompt},
                                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{encoded_image}"}},
                                ]}],
                            }
                            if model.rsplit("/", 1)[-1].lower() == "deepseek-v4-flash-vision-exp":
                                body["thinking"] = {"type": "disabled"}
                            timeout = httpx.Timeout(
                                connect=settings.AI_PROVIDER_CONNECT_TIMEOUT_SECONDS,
                                read=settings.VISION_TIMEOUT_SECONDS,
                                write=settings.AI_PROVIDER_WRITE_TIMEOUT_SECONDS,
                                pool=settings.AI_PROVIDER_POOL_TIMEOUT_SECONDS,
                            )
                            async with httpx.AsyncClient(timeout=timeout) as client:
                                for key_index, key in enumerate(keys):
                                    async with provider_capacity():
                                        response = await client.post(
                                            f"{self.base_url}/chat/completions",
                                            headers=opencode_headers(
                                                key,
                                                session_id=self._session_id,
                                            ),
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
                            content = payload["choices"][0]["message"]["content"]
                            usage = payload.get("usage") or {}
                            http_status = response.status_code
                        parsing_started = time.monotonic()
                        raw, repaired = _parse_json(content)
                        result = _normalize(raw, page, len(data))
                        for answer in result.answers:
                            answer.regions = rotate_answer_regions(answer.regions, rotation)
                        result.duration_ms = int((time.monotonic() - started) * 1000)
                        result.model = model
                        result.provider = str(selection.get("provider")) if selection else self.provider
                        result.fallback_used = model_index > 0
                        result.rotation_applied = rotation
                        result.parsing_ms = int((time.monotonic() - parsing_started) * 1000)
                        if not result.page_text and not result.answers:
                            last_error = "vision_no_content"
                            try_next_orientation = True
                            await self._event(
                                "vision.request_failed", request_id, model, attempt,
                                started, page, len(data), "failed", last_error,
                                usage=usage, http_status=http_status, **event_route,
                            )
                            break
                        expects_student_answers = bool(
                            purpose == "student_response"
                            and isinstance(blueprint, dict)
                            and blueprint.get("preguntas")
                            and not (total > 1 and result.page_role == "reading" and not result.answers)
                        )
                        has_student_answer = any(
                            bool((answer.answer or "").strip())
                            or bool((answer.visual_description or "").strip())
                            for answer in result.answers
                        )
                        if expects_student_answers and not has_student_answer:
                            last_error = "vision_no_student_answers"
                            await self._event(
                                "vision.request_failed", request_id, model, attempt,
                                started, page, len(data), "failed", last_error,
                                usage=usage, http_status=http_status, **event_route,
                            )
                            # Texto impreso sin respuestas no es éxito. Primero prueba
                            # otro lector visual; si se agotan, devuelve incertidumbre
                            # explícita para impedir que se convierta en un cero.
                            if model_index + 1 < len(routes):
                                break
                            result.status = "requires_review"
                            result.warnings.append(
                                "Se reconoció el material impreso, pero no fue posible "
                                "recuperar respuestas del estudiante."
                            )
                            result.page_text = ""
                            return result
                        if repaired:
                            result.warnings.append("JSON reparado localmente una sola vez.")
                        if rotation:
                            result.warnings.append(f"Orientación corregida automáticamente ({rotation:+d}°).")
                        await self._event(
                            "vision.request_completed", request_id, model, attempt,
                            started, page, len(data), "success",
                            usage=usage, http_status=http_status, **event_route,
                        )
                        return result
                    except VisionExtractionError as exc:
                        last_error = exc.code
                        retry = exc.temporary and attempt <= retries
                    except RETRYABLE_ERRORS as exc:
                        last_error = "vision_timeout" if isinstance(exc, httpx.TimeoutException) else "vision_transport"
                        retry = attempt <= retries
                    except httpx.HTTPStatusError as exc:
                        response = exc.response
                        last_error = f"vision_http_{response.status_code}"
                        retry = response.status_code in RETRYABLE_HTTP and attempt <= retries
                    except OllamaProviderError as exc:
                        last_error = "vision_provider_failed"
                        retry = exc.temporary and attempt <= retries
                    except Exception:
                        last_error, retry = "vision_invalid_schema", False
                    await self._event(
                        "vision.retry" if retry else "vision.request_failed",
                        request_id, model, attempt, started, page, len(data),
                        "retry" if retry else "failed", last_error,
                        http_status=response.status_code if response is not None else None,
                        **event_route,
                    )
                    if retry:
                        await asyncio.sleep(min(0.5 * attempt, 2))
                        continue
                    break
                if try_next_orientation:
                    break
                if model_index + 1 < len(routes):
                    logger.warning("vision.fallback", extra={
                        "primary_model": routes[0][0],
                        "fallback_model": routes[model_index + 1][0],
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

    async def _managed_one(
        self, item, total: int, blueprint: dict, purpose: str
    ) -> VisionPageResult:
        from app.db.session import AsyncSessionLocal
        from app.services.ai_api_connections import call_configured_api
        from app.services.ai_api_transport import APIOutputError
        from app.services.ai_credentials_service import (
            get_teacher_ai_credential,
            resolve_api_credential,
        )
        from app.services.vision_route_policy import effective_runtime_limits

        page, data, mime, _allow_rotation = item
        snapshot = self.tracking.get("_ai_config") or {}
        operation_started = time.monotonic()
        try:
            limits = effective_runtime_limits(snapshot.get("runtime_limits"))
        except ValueError:
            return VisionPageResult(
                page=page,
                status="failed_permanent",
                error_code="vision_limits_invalid",
                size_bytes=len(data),
            )
        routes = [
            value
            for value in (snapshot.get("primary"), snapshot.get("fallback"))
            if isinstance(value, dict) and value
        ]
        if (
            not routes
            or not isinstance(snapshot.get("primary"), dict)
            or not (snapshot["primary"].get("model"))
        ):
            return VisionPageResult(
                page=page,
                status="failed_permanent",
                error_code="vision_route_not_ready",
                size_bytes=len(data),
            )
        route_index, last_error, temporary = 0, "vision_route_not_ready", False
        selected = routes[0]
        for attempt in range(1, limits.max_attempts + 1):
            selected = routes[route_index]
            model = str(selected.get("model") or "")
            provider_id = str(selected.get("provider") or "")
            if (
                not model
                or selected.get("available") is False
                or (not selected.get("runtime_profile") and provider_id != "ollama")
                or (
                    selected.get("runtime_profile")
                    and "vision" not in selected.get("capabilities", [])
                )
            ):
                last_error, temporary = "vision_route_not_ready", False
            else:
                started, request_id = time.monotonic(), str(uuid4())
                usage, http_status, temporary = {}, None, False
                event_route = {"selection": selected, "fallback_used": route_index > 0}
                await self._event(
                    "vision.request_started",
                    request_id,
                    model,
                    attempt,
                    started,
                    page,
                    len(data),
                    "started",
                    **event_route,
                )
                try:
                    connection = selected.get("connection") or {}
                    try:
                        async with AsyncSessionLocal() as credential_db:
                            if selected.get("credential_source") == "teacher":
                                teacher_id = self.tracking.get("teacher_id")
                                if not teacher_id:
                                    raise VisionExtractionError("vision_auth_missing")
                                from uuid import UUID

                                key = await get_teacher_ai_credential(
                                    credential_db,
                                    teacher_id=UUID(str(teacher_id)),
                                    provider_id=provider_id,
                                )
                            else:
                                key = await resolve_api_credential(
                                    credential_db, connection
                                )
                    except ValueError as exc:
                        raise VisionExtractionError("vision_auth_failed") from exc
                    if not key:
                        raise VisionExtractionError("vision_auth_missing")
                    encoded = base64.b64encode(data).decode()
                    prompt = self._prompt(blueprint, page, total, purpose)
                    async with provider_capacity(strict=True):
                        async with asyncio.timeout(limits.call_timeout_seconds):
                            if selected.get("runtime_profile"):
                                payload = await call_configured_api(
                                    selected,
                                    key,
                                    [
                                        {
                                            "role": "user",
                                            "content": [
                                                {"type": "text", "text": prompt},
                                                {
                                                    "type": "image_url",
                                                    "image_url": {
                                                        "url": f"data:{mime};base64,{encoded}",
                                                        "detail": "high",
                                                    },
                                                },
                                            ],
                                        }
                                    ],
                                    max_tokens=limits.max_output_tokens,
                                    json_mode=True,
                                    timeout=limits.call_timeout_seconds,
                                    session_id=self._session_id,
                                )
                                usage, http_status = payload.get("usage") or {}, 200
                                choice = (payload.get("choices") or [{}])[0]
                                if choice.get("finish_reason") in {
                                    "length",
                                    "max_tokens",
                                }:
                                    raise VisionExtractionError(
                                        "vision_output_truncated"
                                    )
                                content = (choice.get("message") or {}).get("content")
                            else:
                                native = OllamaCloudProvider(
                                    key,
                                    base_url=connection.get("base_url")
                                    or settings.OLLAMA_CLOUD_BASE_URL,
                                    timeout_seconds=limits.call_timeout_seconds,
                                )
                                payload = await native.chat(
                                    model=model,
                                    messages=[
                                        {
                                            "role": "user",
                                            "content": prompt,
                                            "images": [encoded],
                                        }
                                    ],
                                    options={
                                        "temperature": 0,
                                        "num_predict": limits.max_output_tokens,
                                    },
                                )
                                if payload.get("done_reason") == "length":
                                    raise VisionExtractionError(
                                        "vision_output_truncated"
                                    )
                                content = str(
                                    (payload.get("message") or {}).get("content")
                                    or payload.get("response")
                                    or ""
                                )
                                usage = {
                                    "prompt_tokens": payload.get("prompt_eval_count"),
                                    "completion_tokens": payload.get("eval_count"),
                                }
                                http_status = 200
                    raw, repaired = _parse_json(content)
                    result = _normalize(raw, page, len(data))
                    if not result.page_text and not result.answers:
                        raise VisionExtractionError("vision_no_content")
                    has_answer = any(
                        bool(
                            (answer.answer or "").strip()
                            or (answer.visual_description or "").strip()
                        )
                        for answer in result.answers
                    )
                    if (
                        purpose == "student_response"
                        and blueprint.get("preguntas")
                        and not has_answer
                        and not (total > 1 and result.page_role == "reading")
                    ):
                        raise VisionExtractionError("vision_no_student_answers")
                    result.duration_ms = int(
                        (time.monotonic() - operation_started) * 1000
                    )
                    result.model, result.provider, result.fallback_used = (
                        model,
                        provider_id,
                        route_index > 0,
                    )
                    if repaired:
                        result.warnings.append("JSON reparado localmente una sola vez.")
                    await self._event(
                        "vision.request_completed",
                        request_id,
                        model,
                        attempt,
                        started,
                        page,
                        len(data),
                        "success",
                        usage=usage,
                        http_status=http_status,
                        **event_route,
                    )
                    return result
                except VisionExtractionError as exc:
                    last_error, temporary = exc.code, exc.temporary
                except APIOutputError as exc:
                    last_error = (
                        "vision_output_truncated"
                        if exc.code == "output_budget_exhausted"
                        else "vision_output_incomplete"
                    )
                    usage = {
                        "prompt_tokens": exc.input_tokens,
                        "completion_tokens": exc.output_tokens,
                    }
                except ProviderCapacityUnavailable:
                    last_error, temporary = "capacity_unavailable", True
                except (httpx.TimeoutException, TimeoutError):
                    last_error, temporary = "vision_timeout", True
                except (httpx.NetworkError, httpx.RemoteProtocolError):
                    last_error, temporary = "vision_transport", True
                except httpx.HTTPStatusError as exc:
                    http_status = exc.response.status_code
                    last_error, temporary = (
                        f"vision_http_{http_status}",
                        http_status in RETRYABLE_HTTP,
                    )
                except OllamaProviderError as exc:
                    last_error, temporary = "vision_provider_failed", exc.temporary
                except Exception:
                    last_error, temporary = "vision_invalid_schema", False
                another = attempt < limits.max_attempts and (
                    route_index == 0 and len(routes) > 1 or temporary
                )
                await self._event(
                    "vision.request_failed",
                    request_id,
                    model,
                    attempt,
                    started,
                    page,
                    len(data),
                    "retry" if another else "failed",
                    last_error,
                    usage=usage,
                    http_status=http_status,
                    **event_route,
                )
            if route_index == 0 and len(routes) > 1:
                route_index = 1
            elif not temporary:
                break
        return VisionPageResult(
            page=page,
            status="failed_temporary" if temporary else "failed_permanent",
            size_bytes=len(data),
            error_code=last_error,
            model=str(selected.get("model") or ""),
            provider=str(selected.get("provider") or ""),
            fallback_used=len(routes) > 1 and selected is routes[1],
            duration_ms=int((time.monotonic() - operation_started) * 1000),
            warnings=["Página no extraída automáticamente."],
        )

    async def extract(self, content: bytes, mime: str, *, blueprint: dict | None = None, purpose: Literal["student_response", "evaluation_document"] = "student_response", canonical_pages: CanonicalEvidencePages | None = None) -> VisionExtraction:
        started = time.monotonic()
        preparation_started = time.monotonic()
        if canonical_pages is not None and purpose != "student_response":
            raise VisionExtractionError("vision_invalid_file")
        prepared = _pages(content, mime, **({"canonical_pages": canonical_pages} if canonical_pages is not None else {}))
        preparation_ms = int((time.monotonic() - preparation_started) * 1000)
        self._total_pages = len(prepared)
        semaphore = asyncio.Semaphore(max(1, settings.VISION_MAX_CONCURRENCY))
        async def run(item: tuple[int, bytes, str, bool]) -> VisionPageResult:
            async with semaphore:
                return await self._one(item, len(prepared), blueprint or {}, purpose)
        tasks = [asyncio.create_task(run(item)) for item in prepared]
        try:
            _, pending = await asyncio.wait(tasks, timeout=max(1, settings.VISION_TOTAL_TIMEOUT_SECONDS))
        finally:
            unfinished = [task for task in tasks if not task.done()]
            for task in unfinished:
                task.cancel()
            if unfinished:
                await asyncio.gather(*unfinished, return_exceptions=True)
        gathered = [
            VisionPageResult(page=item[0], status="failed_temporary", error_code="vision_timeout",
                             warnings=["La lectura de esta página tardó demasiado; puede reintentarse."])
            if task in pending else task.result()
            for item, task in zip(prepared, tasks, strict=True)
        ]
        results = sorted(gathered, key=lambda item: item.page)
        success = [item for item in results if item.status in {"extracted", "requires_review"}]
        if not success:
            temporary = any(item.status == "failed_temporary" for item in results)
            raise VisionExtractionError("vision_failed_temporary" if temporary else "vision_failed_permanent", temporary)
        answers, failures = _merge(success), [item for item in results if item not in success]
        snapshot = self.tracking.get("_ai_config") or {}
        if failures and (snapshot.get("feature") == "calificacion.extraccion" or self.tracking.get("_require_configured_route")):
            raise VisionExtractionError("vision_incomplete_pages", any(item.status == "failed_temporary" for item in failures))
        warnings = [warning for item in results for warning in item.warnings]
        graphic_uncertain_questions: list[int | str] = []
        if purpose == "student_response":
            for number in _graphic_question_numbers(blueprint or {}):
                matching = [
                    answer for answer in answers
                    if str(answer.question_number) == str(number)
                ]
                if any(answer.visual_description for answer in matching):
                    continue
                graphic_uncertain_questions.append(number)
                for answer in matching:
                    answer.blank = False
                    answer.needs_review = True
                for page_result in results:
                    affected = False
                    for page_answer in page_result.answers:
                        if str(page_answer.question_number) == str(number):
                            page_answer.blank = False
                            page_answer.needs_review = True
                            affected = True
                    if affected:
                        page_result.status = "requires_review"
                warnings.append(
                    f"No se pudo confirmar la evidencia gráfica de la pregunta {number}; revisión docente necesaria."
                )
        if failures:
            warnings.append("Faltan páginas; revisión docente obligatoria.")
        fallback = next((item for item in results if item.fallback_used), None)
        return VisionExtraction(
            source_fingerprint=canonical_pages.fingerprint if canonical_pages is not None else hashlib.sha256(content).hexdigest(),
            student_detected=any(
                answer.answer is not None or answer.visual_description is not None
                for answer in answers
            ),
            document_quality=round(sum(item.document_quality for item in success) / len(success), 4),
            pages_processed=len(results), answers=answers, pages=results, warnings=warnings,
            graphic_uncertain_questions=graphic_uncertain_questions,
            requires_review=(
                bool(failures or graphic_uncertain_questions)
                or any(item.status == "requires_review" for item in results)
                or any(answer.needs_review for answer in answers)
            ),
            provider="opencode" if (fallback.provider if fallback else self.provider) == "open_code" else (fallback.provider if fallback else self.provider),
            primary_model=self.primary_model, fallback_used=fallback is not None,
            rotation_applied=next((item.rotation_applied for item in success if item.rotation_applied), 0),
            fallback_model=fallback.model if fallback else None,
            failure_reason=failures[0].error_code if failures else None,
            duration_ms=int((time.monotonic() - started) * 1000),
            preparation_ms=preparation_ms,
            parsing_ms=sum(item.parsing_ms for item in results),
        )
