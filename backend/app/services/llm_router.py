"""LLM router with provider cascade and structured local fallbacks."""
from __future__ import annotations

import asyncio
import json
import time
from typing import Any
from uuid import UUID

import httpx
from groq import AsyncGroq

from app.core.config import settings
from app.core.logging import get_logger
from app.modules.analytics.usage_logger import log_ai_usage
from app.services.ai_credentials_service import get_effective_ai_credentials
from app.shared.enums import LLMProvider

logger = get_logger(__name__)

OPEN_CODE_MAX_ATTEMPTS = 3
OPEN_CODE_RETRYABLE_STATUS_CODES = frozenset({408, 425, 429, 500, 502, 503, 504})
OPEN_CODE_RETRY_BASE_SECONDS = 0.5
OPEN_CODE_RETRY_MAX_SECONDS = 10.0
OPEN_CODE_ANTHROPIC_MODEL_PREFIXES = ("qwen", "minimax-m")


def _open_code_uses_messages_api(model: str) -> bool:
    model_id = model.rsplit("/", 1)[-1].lower()
    return model_id.startswith(OPEN_CODE_ANTHROPIC_MODEL_PREFIXES)


def _messages_response_text(data: dict[str, Any]) -> str:
    content = data.get("content") or []
    if isinstance(content, str):
        return content
    return "".join(
        str(block.get("text") or "")
        for block in content
        if isinstance(block, dict) and block.get("type") == "text"
    )


def _open_code_retry_delay_seconds(
    attempt_number: int,
    response: httpx.Response,
) -> float:
    retry_after = response.headers.get("Retry-After")
    if retry_after:
        try:
            return min(
                max(float(retry_after), 0.0),
                OPEN_CODE_RETRY_MAX_SECONDS,
            )
        except ValueError:
            pass
    exponential = OPEN_CODE_RETRY_BASE_SECONDS * (
        2 ** max(attempt_number - 1, 0)
    )
    return min(exponential, OPEN_CODE_RETRY_MAX_SECONDS)


