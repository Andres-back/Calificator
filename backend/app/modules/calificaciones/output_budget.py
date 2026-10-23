"""Bound structured grading output by workload, never by a model's name."""

from app.core.config import settings
from app.modules.calificaciones.breakdown_policy import build_component_scaffold


def grading_output_budget(
    blueprint: dict,
    *,
    stage: str = "grading_primary",
    requested: int | None = None,
) -> int:
    ceiling = max(256, int(settings.PHOTO_GRADING_OUTPUT_MAX_TOKENS))
    if requested is not None:
        return min(ceiling, max(256, int(requested)))
    count = len(build_component_scaffold(blueprint))
    verifier = stage == "grading_secondary"
    floor = int(
        settings.PHOTO_GRADING_VERIFIER_MAX_TOKENS
        if verifier
        else settings.PHOTO_GRADING_PRIMARY_MAX_TOKENS
    )
    # Generous reserve for JSON, reasoning and per-answer feedback, even in small
    # activities. It remains a ceiling, not a requested response length; the
    # existing compact prompts and retry count are unchanged.
    estimate = (3072 + 384 * count) if verifier else (4096 + 512 * count)
    estimate = ((estimate + 1023) // 1024) * 1024
    return min(ceiling, max(256, floor, estimate))
