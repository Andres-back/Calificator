from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.legal.models import LegalAcceptance
from app.modules.users.models import User

TERMS_VERSION = "2026-09-24"
PRIVACY_VERSION = "2026-09-24"
PUBLIC_REGISTRATION_SOURCE = "public_registration"


async def add_public_registration_acceptances(db: AsyncSession, user: User) -> None:
    """Stage immutable legal acceptances in the account-creation transaction."""
    await db.execute(
        insert(LegalAcceptance.__table__),
        [
            {
                "user_id": user.id,
                "document_type": "terms_of_use",
                "document_version": TERMS_VERSION,
                "source": PUBLIC_REGISTRATION_SOURCE,
            },
            {
                "user_id": user.id,
                "document_type": "privacy_policy",
                "document_version": PRIVACY_VERSION,
                "source": PUBLIC_REGISTRATION_SOURCE,
            },
        ],
    )
