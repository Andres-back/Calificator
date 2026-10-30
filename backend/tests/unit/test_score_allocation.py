from copy import deepcopy
from decimal import Decimal

import pytest

from app.modules.evaluaciones.score_allocation import compile_allocation, reweight_points, valuation_display
from app.modules.evaluaciones.score_schemas import ScorePlan


KEYS = [f'pregunta:{index}' for index in range(1, 10)]


def example(mode='bloques'):
    return {'schema_version': 1, 'modo': mode, 'grupos': [
        {'id': 'primero', 'titulo': 'Preguntas 1 a 5', 'claves': KEYS[:5], 'presupuesto': '2', 'fijados': {}},
        {'id': 'segundo', 'titulo': 'Preguntas 6 a 9', 'claves': KEYS[5:], 'presupuesto': '3', 'fijados': {}},
    ]}


def test_ranges_compile_once_with_exact_collective_budgets_and_no_mutation():
    raw = example()
    original = deepcopy(raw)
    weights = compile_allocation(ScorePlan.model_validate(raw), KEYS, Decimal('5'))
    assert list(weights) == KEYS
    assert list(weights.values()) == [Decimal('.4')] * 5 + [Decimal('.75')] * 4
    assert sum(weights.values()) == 5
    assert compile_allocation(ScorePlan.model_validate(raw), KEYS, Decimal('5')) == weights
    assert raw == original


def test_two_open_questions_share_half_and_seven_multiple_choice_share_other_half():
    raw = example('tipo')
    raw['grupos'][0].update(claves=KEYS[:7], presupuesto='2,50')
    raw['grupos'][1].update(claves=KEYS[7:], presupuesto='2,50')
    weights = compile_allocation(ScorePlan.model_validate(raw), KEYS, Decimal('5'))
    assert [weights[key] for key in KEYS[:7]] == [Decimal('.3572')] * 3 + [Decimal('.3571')] * 4
    assert [weights[key] for key in KEYS[7:]] == [Decimal('1.25')] * 2
    assert sum(weights[key] for key in KEYS[:7]) == Decimal('2.50')
    assert sum(weights.values()) == 5
    raw['grupos'][0]['claves'].reverse()
    assert compile_allocation(ScorePlan.model_validate(raw), KEYS, Decimal('5')) == weights


def test_a_locked_question_only_redistributes_within_its_block():
    raw = example()
    raw['grupos'][0]['fijados'] = {KEYS[0]: '0,9'}
    weights = compile_allocation(ScorePlan.model_validate(raw), KEYS, Decimal('5'))
    assert weights[KEYS[0]] == Decimal('.9')
    assert [weights[key] for key in KEYS[1:5]] == [Decimal('.275')] * 4
    assert [weights[key] for key in KEYS[5:]] == [Decimal('.75')] * 4


@pytest.mark.parametrize('case', ['overlap', 'missing', 'foreign', 'empty', 'budget', 'duplicate_group', 'duplicate_member', 'foreign_lock', 'overspent', 'zero', 'nan', 'inf', 'negative', 'bool', 'precision', 'all_locked_wrong', 'too_small'])
def test_impossible_or_ambiguous_plans_never_compile(case):
    raw = example()
    first, second = raw['grupos']
    if case == 'overlap': second['claves'].append(KEYS[0])
    elif case == 'missing': first['claves'].pop()
    elif case == 'foreign': first['claves'][0] = 'pregunta:otra'
    elif case == 'empty': first['claves'] = []
    elif case == 'budget': first['presupuesto'] = '3'
    elif case == 'duplicate_group': second['id'] = first['id']
    elif case == 'duplicate_member': first['claves'].append(KEYS[0])
    elif case == 'foreign_lock': first['fijados'] = {KEYS[8]: '.5'}
    elif case == 'overspent': first['fijados'] = {KEYS[0]: '2'}
    elif case in {'zero', 'nan', 'inf', 'negative', 'bool', 'precision'}:
        first['presupuesto'] = {'zero': '0', 'nan': 'NaN', 'inf': 'Infinity', 'negative': '-2', 'bool': True, 'precision': '.00001'}[case]
    elif case == 'all_locked_wrong': first['fijados'] = dict.fromkeys(first['claves'], '.3')
    elif case == 'too_small': first['presupuesto'], second['presupuesto'] = '.0004', '4.9996'
    with pytest.raises(ValueError):
        compile_allocation(ScorePlan.model_validate(raw), KEYS, Decimal('5'))


def test_all_locks_matching_budget_are_preserved():
    raw = example()
    raw['grupos'][0]['fijados'] = dict.fromkeys(KEYS[:5], '.4')
    assert sum(compile_allocation(ScorePlan.model_validate(raw), KEYS, Decimal('5')).values()) == 5


def test_proportional_update_preserves_zero_pending_and_fraction_without_ai():
    assert reweight_points(Decimal('.28'), Decimal('.56'), Decimal('1.25')) == Decimal('.6250')
    assert reweight_points(Decimal('0'), Decimal('.56'), Decimal('1.25')) == 0
    assert reweight_points(None, Decimal('.56'), Decimal('1.25')) is None
    assert reweight_points(Decimal('.56'), Decimal('.56'), Decimal('1.25')) == Decimal('1.25')
    with pytest.raises(ValueError):
        reweight_points(Decimal('.57'), Decimal('.56'), Decimal('1.25'))


def test_display_equivalents_keep_original_assessments_and_confidence_untouched():
    raw = [{'puntaje': '.28', 'estado': 'parcial', 'confianza': .9, 'explicacion': 'Falta explicar una razón.'}, {'puntaje': None, 'estado': 'revision_pendiente'}]
    before = deepcopy(raw)
    view = valuation_display(raw, '.56', Decimal('1.25'))
    assert raw == before
    assert view[0]['puntaje'] == .625
    assert view[0]['puntaje_original'] == '.28'
    assert view[0]['confianza'] == .9 and view[0]['estado'] == 'parcial'
    assert 'valoración original: 0.28 de 0.56' in view[0]['explicacion']
    assert view[1] == raw[1]
    # Further reallocations keep using the initial raw assessment's maximum.
    assert valuation_display(raw, '.56', Decimal('2'))[0]['puntaje'] == 1
