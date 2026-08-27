from functools import lru_cache
from urllib.parse import urlparse

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENV: str = "development"
    ENVIRONMENT: str | None = None
    APP_NAME: str = "XCalificator"
    API_PREFIX: str = "/api"
    SECRET_KEY: str = "change-me"
    JWT_SECRET: str | None = None
    COOKIE_SECURE: bool | None = None
    JWT_ACCESS_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 7
    JWT_EXPIRY: int | None = None
    JWT_REFRESH_EXPIRY: int | None = None

    DATABASE_URL: str = (
        "postgresql+asyncpg://xcalificator:change-me@postgres:5432/xcalificator"
    )
    DISABLE_DB_POOL: bool = False
    REDIS_URL: str = "redis://redis:6379/0"

    UPLOADS_DIR: str = "/app/uploads"
    UPLOAD_DIR: str | None = None
    PUBLIC_UPLOADS_BASE_URL: str = "/uploads"
    MAX_IMAGE_SIZE_MB: int = 10
    MAX_EVIDENCE_FILES: int = 10
    MAX_EVIDENCE_FILE_MB: int = 10
    MAX_EVIDENCE_TOTAL_MB: int = 40
    MAX_GRADING_PDF_PAGES: int = 20
    GRADING_PDF_RENDER_DPI: int = 150

    CORS_ORIGINS: str = (
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    )
    TRUSTED_HOSTS: str = "localhost,127.0.0.1,testserver"
    ENABLE_API_DOCS: bool | None = None

    # AI providers
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4.1-mini"
    OPENAI_TIMEOUT_SECONDS: int = 60
    OPENAI_IMAGE_MODEL: str = "gpt-image-2"
    # gpt-image admite quality low|medium|high|auto. "low" = mas barato (slides).
    OPENAI_IMAGE_QUALITY: str = "low"
    OPENAI_IMAGE_TIMEOUT_SECONDS: int = 45

    CLOUDFLARE_API_TOKEN: str = ""
    CLOUDFLARE_ACCOUNT_ID: str = ""
    CLOUDFLARE_IMAGE_MODEL: str = "@cf/bytedance/stable-diffusion-xl-lightning"
    CLOUDFLARE_IMAGE_FALLBACK_MODEL: str = "@cf/stabilityai/stable-diffusion-xl-base-1.0"
    CLOUDFLARE_TIMEOUT_SECONDS: int = 45

    OPEN_CODE_API_KEY: str = ""
    OPEN_CODE_BASE_URL: str = "https://opencode.ai/zen/go/v1"
    OPEN_CODE_MODEL: str = "deepseek-v4-flash"
    OPEN_CODE_MAX_TOKENS: int = 8192
    OPEN_CODE_PRESENTATION_MODEL: str = "qwen3.7-plus"
    OPEN_CODE_PRESENTATION_TIMEOUT_SECONDS: int = 120
    OPEN_CODE_PRESENTATION_MAX_TOKENS: int = 8192
    OPEN_CODE_DIGITALIZATION_VISION_MODEL: str = "deepseek-v4-flash-vision-exp"
    OPEN_CODE_DIGITALIZATION_VISION_TIMEOUT_SECONDS: int = 60
    OPEN_CODE_DIGITALIZATION_MODEL: str = "deepseek-v4-flash"
    OPEN_CODE_DIGITALIZATION_TIMEOUT_SECONDS: int = 60
    OPEN_CODE_DIGITALIZATION_MAX_TOKENS: int = 3072
    # Compatibilidad con despliegues anteriores; ya no cancela el job.
    DIGITALIZATION_TOTAL_TIMEOUT_SECONDS: int = 180
    OPEN_CODE_TIMEOUT_SECONDS: int = 45
    # Transporte: una inferencia aceptada espera sin read-timeout. Estos límites
    # detectan únicamente conexión, escritura o espera de pool realmente rotas.
    AI_PROVIDER_CONNECT_TIMEOUT_SECONDS: int = 15
    AI_PROVIDER_WRITE_TIMEOUT_SECONDS: int = 60
    AI_PROVIDER_POOL_TIMEOUT_SECONDS: int = 30
    VISION_PROVIDER: str = "opencode"
    VISION_MODEL: str = "deepseek-v4-flash-vision-exp"
    VISION_TIMEOUT_SECONDS: int = 90
    VISION_TOTAL_TIMEOUT_SECONDS: int = 240
    VISION_MAX_RETRIES: int = 1
    VISION_FALLBACK_ENABLED: bool = True
    VISION_FALLBACK_MODELS: str = "qwen3.7-plus,mimo-v2.5"
    VISION_MAX_CONCURRENCY: int = 3
    VISION_MAX_IMAGE_SIDE: int = 2200
    VISION_MAX_TOKENS: int = 3072
    DIGITALIZATION_SLOW_WARNING_SECONDS: int = 90
    PHOTO_GRADING_SLOW_WARNING_SECONDS: int = 90
    PHOTO_GRADING_VISION_MODEL: str = "deepseek-v4-flash-vision-exp"
    PHOTO_GRADING_VISION_FALLBACK_MODEL: str = "qwen3.6-plus"
    PHOTO_GRADING_VISION_LAST_RESORT_MODEL: str = "mimo-v2.5"
    PHOTO_GRADING_TEXT_MODEL: str = "deepseek-v4-flash-vision-exp"
    PHOTO_GRADING_VERIFIER_MODEL: str = "deepseek-v4-flash-vision-exp"
    # Qwen queda como contingencia independiente si DeepSeek no produce contrato.
    PHOTO_GRADING_TEXT_REVIEW_MODEL: str = "qwen3.7-plus"
    PHOTO_GRADING_COMPARATOR_MODEL: str = "deepseek-v4-pro"
    PHOTO_GRADING_CROSS_PROVIDER_FALLBACK_ENABLED: bool = False
    # Nombres legacy conservados para compatibilidad; son umbrales observacionales.
    PHOTO_GRADING_VISION_TIMEOUT_SECONDS: int = 75
    PHOTO_GRADING_GRADERS_TIMEOUT_SECONDS: int = 45
    PHOTO_GRADING_VERIFIER_TIMEOUT_SECONDS: int = 20
    PHOTO_GRADING_ARBITER_TIMEOUT_SECONDS: int = 30
    PHOTO_GRADING_PRIMARY_MAX_TOKENS: int = 3072
    PHOTO_GRADING_VERIFIER_MAX_TOKENS: int = 1536
    PHOTO_GRADING_ARBITRATION_MIN_CONFIDENCE: float = 0.75
    PHOTO_GRADING_ARBITRATION_SCORE_DELTA: float = 0.5
    PHOTO_GRADING_MODEL_MAX_ATTEMPTS: int = 1
    # Compatibilidad con despliegues anteriores; ya no cancela el pipeline.
    PHOTO_GRADING_TOTAL_TIMEOUT_SECONDS: int = 180
    AI_JOB_QUEUED_RECOVERY_SECONDS: int = 300
    AI_JOB_RECOVERY_INTERVAL_SECONDS: int = 60
    AI_JOB_RECOVERY_BATCH_SIZE: int = 25
    EXPLAINABLE_GRADING_GENERATION_ENABLED: bool = True
    EXPLAINABLE_GRADING_AUTHORITY_ENABLED: bool = False

    GROQ_API_KEY: str = ""
    # llama-3.1-70b-versatile fue dado de baja por Groq; usar el sucesor vigente.
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_TIMEOUT_SECONDS: int = 30
    OCR_GROQ_FALLBACK_MODEL: str = "meta-llama/llama-4-scout-17b-16e-instruct"

    OLLAMA_ENDPOINT: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"
    OLLAMA_TIMEOUT_SECONDS: int = 120

    EMBEDDING_PROVIDER: str = "openai"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536


    MAX_PRESENTATION_PARALLEL_JOBS: int = 5
    MAX_LLM_CONCURRENT_CALLS: int = 10
    RATE_LIMIT_CHAT_SECONDS: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    def model_post_init(self, __context: object) -> None:
        if self.ENVIRONMENT and self.ENV == "development":
            self.ENV = self.ENVIRONMENT
        self.ENV = self.ENV.strip().lower()
        if self.ENABLE_API_DOCS is None:
            self.ENABLE_API_DOCS = self.ENV != "production"
        if self.JWT_SECRET and self.SECRET_KEY == "change-me":
            self.SECRET_KEY = self.JWT_SECRET
        if self.JWT_EXPIRY and self.JWT_ACCESS_EXPIRE_MINUTES == 60:
            self.JWT_ACCESS_EXPIRE_MINUTES = max(1, self.JWT_EXPIRY // 60)
        if self.JWT_REFRESH_EXPIRY and self.JWT_REFRESH_EXPIRE_DAYS == 7:
            self.JWT_REFRESH_EXPIRE_DAYS = max(1, self.JWT_REFRESH_EXPIRY // 86400)
        if self.UPLOAD_DIR and self.UPLOADS_DIR == "/app/uploads":
            self.UPLOADS_DIR = self.UPLOAD_DIR
        self._validate_production_settings()

    def _validate_production_settings(self) -> None:
        if self.ENV != "production":
            return

        invalid: list[str] = []
        if len(self.SECRET_KEY) < 32 or self.SECRET_KEY.lower() in {"change-me", "secret"}:
            invalid.append("SECRET_KEY/JWT_SECRET must contain at least 32 non-default characters")
        if "change-me" in self.DATABASE_URL.lower():
            invalid.append("DATABASE_URL still contains the default password")

        redis_url = urlparse(self.REDIS_URL)
        if not redis_url.password:
            invalid.append("REDIS_URL must include a password")

        if "*" in self.trusted_hosts:
            invalid.append("TRUSTED_HOSTS cannot contain '*' in production")

        if invalid:
            raise ValueError("Invalid production configuration: " + "; ".join(invalid))

    @property
    def cookie_secure(self) -> bool:
        if self.COOKIE_SECURE is not None:
            return self.COOKIE_SECURE
        return self.ENV == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def trusted_hosts(self) -> list[str]:
        return [host.strip() for host in self.TRUSTED_HOSTS.split(",") if host.strip()]
    @property
    def vision_fallback_models(self) -> list[str]:
        return [model.strip() for model in self.VISION_FALLBACK_MODELS.split(",") if model.strip()]



@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
