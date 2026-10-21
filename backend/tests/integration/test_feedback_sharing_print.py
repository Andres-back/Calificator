from uuid import uuid4

import pytest
from sqlalchemy import text

@pytest.mark.asyncio
async def test_print_keeps_complete_text_real_zero_and_never_changes_grade(fb_client, fb_db):
    client, _, case = fb_client
    evaluation, grade = case[-2:]
    grade.nota_confirmada = 0
    grade.feedback = ('En la pregunta 2 falta explicar el recorrido del río. Relee el mapa y señala su desembocadura.\n' * 25).strip()
    await fb_db.flush()
    before = await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'), {'id': grade.id})
    prefix = f'/api/evaluaciones/{evaluation.id}/devoluciones'
    preview = (await client.post(prefix + '/previsualizar', json={'calificacion_ids': [str(grade.id)]})).json()['resultados'][0]
    assert preview['elegible']
    response = await client.post(prefix + '/fichas', json={'selecciones': [{'calificacion_id': str(grade.id), 'fingerprint': preview['fingerprint']}]})
    assert response.status_code == 200 and 'no-store' in response.headers['cache-control']
    result = response.json()['resultados'][0]['resultado']
    assert float(result['nota']) == 0
    assert result['retroalimentacion'] == grade.feedback
    assert 'credential' not in response.text and '/devolucion#' not in response.text
    assert await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'), {'id': grade.id}) == before
    assert await fb_db.scalar(text('SELECT count(*) FROM feedback_accesses WHERE calificacion_id=:id'), {'id': grade.id}) == 0


@pytest.mark.asyncio
async def test_print_explicitly_rejects_changed_result_and_unauthorized_audiences(fb_client, fb_db, fb_case_factory):
    client, actor, case = fb_client
    other = await fb_case_factory(fb_db)
    await fb_db.flush()
    prefix = f'/api/evaluaciones/{case[-2].id}/devoluciones'
    selection = {'selecciones': [{'calificacion_id': str(case[-1].id), 'fingerprint': '0' * 64}, {'calificacion_id': str(uuid4()), 'fingerprint': '0' * 64}]}
    response = await client.post(prefix + '/fichas', json=selection)
    assert all('error' in item and 'resultado' not in item for item in response.json()['resultados'])
    actor['user'] = other[0]
    assert (await client.post(prefix + '/fichas', json=selection)).status_code == 403
    actor['user'] = case[1]
    assert (await client.post(prefix + '/fichas', json=selection)).status_code == 403
    actor['user'] = None
    assert (await client.post(prefix + '/fichas', json=selection)).status_code == 401


@pytest.mark.asyncio
async def test_teacher_sees_pending_feedback_in_list_but_cannot_print_it(fb_client, fb_db):
    client, _, case = fb_client
    grade = case[-1]
    grade.estado = 'requiere_revision'
    grade.revisado_por_docente = False
    grade.nota_confirmada = None
    grade.nota_sugerida = 3.5
    await fb_db.flush()
    prefix = f'/api/evaluaciones/{case[-2].id}/devoluciones'
    response = await client.post(prefix + '/previsualizar', json={'calificacion_ids': [str(grade.id)]})
    item = response.json()['resultados'][0]
    assert not item['elegible'] and 'resultado' not in item and 'fingerprint' not in item
    assert item['borrador_docente']['retroalimentacion'] == grade.feedback
    assert float(item['borrador_docente']['nota']) == 3.5
    printed = await client.post(prefix + '/fichas', json={'selecciones': [{'calificacion_id': str(grade.id), 'fingerprint': '0' * 64}]})
    assert 'resultado' not in printed.json()['resultados'][0]
