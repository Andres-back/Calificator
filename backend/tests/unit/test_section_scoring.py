from copy import deepcopy
from decimal import Decimal
from uuid import UUID

import pytest

from app.modules.evaluaciones.document_schemas import EvaluationDocument
from app.modules.evaluaciones.document_structure import compile_section_scores, apply_section_scoring
from tests.fixtures.document_structure import identifier


def example():
    sections = [identifier(f'group:{i}') for i in range(3)]
    questions, nodes = [], []
    for i, size in enumerate([3, 2, 1]):
        nodes.append({'id': sections[i], 'padre_id': None, 'orden': i, 'tipo': 'seccion', 'titulo': f'Sección {i + 1}'})
        for j in range(size):
            number = len(questions) + 1
            qid = identifier(f'q:{number}')
            questions.append({'numero': number, 'contenido_id': qid, 'puntaje': '1' if number == 6 else '0.8'})
            nodes.append({'id': identifier(f'node:{number}'), 'tipo': 'pregunta', 'pregunta_id': qid,
                          'padre_id': sections[i], 'orden': j})
    document = EvaluationDocument.model_validate({'nodos': nodes, 'puntuacion_secciones': {
        'presupuestos': dict(zip(sections, ['2', '2', '1'])),
        'pesos_base': {q['contenido_id']: q['puntaje'] for q in questions}, 'confirmado': True}})
    return document, questions, sections


def test_exact_largest_remainders_and_repeat_without_drift_or_double_weighting():
    document, questions, _ = example()
    before = deepcopy(questions)
    first = compile_section_scores(document, questions, Decimal('5'))
    assert [q['puntaje'] for q in first] == ['0.67', '0.67', '0.66', '1.00', '1.00', '1.00']
    assert sum(Decimal(q['puntaje']) for q in first) == 5
    assert compile_section_scores(document, first, Decimal('5')) == first
    assert questions == before
    assert sum([Decimal('1.5'), Decimal('1'), Decimal('.5')]) == Decimal('3')


@pytest.mark.parametrize('case', ['sum', 'empty', 'foreign', 'weight_missing', 'unconfirmed', 'too_small', 'overlap', 'uncovered', 'zero'])
def test_invalid_budgets_do_not_reweight_a_question(case):
    document, questions, sections = example()
    raw = document.model_dump(mode='json')
    budget = raw['puntuacion_secciones']
    if case == 'sum': budget['presupuestos'][sections[0]] = '3'
    elif case == 'empty':
        raw['nodos'].append({'id': identifier('empty'), 'tipo': 'seccion', 'orden': 3, 'titulo': 'Lectura'})
        budget['presupuestos'][identifier('empty')] = '1'
    elif case == 'foreign': budget['presupuestos'] = {identifier('foreign'): '5'}
    elif case == 'weight_missing': budget['pesos_base'].pop(questions[0]['contenido_id'])
    elif case == 'unconfirmed': budget['confirmado'] = False
    elif case == 'too_small': budget['presupuestos'] = dict(zip(sections, ['.01', '3.99', '1']))
    elif case == 'overlap':
        raw['nodos'][0]['padre_id'] = sections[1]
        raw['nodos'][0]['orden'] = 2
    elif case == 'uncovered': raw['nodos'][1]['padre_id'] = None; raw['nodos'][1]['orden'] = 3
    elif case == 'zero': budget['presupuestos'][sections[0]] = '0'
    with pytest.raises(ValueError):
        compile_section_scores(EvaluationDocument.model_validate(raw), questions, Decimal('5'))


def test_mode_off_keeps_points_and_disabling_requires_explicit_restore():
    document, questions, _ = example()
    off = document.model_copy(update={'puntuacion_secciones': None})
    assert apply_section_scoring(None, off, questions, questions, 5, 5, confirmed=False) == questions
    compiled = compile_section_scores(document, questions, 5)
    with pytest.raises(ValueError, match='[Cc]onfirma'):
        apply_section_scoring(document, off, compiled, compiled, 5, 5, confirmed=False)
    assert apply_section_scoring(document, off, compiled, compiled, 5, 5, confirmed=True) == questions


def test_stale_membership_and_tampered_base_weights_are_rejected():
    document, questions, sections = example()
    compiled = compile_section_scores(document, questions, 5)
    moved = document.model_copy(deep=True)
    moved.nodos[1].padre_id = moved.nodos[-1].padre_id
    moved.nodos[1].orden = 1
    with pytest.raises(ValueError, match='[Cc]onfirma'):
        apply_section_scoring(document, moved, compiled, compiled, 5, 5, confirmed=False)
    changed = document.model_copy(deep=True)
    changed.puntuacion_secciones.pesos_base[UUID(questions[0]['contenido_id'])] = Decimal('9')
    with pytest.raises(ValueError, match='base'):
        apply_section_scoring(document, changed, compiled, compiled, 5, 5, confirmed=True)


def test_explicit_internal_adjustments_still_sum_to_each_group():
    document, questions, _ = example()
    raw = document.model_dump(mode='json')
    raw['puntuacion_secciones']['ajustes'] = {q['contenido_id']: value for q, value in zip(questions, ['.5', '.5', '1', '.5', '1.5', '1'])}
    result = compile_section_scores(EvaluationDocument.model_validate(raw), questions, 5)
    assert [q['puntaje'] for q in result] == ['0.50', '0.50', '1.00', '0.50', '1.50', '1.00']
    raw['puntuacion_secciones']['ajustes'][questions[0]['contenido_id']] = '.6'
    with pytest.raises(ValueError):
        compile_section_scores(EvaluationDocument.model_validate(raw), questions, 5)
