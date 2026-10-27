from copy import deepcopy
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.modules.evaluaciones.document_schemas import EvaluationDocument
from app.modules.evaluaciones.document_structure import (
    document_context, document_preorder, public_document, validate_document_scope,
)
from tests.fixtures.document_structure import identifier, sample_document


def test_preserves_six_sections_subsections_reading_and_sixteen_distinct_questions():
    raw, questions = sample_document()
    document = EvaluationDocument.model_validate(raw)
    validate_document_scope(document, questions)
    ordered = document_preorder(document)
    assert len([node for node in ordered if node.tipo == 'seccion' and node.padre_id is None]) == 6
    assert len([node for node in ordered if node.tipo == 'seccion' and node.padre_id is not None]) == 2
    assert len([node for node in ordered if node.tipo == 'pregunta']) == 16
    assert [node.etiqueta_original for node in ordered if node.tipo == 'pregunta'].count('1') == 4
    assert len({node.pregunta_id for node in ordered if node.tipo == 'pregunta'}) == 16
    assert next(node for node in ordered if node.proposito == 'lectura').texto.count('\n') == 1
    assert any(node.proposito == 'actividad' for node in ordered)
    assert document.model_dump(mode='json')['revision']['conservados'] == raw['revision']['conservados']


@pytest.mark.parametrize('corruption', ['duplicate_id', 'duplicate_order', 'orphan', 'cycle', 'wrong_parent', 'wrong_kind', 'private_field'])
def test_rejects_invalid_or_ambiguous_document_structure(corruption):
    raw, _ = sample_document()
    if corruption == 'duplicate_id':
        raw['nodos'][1]['id'] = raw['nodos'][0]['id']
    elif corruption == 'duplicate_order':
        raw['nodos'][2]['orden'] = raw['nodos'][1]['orden']
    elif corruption == 'orphan':
        raw['nodos'][0]['padre_id'] = identifier('not-present')
    elif corruption == 'cycle':
        raw['nodos'][0]['padre_id'] = raw['nodos'][0]['id']
    elif corruption == 'wrong_parent':
        raw['nodos'][0]['padre_id'] = raw['nodos'][1]['id']
    elif corruption == 'wrong_kind':
        raw['nodos'][0]['pregunta_id'] = identifier('question:1')
    else:
        raw['nodos'][0]['respuesta_correcta'] = 'private sentinel'
    with pytest.raises(ValidationError):
        EvaluationDocument.model_validate(raw)


@pytest.mark.parametrize('change', ['missing', 'duplicate_reference', 'foreign', 'duplicate_canonical_number'])
def test_references_cover_each_local_question_once(change):
    raw, questions = sample_document()
    question_nodes = [node for node in raw['nodos'] if node['tipo'] == 'pregunta']
    if change == 'missing':
        raw['nodos'].remove(question_nodes[-1])
    elif change == 'duplicate_reference':
        question_nodes[-1]['pregunta_id'] = question_nodes[0]['pregunta_id']
    elif change == 'foreign':
        question_nodes[-1]['pregunta_id'] = identifier('foreign-question')
    else:
        questions[-1]['numero'] = questions[0]['numero']
    with pytest.raises(ValueError):
        validate_document_scope(EvaluationDocument.model_validate(raw), questions)


def test_known_omission_cannot_be_reported_as_complete():
    raw, _ = sample_document()
    raw['revision']['conservados'].pop()
    with pytest.raises(ValidationError):
        EvaluationDocument.model_validate(raw)


def test_teacher_can_explicitly_exclude_source_but_never_silently_drop_it():
    raw, _ = sample_document()
    removed = next(node for node in raw['nodos'] if node.get('proposito') == 'actividad')
    raw['nodos'].remove(removed)
    source_id = removed['fuente_ids'][0]
    raw['revision']['conservados'].remove(source_id)
    raw['revision']['exclusiones'] = [{'elemento_id': source_id,
        'motivo': 'El docente retiró esta actividad de la copia.', 'confirmado': True}]
    document = EvaluationDocument.model_validate(raw)
    assert document.revision.exclusiones[0].elemento_id == source_id
    raw['revision']['exclusiones'][0]['confirmado'] = False
    with pytest.raises(ValidationError):
        EvaluationDocument.model_validate(raw)
    raw['revision']['exclusiones'][0].update(confirmado=True, elemento_id='foreign-source')
    with pytest.raises(ValidationError):
        EvaluationDocument.model_validate(raw)


