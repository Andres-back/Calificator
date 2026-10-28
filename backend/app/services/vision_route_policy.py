"""Provider-neutral controls for the administered evidence-reading stage."""

from pydantic import BaseModel, ConfigDict, Field

READING_FEATURE = "calificacion.extraccion"


class VisionRuntimeLimits(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    call_timeout_seconds: int = Field(default=60, ge=5, le=60)
    max_attempts: int = Field(default=2, ge=1, le=2)
    max_output_tokens: int = Field(default=10000, ge=1024, le=10000)


def effective_runtime_limits(value) -> VisionRuntimeLimits:
    """Only null/absence adopts defaults; invalid falsey values must be rejected."""
    return VisionRuntimeLimits.model_validate({} if value is None else value)


def validate_runtime_limits(feature: str, value):
    if value is None:
        return None
    if feature != READING_FEATURE:
        raise ValueError(
            "Los controles de lectura solo se admiten en la lectura visual de calificación."
        )
    return VisionRuntimeLimits.model_validate(value).model_dump()
