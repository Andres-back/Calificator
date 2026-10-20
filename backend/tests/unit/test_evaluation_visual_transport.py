"""Synthetic captures of exactly what each model receives; no provider calls."""
import base64
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

from PIL import Image
import pytest

from app.modules.calificaciones import agents
from app.modules.calificaciones.grading_visuals import EvaluationVisualInput, VisualContextError


def png(color='blue'):
    stream = BytesIO()
    Image.new('RGB', (20, 20), color).save(stream, 'PNG')
    return stream.getvalue()


def visual(question_ids, **fields):
    return EvaluationVisualInput(block_id=str(uuid4()), question_ids=tuple(question_ids),
        kind='imagen', description='Figura de referencia', image_bytes=png(), image_mime='image/png', **fields)


def context():
    first, second = str(uuid4()), str(uuid4())
    shared = visual((first, second))
    ctx = agents.AgentContext(evaluacion_nombre='Prueba', nota_maxima=5,
        blueprint={'nota_maxima': 5, 'contenido_version_id': str(uuid4()), 'contenido_hash': 'a' * 64,
            'preguntas': [{'numero': 1, 'contenido_id': first, 'enunciado': 'Figura uno', 'puntaje': 2.5},
                          {'numero': 2, 'contenido_id': second, 'enunciado': 'Figura dos', 'puntaje': 2.5}],
            'respuestas_esperadas': [{'numero': 1, 'respuesta': 'Azul'}, {'numero': 2, 'respuesta': 'Azul'}]},
        student_response_text='P1: Azul\nP2: Azul', evaluation_visuals=(shared,))
    return ctx, first, second


def response():
    return {'choices': [{'message': {'content': {'nota_sugerida': 5, 'confianza': .95,
        'componentes': [], 'feedback_estudiante': 'Compara las figuras.'}}}]}


@pytest.mark.asyncio
@pytest.mark.parametrize('student_image', [None, b'student-evidence'])
async def test_primary_and_verifier_receive_identical_material_separate_from_student_evidence(monkeypatch, student_image):
    monkeypatch.setattr(agents, 'model_supports_vision', lambda _: True)
    ctx, _, _ = context()
    ctx.image_bytes = student_image
    client = SimpleNamespace(chat=AsyncMock(), chat_multimodal=AsyncMock(return_value=response()))
    # A caller disabling the optional student-image path must not drop required figures.
    primary = await agents.grader_agent(ctx, client=client, multimodal=False)
    assert primary.nota_sugerida == 5
    first_call = client.chat_multimodal.await_args.kwargs
    client.chat.assert_not_called()
    # The primary is already usable on its own, without depending on a verifier.
    assert first_call['evaluation_visuals'] == ctx.evaluation_visuals
    verified = await agents.verification_agent(ctx, primary, client=client, multimodal=False)
    assert verified.nota_sugerida == 5
    for call in client.chat_multimodal.await_args_list:
        assert call.kwargs['evaluation_visuals'] == ctx.evaluation_visuals
        assert call.kwargs['image_bytes'] == student_image
        assert 'MATERIAL DE LA EVALUACIÓN' in call.kwargs['text']
        assert 'no son respuestas del estudiante' in call.kwargs['text']
    assert first_call['evaluation_visuals'][0].image_bytes != student_image


@pytest.mark.asyncio
async def test_wire_deduplicates_shared_images_but_preserves_all_block_associations():
    ctx, first, second = context()
    duplicated = visual((second,))
    client = object.__new__(agents.OpenCodeClient)
    client.chat = AsyncMock(return_value=response())
    await client.chat_multimodal(model='vision', text='Analiza los materiales.', image_bytes=b'student',
        evaluation_visuals=(*ctx.evaluation_visuals, duplicated))
    request = client.chat.await_args.kwargs
    content = request['messages'][0]['content']
    urls = [item['image_url']['url'] for item in content if item['type'] == 'image_url']
    assert request['image_count'] == 2  # one student image + one deduplicated stimulus
    assert [base64.b64decode(url.split(',', 1)[1]) for url in urls] == [b'student', png()]
    labels = ' '.join(item.get('text', '') for item in content)
    assert 'RESPUESTA DEL ESTUDIANTE' in labels and 'MATERIAL DE LA EVALUACIÓN' in labels
    assert first in labels and second in labels and duplicated.block_id in labels


