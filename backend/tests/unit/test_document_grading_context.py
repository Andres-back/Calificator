from copy import deepcopy
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.modules.calificaciones import agents
from app.modules.evaluaciones.blueprint_service import evaluation_to_grading_blueprint
from app.modules.evaluaciones.grading_visual_context import read_grading_definition
from app.modules.evaluaciones.visual_service import content_hash
from app.modules.feedback_sharing.projection import build_projection, digest
from tests.fixtures.document_structure import identifier
from tests.unit.test_document_exports import example
from tests.unit.test_feedback_sharing_projection import source


def test_section_budgets_feed_canonical_scaffold_without_double_weighting():
    from app.modules.calificaciones.breakdown_policy import build_component_scaffold, calculate_formula
    from app.modules.evaluaciones.document_structure import compile_section_scores
    from tests.unit.test_section_scoring import example as scoring_example

    document, questions, _ = scoring_example()
    item = grading_example()
    item.preguntas = compile_section_scores(document, questions, 5)
    item.estructura_documento = document.model_dump(mode='json')
    item.estructura_documento['revision'].update(estado='completa', confirmado=True)
    blueprint = evaluation_to_grading_blueprint(item)
    components = build_component_scaffold(blueprint)
    assert len(components) == 6  # Headings and readings never create scoring components.
    assert [c['puntos_maximos'] for c in components] == [Decimal(q['puntaje']) for q in item.preguntas]
    # The three groups obtain 1.50, 1.00 and 0.50 of their 2 + 2 + 1 budgets.
    for component in components:
        component['puntos_obtenidos'] = Decimal('0.50')
    formula = calculate_formula(components, blueprint['nota_maxima'])
    assert formula['puntos_posibles'] == Decimal('5.00')
    assert formula['puntos_obtenidos'] == formula['nota_final'] == Decimal('3.00')


def grading_example():
    evaluation = example()
    evaluation.blueprint = None
    evaluation.metas_profesor, evaluation.criterios = [], []
    evaluation.modalidad = 'fisica'
    return evaluation


@pytest.mark.asyncio
async def test_all_three_agents_receive_same_educational_document_without_provenance():
    item = grading_example()
    blueprint = evaluation_to_grading_blueprint(item)
    ctx = agents.AgentContext(evaluacion_nombre=item.nombre, nota_maxima=5, blueprint=blueprint,
        student_response_text='Respuesta sintética')
    prompt = agents.render_grader_prompt(ctx)
    assert 'Una semilla llegó al jardín' in prompt
    assert 'Conversamos en grupo' in prompt and 'source:' not in prompt
    client = SimpleNamespace(chat=AsyncMock(return_value={'choices': [{'message': {'content':
        '{"nota_final":3,"nota_sugerida":3,"feedback_integrado":"Revisa la lectura.","componentes":[],"confianza":0.9}'}}]}))
    primary = agents.AgentResult(nota_sugerida=3, confianza=.9, feedback_estudiante='Revisa la lectura.')
    await agents.verification_agent(ctx, primary, client=client)
    assert 'Una semilla llegó al jardín' in client.chat.call_args.kwargs['messages'][0]['content']
    await agents.comparator_agent(primary, primary, force_arbitration=True, client=client, ctx=ctx)
    assert 'Una semilla llegó al jardín' in client.chat.call_args.kwargs['messages'][0]['content']


@pytest.mark.asyncio
async def test_document_context_is_read_from_delivery_revision_not_the_live_evaluation(monkeypatch):
    item = grading_example()
    snapshot = {key: value for key, value in vars(item).items() if key not in {'created_at'}}
    snapshot.update(tipo_origen='externa_digitalizada', dba_ids=[], dba_personalizado_ids=[])
    revision = SimpleNamespace(id=identifier('old-version'), snapshot_json=snapshot, content_hash=content_hash(snapshot))
    from app.modules.evaluaciones import grading_visual_context
    monkeypatch.setattr(grading_visual_context, 'get_content_revision', AsyncMock(return_value=revision))
    evaluation = SimpleNamespace(id=identifier('eval'), materia_id=identifier('subject'), profesor_id=identifier('teacher'),
        nombre='Otra versión nueva', contenido_version_id=identifier('new-version'))
    delivery = SimpleNamespace(evaluacion_id=evaluation.id, contenido_version_id=revision.id)
    context = await read_grading_definition(None, evaluation, delivery)
    assert 'Una semilla llegó al jardín' in context.blueprint['contexto_documental']
    assert context.blueprint['nombre'] == item.nombre


def test_new_feedback_context_changes_fingerprint_while_legacy_stays_byte_identical():
    grade, evaluation = source()
    first = build_projection(grade, evaluation, 'Estudiante', 'Ciencias', None)
    expected = digest({'payload': first.payload, 'grade': grade.id, 'state': grade.estado,
        'student': grade.estudiante_id, 'evaluation': grade.evaluacion_id, 'subject': grade.materia_id,
        'breakdown': None, 'evidence': None, 'questions': evaluation.preguntas,
        'criteria': evaluation.criterios, 'goals': evaluation.metas_profesor})
    assert first.fingerprint == expected
    structured = grading_example()
    evaluation.preguntas = structured.preguntas
    evaluation.estructura_documento = structured.estructura_documento
    shared = build_projection(grade, evaluation, 'Estudiante', 'Ciencias', None)
    assert 'Una semilla llegó al jardín' in shared.payload['contexto_documental']
    assert 'PRIVATE_KEY' not in str(shared.payload) and 'source:' not in str(shared.payload)
    from app.modules.feedback_sharing.chat_service import build_prompt
    assert 'Una semilla llegó al jardín' in build_prompt(shared.payload, '¿Cómo practico?')
    before = deepcopy(shared.payload)
    evaluation.estructura_documento['nodos'][0]['titulo'] = 'Nuevo título'
    assert build_projection(grade, evaluation, 'Estudiante', 'Ciencias', None).fingerprint != shared.fingerprint
    assert shared.payload == before
