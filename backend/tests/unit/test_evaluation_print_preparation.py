"""No inference, HTML input, hidden saves or unbounded layout search."""
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.evaluaciones.print_preparation import PrintPreparationRequest, PrintDraft, candidates, fingerprint, validate_base


def request(**kwargs):
    return PrintPreparationRequest(evaluacion_id=uuid4(), expected_updated_at=datetime.now(timezone.utc),
        configuracion={'distribucion': 'amplia', 'meta_paginas': 1}, **kwargs)


def test_bounded_candidates_preserve_question_overrides_and_color():
    question = str(uuid4())
    value = request()
    value.configuracion.respuestas = {question: {'lineas': 8}}
    results = candidates(value.configuracion)
    assert 1 <= len(results) <= 4
    assert all(item.fuente_pt is None or item.fuente_pt >= 10 for item in results)
    assert all(item.respuestas == value.configuracion.respuestas for item in results)
    assert all(item.blanco_negro == value.configuracion.blanco_negro for item in results)
    assert candidates(request().configuracion.model_copy(update={'meta_paginas': None})) == [request().configuracion.model_copy(update={'meta_paginas': None})]


def test_fingerprint_includes_owner_base_draft_settings_and_never_solution():
    value = request()
    owner = uuid4()
    assert fingerprint(owner, value) == fingerprint(owner, value.model_copy(deep=True))
    assert fingerprint(owner, value) != fingerprint(uuid4(), value)
    assert fingerprint(owner, value) != fingerprint(owner, value.model_copy(update={'borrador': PrintDraft(nombre='Otro título')}))
    with pytest.raises(ValidationError):
        PrintPreparationRequest(**{**value.model_dump(), 'soluciones': True})


def test_draft_rejects_oversized_content_and_unknown_fields():
    with pytest.raises(ValidationError):
        request(borrador={'preguntas': [{'enunciado': 'a' * 300_001}]})
    with pytest.raises(ValidationError):
        request(borrador={'html': '<script>bad</script>'})


def test_stale_base_is_conflict_not_a_silent_save():
    from fastapi import HTTPException
    value = request()
    evaluation = SimpleNamespace(updated_at=value.expected_updated_at, contenido_version_id=None)
    validate_base(evaluation, value)
    evaluation.contenido_version_id = uuid4()
    with pytest.raises(HTTPException) as error:
        validate_base(evaluation, value)
    assert error.value.status_code == 409
