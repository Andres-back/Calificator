from copy import deepcopy
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.evaluaciones.print_settings import PrintSettings, resolve_print_settings, validate_print_scope


@pytest.mark.parametrize('mode,font,lines', [('compacta', 10.5, 2), ('media', 12, 3), ('amplia', 14, 5)])
def test_three_distribution_modes_are_independent_of_color(mode, font, lines):
    settings = PrintSettings(distribucion=mode, blanco_negro=False)
    resolved = resolve_print_settings(settings)
    assert (resolved.fuente_pt, resolved.lineas_abierta, resolved.blanco_negro) == (font, lines, False)
    assert resolve_print_settings(None) is None  # Legacy is NOT the new default.


@pytest.mark.parametrize('value', [9, 19, float('nan'), float('inf'), True, '12'])
def test_font_range_is_strict_and_finite(value):
    with pytest.raises(ValidationError):
        PrintSettings(fuente_pt=value)


@pytest.mark.parametrize('value', [0, 21, True, '2'])
def test_page_target_is_bounded(value):
    with pytest.raises(ValidationError):
        PrintSettings(meta_paginas=value)


def test_unknown_fields_and_scope_are_not_silently_ignored():
    question, block = uuid4(), uuid4()
    settings = PrintSettings.model_validate({'respuestas': {str(question): {'lineas': 3}},
        'materiales': {str(block): {'ancho_porcentaje': 35, 'disposicion': 'lateral'}}})
    before = deepcopy(settings.model_dump(mode='json'))
    validate_print_scope(settings, [{'contenido_id': str(question)}], {'bloques': [{'id': str(block)}]})
    assert settings.model_dump(mode='json') == before
    with pytest.raises(ValueError, match='pregunta'):
        validate_print_scope(settings, [], {'bloques': [{'id': str(block)}]})
    with pytest.raises(ValueError, match='material'):
        validate_print_scope(settings, [{'contenido_id': str(question)}], None)
    with pytest.raises(ValidationError):
        PrintSettings(foo='ignored')


def test_response_spaces_and_material_sizes_are_bounded():
    for response in ({'lineas': 0}, {'lineas': 13}, {'dibujo_mm': 29}, {'dibujo_mm': 101}):
        with pytest.raises(ValidationError):
            PrintSettings(respuestas={uuid4(): response})
    for size in (24, 101, True):
        with pytest.raises(ValidationError):
            PrintSettings(materiales={uuid4(): {'ancho_porcentaje': size}})


def test_presets_do_not_override_explicit_font_and_print_json_has_no_key():
    value = PrintSettings(distribucion='amplia', fuente_pt=11)
    assert resolve_print_settings(value).fuente_pt == 11
    assert 'respuesta_correcta' not in value.model_dump_json()