def test_partitions_keep_their_material_and_shared_stimuli_without_acquiring_other_questions():
    ctx, first, second = context()
    local = visual((first,))
    ctx.evaluation_visuals = (*ctx.evaluation_visuals, local)
    ctx.student_response_text = 'Explicación extensa. ' * 1000
    partitions = agents.partition_grading_context(ctx, [], max_chars=1000)
    assert len(partitions) == 2
    assert partitions[0].evaluation_visuals == ctx.evaluation_visuals
    assert partitions[1].evaluation_visuals == (ctx.evaluation_visuals[0],)
    for part in partitions:
        assert part.blueprint['contenido_hash'] == 'a' * 64
        assert part.evaluation_visuals[0].image_bytes == png()
    assert second in partitions[1].evaluation_visuals[0].question_ids


@pytest.mark.asyncio
@pytest.mark.parametrize('agent', ['primary', 'verifier'])
async def test_nonvision_model_cannot_score_required_material_as_text(monkeypatch, agent):
    monkeypatch.setattr(agents, 'model_supports_vision', lambda _: False)
    ctx, _, _ = context()
    client = SimpleNamespace(chat=AsyncMock(return_value=response()), chat_multimodal=AsyncMock(return_value=response()))
    primary = agents.AgentResult(nota_sugerida=5, confianza=.95, feedback_estudiante='')
    result = await (agents.grader_agent(ctx, model='text-only', client=client) if agent == 'primary'
        else agents.verification_agent(ctx, primary, model='text-only', client=client))
    assert result.nota_sugerida is None and result.requiere_revision_docente
    assert result.error == 'evaluation_visual_model_unsupported'
    client.chat.assert_not_called()
    client.chat_multimodal.assert_not_called()


@pytest.mark.asyncio
async def test_text_only_router_fallback_refuses_required_images(monkeypatch):
    ctx, _, _ = context()
    factory = AsyncMock()
    monkeypatch.setattr(agents, 'LLMRouter', factory)
    result = await agents.router_grader_agent(ctx)
    assert result.nota_sugerida is None and result.requiere_revision_docente
    factory.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize('limit', ['images', 'bytes'])
async def test_wire_budget_excess_is_explicit_and_does_not_send_partial_material(monkeypatch, limit):
    ctx, first, _ = context()
    visuals = (*ctx.evaluation_visuals, EvaluationVisualInput(block_id=str(uuid4()), question_ids=(first,),
        kind='imagen', description='Otra figura', image_bytes=png('red'), image_mime='image/png'))
    monkeypatch.setattr(agents.settings, 'GRADING_MULTIMODAL_MAX_IMAGES', 1 if limit == 'images' else 32)
    monkeypatch.setattr(agents.settings, 'GRADING_MULTIMODAL_MAX_BYTES', 1 if limit == 'bytes' else 32 * 1024 * 1024)
    client = object.__new__(agents.OpenCodeClient)
    client.chat = AsyncMock()
    with pytest.raises(VisualContextError):
        await client.chat_multimodal(model='vision', text='Pregunta', image_bytes=None, evaluation_visuals=visuals)
    client.chat.assert_not_called()


@pytest.mark.asyncio
async def test_text_stimulus_is_available_to_text_models_without_a_fake_image(monkeypatch):
    monkeypatch.setattr(agents, 'model_supports_vision', lambda _: False)
    ctx, first, _ = context()
    ctx.evaluation_visuals = (EvaluationVisualInput(block_id=str(uuid4()), question_ids=(first,),
        kind='texto', text='Una lectura compartida que debe conservarse.'),)
    client = SimpleNamespace(chat=AsyncMock(return_value=response()), chat_multimodal=AsyncMock())
    result = await agents.grader_agent(ctx, model='text-only', client=client)
    assert result.nota_sugerida == 5
    assert 'Una lectura compartida' in client.chat.await_args.kwargs['messages'][0]['content']
    client.chat_multimodal.assert_not_called()


