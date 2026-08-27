import asyncio
from datetime import timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.core.security import create_access_token, decode_token_claims
from app.modules.auth.password_recovery_service import (
    build_reset_token,
    consume_password_reset_token,
    hash_reset_token,
    parse_reset_token,
    utcnow,
)
from app.shared.enums import UserEstado


class FakeSession:
    def __init__(self, request, user):
        self.request = request
        self.user = user
        self.commits = 0

    async def scalar(self, _query):
        return self.request

    async def get(self, _model, _identifier):
        return self.user

    async def execute(self, _query):
        return SimpleNamespace(rowcount=1)

    async def commit(self):
        self.commits += 1

    async def refresh(self, _value):
        return None


def reset_fixture(*, expired: bool = False):
    request_id = uuid4()
    token = build_reset_token(request_id)
    request = SimpleNamespace(
        id=request_id,
        user_id=uuid4(),
        token_hash=hash_reset_token(token),
        expires_at=utcnow() + timedelta(minutes=-1 if expired else 10),
        consumed_at=None,
        invalidated_at=None,
    )
    user = SimpleNamespace(
        id=request.user_id,
        estado=UserEstado.ACTIVO.value,
        password_hash="old",
        auth_version=1,
    )
    return token, request, user


def test_reset_token_is_signed_and_tamper_evident():
    request_id = uuid4()
    token = build_reset_token(request_id)
    assert parse_reset_token(token) == request_id
    with pytest.raises(ValueError):
        parse_reset_token(token[:-1] + ("A" if token[-1] != "A" else "B"))


def test_reset_token_expires_and_can_only_be_consumed_once():
    async def scenario():
        expired_token, expired, user = reset_fixture(expired=True)
        with pytest.raises(ValueError):
            await consume_password_reset_token(
                FakeSession(expired, user),
                token=expired_token,
                password="new-password",
            )

        token, request, active_user = reset_fixture()
        db = FakeSession(request, active_user)
        await consume_password_reset_token(db, token=token, password="new-password")
        assert request.consumed_at is not None
        assert active_user.auth_version == 2
        assert active_user.password_hash != "old"
        assert db.commits == 1

        with pytest.raises(ValueError):
            await consume_password_reset_token(
                db,
                token=token,
                password="again-password",
            )

    asyncio.run(scenario())


def test_session_tokens_carry_a_compatible_auth_version():
    user_id = uuid4()
    token = create_access_token(user_id, auth_version=4)
    assert decode_token_claims(token) == (user_id, 4)