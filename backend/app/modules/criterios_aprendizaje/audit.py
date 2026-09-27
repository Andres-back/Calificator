"""Auditoría minimizada del ciclo de criterios."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.audit_service import audit


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
    if extra:
        metadata.update(extra)
    await audit(db, event=f"learning_criteria_{event}", user_id=actor_id, metadata=metadata)