@pytest.mark.asyncio
async def test_real_orchestrator_sends_the_same_material_to_both_stages_for_online_answers(monkeypatch):
    from app.modules.calificaciones import orchestrator
    captures = []
    ctx, _, _ = context()
    async def wire_chat(_self, **kwargs):
        captures.append(kwargs)
        value = response()
        value['choices'][0]['message']['content'].update(
            requiere_revision_docente=False, requiere_arbitraje=False,
            componentes=[{'clave': f'pregunta:{number}', 'puntaje': 2.5, 'estado': 'correcta',
                'respuesta_estudiante': 'Azul', 'explicacion': 'Coincide con la figura', 'confianza': .95} for number in (1, 2)])
        return value
    class CaptureClient:
        def __init__(self, **_kwargs):
            pass
        chat = wire_chat
        chat_multimodal = agents.OpenCodeClient.chat_multimodal
        async def close(self):
            pass
    monkeypatch.setattr(orchestrator, 'OpenCodeClient', CaptureClient)
    monkeypatch.setattr(orchestrator, 'build_question_context_for_grading', AsyncMock(return_value=({}, [])))
    monkeypatch.setattr(orchestrator, 'model_supports_vision', lambda _: True)
    monkeypatch.setattr(agents, 'model_supports_vision', lambda _: True)
    result = await orchestrator.orchestrate_grading(object(), evaluacion_id=uuid4(), materia_id=uuid4(),
        blueprint=ctx.blueprint, student_response_text=ctx.student_response_text, evaluation_visuals=ctx.evaluation_visuals)
    assert result.nota_sugerida == 5, result.raw_model_output
    assert [call['stage'] for call in captures] == ['grading_primary', 'grading_secondary']
    for call in captures:
        assert call['image_count'] == 1
        blocks = call['messages'][0]['content']
        assert base64.b64decode(next(block['image_url']['url'] for block in blocks if block['type'] == 'image_url').split(',')[1]) == png()
    assert result.raw_model_output['evaluation_content']['content_hash'] == 'a' * 64
    assert result.raw_model_output['vision'] is None  # no invented student photo/extraction


@pytest.mark.asyncio
async def test_a_single_question_too_large_is_reviewed_without_truncating_its_reading(monkeypatch):
    ctx, first, _ = context()
    ctx.evaluation_visuals = (EvaluationVisualInput(block_id=str(uuid4()), question_ids=(first,),
        kind='texto', text='La lectura completa no puede truncarse. ' * 1000),)
    monkeypatch.setattr(agents.settings, 'PHOTO_GRADING_CONTEXT_BUDGET_CHARS', 1000)
    client = SimpleNamespace(chat=AsyncMock(), chat_multimodal=AsyncMock())
    result = await agents.grader_agent(ctx, client=client)
    assert result.nota_sugerida is None and result.requiere_revision_docente
    assert result.error == 'evaluation_visual_budget_exceeded'
    client.chat.assert_not_called()
    client.chat_multimodal.assert_not_called()


@pytest.mark.asyncio
async def test_only_an_explicit_vision_fallback_can_recover_required_figures(monkeypatch):
    from app.modules.calificaciones import orchestrator
    ctx, _, _ = context()
    monkeypatch.setattr(agents, 'model_supports_vision', lambda model: model == 'authorized-vision')
    monkeypatch.setattr(orchestrator, 'model_supports_vision', lambda model: model == 'authorized-vision')
    client = SimpleNamespace(chat=AsyncMock(), chat_multimodal=AsyncMock(return_value=response()))
    result = await orchestrator._run_grader_cascade(ctx, models=['text-only', 'authorized-vision'],
        multimodal=True, client=client)
    assert result.modelo == 'authorized-vision' and result.nota_sugerida == 5
    client.chat.assert_not_called()
    client.chat_multimodal.assert_awaited_once()
    assert client.chat_multimodal.await_args.kwargs['evaluation_visuals'] == ctx.evaluation_visuals


@pytest.mark.asyncio
@pytest.mark.parametrize('model', ['deepseek-v4-flash-vision-exp', 'qwen3.8-flash'])
async def test_transport_retries_preserve_all_material_in_both_existing_protocols(monkeypatch, model):
    import json
    import httpx
    ctx, _, _ = context()
    requests = []
    async def handler(request):
        requests.append(json.loads(request.content))
        if len(requests) == 1:
            return httpx.Response(503, json={'error': 'synthetic retry'})
        if model.startswith('qwen'):
            return httpx.Response(200, json={'content': [{'type': 'text', 'text': '{"nota_sugerida":5}'}], 'stop_reason': 'end_turn'})
        return httpx.Response(200, json=response())
    monkeypatch.setattr(agents.settings, 'OPEN_CODE_API_KEY', 'synthetic-test-key')
    monkeypatch.setattr(agents, '_retry_delay_seconds', lambda *_: 0)
    client = agents.OpenCodeClient()
    await client._client.aclose()
    client._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    client._log_call = AsyncMock()
    try:
        await client.chat_multimodal(model=model, text='Material de referencia', image_bytes=b'student',
            evaluation_visuals=ctx.evaluation_visuals, max_attempts=2)
    finally:
        await client.close()
    assert len(requests) == 2 and requests[0] == requests[1]
    encoded = base64.b64encode(png()).decode()
    assert encoded in json.dumps(requests[0])
    assert client._log_call.await_args.kwargs['image_count'] == 2
