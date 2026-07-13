"""Servicio central de configuración efectiva de IA.

Prioridad de resolución:
1. Configuración administrativa en BD (ai_provider_settings, ai_feature_routing)
2. Variables de entorno (.env)
3. Valores predeterminados seguros

Usa Redis como caché con TTL. Invalida al guardar cambios.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import text as sql_text

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

CACHE_KEY_PROVIDERS = "ai:providers"
CACHE_KEY_FEATURES = "ai:features"
CACHE_KEY_EFFECTIVE = "ai:effective:v2"
CACHE_TTL = 60  # 60 segundos

DEFAULT_PROVIDERS: list[dict[str, Any]] = [
    {
        "id": "open_code", "tipo": "texto", "label": "OpenCode",
        "base_url": settings.OPEN_CODE_BASE_URL,
        "model": settings.OPEN_CODE_MODEL,
        "active": True, "priority": 1,
        "timeout_seconds": settings.OPEN_CODE_TIMEOUT_SECONDS,
        "max_retries": 2,
    },
    {
        "id": "groq", "tipo": "texto", "label": "Groq",
        "base_url": "https://api.groq.com/openai/v1",
        "model": settings.GROQ_MODEL,
        "active": True, "priority": 2,
        "timeout_seconds": settings.GROQ_TIMEOUT_SECONDS,
        "max_retries": 2,
    },
    {
        "id": "ollama", "tipo": "texto", "label": "Ollama",
        "base_url": settings.OLLAMA_ENDPOINT,
        "model": settings.OLLAMA_MODEL,
        "active": True, "priority": 3,
        "timeout_seconds": settings.OLLAMA_TIMEOUT_SECONDS,
        "max_retries": 1,
    },
    {
        "id": "template", "tipo": "texto", "label": "Template",
        "base_url": None, "model": None,
        "active": True, "priority": 99,
        "timeout_seconds": 5, "max_retries": 0,
    },
    {
        "id": "openai_image", "tipo": "imagen", "label": "OpenAI Imágenes",
        "base_url": "https://api.openai.com/v1",
        "model": settings.OPENAI_IMAGE_MODEL,
        "active": True, "priority": 1,
        "timeout_seconds": settings.OPENAI_IMAGE_TIMEOUT_SECONDS,
        "max_retries": 2,
    },
    {
        "id": "cloudflare_image", "tipo": "imagen", "label": "Cloudflare Images",
        "base_url": None,
        "model": settings.CLOUDFLARE_IMAGE_MODEL,
        "active": bool(settings.CLOUDFLARE_API_TOKEN), "priority": 2,
        "timeout_seconds": settings.CLOUDFLARE_TIMEOUT_SECONDS,
        "max_retries": 1,
    },
]

DEFAULT_FEATURES: list[dict[str, Any]] = [
    {"feature": "xali", "label": "Chatbot Xali", "primary_provider": "groq", "fallback_provider": "template", "active": True},
    {"feature": "calificacion_texto", "label": "Calificación de texto", "primary_provider": "groq", "fallback_provider": "template", "active": True},
    {"feature": "calificacion_foto", "label": "Calificación por foto", "primary_provider": "groq", "fallback_provider": "template", "active": True},
    {"feature": "retroalimentacion", "label": "Retroalimentación", "primary_provider": "groq", "fallback_provider": "template", "active": True},
    {"feature": "generacion_preguntas", "label": "Generación de preguntas", "primary_provider": "groq", "fallback_provider": "template", "active": True},
    {"feature": "herramientas_educativas", "label": "Herramientas educativas", "primary_provider": "groq", "fallback_provider": "template", "active": True},
    {"feature": "presentaciones", "label": "Presentaciones", "primary_provider": "groq", "fallback_provider": "template", "active": True},
    {"feature": "generacion_imagenes", "label": "Generación de imágenes", "primary_provider": "openai_image", "fallback_provider": "cloudflare_image", "active": True},
    {"feature": "vision_ocr", "label": "Visión/OCR", "primary_provider": "groq", "fallback_provider": "template", "active": True},
    {"feature": "rag", "label": "RAG (embeddings)", "primary_provider": "openai", "fallback_provider": None, "active": True},
    {"feature": "embeddings", "label": "Embeddings", "primary_provider": "openai", "fallback_provider": None, "active": True},
]

_EDUCATIONAL_TOOL_TASKS = {
    "crucigrama",
    "cuento",
    "emparejar",
    "examen",
    "guia",
    "plan_refuerzo",
    "rubrica",
    "sopa_letras_pistas",
    "taller",
    "unir_columnas",
}


def _feature_candidates(feature: str) -> tuple[str, ...]:
    """Map runtime task names to the capabilities exposed in the admin UI."""
    aliases: dict[str, tuple[str, ...]] = {
        "grading": ("calificacion_texto", "calificacion_foto", "grading_text", "grading_photo"),
        "presentacion": ("presentaciones", "presentations"),
        "xali_chat": ("xali",),
        "xali_evaluacion_post_entrega": ("xali",),
    }
    if feature in _EDUCATIONAL_TOOL_TASKS:
        return (feature, "herramientas_educativas", "tools")
    return (feature, *aliases.get(feature, ()))


class AIConfigService:
    """Servicio central de configuración de IA con caché Redis y fallback a .env."""

    def __init__(self, db: Any = None, redis_client: Any = None) -> None:
        self._db = db
        self._redis = redis_client

    async def _ensure_tables(self) -> None:
        """Crea las tablas si no existen (idempotente)."""
        if not self._db:
            return
        await self._db.execute(sql_text("""
            CREATE TABLE IF NOT EXISTS ai_provider_settings (
                id VARCHAR(60) PRIMARY KEY,
                tipo VARCHAR(30) NOT NULL DEFAULT 'texto',
                label VARCHAR(100),
                base_url TEXT,
                model VARCHAR(200),
                active BOOLEAN NOT NULL DEFAULT true,
                priority INTEGER NOT NULL DEFAULT 99,
                timeout_seconds INTEGER NOT NULL DEFAULT 30,
                max_retries INTEGER NOT NULL DEFAULT 2,
                updated_by UUID,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        await self._db.execute(sql_text("""
            CREATE TABLE IF NOT EXISTS ai_feature_routing (
                feature VARCHAR(60) PRIMARY KEY,
                label VARCHAR(100),
                primary_provider VARCHAR(60),
                fallback_provider VARCHAR(60),
                active BOOLEAN NOT NULL DEFAULT true,
                updated_by UUID,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        await self._db.execute(sql_text("""
            CREATE TABLE IF NOT EXISTS ai_global_limits (
                id SERIAL PRIMARY KEY,
                max_requests_per_profesor_day INTEGER DEFAULT 200,
                max_requests_per_estudiante_day INTEGER DEFAULT 50,
                max_images_per_day INTEGER DEFAULT 100,
                max_presentations_per_day INTEGER DEFAULT 20,
                max_tokens_per_request INTEGER DEFAULT 4096,
                max_concurrency INTEGER DEFAULT 10,
                rate_limit_message TEXT DEFAULT 'Has superado el limite diario. Intenta de nuevo mañana.',
                updated_by UUID,
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        await self._db.execute(sql_text("""
            INSERT INTO ai_global_limits (id, max_requests_per_profesor_day, max_requests_per_estudiante_day)
            SELECT 1, 200, 50 WHERE NOT EXISTS (SELECT 1 FROM ai_global_limits WHERE id = 1)
        """))
        await self._db.commit()

    async def _seed_defaults(self) -> None:
        """Inserta valores por defecto si las tablas están vacías."""
        if not self._db:
            return
        # Seed providers
        existing = await self._db.execute(sql_text("SELECT COUNT(*) FROM ai_provider_settings"))
        if existing.scalar() == 0:
            for p in DEFAULT_PROVIDERS:
                await self._db.execute(
                    sql_text("""INSERT INTO ai_provider_settings (id, tipo, label, base_url, model, active, priority, timeout_seconds, max_retries)
                         VALUES (:id, :tipo, :label, :base_url, :model, :active, :priority, :timeout_seconds, :max_retries)"""),
                    p
                )
        # Seed features
        existing_f = await self._db.execute(sql_text("SELECT COUNT(*) FROM ai_feature_routing"))
        if existing_f.scalar() == 0:
            for f in DEFAULT_FEATURES:
                await self._db.execute(
                    sql_text("""INSERT INTO ai_feature_routing (feature, label, primary_provider, fallback_provider, active)
                         VALUES (:feature, :label, :primary_provider, :fallback_provider, :active)"""),
                    f
                )
        await self._db.commit()

    async def init(self) -> None:
        """Inicializa valores por defecto si las tablas están vacías."""
        if not self._db:
            return
        await self._seed_defaults()

    async def get_all_providers(self) -> list[dict[str, Any]]:
        """Return the persisted provider configuration, falling back to defaults."""
        providers = await self._load_providers_from_db()
        return providers or [dict(provider) for provider in DEFAULT_PROVIDERS]

    async def get_all_features(self) -> list[dict[str, Any]]:
        """Return the persisted feature routing, falling back to defaults."""
        features = await self._load_features_from_db()
        return features or [dict(feature) for feature in DEFAULT_FEATURES]

    async def get_effective_providers(self, tipo: str = "texto") -> list[dict[str, Any]]:
        """Devuelve proveedores activos ordenados por prioridad para un tipo."""
        cached = await self._get_cache(CACHE_KEY_EFFECTIVE)
        if cached:
            providers = cached.get("providers", [])
            return [p for p in providers if p.get("tipo") == tipo and p.get("active")]

        providers = await self._load_providers_from_db()
        if not providers:
            providers = DEFAULT_PROVIDERS

        await self._set_cache(CACHE_KEY_EFFECTIVE, {"providers": providers})
        return [p for p in providers if p.get("tipo") == tipo and p.get("active")]

    async def get_feature_config(self, feature: str) -> dict[str, Any]:
        """Devuelve configuración de ruteo para una funcionalidad."""
        candidates = _feature_candidates(feature)
        cached = await self._get_cache(CACHE_KEY_FEATURES)
        if cached:
            features = cached.get("features", [])
            for candidate in candidates:
                for item in features:
                    if item["feature"] == candidate:
                        return item

        features = await self._load_features_from_db()
        if not features:
            features = DEFAULT_FEATURES

        await self._set_cache(CACHE_KEY_FEATURES, {"features": features})
        for candidate in candidates:
            for item in features:
                if item["feature"] == candidate:
                    return item
        return {"feature": feature, "primary_provider": "groq", "fallback_provider": "template", "active": True}

    async def get_provider_config(self, provider_id: str) -> dict[str, Any]:
        """Devuelve configuración de un proveedor específico."""
        providers = await self.get_effective_providers()
        for p in providers:
            if p["id"] == provider_id:
                return p
        # Fallback a defaults
        for p in DEFAULT_PROVIDERS:
            if p["id"] == provider_id:
                return p
        return {"id": provider_id, "active": False}

    async def get_text_providers(self) -> list[dict[str, Any]]:
        return await self.get_effective_providers("texto")

    async def get_image_providers(self) -> list[dict[str, Any]]:
        return await self.get_effective_providers("imagen")

    async def invalidate_cache(self) -> None:
        """Invalida toda la caché de configuración IA."""
        if self._redis:
            await self._redis.delete(CACHE_KEY_EFFECTIVE)
            await self._redis.delete(CACHE_KEY_PROVIDERS)
            await self._redis.delete(CACHE_KEY_FEATURES)
        logger.info("AI config cache invalidated")

    async def get_config_hash(self) -> str:
        """Hash de la configuración actual (para comparar backend vs worker)."""
        providers = await self._load_providers_from_db() or DEFAULT_PROVIDERS
        features = await self._load_features_from_db() or DEFAULT_FEATURES
        raw = json.dumps({"providers": providers, "features": features}, sort_keys=True, default=str)
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    # ── Persistencia ───────────────────────────────────────────────────

    async def save_providers(self, providers: list[dict[str, Any]], admin_id: UUID | None = None) -> None:
        if not self._db:
            return
        await self._db.execute(sql_text("DELETE FROM ai_provider_settings"))
        for p in providers:
            await self._db.execute(
                sql_text("""INSERT INTO ai_provider_settings (id, tipo, label, base_url, model, active, priority, timeout_seconds, max_retries, updated_by)
                     VALUES (:id, :tipo, :label, :base_url, :model, :active, :priority, :timeout_seconds, :max_retries, :admin)"""),
                {"admin": str(admin_id) if admin_id else None, **p}
            )
        await self._db.commit()
        await self._audit(admin_id, "save_providers", "providers", "", "", "ok")
        await self.invalidate_cache()

    async def save_features(self, features: list[dict[str, Any]], admin_id: UUID | None = None) -> None:
        if not self._db:
            return
        await self._db.execute(sql_text("DELETE FROM ai_feature_routing"))
        for f in features:
            await self._db.execute(
                sql_text("""INSERT INTO ai_feature_routing (feature, label, primary_provider, fallback_provider, active, updated_by)
                     VALUES (:feature, :label, :primary_provider, :fallback_provider, :active, :admin)"""),
                {"admin": str(admin_id) if admin_id else None, **f}
            )
        await self._db.commit()
        await self._audit(admin_id, "save_features", "features", "", "", "ok")
        await self.invalidate_cache()

    async def save_provider(self, provider_id: str, updates: dict[str, Any], admin_id: UUID | None = None) -> None:
        if not self._db:
            return
        sets = []
        params: dict = {"id": provider_id}
        for key in ("active", "model", "priority", "timeout_seconds", "max_retries", "base_url"):
            if key in updates:
                sets.append(f"{key}=:{key}")
                params[key] = updates[key]
        if not sets:
            return
        params["admin"] = str(admin_id) if admin_id else None
        await self._db.execute(
            sql_text(f"UPDATE ai_provider_settings SET {', '.join(sets)}, updated_by=:admin, updated_at=NOW() WHERE id=:id"),
            params
        )
        await self._db.commit()
        await self.invalidate_cache()

    async def restore_defaults(self, admin_id: UUID | None = None) -> None:
        if not self._db:
            return
        await self._db.execute(sql_text("DELETE FROM ai_provider_settings"))
        await self._db.execute(sql_text("DELETE FROM ai_feature_routing"))
        await self._seed_defaults()
        await self._audit(admin_id, "restore_defaults", "config", "", "", "ok")
        await self.invalidate_cache()
        logger.info("AI config restored to defaults", extra={"admin_id": str(admin_id) if admin_id else None})

    # ── Límites ────────────────────────────────────────────────────────

    async def get_limits(self) -> dict[str, Any]:
        if not self._db:
            return {"max_requests_per_profesor_day": 200, "max_requests_per_estudiante_day": 50}
        r = await self._db.execute(sql_text("SELECT * FROM ai_global_limits WHERE id = 1"))
        row = r.fetchone()
        if row:
            return dict(row._mapping)
        return {"max_requests_per_profesor_day": 200, "max_requests_per_estudiante_day": 50}

    # ── Privados ───────────────────────────────────────────────────────

    async def _audit(self, admin_id, action, entity, field="", old_val="", new_val="", result="ok"):
        if not self._db:
            return
        try:
            await self._db.execute(
                sql_text("INSERT INTO ai_config_audit_logs (admin_id, action, entity, field_name, old_value, new_value, result) VALUES (:aid, :a, :e, :f, :o, :n, :r)"),
                {"aid": str(admin_id) if admin_id else None, "a": action, "e": entity, "f": field, "o": str(old_val)[:500] if old_val else None, "n": str(new_val)[:500] if new_val else None, "r": result}
            )
            await self._db.commit()
        except Exception:
            pass

    async def _load_providers_from_db(self) -> list[dict[str, Any]] | None:
        if not self._db:
            return None
        try:
            r = await self._db.execute(
                sql_text("SELECT id, tipo, label, base_url, model, active, priority, timeout_seconds, max_retries FROM ai_provider_settings ORDER BY priority, id")
            )
            rows = r.fetchall()
            return [dict(row._mapping) for row in rows] if rows else None
        except Exception:
            return None

    async def _load_features_from_db(self) -> list[dict[str, Any]] | None:
        if not self._db:
            return None
        try:
            r = await self._db.execute(sql_text("SELECT feature, label, primary_provider, fallback_provider, active FROM ai_feature_routing ORDER BY feature"))
            rows = r.fetchall()
            return [dict(row._mapping) for row in rows] if rows else None
        except Exception:
            return None

    async def _get_cache(self, key: str) -> Any | None:
        if not self._redis:
            return None
        try:
            raw = await self._redis.get(key)
            return json.loads(raw) if raw else None
        except Exception:
            return None

    async def _set_cache(self, key: str, value: Any) -> None:
        if not self._redis:
            return
        try:
            await self._redis.setex(key, CACHE_TTL, json.dumps(value, default=str))
        except Exception:
            pass


# Módulo singleton diferido (se inicializa con db/redis)
ai_config_service: AIConfigService | None = None


async def get_ai_config_service(db, redis_client=None) -> AIConfigService:
    global ai_config_service
    if ai_config_service is None:
        ai_config_service = AIConfigService(db=db, redis_client=redis_client)
        await ai_config_service.init()
    else:
        ai_config_service._db = db
        ai_config_service._redis = redis_client
    return ai_config_service
