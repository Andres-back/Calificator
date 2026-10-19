import json
from pathlib import Path

import pytest

from app.modules.xali.visual_content import clean_envelope, split_response, wire_response

FIXTURES = json.loads((Path(__file__).resolve().parents[3] / 'specs/104-xali-docente-visual/fixtures/visuales.json').read_text(encoding='utf-8'))


@pytest.mark.parametrize('visual', FIXTURES['validos'])
def test_accepts_valid_visuals(visual):
    assert len(clean_envelope({'version': 1, 'visuales': [visual]})['visuales']) == 1


@pytest.mark.parametrize('visual', FIXTURES['invalidos'])
def test_rejects_invalid_visuals_without_executing(visual):
    assert clean_envelope({'version': 1, 'visuales': [visual]})['visuales'] == []


def test_round_trip_and_preserves_plain_history():
    envelope = clean_envelope({'version': 1, 'visuales': [FIXTURES['validos'][0]]})
    message = wire_response('Explicación.', envelope)
    text, restored = split_response(message)
    assert text == 'Explicación.'
    assert restored['visuales'] == envelope['visuales']
    assert split_response('Texto antiguo.')[0] == 'Texto antiguo.'


@pytest.mark.parametrize('data', [
    {'version': True, 'visuales': []}, {'version': 2, 'visuales': []},
    {'version': 1, 'visuales': FIXTURES['validos']},
    {'version': 1, 'visuales': [], 'execute': 'bad'},
    {'version': 1, 'visuales': [dict(FIXTURES['validos'][0], filas=[[float('nan'), 1, 2]])]},
])
def test_invalid_envelopes_are_safe(data):
    assert clean_envelope(data)['visuales'] == []


def test_bad_or_multiple_blocks_preserve_explanation_and_notice():
    text, envelope = split_response('Útil.\n```xcalificator-visual-v1\n{bad}\n```')
    assert 'Útil.' in text
    assert envelope['avisos']
    assert not envelope['visuales']
    text, envelope = split_response('Útil.\n```xcalificator-visual-v2\n{}\n```')
    assert text == 'Útil.' and envelope['avisos']
