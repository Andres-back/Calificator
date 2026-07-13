from uuid import uuid4

import pytest

from app.core.security import create_access_token, create_refresh_token, decode_token


def test_access_token_round_trip_keeps_subject() -> None:
    subject = uuid4()

    token = create_access_token(subject)

    assert decode_token(token) == subject


def test_refresh_token_cannot_be_used_as_access_token() -> None:
    token = create_refresh_token(uuid4())

    with pytest.raises(ValueError, match="Invalid token type"):
        decode_token(token)
