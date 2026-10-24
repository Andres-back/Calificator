"""Recoverable teacher copies; public authentication still uses the digest."""
import base64
import hashlib
import hmac
import re

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException

from app.core.config import settings

PREFIX = 'feedback:v1:'


def _cipher():
    key = hmac.new(settings.SECRET_KEY.encode('utf-8'), b'xcalificator:feedback-link-copy:v1', hashlib.sha256).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def seal_credential(token: str) -> str:
    if not re.fullmatch(r'[A-Za-z0-9_-]{43}', token):
        raise ValueError('Malformed feedback credential')
    return PREFIX + _cipher().encrypt(token.encode('ascii')).decode('ascii')


def open_credential(sealed: str | None, expected_digest: str) -> str:
    try:
        if not sealed or not sealed.startswith(PREFIX):
            raise ValueError('unrecoverable')
        token = _cipher().decrypt(sealed[len(PREFIX):].encode('ascii')).decode('ascii')
        if not re.fullmatch(r'[A-Za-z0-9_-]{43}', token):
            raise ValueError('invalid')
        if not hmac.compare_digest(hashlib.sha256(token.encode()).hexdigest(), expected_digest):
            raise ValueError('replaced')
        return token
    except (InvalidToken, ValueError, UnicodeError):
        raise HTTPException(409, 'No podemos recuperar la copia de este enlace. Puedes reemplazarlo de forma explícita desde sus opciones.') from None
