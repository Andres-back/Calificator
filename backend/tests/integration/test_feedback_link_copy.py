"""Copying a link is authenticated, recoverable and not a renewal."""
from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import text

from app.modules.feedback_sharing.access_policy import guard_token
from app.modules.feedback_sharing.link_service import copy_accesses
from app.modules.feedback_sharing.service import create_access, prepare_grade_preview


async def link(db,case):
    actor,_,_,evaluation,grade=case
    await db.commit()
    preview=await prepare_grade_preview(db,actor,evaluation.id,grade.id)
    access,token=await create_access(db,actor,evaluation.id,grade.id,preview['fingerprint'],uuid4(),3,False)
    await db.commit()
    return access,token


@pytest.mark.asyncio
async def test_copy_can_be_repeated_without_changing_any_access_or_grade(fb_db,fb_case,monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED',True)
    access,token=await link(fb_db,fb_case)
    actor,_,_,evaluation,grade=fb_case
    before=(await fb_db.execute(text('SELECT to_jsonb(a) FROM feedback_accesses a WHERE id=:id'),{'id':access.id})).scalar_one()
    grade_before=await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'),{'id':grade.id})
    first=await copy_accesses(fb_db,actor,evaluation.id,[access.id])
    await fb_db.commit()
    again=await copy_accesses(fb_db,actor,evaluation.id,[access.id])
    await fb_db.commit()
    assert first==again and first['resultados'][0]['url'].endswith('#'+token)
    assert await fb_db.scalar(text('SELECT to_jsonb(a) FROM feedback_accesses a WHERE id=:id'),{'id':access.id})==before
    assert await fb_db.scalar(text('SELECT to_jsonb(c) FROM calificaciones c WHERE id=:id'),{'id':grade.id})==grade_before
    assert (await guard_token(fb_db,token)).access.id==access.id


@pytest.mark.asyncio
async def test_legacy_token_still_opens_but_is_not_reconstructed_or_replaced(fb_db,fb_case,monkeypatch):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED',True)
    access,token=await link(fb_db,fb_case)
    access.credential_encrypted=None
    await fb_db.commit()
    result=await copy_accesses(fb_db,fb_case[0],fb_case[3].id,[access.id])
    assert result['resultados'][0]['code']=='legacy_unrecoverable'
    assert 'url' not in result['resultados'][0]
    assert (await guard_token(fb_db,token)).access.credential_generation==1


@pytest.mark.asyncio
@pytest.mark.parametrize('kind', ['expired','disabled','corrupted','changed'])
async def test_copy_does_not_reactivate_or_disclose_invalid_access(fb_db,fb_case,monkeypatch,kind):
    monkeypatch.setattr('app.core.config.settings.FEEDBACK_SHARING_ENABLED',True)
    access,_=await link(fb_db,fb_case)
    if kind=='expired':access.expires_at-=timedelta(days=4)
    if kind=='disabled':access.state='disabled'
    if kind=='corrupted':access.credential_encrypted='feedback:v1:invalid'
    if kind=='changed':fb_case[-1].nota_confirmada=4
    await fb_db.commit()
    result=await copy_accesses(fb_db,fb_case[0],fb_case[3].id,[access.id])
    assert 'url' not in result['resultados'][0]
    assert result['resultados'][0]['error']


@pytest.mark.asyncio
async def test_copy_routes_enforce_permissions_and_do_not_leak_foreign_names(fb_client):
    client,identity,case=fb_client
    actor,student,_,evaluation,grade=case
    preview=(await client.post(f'/api/evaluaciones/{evaluation.id}/devoluciones/previsualizar',json={'calificacion_ids':[str(grade.id)]})).json()['resultados'][0]
    created=(await client.post(f'/api/evaluaciones/{evaluation.id}/devoluciones/accesos',json={
        'request_id':str(uuid4()),'selecciones':[{'calificacion_id':str(grade.id),'fingerprint':preview['fingerprint']}],
        'duracion_dias':3,'evidencia':False})).json()['resultados'][0]
    route=f'/api/evaluaciones/{evaluation.id}/devoluciones/accesos/copiar'
    identity['user']=student
    assert (await client.post(route,json={'access_ids':[created['id']]})).status_code==403
    identity['user']=None
    assert (await client.post(route,json={'access_ids':[created['id']]})).status_code==401
    identity['user']=actor
    response=await client.post(route,json={'access_ids':[created['id'],str(uuid4())]})
    assert response.status_code==200
    assert {'private','no-store'} <= {value.strip() for value in response.headers['cache-control'].split(',')}
    rows=response.json()['resultados']
    assert rows[0]['url']==created['url'] and 'estudiante' not in rows[1]
