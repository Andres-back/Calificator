"""Source/structure preservation without provider calls or real documents."""
from copy import deepcopy
from decimal import Decimal
from uuid import UUID, uuid4

import pytest

from app.modules.evaluaciones import digitalize_service
from app.modules.evaluaciones.document_import import build_document_inventory
from app.modules.evaluaciones.document_schemas import EvaluationDocument
from app.modules.evaluaciones.document_structure import document_preorder, validate_document_scope
from tests.fixtures.document_structure import sample_document


def source_and_model():
    document, questions = sample_document()
    by_id = {question['contenido_id']: question for question in questions}
    aliases = {node['id']: f'node-{index}' for index, node in enumerate(document['nodos'])}
    source, nodes, raw_questions, answers = [], [], [], []
    spans = []
    for node in document_preorder(EvaluationDocument.model_validate(document)):
        item = {'id': aliases[str(node.id)], 'tipo': node.tipo,
                'padre_id': aliases[str(node.padre_id)] if node.padre_id else None, 'orden': node.orden}
        if node.tipo == 'seccion':
            text = f'{node.etiqueta_original}. {node.titulo}'
            item.update(titulo=node.titulo, etiqueta_original=node.etiqueta_original)
        elif node.tipo == 'texto':
            text = node.texto
            item.update(texto='THIS_MODEL_SUMMARY_MUST_NOT_REPLACE_SOURCE', proposito=node.proposito)
        else:
            question = by_id[str(node.pregunta_id)]
            text = f'{node.etiqueta_original}) {question["enunciado"]}'
            item.update(pregunta_origen_id=str(node.pregunta_id), etiqueta_original=node.etiqueta_original)
            raw_questions.append({**question, 'numero': int(node.etiqueta_original), 'origen_id': str(node.pregunta_id)})
            answers.append({'numero': int(node.etiqueta_original), 'origen_id': str(node.pregunta_id),
                'respuesta': f'Referencia independiente {question["numero"]}', 'origen': 'resolucion_independiente',
                'confianza': 0.95, 'explicacion': 'Referencia independiente justificada con la consigna sintética.'})
        start = len(source)
        source.extend(text.splitlines())
        spans.append((item, start, len(source)))
        nodes.append(item)
    text = '\n'.join(source)
    inventory = build_document_inventory(text)
    for item, start, stop in spans:
        item['fuente_ids'] = [entry['id'] for entry in inventory[start:stop]]
    return text, inventory, {'preguntas': raw_questions, 'respuestas_esperadas': answers,
                             'documento': nodes, 'reglas_feedback': {}}


def normalize(raw, inventory, scope=None):
    return digitalize_service.normalize_detected_structure(raw, nota_maxima=Decimal('5'),
        document_inventory=inventory, document_scope_id=scope or uuid4())


def test_import_restarted_numbers_keeps_keys_and_non_question_sections():
    _, inventory, raw = source_and_model()
    result = normalize(raw, inventory)
    document = EvaluationDocument.model_validate(result['estructura_documento'])
    validate_document_scope(document, result['preguntas'])
    assert [question['numero'] for question in result['preguntas']] == list(range(1, 17))
    assert len({question['contenido_id'] for question in result['preguntas']}) == 16
    assert [item['respuesta'] for item in result['respuestas_esperadas']] == [f'Referencia independiente {number}' for number in range(1, 17)]
    assert len([node for node in document.nodos if node.tipo == 'seccion' and node.padre_id is None]) == 6
    assert len([node for node in document.nodos if node.tipo == 'seccion' and node.padre_id is not None]) == 2
    assert any(node.texto and 'Una semilla llegó' in node.texto for node in document.nodos)
    assert any(node.proposito == 'actividad' and 'Comparen sus ideas' in node.texto for node in document.nodos)
    assert 'THIS_MODEL_SUMMARY' not in str(result)
    assert document.revision.estado == 'requiere_revision' and not document.revision.confirmado
    assert sum(Decimal(question['puntaje']) for question in result['preguntas']) == Decimal('5')


@pytest.mark.parametrize('corruption', ['missing_reading', 'flat_model', 'invented_title', 'foreign_source'])
def test_lost_or_invented_structure_preserves_source_for_explicit_review(corruption):
    source, inventory, raw = source_and_model()
    if corruption == 'missing_reading':
        raw['documento'] = [node for node in raw['documento'] if node.get('proposito') != 'lectura']
    elif corruption == 'flat_model':
        raw.pop('documento')
    elif corruption == 'invented_title':
        raw['documento'][0]['titulo'] = 'MODEL_INVENTED_CHAPTER'
    else:
        raw['documento'][0]['fuente_ids'] = ['source:does-not-exist']
    result = normalize(raw, inventory)
    document = EvaluationDocument.model_validate(result['estructura_documento'])
    validate_document_scope(document, result['preguntas'])
    educational = '\n'.join(node.texto or node.titulo or '' for node in document.nodos)
    assert 'Una semilla llegó al jardín con el viento.' in educational
    assert 'Comparen sus ideas sobre el cuidado del jardín' in educational
    assert 'MODEL_INVENTED_CHAPTER' not in educational
    assert document.revision.estado == 'requiere_revision'
    assert document.revision.conservados == document.revision.detectados
    assert result['advertencias']
    assert source and len(result['preguntas']) == 16


def test_missing_answer_alias_does_not_reuse_another_sections_number_one():
    _, inventory, raw = source_and_model()
    raw['respuestas_esperadas'] = [{'numero': 1, 'respuesta': 'AMBIGUOUS_REFERENCE',
        'origen': 'resolucion_independiente', 'explicacion': 'No identifica cuál sección.', 'confianza': 1}]
    result = normalize(raw, inventory)
    assert not result['clave_completa']
    assert 'AMBIGUOUS_REFERENCE' not in str(result)
    assert set(result['claves_pendientes']) == set(range(1, 17))


def test_inventory_and_server_assigned_identities_are_deterministic():
    source, inventory, raw = source_and_model()
    scope = uuid4()
    before = deepcopy(raw)
    first, second = normalize(raw, inventory, scope), normalize(raw, inventory, scope)
    assert first['estructura_documento'] == second['estructura_documento']
    assert first['preguntas'] == second['preguntas']
    assert inventory == build_document_inventory(source)
    assert raw == before
    assert all(UUID(question['contenido_id']) for question in first['preguntas'])


@pytest.mark.asyncio
async def test_document_structure_uses_one_model_call_and_never_flat_local_answer_mapping(monkeypatch):
    source, _, raw = source_and_model()
    calls = []
    class Router:
        def set_output_budget(self, value):
            assert value > 0
        def set_tracking(self, **_kwargs):
            pass
        async def generate_json(self, task, prompt):
            calls.append((task, prompt))
            assert 'fuente_ids' in prompt and 'origen_id' in prompt and 'node-' not in prompt
            return raw
    def forbidden(*_args):
        raise AssertionError('A flat source-number mapping can overwrite another section’s key')
    monkeypatch.setattr(digitalize_service, 'LLMRouter', lambda **_kwargs: Router())
    monkeypatch.setattr(digitalize_service, '_apply_locally_verified_answers', forbidden)
    result = await digitalize_service.detectar_estructura_evaluacion(uuid4(), source, document_scope_id=uuid4())
    assert len(calls) == 1 and len(result['preguntas']) == 16
    assert 'estructura_documento' in result
