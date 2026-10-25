from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.feedback_sharing.conversation import conversation_digest, conversation_scope, read_cursor, seal_cursor


def context():
    return SimpleNamespace(access=SimpleNamespace(id=uuid4(), credential_generation=1), publication=SimpleNamespace(id=uuid4()))


def test_scope_and_digest_are_stable_separated_and_scoped():
    first, other, visitor = context(), context(), str(uuid4())
    assert len(conversation_scope(first)) == 64
    assert conversation_scope(first) == conversation_scope(first)
    assert conversation_scope(first) != conversation_scope(other)
    assert conversation_digest(first, visitor) != conversation_scope(first)
    assert conversation_digest(first, visitor) != conversation_digest(other, visitor)
    assert conversation_digest(first, visitor) != conversation_digest(first, str(uuid4()))
    old = conversation_scope(first)
    first.access.credential_generation += 1
    assert conversation_scope(first) != old
    assert conversation_digest(first, None) is None


@pytest.mark.parametrize('value', ['', 'x' * 5000, str(uuid4()).upper(), '00000000-0000-0000-0000-000000000000'])
def test_invalid_identity_is_rejected(value):
    with pytest.raises(HTTPException) as error:
        conversation_digest(context(), value)
    assert error.value.status_code == 400


def test_cursor_is_opaque_bounded_and_bound_to_conversation():
    first, visitor = context(), str(uuid4())
    scope = conversation_digest(first, visitor)
    stamp, row_id = datetime.now(timezone.utc), uuid4()
    cursor = seal_cursor(scope, stamp, row_id)
    assert str(row_id) not in cursor and scope not in cursor
    assert read_cursor(cursor, scope) == (stamp, row_id)
    for invalid, identity in [(cursor, conversation_digest(first, str(uuid4()))), (cursor[:-3], scope), ('x' * 3000, scope)]:
        with pytest.raises(HTTPException) as error:
            read_cursor(invalid, identity)
        assert error.value.status_code == 400
