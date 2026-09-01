"""LLM router with provider cascade and structured local fallbacks."""
from __future__ import annotations

import asyncio
import copy
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
from app.services.ollama_provider import OllamaCloudProvider
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


def _persistent_inference_timeout() -> httpx.Timeout:
    return httpx.Timeout(
        connect=max(1.0, float(settings.AI_PROVIDER_CONNECT_TIMEOUT_SECONDS)),
        read=None,
        write=max(1.0, float(settings.AI_PROVIDER_WRITE_TIMEOUT_SECONDS)),
        pool=max(1.0, float(settings.AI_PROVIDER_POOL_TIMEOUT_SECONDS)),
    )


class LLMRouter:
    """Cascade through configured LLM providers, then use a safe local template."""

    def __init__(
        self, user_id: UUID | None = None, *, ai_config: dict[str, Any] | None = None
    ) -> None:
        self._user_id = user_id
        self._ai_config = dict(ai_config) if ai_config else None
        self._personal_route_without_fallback = False
        self._usage_fallback_used = False
        self._tracking: dict = {}
        self._credentials = {
            "openai": getattr(settings, "OPENAI_API_KEY", ""),
            "open_code": getattr(settings, "OPEN_CODE_API_KEY", ""),
            "groq": getattr(settings, "GROQ_API_KEY", ""),
            "ollama": getattr(settings, "OLLAMA_API_KEY", ""),
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

    def _routing_telemetry(self) -> dict[str, Any]:
        snapshot = self._ai_config or {}
        primary = snapshot.get("primary") or {}
        return {
            "routing_origin": primary.get("credential_source"),
            "config_hash": snapshot.get("config_hash"),
            "config_version": snapshot.get("teacher_config_version") or snapshot.get("global_config_version"),
            "fallback_used": self._usage_fallback_used,
        }

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

        for provider_index, (provider, fn) in enumerate(providers):
            self._usage_fallback_used = provider_index > 0
            try:
                logger.debug("LLM call via %s for task '%s'", provider, task_type)
                start = time.monotonic()
                result = await fn(prompt, json_mode)
                ms = int((time.monotonic() - start) * 1000)
                logger.info("LLM ok via %s (%dms) task=%s", provider, ms, task_type)
                return result
            except Exception as exc:  # noqa: BLE001
                logger.warning("LLM provider %s failed: %s", provider, exc)

        if self._personal_route_without_fallback:
            raise RuntimeError("La API personal no respondió y no autorizaste fallback institucional")
        if task_type == "evaluacion_digitalizar":
            raise RuntimeError("OpenCode no pudo completar la digitalización")
        logger.error("All LLM providers failed for task '%s'; using safe template", task_type)
        return self._safe_template(task_type)

    async def _load_providers(self, task_type: str) -> list[tuple[str, Any]]:
        """Load provider cascade dynamically from DB config, fallback to defaults."""
        ordered = []
        personal_route = False
        resolved_fallback: dict[str, Any] = {}
        institutional_credentials = dict(self._credentials)
        if task_type == "evaluacion_digitalizar":
            self._provider_configs[LLMProvider.OPEN_CODE.value] = {
                "model": settings.OPEN_CODE_DIGITALIZATION_MODEL,
                "timeout_seconds": settings.OPEN_CODE_DIGITALIZATION_TIMEOUT_SECONDS,
                "max_tokens": settings.OPEN_CODE_DIGITALIZATION_MAX_TOKENS,
                "wait_for_completion": True,
            }
        elif task_type == "presentacion":
            self._provider_configs[LLMProvider.OPEN_CODE.value] = {
                "model": settings.OPEN_CODE_PRESENTATION_MODEL,
                "timeout_seconds": settings.OPEN_CODE_PRESENTATION_TIMEOUT_SECONDS,
                "max_tokens": settings.OPEN_CODE_PRESENTATION_MAX_TOKENS,
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
                    "openai": getattr(credentials, "openai_key", ""),
                    "open_code": getattr(credentials, "open_code_key", ""),
                    "groq": getattr(credentials, "groq_key", ""),
                    "ollama": getattr(credentials, "ollama_key", ""),
                }
                institutional_credentials = dict(self._credentials)
                self._provider_configs = {str(item["id"]): item for item in text_providers}
                if task_type == "evaluacion_digitalizar":
                    document_provider = self._provider_configs.setdefault(
                        LLMProvider.OPEN_CODE.value, {}
                    )
                    document_provider["model"] = settings.OPEN_CODE_DIGITALIZATION_MODEL
                    document_provider[
                        "timeout_seconds"
                    ] = settings.OPEN_CODE_DIGITALIZATION_TIMEOUT_SECONDS
                    document_provider["max_tokens"] = (
                        settings.OPEN_CODE_DIGITALIZATION_MAX_TOKENS
                    )
                    document_provider["wait_for_completion"] = True
                elif task_type == "presentacion":
                    presentation_provider = self._provider_configs.setdefault(
                        LLMProvider.OPEN_CODE.value, {}
                    )
                    presentation_provider["model"] = settings.OPEN_CODE_PRESENTATION_MODEL
                    presentation_provider["timeout_seconds"] = settings.OPEN_CODE_PRESENTATION_TIMEOUT_SECONDS
                    presentation_provider["max_tokens"] = settings.OPEN_CODE_PRESENTATION_MAX_TOKENS

                primary_id = str(feature.get("primary_provider") or "")
                fallback_id = str(feature.get("fallback_provider") or "")
                if primary_id in self._provider_configs and feature.get("primary_model"):
                    self._provider_configs[primary_id]["model"] = feature["primary_model"]
                if fallback_id in self._provider_configs and feature.get("fallback_model"):
                    self._provider_configs[fallback_id]["model"] = feature["fallback_model"]

                if self._user_id is not None:
                    try:
                        from app.services.ai_configuration_resolver import resolve_ai_configuration
                        from app.services.ai_credentials_service import get_teacher_ai_credential

                        resolved = self._ai_config or await resolve_ai_configuration(
                            db,
                            feature=task_type,
                            teacher_id=self._user_id,
                        )
                        self._ai_config = dict(resolved)
                        selected = resolved.get("primary") or {}
                        selected_provider = str(selected.get("provider") or "")
                        selected_model = selected.get("model")
                        if selected_provider in self._provider_configs and selected_model:
                            self._provider_configs[selected_provider]["model"] = selected_model
                        if selected.get("credential_source") == "teacher" and selected_provider in {"openai", "open_code", "groq", "ollama"}:
                            personal_route = True
                            teacher_secret = await get_teacher_ai_credential(
                                db,
                                teacher_id=self._user_id,
                                provider_id=selected_provider,
                            )
                            if teacher_secret:
                                self._credentials[selected_provider] = teacher_secret
                            else:
                                self._credentials[selected_provider] = ""
                        resolved_fallback = resolved.get("fallback") or {}
                        self._personal_route_without_fallback = (
                            personal_route and not bool(resolved_fallback)
                        )
                        feature = {
                            **feature,
                            "primary_provider": selected_provider or feature.get("primary_provider"),
                            "primary_model": selected_model or feature.get("primary_model"),
                            "fallback_provider": (
                                resolved_fallback.get("provider")
                                if personal_route
                                else resolved_fallback.get("provider")
                                or feature.get("fallback_provider")
                            ),
                            "fallback_model": (
                                resolved_fallback.get("model")
                                if personal_route
                                else resolved_fallback.get("model")
                                or feature.get("fallback_model")
                            ),
                        }
                    except Exception as exc:
                        logger.warning("Teacher AI configuration unavailable; using institutional route: %s", type(exc).__name__)

                # Document extraction remains vision-capable; the resolved route decides the model.
                if task_type == "evaluacion_digitalizar":
                    for provider in text_providers:
                        if provider["id"] == LLMProvider.OPEN_CODE.value and provider["active"]:
                            ordered.append((provider["id"], self._call_open_code))
                            if (
                                personal_route
                                and resolved_fallback.get("provider") == provider["id"]
                                and resolved_fallback.get("credential_source")
                                == "institutional"
                            ):
                                institutional_router = copy.copy(self)
                                institutional_router._credentials = dict(
                                    institutional_credentials
                                )
                                institutional_router._provider_configs = {
                                    key: dict(value)
                                    for key, value in self._provider_configs.items()
                                }
                                fallback_call = (
                                    institutional_router._call_for_provider(
                                        provider["id"]
                                    )
                                )
                                if fallback_call:
                                    ordered.append(
                                        (
                                            f"{provider['id']}:institutional",
                                            fallback_call,
                                        )
                                    )
                            break
                    return ordered

                # Build ordered list from configured providers
                seen = set()
                primary = feature.get("primary_provider", "")
                fallback = feature.get("fallback_provider", "")

                # Real providers first. The local template is deliberately
                # deferred until every configured provider has been tried;
                # otherwise it short-circuits the cascade with generic data.
                if primary:
                    for tp in text_providers:
                        if (
                            tp["id"] == primary
                            and tp["active"]
                            and tp["id"] != "template"
                        ):
                            f = self._call_for_provider(tp["id"])
                            if f:
                                ordered.append((tp["id"], f))
                                seen.add(tp["id"])
                                break

                # Then fallback
                if fallback:
                    for tp in text_providers:
                        if (
                            tp["id"] == fallback
                            and tp["id"] not in seen
                            and tp["active"]
                            and tp["id"] != "template"
                        ):
                            f = self._call_for_provider(tp["id"])
                            if f:
                                ordered.append((tp["id"], f))
                                seen.add(tp["id"])
                                break
                if (
                    personal_route
                    and fallback
                    and fallback == primary
                    and fallback in seen
                    and resolved_fallback.get("credential_source") == "institutional"
                ):
                    institutional_router = copy.copy(self)
                    institutional_router._credentials = dict(institutional_credentials)
                    institutional_router._provider_configs = {
                        key: dict(value)
                        for key, value in self._provider_configs.items()
                    }
                    fallback_call = institutional_router._call_for_provider(fallback)
                    if fallback_call:
                        ordered.append((f"{fallback}:institutional", fallback_call))

                # A personal route may use only its captured explicit fallback.
                if personal_route:
                    return ordered

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

        return ordered

    async def _template_call(self, prompt: str, json_mode: bool) -> str:
        return self._safe_template("fallback")

    def _call_for_provider(self, provider_id: str) -> Any | None:
        if provider_id == LLMProvider.OPENAI.value:
            return self._call_openai
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
        configured_key = str(self._credentials.get("open_code", "") or "").strip()
        environment_key = str(
            getattr(settings, "OPEN_CODE_API_KEY", "") or ""
        ).strip()
        api_keys = [configured_key] if configured_key else []
        if environment_key and environment_key not in api_keys:
            api_keys.append(environment_key)
        if not api_keys:
            raise ValueError("OPEN_CODE_API_KEY not configured")

        config = self._provider_configs.get(LLMProvider.OPEN_CODE.value, {})
        model = config.get("model") or getattr(
            settings, "OPEN_CODE_MODEL", "deepseek-v4-flash"
        )
        body: dict[str, Any] = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1 if json_mode else 0.3,
        }
        use_messages_api = _open_code_uses_messages_api(model)
        if use_messages_api:
            body["max_tokens"] = int(
                config.get("max_tokens")
                or getattr(settings, "OPEN_CODE_MAX_TOKENS", 8192)
            )
            endpoint = "messages"
        else:
            if json_mode:
                body["response_format"] = {"type": "json_object"}
            endpoint = "chat/completions"

        timeout = (
            _persistent_inference_timeout()
            if config.get("wait_for_completion")
            else config.get("timeout_seconds") or getattr(
                settings, "OPEN_CODE_TIMEOUT_SECONDS", 45
            )
        )
        base_url = str(
            config.get("base_url") or settings.OPEN_CODE_BASE_URL
        ).rstrip("/")
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                for credential_index, api_key in enumerate(api_keys):
                    if credential_index > 0:
                        self._usage_fallback_used = True
                    headers = (
                        {
                            "x-api-key": api_key,
                            "anthropic-version": "2023-06-01",
                            "Content-Type": "application/json",
                        }
                        if use_messages_api
                        else {
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        }
                    )
                    for attempt in range(1, OPEN_CODE_MAX_ATTEMPTS + 1):
                        resp = await client.post(
                            f"{base_url}/{endpoint}",
                            headers=headers,
                            json=body,
                        )
                        has_credential_fallback = credential_index < len(api_keys) - 1
                        if resp.status_code in {401, 403} and has_credential_fallback:
                            logger.warning(
                                "OpenCode rejected the stored credential; "
                                "retrying with the environment credential"
                            )
                            break
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
                        data = resp.json()
                        ms = int((time.monotonic() - start) * 1000)
                        usage = data.get("usage", {}) or {}
                        await log_ai_usage(
                            feature="content_generation",
                            provider="opencode",
                            model=model,
                            status="success",
                            latency_ms=ms,
                            input_tokens=(
                                usage.get("input_tokens")
                                or usage.get("prompt_tokens")
                            ),
                            output_tokens=(
                                usage.get("output_tokens")
                                or usage.get("completion_tokens")
                            ),
                            **self._tracking,
                            **self._routing_telemetry(),
                        )
                        if use_messages_api:
                            return _messages_response_text(data)
                        return data["choices"][0]["message"]["content"]

            raise RuntimeError("OpenCode rechazó las credenciales configuradas")
        except httpx.TimeoutException:
            ms = int((time.monotonic() - start) * 1000)
            await log_ai_usage(
                feature="content_generation",
                provider="opencode",
                model=model,
                status="timeout",
                latency_ms=ms,
                error_code="provider_timeout",
                **self._tracking,
                **self._routing_telemetry(),
            )
            raise
        except Exception as exc:
            ms = int((time.monotonic() - start) * 1000)
            await log_ai_usage(
                feature="content_generation",
                provider="opencode",
                model=model,
                status="failed",
                latency_ms=ms,
                error_code=str(exc)[:60],
                **self._tracking,
                **self._routing_telemetry(),
            )
            raise
    async def _call_openai(self, prompt: str, json_mode: bool) -> str:
        api_key = self._credentials.get("openai", "")
        config = self._provider_configs.get(LLMProvider.OPENAI.value, {})
        if not api_key:
            raise ValueError("OPENAI_API_KEY not configured")
        body: dict[str, Any] = {
            "model": config.get("model") or settings.OPENAI_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2 if json_mode else 0.3,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        timeout = config.get("timeout_seconds") or settings.OPENAI_TIMEOUT_SECONDS
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=body,
            )
        response.raise_for_status()
        data = response.json()
        return str(data["choices"][0]["message"].get("content") or "")
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
        api_key = str(self._credentials.get("ollama", "") or "").strip()
        if not api_key:
            raise ValueError("OLLAMA_API_KEY not configured")
        config = self._provider_configs.get(LLMProvider.OLLAMA.value, {})
        model = str(config.get("model") or getattr(settings, "OLLAMA_MODEL", "")).strip()
        if not model:
            raise ValueError("No hay un modelo de Ollama Cloud seleccionado")
        client = OllamaCloudProvider(
            api_key,
            base_url=getattr(settings, "OLLAMA_CLOUD_BASE_URL", "https://ollama.com/api"),
            timeout_seconds=float(config.get("timeout_seconds") or getattr(settings, "OLLAMA_TIMEOUT_SECONDS", 120)),
        )
        response = await client.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0.1 if json_mode else 0.3},
        )
        message = response.get("message") or {}
        return str(message.get("content") or response.get("response") or "")

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
            "lectura_comprensiva": {
                "titulo": "Lectura comprensiva",
                "instrucciones": "Lee una vez para comprender la idea general y otra para buscar evidencias.",
                "estrategia_lectora": "Subraya acciones, palabras desconocidas e ideas que permitan inferir.",
                "fuente": "Texto original generado para la actividad",
                "texto": "En el huerto escolar, Lina noto que una planta crecia inclinada hacia la ventana. Registro su posicion durante varios dias. Luego giro la maceta y observo que el tallo volvio a orientarse hacia la luz. Con sus notas, explico al grupo que la planta respondia a una condicion del entorno.",
                "preguntas": [
                    {"numero": 1, "tipo": "literal", "dificultad": "baja", "enunciado": "Que observo Lina?", "respuesta_esperada": "Que la planta crecia hacia la ventana.", "evidencia_textual": "crecia inclinada hacia la ventana", "justificacion": "Aparece expresamente en el texto."},
                    {"numero": 2, "tipo": "inferencial", "dificultad": "media", "enunciado": "Por que registro varios dias?", "respuesta_esperada": "Para comprobar que era un patron.", "evidencia_textual": "registro su posicion durante varios dias", "justificacion": "Repetir permite comparar cambios."},
                    {"numero": 3, "tipo": "vocabulario", "dificultad": "media", "enunciado": "Que significa orientarse?", "respuesta_esperada": "Dirigirse hacia un lugar.", "evidencia_textual": "orientarse hacia la luz", "justificacion": "La frase indica direccion."},
                    {"numero": 4, "tipo": "critica", "dificultad": "alta", "enunciado": "La evidencia es suficiente? Explica.", "respuesta_esperada": "Es util, aunque conviene probar con mas plantas.", "evidencia_textual": "giro la maceta y observo", "justificacion": "Una muestra mayor haria la conclusion mas solida."},
                    {"numero": 5, "tipo": "inferencial", "dificultad": "media", "enunciado": "Que aportaron las notas?", "respuesta_esperada": "Evidencia para explicar el cambio.", "evidencia_textual": "Con sus notas, explico al grupo", "justificacion": "Los registros respaldaron su explicacion."},
                ],
            },
            "guia": {
                "titulo": "Guia de aprendizaje",
                "objetivos": ["Observar un fenomeno natural", "Registrar evidencias", "Explicar resultados con palabras propias"],
                "saberes_previos": ["Reconocer ejemplos del tema en el entorno", "Expresar observaciones con palabras propias"],
                "introduccion": "En esta guia el estudiante explora un concepto de ciencias mediante observacion, comparacion y explicacion.",
                "secciones": [
                    {
                        "titulo": "Exploracion",
                        "explicacion": "Observar con atencion permite reconocer caracteristicas, semejanzas y diferencias.",
                        "contenido": "Observa objetos o situaciones del entorno relacionadas con el tema.",
                        "ejemplo_guiado": "El docente modela como describir color, forma, material y comportamiento sin adivinar.",
                        "actividades": ["Describe lo observado", "Clasifica los ejemplos segun sus caracteristicas"],
                        "verificacion": "Menciona una caracteristica y explica como la identificaste.",
                    },
                    {
                        "titulo": "Aplicacion",
                        "explicacion": "La evidencia registrada sirve para construir una conclusion comprensible.",
                        "contenido": "Usa la evidencia recogida para construir una explicacion sencilla.",
                        "ejemplo_guiado": "Compara dos registros y conecta la diferencia con el concepto estudiado.",
                        "actividades": ["Completa una tabla de resultados", "Escribe una conclusion corta", "Comparte una evidencia con el grupo"],
                        "verificacion": "Subraya la evidencia que respalda tu conclusion.",
                    },
                ],
                "cierre": "Resume que aprendiste, que evidencia usaste y que pregunta aun tienes.",
                "evaluacion_formativa": ["Explica con claridad", "Usa vocabulario del tema", "Relaciona evidencia y conclusion"],
            },
            "taller": {
                "titulo": "Taller practico",
                "objetivo": "Aplicar el concepto estudiado en situaciones observables del entorno.",
                "instrucciones": "Resuelve cada punto en orden y muestra el procedimiento cuando sea necesario.",
                "puntaje_total": 10,
                "puntos": [
                    {"numero": 1, "tipo": "aplicacion", "dificultad": "baja", "enunciado": "Observa dos ejemplos y describe sus diferencias.", "opciones": [], "puntaje": 2, "lineas_respuesta": 3, "respuesta_esperada": "Describe dos diferencias observables.", "criterio_logro": "Compara usando vocabulario del tema."},
                    {"numero": 2, "tipo": "procedimiento", "dificultad": "baja", "enunciado": "Organiza tus observaciones en una tabla.", "opciones": [], "puntaje": 2, "lineas_respuesta": 4, "respuesta_esperada": "Tabla con ejemplos y caracteristicas.", "criterio_logro": "Registra informacion clara y ordenada."},
                    {"numero": 3, "tipo": "abierta", "dificultad": "media", "enunciado": "Explica que patron encuentras en los resultados.", "opciones": [], "puntaje": 2, "lineas_respuesta": 4, "respuesta_esperada": "Identifica un patron respaldado por los datos.", "criterio_logro": "Relaciona resultados y explicacion."},
                    {"numero": 4, "tipo": "aplicacion", "dificultad": "media", "enunciado": "Aplica el concepto a una situacion de tu entorno.", "opciones": [], "puntaje": 2, "lineas_respuesta": 4, "respuesta_esperada": "Ejemplo pertinente y explicado.", "criterio_logro": "Transfiere el concepto a una situacion nueva."},
                    {"numero": 5, "tipo": "abierta", "dificultad": "alta", "enunciado": "Justifica una conclusion usando dos evidencias.", "opciones": [], "puntaje": 2, "lineas_respuesta": 5, "respuesta_esperada": "Conclusion coherente con dos evidencias.", "criterio_logro": "Argumenta con evidencia suficiente."},
                ],
                "criterios_revision": ["Comprension del concepto", "Uso de evidencia", "Claridad del procedimiento"],
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
                "diagnostico_inicial": "Reconoce ideas basicas, pero necesita apoyo para aplicarlas y explicar el procedimiento.",
                "dificultades": ["Aplicar el concepto en situaciones nuevas", "Justificar respuestas con evidencia"],
                "fortalezas": ["Participa con preguntas guia", "Reconoce vocabulario esencial"],
                "objetivo_general": "Fortalecer la comprension del tema mediante actividades breves, observables y guiadas.",
                "duracion_estimada": "2 semanas, 3 sesiones por semana de 20 minutos",
                "semanas": [
                    {
                        "semana": 1,
                        "tema": "Conceptos basicos",
                        "actividades": ["Revisar vocabulario clave", "Resolver ejemplos guiados"],
                        "recursos": ["Cuaderno", "Imagenes", "Objetos del entorno"],
                        "meta_semana": "Reconocer los conceptos principales.",
                        "evidencia": "Organizador con conceptos y dos ejemplos correctos.",
                        "responsable": "docente y estudiante",
                    },
                    {
                        "semana": 2,
                        "tema": "Aplicacion",
                        "actividades": ["Hacer una observacion practica", "Explicar resultados en una tabla"],
                        "recursos": ["Ficha de trabajo", "Materiales de aula"],
                        "meta_semana": "Aplicar el concepto en una situacion concreta.",
                        "evidencia": "Explicacion breve respaldada por la tabla.",
                        "responsable": "estudiante con seguimiento docente",
                    },
                ],
                "estrategias_apoyo": ["Acompanamiento corto diario", "Preguntas guia", "Retroalimentacion inmediata"],
                "indicadores_mejora": ["Usa vocabulario del tema", "Explica con evidencia", "Completa actividades con autonomia"],
                "comprobacion_final": "Resolver una situacion nueva y explicar el procedimiento sin ayuda.",
                "recomendaciones_familia": ["Practicar con ejemplos cotidianos durante diez minutos", "Valorar el procedimiento antes que la rapidez"],
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
