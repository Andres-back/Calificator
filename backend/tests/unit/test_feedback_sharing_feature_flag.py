from unittest.mock import AsyncMock

from fastapi import HTTPException
import pytest

from app.core.config import Settings, settings
from app.modules.feedback_sharing.access_policy import guard_token
from app.modules.feedback_sharing.invalidations import suspend_grade_publications


def test_feature_is_disabled_by_default_without_environment():
    assert Settings.model_fields["FEEDBACK_SHARING_ENABLED"].default is False


@pytest.mark.asyncio
async def test_disabled_surface_does_not_query_new_schema(monkeypatch):
    monkeypatch.setattr(settings, "FEEDBACK_SHARING_ENABLED", False)
    db = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        await guard_token(db, "synthetic-not-a-token")
    assert exc.value.status_code == 404
    await suspend_grade_publications(db, None)
    db.execute.assert_not_awaited()
    db.scalar.assert_not_awaited()
    db.scalars.assert_not_awaited()
