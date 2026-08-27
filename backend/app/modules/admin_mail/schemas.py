from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr


class MailConfigRead(BaseModel):
    host: str
    port: int
    use_starttls: bool
    username: str
    from_email: EmailStr | None
    configured: bool
    has_password: bool
    source: str
    last_test_status: str | None = None
    last_test_latency_ms: int | None = None
    last_test_error_code: str | None = None
    last_test_at: datetime | None = None


class MailConfigUpdate(BaseModel):
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(ge=1, le=65535)
    use_starttls: bool = True
    username: str = Field(min_length=1, max_length=320)
    from_email: EmailStr
    password: SecretStr | None = None

    model_config = ConfigDict(extra="forbid")


class MailTestResult(BaseModel):
    status: str
    detail: str
    latency_ms: int | None = None
    error_code: str | None = None


class PasswordRecoveryStatus(BaseModel):
    pending: int
    sent_last_24h: int
    failed_last_24h: int


