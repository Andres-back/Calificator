"""Auditoría minimizada del ciclo de criterios."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.audit_service import audit


SAFE_EXTRA_FIELDS = frozenset({
    "application_id",
    "page_count",
    "revision",
    "source_id",
    "source_type",
    "target_id",
    "target_type",
    "version",
})


def safe_audit_metadata(extra: dict | None) -> dict:
    """Conserva trazabilidad estructural sin texto, archivos, URLs ni secretos."""
    if not extra:
        return {}
    return {
        key: value
        for key, value in extra.items()
        if key in SAFE_EXTRA_FIELDS and isinstance(value, (str, int, float, bool, type(None)))
    }


async def audit_criteria_event(
    db: AsyncSession,
    *,
    event: str,
    actor_id: UUID,
    set_id: UUID,
    version_id: UUID | None = None,
    extra: dict | None = None,
) -> None:
    metadata = {"criterion_set_id": str(set_id)}
    if version_id:
        metadata["criterion_version_id"] = str(version_id)
    metadata.update(safe_audit_metadata(extra))
    await audit(db, event=f"learning_criteria_{event}", user_id=actor_id, metadata=metadata)