class LLMRouter:
    """Cascade through configured LLM providers, then use a safe local template."""

    def __init__(self, user_id: UUID | None = None) -> None:
        self._user_id = user_id
        self._tracking: dict = {}
        self._credentials = {
            "open_code": getattr(settings, "OPEN_CODE_API_KEY", ""),
            "groq": getattr(settings, "GROQ_API_KEY", ""),
        }
        self._provider_configs: dict[str, dict[str, Any]] = {}

    async def generate_json(
        self,
        task_type: str,
        prompt: str,
        schema: dict | None = None,
    ) -> dict[str, Any]:
        raw = await self._generate_raw(task_type, prompt, json_mode=True)
        return self._parse_json(raw, task_type)

    def set_tracking(self, **kwargs) -> None:
        """Establece metadatos de tracking para logging de uso."""
        self._tracking.update(kwargs)

    async def generate_text(self, task_type: str, prompt: str) -> str:
        return await self._generate_raw(task_type, prompt, json_mode=False)

    async def _generate_raw(
        self,
        task_type: str,
        prompt: str,
        json_mode: bool,
    ) -> str:
        # Build dynamic provider cascade from admin config
        providers = await self._load_providers(task_type)

        for provider, fn in providers:
            try:
                logger.debug("LLM call via %s for task '%s'", provider, task_type)
                start = time.monotonic()
                result = await fn(prompt, json_mode)
                ms = int((time.monotonic() - start) * 1000)
                logger.info("LLM ok via %s (%dms) task=%s", provider, ms, task_type)
                return result
            except Exception as exc:  # noqa: BLE001
                logger.warning("LLM provider %s failed: %s", provider, exc)

        if task_type == "evaluacion_digitalizar":
            raise RuntimeError("OpenCode no pudo completar la digitalización")
        logger.error("All LLM providers failed for task '%s'; using safe template", task_type)
        return self._safe_template(task_type)

    async def _load_providers(self, task_type: str) -> list[tuple[str, Any]]:
        """Load provider cascade dynamically from DB config, fallback to defaults."""
        ordered = []
        if task_type == "evaluacion_digitalizar":
            self._provider_configs[LLMProvider.OPEN_CODE.value] = {
                "model": settings.OPEN_CODE_DIGITALIZATION_MODEL,
                "timeout_seconds": settings.OPEN_CODE_DIGITALIZATION_TIMEOUT_SECONDS,
            }
        try:
            from app.db.session import AsyncSessionLocal
            from app.services.ai_config_service import AIConfigService
            async with AsyncSessionLocal() as db:
                svc = AIConfigService(db=db)
                await svc.init()
                feature = await svc.get_feature_config(task_type)
                text_providers = await svc.get_text_providers()
                credentials = await get_effective_ai_credentials(db)
                self._credentials = {
                    "open_code": credentials.open_code_key,
                    "groq": credentials.groq_key,
                }
                self._provider_configs = {str(item["id"]): item for item in text_providers}
                if task_type == "evaluacion_digitalizar":
                    document_provider = self._provider_configs.setdefault(
                        LLMProvider.OPEN_CODE.value, {}
                    )
                    document_provider["model"] = settings.OPEN_CODE_DIGITALIZATION_MODEL
                    document_provider[
                        "timeout_seconds"
                    ] = settings.OPEN_CODE_DIGITALIZATION_TIMEOUT_SECONDS

                # Student/teacher documents are restricted to OpenCode only.
                if task_type == "evaluacion_digitalizar":
                    for provider in text_providers:
                        if provider["id"] == LLMProvider.OPEN_CODE.value and provider["active"]:
                            ordered.append((provider["id"], self._call_open_code))
                            break
                    return ordered

                # Build ordered list from configured providers
                seen = set()
                primary = feature.get("primary_provider", "")
                fallback = feature.get("fallback_provider", "")

                # Primary first
                if primary:
                    for tp in text_providers:
                        if tp["id"] == primary and tp["active"]:
                            f = self._call_for_provider(tp["id"])
                            if f:
                                ordered.append((tp["id"], f))
                                seen.add(tp["id"])
                                break

                # Then fallback
                if fallback:
                    for tp in text_providers:
                        if tp["id"] == fallback and tp["id"] not in seen and tp["active"]:
                            f = self._call_for_provider(tp["id"])
                            if f:
                                ordered.append((tp["id"], f))
                                seen.add(tp["id"])
                                break
                # Then remaining by priority.
                for tp in text_providers:
                    if tp["id"] not in seen and tp["active"] and tp["id"] != "template":
                        f = self._call_for_provider(tp["id"])
                        if f:
                            ordered.append((tp["id"], f))
                            seen.add(tp["id"])

                # Template always last
                for tp in text_providers:
                    if tp["id"] == "template" and tp["id"] not in seen and tp["active"]:
                        f = self._call_for_provider(tp["id"])
                        if f:
                            ordered.append((tp["id"], f))
                            break
        except Exception as exc:
            logger.debug("Cannot load admin config for providers: %s; using defaults", exc)

        # Fallback to hardcoded defaults
        if not ordered:
            if task_type == "evaluacion_digitalizar":
                ordered = [(LLMProvider.OPEN_CODE.value, self._call_open_code)]
            else:
                ordered = [
                    (LLMProvider.OPEN_CODE.value, self._call_open_code),
                    (LLMProvider.GROQ.value, self._call_groq),
                    (LLMProvider.OLLAMA.value, self._call_ollama),
                ]
        if task_type == "grading_photo":
            ordered.sort(
                key=lambda item: 0
                if item[0] == LLMProvider.GROQ.value
                else 1
            )
        return ordered

    async def _template_call(self, prompt: str, json_mode: bool) -> str:
        return self._safe_template("fallback")

    def _call_for_provider(self, provider_id: str) -> Any | None:
        if provider_id == LLMProvider.OPEN_CODE.value:
            return self._call_open_code
        if provider_id == LLMProvider.GROQ.value:
            return self._call_groq
        if provider_id == LLMProvider.OLLAMA.value:
            return self._call_ollama
        if provider_id == "template":
            return self._template_call
        return None

    async def _call_open_code(self, prompt: str, json_mode: bool) -> str:
        api_key = self._credentials.get("open_code", "")
        config = self._provider_configs.get(LLMProvider.OPEN_CODE.value, {})
        if not api_key:
            raise ValueError("OPEN_CODE_API_KEY not configured")
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        model = config.get("model") or getattr(settings, "OPEN_CODE_MODEL", "deepseek-v4-flash")
        body: dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1 if json_mode else 0.3,
        }
        use_messages_api = _open_code_uses_messages_api(model)
        if use_messages_api:
            body["max_tokens"] = int(
                config.get("max_tokens")
                or getattr(settings, "OPEN_CODE_DIGITALIZATION_MAX_TOKENS", 3072)
            )
            headers = {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            }
            endpoint = "messages"
        else:
            if json_mode:
                body["response_format"] = {"type": "json_object"}
            endpoint = "chat/completions"
        timeout = config.get("timeout_seconds") or getattr(settings, "OPEN_CODE_TIMEOUT_SECONDS", 45)
        base_url = str(config.get("base_url") or settings.OPEN_CODE_BASE_URL).rstrip("/")
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                for attempt in range(1, OPEN_CODE_MAX_ATTEMPTS + 1):
                    resp = await client.post(
                        f"{base_url}/{endpoint}",
                        headers=headers,
                        json=body,
                    )
                    should_retry = (
                        resp.status_code in OPEN_CODE_RETRYABLE_STATUS_CODES
                        and attempt < OPEN_CODE_MAX_ATTEMPTS
                    )
                    if should_retry:
                        delay = _open_code_retry_delay_seconds(attempt, resp)
                        logger.warning(
                            "OpenCode transient HTTP %s; retry %d/%d in %.2fs",
                            resp.status_code,
                            attempt + 1,
                            OPEN_CODE_MAX_ATTEMPTS,
                            delay,
                        )
                        await asyncio.sleep(delay)
                        continue
                    resp.raise_for_status()
                    break
                data = resp.json()
                ms = int((time.monotonic() - start) * 1000)
                usage = data.get("usage", {}) or {}
                await log_ai_usage(
                    feature="content_generation",
                    provider="opencode",
                    model=model,
                    status="success",
                    latency_ms=ms,
                    input_tokens=usage.get("input_tokens") or usage.get("prompt_tokens"),
                    output_tokens=usage.get("output_tokens") or usage.get("completion_tokens"),
                    **self._tracking,
                )
                if use_messages_api:
                    return _messages_response_text(data)
                return data["choices"][0]["message"]["content"]
        except httpx.TimeoutException:
            ms = int((time.monotonic() - start) * 1000)
            await log_ai_usage(feature="content_generation", provider="opencode", model=model, status="timeout", latency_ms=ms, error_code="provider_timeout", **self._tracking)
            raise
        except Exception as exc:
            ms = int((time.monotonic() - start) * 1000)
            await log_ai_usage(feature="content_generation", provider="opencode", model=model, status="failed", latency_ms=ms, error_code=str(exc)[:60], **self._tracking)
            raise

    async def _call_groq(self, prompt: str, json_mode: bool) -> str:
        api_key = self._credentials.get("groq", "")
        config = self._provider_configs.get(LLMProvider.GROQ.value, {})
        if not api_key:
            raise ValueError("GROQ_API_KEY not configured")
        kwargs: dict[str, Any] = {
            "model": config.get("model") or getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile"),
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "timeout": config.get("timeout_seconds") or getattr(settings, "GROQ_TIMEOUT_SECONDS", 30),
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        client = AsyncGroq(api_key=api_key)
        resp = await client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content or ""

    async def _call_ollama(self, prompt: str, json_mode: bool) -> str:
        endpoint = getattr(settings, "OLLAMA_ENDPOINT", "http://ollama:11434")
        model = getattr(settings, "OLLAMA_MODEL", "llama3.1:8b")
        body: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": False,
        }
        if json_mode:
            body["format"] = "json"
        timeout = getattr(settings, "OLLAMA_TIMEOUT_SECONDS", 120)
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(f"{endpoint}/api/generate", json=body)
            resp.raise_for_status()
            return resp.json().get("response", "")

    @staticmethod
    def _parse_json(raw: str, task_type: str) -> dict[str, Any]:
        raw = raw.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1]) if len(lines) > 2 else raw
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            logger.error("Invalid JSON from LLM for task '%s': %.200s", task_type, raw)
            return {"error": "invalid_json", "raw": raw[:500]}

    @staticmethod
    def _safe_template(task_type: str) -> str:
        if task_type == "xali_evaluacion_post_entrega":
            return (
                "Puedo ayudarte a revisar tu evaluacion desde una mirada formativa: identifica que parte de tu "
                "respuesta quedo incompleta, compara tu razonamiento con los criterios vistos en clase y repasa "
                "el concepto relacionado antes de la proxima actividad. No puedo cambiar tu nota ni reemplazar "
                "la retroalimentacion docente. La IA te orienta, pero tu docente es quien valida y acompaña tu proceso."
            )
        templates: dict[str, dict[str, Any]] = {
            "presentacion": {
                "title": "Presentacion educativa",
                "slides": [
                    {
                        "title": "Proposito de la clase",
                        "bullets": [
                            "Reconocer el tema central.",
                            "Relacionar el tema con experiencias previas.",
                        ],
                        "image": "Aula con estudiantes observando ejemplos del tema.",
                        "notes": "Inicia con una pregunta diagnostica breve.",
                    },
                    {
                        "title": "Conceptos clave",
                        "bullets": [
                            "Identificar vocabulario esencial.",
                            "Explicar cada concepto con un ejemplo cercano.",
                        ],
                        "image": "Infografia escolar con conceptos conectados.",
                        "notes": "Pide a los estudiantes proponer ejemplos.",
                    },
                    {
                        "title": "Ejemplo guiado",
                        "bullets": [
                            "Observar una situacion concreta.",
                            "Describir evidencias y sacar conclusiones.",
                        ],
                        "image": "Docente guiando una actividad en grupo.",
                        "notes": "Modela el razonamiento paso a paso.",
                    },
                    {
                        "title": "Actividad de aplicacion",
                        "bullets": [
                            "Resolver una tarea corta en parejas.",
                            "Registrar respuestas en el cuaderno.",
                        ],
                        "image": "Estudiantes trabajando colaborativamente.",
                        "notes": "Acompana a quienes necesiten apoyo.",
                    },
                    {
                        "title": "Cierre",
                        "bullets": [
                            "Compartir una conclusion.",
                            "Responder una pregunta de salida.",
                        ],
                        "image": "Grupo compartiendo conclusiones al final de clase.",
                        "notes": "Usa las respuestas para planear refuerzo.",
                    },
                ],
            },
            "sopa_letras": {
                "titulo": "Sopa de letras",
                "instrucciones": "Encuentra las palabras del banco y relaciona cada una con el tema estudiado.",
                "grilla": [
                    ["L", "U", "Z", "A", "G", "U", "A", "S", "O", "L"],
                    ["S", "O", "M", "B", "R", "A", "T", "I", "E", "R"],
                    ["O", "P", "A", "C", "O", "N", "E", "N", "E", "A"],
                    ["E", "S", "P", "E", "J", "O", "R", "V", "R", "I"],
                    ["V", "I", "D", "R", "I", "O", "I", "E", "G", "R"],
                    ["C", "I", "E", "N", "C", "I", "A", "S", "I", "E"],
                    ["M", "A", "T", "E", "R", "I", "A", "L", "A", "S"],
                    ["F", "U", "E", "R", "Z", "A", "S", "U", "N", "A"],
                    ["S", "O", "N", "I", "D", "O", "L", "N", "T", "E"],
                    ["V", "I", "V", "O", "S", "A", "I", "R", "E", "S"],
                ],
                "palabras": [
                    {"palabra": "LUZ", "fila": 0, "col": 0, "direccion": "horizontal"},
                    {"palabra": "SOMBRA", "fila": 1, "col": 0, "direccion": "horizontal"},
                    {"palabra": "OPACO", "fila": 2, "col": 0, "direccion": "horizontal"},
                    {"palabra": "ESPEJO", "fila": 3, "col": 0, "direccion": "horizontal"},
                    {"palabra": "VIDRIO", "fila": 4, "col": 0, "direccion": "horizontal"},
                ],
                "banco_palabras": ["LUZ", "SOMBRA", "OPACO", "ESPEJO", "VIDRIO"],
                "sopa_letras": {
                    "grid": [
                        ["L", "U", "Z", "A", "G", "U", "A", "S", "O", "L"],
                        ["S", "O", "M", "B", "R", "A", "T", "I", "E", "R"],
                        ["O", "P", "A", "C", "O", "N", "E", "N", "E", "A"],
                        ["E", "S", "P", "E", "J", "O", "R", "V", "R", "I"],
                        ["V", "I", "D", "R", "I", "O", "I", "E", "G", "R"],
                        ["C", "I", "E", "N", "C", "I", "A", "S", "I", "E"],
                        ["M", "A", "T", "E", "R", "I", "A", "L", "A", "S"],
                        ["F", "U", "E", "R", "Z", "A", "S", "U", "N", "A"],
                        ["S", "O", "N", "I", "D", "O", "L", "N", "T", "E"],
                        ["V", "I", "V", "O", "S", "A", "I", "R", "E", "S"],
                    ],
                    "palabras": [
                        {"palabra": "LUZ", "fila": 0, "col": 0, "direccion": "horizontal"},
                        {"palabra": "SOMBRA", "fila": 1, "col": 0, "direccion": "horizontal"},
                        {"palabra": "OPACO", "fila": 2, "col": 0, "direccion": "horizontal"},
                        {"palabra": "ESPEJO", "fila": 3, "col": 0, "direccion": "horizontal"},
                        {"palabra": "VIDRIO", "fila": 4, "col": 0, "direccion": "horizontal"},
                    ],
                    "size": 10,
                },
            },
            "crucigrama": {
                "titulo": "Crucigrama de ciencias",
                "instrucciones": "Lee cada pista y escribe el concepto cientifico correspondiente.",
                "preguntas_horizontales": [
                    {"numero": 1, "pista": "Energia que permite ver los objetos.", "respuesta": "LUZ", "fila": 0, "columna": 0, "longitud": 3},
                    {"numero": 2, "pista": "Sustancia liquida esencial para los seres vivos.", "respuesta": "AGUA", "fila": 3, "columna": 0, "longitud": 4},
                    {"numero": 4, "pista": "Material natural solido que forma parte del suelo.", "respuesta": "ROCA", "fila": 5, "columna": 3, "longitud": 4},
                ],
                "preguntas_verticales": [
                    {"numero": 1, "pista": "Instrumento que aumenta la imagen de objetos pequenos.", "respuesta": "LUPA", "fila": 0, "columna": 0, "longitud": 4},
                    {"numero": 3, "pista": "Mezcla de gases que respiramos.", "respuesta": "AIRE", "fila": 3, "columna": 3, "longitud": 4},
                ],
                "crucigrama": {
                    "grid": [
                        ["L", "U", "Z", "", "", "", ""],
                        ["U", "", "", "", "", "", ""],
                        ["P", "", "", "", "", "", ""],
                        ["A", "G", "U", "A", "", "", ""],
                        ["", "", "", "I", "", "", ""],
                        ["", "", "", "R", "O", "C", "A"],
                        ["", "", "", "E", "", "", ""],
                    ],
                    "size": 7,
                    "pistas_horizontal": [
                        {"numero": 1, "pista": "Energia que permite ver los objetos.", "respuesta": "LUZ", "fila": 0, "columna": 0, "longitud": 3},
                        {"numero": 2, "pista": "Sustancia liquida esencial para los seres vivos.", "respuesta": "AGUA", "fila": 3, "columna": 0, "longitud": 4},
                        {"numero": 4, "pista": "Material natural solido que forma parte del suelo.", "respuesta": "ROCA", "fila": 5, "columna": 3, "longitud": 4},
                    ],
                    "pistas_vertical": [
                        {"numero": 1, "pista": "Instrumento que aumenta la imagen de objetos pequenos.", "respuesta": "LUPA", "fila": 0, "columna": 0, "longitud": 4},
                        {"numero": 3, "pista": "Mezcla de gases que respiramos.", "respuesta": "AIRE", "fila": 3, "columna": 3, "longitud": 4},
                    ],
                },
            },
            "cuento": {
                "titulo": "La investigacion de la luz",
                "personajes": ["Lina", "Tomas", "Profe Ana"],
                "parrafos": [
                    "Lina y Tomas observaron que algunos objetos dejaban pasar la luz y otros formaban sombras.",
                    "Con una linterna compararon vidrio, papel y carton, y registraron sus resultados en una tabla.",
                    "Al final explicaron que cada material se comporta diferente frente a la luz.",
                ],
                "moraleja": "Observar, comparar y registrar ayuda a comprender los fenomenos naturales.",
                "preguntas_comprension": [
                    "Que objetos compararon los estudiantes?",
                    "Por que algunos materiales forman sombra?",
                    "Como registraron sus observaciones?",
                ],
            },
            "guia": {
                "titulo": "Guia de aprendizaje",
                "objetivos": ["Observar un fenomeno natural", "Registrar evidencias", "Explicar resultados con palabras propias"],
                "introduccion": "En esta guia el estudiante explora un concepto de ciencias mediante observacion, comparacion y explicacion.",
                "secciones": [
                    {
                        "titulo": "Exploracion",
                        "contenido": "Observa objetos o situaciones del entorno relacionadas con el tema.",
                        "actividades": ["Describe lo observado", "Clasifica los ejemplos segun sus caracteristicas"],
                    },
                    {
                        "titulo": "Aplicacion",
                        "contenido": "Usa la evidencia recogida para construir una explicacion sencilla.",
                        "actividades": ["Completa una tabla de resultados", "Escribe una conclusion corta"],
                    },
                ],
                "evaluacion_formativa": ["Explica con claridad", "Usa vocabulario del tema", "Relaciona evidencia y conclusion"],
            },
            "taller": {
                "titulo": "Taller practico",
                "objetivo": "Aplicar el concepto estudiado en situaciones observables del entorno.",
                "puntos": [
                    {"numero": 1, "enunciado": "Observa dos ejemplos del fenomeno y describe sus diferencias.", "espacio_respuesta": ""},
                    {"numero": 2, "enunciado": "Explica con tus palabras que aprendiste a partir de la actividad.", "espacio_respuesta": ""},
                ],
            },
            "examen": {
                "titulo": "Examen corto",
                "instrucciones": "Responde con base en lo trabajado en clase. Lee cada pregunta antes de contestar.",
                "preguntas": [
                    {
                        "numero": 1,
                        "tipo": "opcion_multiple",
                        "enunciado": "Que se debe hacer primero para estudiar un fenomeno natural?",
                        "opciones": ["A) Observar", "B) Adivinar", "C) Copiar", "D) Ignorar"],
                        "respuesta_correcta": "A",
                        "puntaje": 1.0,
                    },
                    {
                        "numero": 2,
                        "tipo": "abierta",
                        "enunciado": "Explica una observacion relacionada con el tema de clase.",
                        "opciones": [],
                        "respuesta_correcta": "Respuesta argumentada con evidencia.",
                        "puntaje": 2.0,
                    },
                    {
                        "numero": 3,
                        "tipo": "verdadero_falso",
                        "enunciado": "La evidencia ayuda a justificar una conclusion.",
                        "opciones": ["Verdadero", "Falso"],
                        "respuesta_correcta": "Verdadero",
                        "puntaje": 1.0,
                    },
                ],
                "total_puntaje": 4.0,
            },
            "rubrica": {
                "titulo": "Rubrica de actividad cientifica",
                "escala": ["Excelente", "Bueno", "Regular", "Insuficiente"],
                "criterios": [
                    {
                        "nombre": "Observacion",
                        "descripcion": "Registra caracteristicas relevantes del fenomeno.",
                        "peso_porcentaje": 35,
                        "niveles": {
                            "Excelente": "Registra observaciones completas y precisas.",
                            "Bueno": "Registra la mayoria de observaciones necesarias.",
                            "Regular": "Registra observaciones incompletas.",
                            "Insuficiente": "No registra observaciones utiles.",
                        },
                    },
                    {
                        "nombre": "Explicacion",
                        "descripcion": "Relaciona la evidencia con el concepto estudiado.",
                        "peso_porcentaje": 40,
                        "niveles": {
                            "Excelente": "Explica con claridad y usa evidencia.",
                            "Bueno": "Explica la idea principal con alguna evidencia.",
                            "Regular": "Explica de forma parcial.",
                            "Insuficiente": "No logra explicar la relacion.",
                        },
                    },
                    {
                        "nombre": "Comunicacion",
                        "descripcion": "Presenta resultados de forma ordenada.",
                        "peso_porcentaje": 25,
                        "niveles": {
                            "Excelente": "Presenta resultados claros y organizados.",
                            "Bueno": "Presenta resultados comprensibles.",
                            "Regular": "Presenta resultados con poco orden.",
                            "Insuficiente": "No comunica los resultados.",
                        },
                    },
                ],
            },
            "plan_refuerzo": {
                "estudiante": "Estudiante",
                "objetivo_general": "Fortalecer la comprension del tema mediante actividades breves, observables y guiadas.",
                "semanas": [
                    {
                        "semana": 1,
                        "tema": "Conceptos basicos",
                        "actividades": ["Revisar vocabulario clave", "Resolver ejemplos guiados"],
                        "recursos": ["Cuaderno", "Imagenes", "Objetos del entorno"],
                        "meta_semana": "Reconocer los conceptos principales.",
                    },
                    {
                        "semana": 2,
                        "tema": "Aplicacion",
                        "actividades": ["Hacer una observacion practica", "Explicar resultados en una tabla"],
                        "recursos": ["Ficha de trabajo", "Materiales de aula"],
                        "meta_semana": "Aplicar el concepto en una situacion concreta.",
                    },
                ],
                "estrategias_apoyo": ["Acompanamiento corto diario", "Preguntas guia", "Retroalimentacion inmediata"],
                "indicadores_mejora": ["Usa vocabulario del tema", "Explica con evidencia", "Completa actividades con autonomia"],
            },
        }
        return json.dumps(
            templates.get(
                task_type,
                {
                    "titulo": "Material educativo",
                    "contenido": "Actividad base generada con plantilla local.",
                    "actividades": ["Observar", "Registrar", "Explicar"],
                },
            )
        )
