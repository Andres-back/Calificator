"""Batch decisions do not silently edit grades, messages or bearer credentials."""
from decimal import Decimal
import hashlib
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock
import asyncio

from fastapi import HTTPException
import pytest

from app.modules.feedback_sharing.credentials import seal_credential, open_credential
from app.modules.feedback_sharing.batch_policy import batch_score, delivery_message

TOKEN = 'a' * 43
DIGEST = hashlib.sha256(TOKEN.encode()).hexdigest()
MESSAGE = 'Identificaste el personaje. Siguiente paso: relee el segundo párrafo y explica su emoción.'


def test_legacy_publication_rejects_unconfirmed_before_database_access():
    from app.modules.calificaciones.service import publicar_nota
    db = NS(scalar=AsyncMock(side_effect=AssertionError('No database lookup expected')))
    with pytest.raises(HTTPException) as caught:
        asyncio.run(publicar_nota(db, NS(estado='sugerida')))
    assert caught.value.status_code == 409
    db.scalar.assert_not_called()


def test_credential_is_authenticated_encrypted_and_bound_to_digest():
    sealed = seal_credential(TOKEN)
    assert TOKEN not in sealed and sealed.startswith('feedback:v1:')
    assert open_credential(sealed, DIGEST) == TOKEN
    assert seal_credential(TOKEN) != sealed
    for value, digest in [(None, DIGEST), (TOKEN, DIGEST), (sealed[:-4]+'xxxx', DIGEST), (sealed, 'b'*64)]:
        with pytest.raises(HTTPException):
            open_credential(value, digest)


@pytest.mark.parametrize('token', ['', 'a'*42, 'a'*44, 'https://example.test', '/'*43])
def test_malformed_tokens_are_never_persisted(token):
    with pytest.raises(ValueError):
        seal_credential(token)


def test_only_known_technical_preamble_is_separated_from_educational_message():
    source = 'Retroalimentación provisional: requiere revisión docente porque falta información. Borrador basado en el desglose: ' + MESSAGE
    assert delivery_message(source) == MESSAGE
    assert delivery_message(MESSAGE) == MESSAGE
    unknown = 'Retroalimentación provisional: esta respuesta no puede leerse.'
    assert delivery_message(unknown) == unknown
    assert 'requiere revisión' in source  # immutable source string, not rewritten


@pytest.mark.parametrize('state', ['confirmada', 'ajustada', 'publicada'])
def test_confirmed_or_adjusted_value_takes_priority_including_zero(state):
    grade = NS(estado=state, revisado_por_docente=True, nota_confirmada=Decimal('0'), nota_sugerida=Decimal('4'))
    assert batch_score(grade, NS(nota_maxima=5)) == 0


def test_available_suggestion_can_be_explicitly_accepted():
    grade = NS(estado='requiere_revision', revisado_por_docente=False, nota_confirmada=None, nota_sugerida=Decimal('3.5'))
    assert batch_score(grade, NS(nota_maxima=5)) == Decimal('3.5')


@pytest.mark.parametrize('state,score', [('procesando',3), ('en_cola',3), ('anulada',3), ('error',3), ('sugerida',None), ('sugerida',Decimal('NaN')), ('sugerida',6)])
def test_unavailable_or_invalid_result_is_not_turned_into_zero(state,score):
    with pytest.raises(HTTPException):
        batch_score(NS(estado=state,nota_sugerida=score,nota_confirmada=None,revisado_por_docente=False),NS(nota_maxima=5))
