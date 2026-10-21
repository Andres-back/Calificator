"""Purge only temporary conversation text, retaining audit/idempotency/quota."""
from datetime import timedelta

from sqlalchemy import and_, or_, select, update

from app.modules.feedback_sharing.access_policy import db_now
from app.modules.feedback_sharing.models import FeedbackAccess, FeedbackChatRequest, FeedbackPublication


async def purge_expired_conversations(db, *, now=None, limit=100):
    now = now or await db_now(db)
    cutoff = now - timedelta(days=30)
    has_text = select(FeedbackChatRequest.id).where(
        FeedbackChatRequest.access_id == FeedbackAccess.id,
        FeedbackChatRequest.status.in_(['succeeded', 'failed', 'closed']),
        FeedbackChatRequest.accepted_at <= cutoff,
        or_(FeedbackChatRequest.message.is_not(None), FeedbackChatRequest.response.is_not(None)),
    ).exists()
    candidates = (await db.execute(select(FeedbackAccess.id, FeedbackAccess.publication_id).join(FeedbackPublication, FeedbackPublication.id == FeedbackAccess.publication_id).where(
        or_(
            and_(FeedbackAccess.state == 'disabled', FeedbackAccess.disabled_at <= cutoff),
            and_(FeedbackAccess.state != 'disabled', FeedbackPublication.state == 'suspended', FeedbackPublication.suspended_at <= cutoff),
            and_(FeedbackAccess.state != 'disabled', FeedbackPublication.state != 'suspended', FeedbackAccess.expires_at <= cutoff),
        ),
        has_text,
    ).order_by(FeedbackAccess.id).limit(limit))).all()
    purged = 0
    for access_id, publication_id in candidates:
        # Same ordering as reactivation: publication -> access -> request.
        publication = await db.scalar(select(FeedbackPublication).where(FeedbackPublication.id == publication_id).with_for_update(skip_locked=True).execution_options(populate_existing=True))
        if publication is None:
            continue
        access = await db.scalar(select(FeedbackAccess).where(FeedbackAccess.id == access_id).with_for_update(skip_locked=True).execution_options(populate_existing=True))
        if access is None or access.publication_id != publication_id:
            continue
        if access.state == 'disabled':
            closed_at = access.disabled_at
        elif publication.state == 'suspended':
            closed_at = publication.suspended_at
        else:
            closed_at = access.expires_at if access.expires_at <= now else None
        if closed_at is None or closed_at > cutoff:
            continue
        result = await db.execute(update(FeedbackChatRequest).where(
            FeedbackChatRequest.access_id == access.id,
            FeedbackChatRequest.status.in_(['succeeded', 'failed', 'closed']),
            FeedbackChatRequest.accepted_at <= cutoff,
            or_(FeedbackChatRequest.message.is_not(None), FeedbackChatRequest.response.is_not(None)),
        ).values(message=None, response=None))
        purged += result.rowcount
    return purged
