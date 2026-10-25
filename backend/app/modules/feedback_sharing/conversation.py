"""Browser continuity without storing bearer credentials or reader identity."""
import base64
from datetime import datetime
import hashlib
import hmac
import json
from uuid import UUID

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException

from app.core.config import settings


def _key(purpose):
    return hmac.new(settings.SECRET_KEY.encode(), f'xcalificator:feedback-conversation:v1:{purpose}'.encode(), hashlib.sha256).digest()


def _scope(context):
    return f'{context.access.id}:{context.publication.id}:{context.access.credential_generation}'


def conversation_scope(context):
    return hmac.new(_key('scope'), _scope(context).encode(), hashlib.sha256).hexdigest()


def conversation_digest(context, visitor):
    if visitor is None:
        return None
    try:
        identity = UUID(visitor)
        if identity.version != 4 or str(identity) != visitor:
            raise ValueError('invalid')
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(400, 'No pudimos reconocer esta conversación. Vuelve a abrir el enlace.') from None
    return hmac.new(_key('reader'), f'{_scope(context)}:{identity}'.encode(), hashlib.sha256).hexdigest()


def _cipher():
    return Fernet(base64.urlsafe_b64encode(_key('cursor')))


def seal_cursor(digest, accepted_at, request_id):
    data = json.dumps([digest, accepted_at.isoformat(), str(request_id)], separators=(',', ':')).encode()
    return _cipher().encrypt(data).decode('ascii')


def read_cursor(cursor, digest):
    try:
        if not cursor or len(cursor) > 1024:
            raise ValueError('invalid')
        scope, stamp, request_id = json.loads(_cipher().decrypt(cursor.encode('ascii')))
        if not isinstance(scope, str) or not hmac.compare_digest(scope, digest):
            raise ValueError('scope')
        date = datetime.fromisoformat(stamp)
        if date.tzinfo is None:
            raise ValueError('date')
        return date, UUID(request_id)
    except (InvalidToken, ValueError, TypeError, UnicodeError):
        raise HTTPException(400, 'No pudimos recuperar esa parte de la conversación. Actualízala e inténtalo de nuevo.') from None
