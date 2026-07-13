from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, SecretStr, field_validator


class GlobalAIConfigUpdate(BaseModel):
    openai_key: SecretStr | None = None
    cloudflare_token: SecretStr | None = None
    cloudflare_account_id: str | None = None
    groq_key: SecretStr | None = None
    open_code_key: SecretStr | None = None
    modelo_llm_default: str | None = None
    clear_openai_key: bool = False
    clear_cloudflare_token: bool = False
    clear_cloudflare_account_id: bool = False
    clear_groq_key: bool = False
    clear_open_code_key: bool = False

    @field_validator("openai_key", "cloudflare_token", "groq_key", "open_code_key", mode="before")
    @classmethod
    def validate_secret(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            raise ValueError("La credencial no puede estar vacia.")
        return value

    @field_validator("cloudflare_account_id", "modelo_llm_default", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value


class GlobalAIConfigRead(BaseModel):
    modelo_llm_default: str | None
    has_openai_key: bool
    has_cloudflare: bool
    has_groq_key: bool
    has_open_code_key: bool
    cloudflare_account_id: str | None = None
    credential_sources: dict[str, str] = Field(default_factory=dict)


class ProfesorAIConfigUpdate(BaseModel):
    openai_key: SecretStr | None = None
    cloudflare_token: SecretStr | None = None
    cloudflare_account_id: str | None = None
    modelo_llm_preferido: str | None = None


class UsageStatsRead(BaseModel):
    total_calls: int
    total_tokens_input: int
    total_tokens_output: int
    total_cost: float
    by_provider: list[dict]


class AIProvider(BaseModel):
    # `name` stays in the response for existing clients; `id` is the canonical
    # persisted identifier required by provider save/update endpoints.
    id: str
    name: str
    tipo: str = "texto"
    label: str
    active: bool = True
    base_url: str | None = None
    model: str | None = None
    priority: int = 0
    timeout_seconds: int = 30
    max_retries: int = 2
    auth_configured: bool = False
    last_test_status: str | None = None
    last_test_latency_ms: int | None = None
    last_test_http_code: int | None = None
    last_test_error: str | None = None
    last_test_at: datetime | None = None


class AIProviderUpdate(BaseModel):
    active: bool | None = None
    model: str | None = None
    priority: int | None = None
    timeout_seconds: int | None = None
    max_retries: int | None = None


class FeatureRouting(BaseModel):
    feature: str
    label: str
    primary_provider: str = "groq"
    primary_model: str | None = None
    fallback_provider: str | None = None
    fallback_model: str | None = None
    active: bool = True


class AISettingsRead(BaseModel):
    providers: list[AIProvider]
    features: list[FeatureRouting]
    global_config: GlobalAIConfigRead
    usage: UsageStatsRead


class AIProviderTestResponse(BaseModel):
    status: str
    latency_ms: int | None = None
    http_code: int | None = None
    error: str | None = None
    detail: str | None = None
