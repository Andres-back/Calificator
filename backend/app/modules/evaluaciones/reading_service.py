"""Public reading text, independent of private answer keys and feedback rules."""
from typing import Any

MAX_READING_CHARS = 60_000


def normalize_reading(value: Any) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or len(value) > MAX_READING_CHARS:
        raise ValueError('La lectura debe ser texto de hasta 60.000 caracteres.')
    return value.strip() or None


def evaluation_reading(evaluation: Any) -> str | None:
    """Supports live ORM objects and immutable export/grading snapshot dicts."""
    blueprint = evaluation.get('blueprint') if isinstance(evaluation, dict) else getattr(evaluation, 'blueprint', None)
    rules = blueprint.get('reglas_feedback') if isinstance(blueprint, dict) else getattr(blueprint, 'reglas_feedback', None)
    value = rules.get('lectura') if isinstance(rules, dict) else None
    if not isinstance(value, str):
        return None
    return value.strip() or None