def test_student_projection_has_no_provenance_review_or_private_payload():
    raw, questions = sample_document()
    document = EvaluationDocument.model_validate(raw)
    projection = public_document(document, questions)
    assert 'revision' not in projection
    assert all('fuente_ids' not in node for node in projection['nodos'])
    assert len(projection['nodos']) == len(raw['nodos'])
    assert 'respuesta_correcta' not in str(projection)
    assert 'respuestas_esperadas' not in str(projection)


def test_unconfirmed_document_is_not_a_public_projection():
    raw, questions = sample_document()
    raw['revision'].update(estado='requiere_revision', confirmado=False)
    with pytest.raises(ValueError, match='[Rr]evis'):
        public_document(EvaluationDocument.model_validate(raw), questions)


def test_context_uses_frozen_document_and_preserves_educational_text_only():
    raw, questions = sample_document()
    snapshot = {'estructura_documento': raw, 'preguntas': questions,
                'respuestas_esperadas': [{'numero': 1, 'respuesta': 'PRIVATE_KEY_SENTINEL'}]}
    text = document_context(snapshot)
    assert 'Una semilla llegó al jardín' in text
    assert 'Comparen sus ideas' in text
    assert 'PRIVATE_KEY_SENTINEL' not in text
    assert 'source:' not in text
    assert 'Pregunta 16' in text
    with pytest.raises(ValueError, match='límite'):
        document_context(snapshot, max_chars=20)
    assert raw == deepcopy(snapshot['estructura_documento'])


def test_legacy_document_absence_is_not_mutated_or_invented():
    legacy = SimpleNamespace(preguntas=[{'numero': 1, 'enunciado': 'Texto plano'}])
    assert document_context(legacy) == ''
    assert not hasattr(legacy, 'estructura_documento')


def test_optional_storage_and_closed_public_read_contract_are_additive():
    from app.modules.evaluaciones.document_schemas import PublicEvaluationDocument
    from app.modules.evaluaciones.models import Evaluacion
    from app.modules.evaluaciones.schemas import EvaluacionCreate, EvaluacionUpdate
    from uuid import uuid4

    assert Evaluacion.__table__.c.estructura_documento.nullable
    assert 'estructura_documento' not in EvaluacionUpdate(nombre='Sin cambio documental').model_dump(exclude_unset=True)
    request = EvaluacionCreate(materia_id=uuid4(), nombre='Evaluación plana')
    assert request.estructura_documento is None
    raw, questions = sample_document()
    projection = public_document(EvaluationDocument.model_validate(raw), questions)
    assert 'revision' not in PublicEvaluationDocument.model_validate(projection).model_dump()
    with pytest.raises(ValidationError):
        PublicEvaluationDocument.model_validate(raw)


def test_tree_depth_is_bounded_and_input_order_does_not_replace_explicit_order():
    raw, questions = sample_document()
    expected = [str(node.id) for node in document_preorder(EvaluationDocument.model_validate(raw))]
    raw['nodos'].reverse()
    assert [str(node.id) for node in document_preorder(EvaluationDocument.model_validate(raw))] == expected
    validate_document_scope(EvaluationDocument.model_validate(raw), questions)
    parent = None
    raw['nodos'] = []
    for index in range(10):
        item = {'id': identifier(f'depth:{index}'), 'tipo': 'seccion', 'orden': 0,
                'padre_id': parent, 'titulo': f'Nivel {index}'}
        raw['nodos'].append(item)
        parent = item['id']
    with pytest.raises(ValidationError, match='profundidad'):
        EvaluationDocument.model_validate(raw)
