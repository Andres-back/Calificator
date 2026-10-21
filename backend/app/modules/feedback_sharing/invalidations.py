"""Suspensión en la transacción académica, sin dependencia circular de servicios."""
from uuid import UUID

from sqlalchemy import func, text, update

from app.core.config import settings
from app.modules.feedback_sharing.models import FeedbackPublication


async def suspend_grade_publications(db, grade_id: UUID) -> None:
    if not settings.FEEDBACK_SHARING_ENABLED:
        return
    ids = list((await db.scalars(update(FeedbackPublication).where(
        FeedbackPublication.calificacion_id == grade_id,
        FeedbackPublication.state == "authorized",
    ).values(state="suspended", suspended_at=func.clock_timestamp()).returning(FeedbackPublication.id))).all())
    for publication_id in ids:
        await db.execute(text("INSERT INTO audit_events(event,entity_type,entity_id,metadata) VALUES ('feedback_suspended','feedback_publication',:id,'{}'::jsonb)"), {"id": str(publication_id)})
