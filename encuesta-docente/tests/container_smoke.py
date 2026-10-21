"""Recepción en la imagen real, con SQLite temporal y sin red/credenciales reales."""
import hashlib
import io
import json
import tempfile
import uuid
from pathlib import Path
from app import SurveyApplication, canonical

with tempfile.TemporaryDirectory() as folder:
    app=SurveyApplication(database=Path(folder)/'qa.sqlite3',origin='http://localhost',secret='s'*48,admin_user='synthetic',admin_password='a'*32)
    def request(path,method='GET',payload=None,headers=None):
        body=canonical(payload).encode() if payload is not None else b''
        environ={'REQUEST_METHOD':method,'PATH_INFO':'/encuesta-docente'+path,'CONTENT_TYPE':'application/json','CONTENT_LENGTH':str(len(body)),'wsgi.input':io.BytesIO(body),'HTTP_ORIGIN':'http://localhost','REMOTE_ADDR':'127.0.0.1',**(headers or {})}
        result={}
        def start(status,values):result.update(status=status,headers=dict(values))
        result['body']=b''.join(app(environ,start));return result
    response=request('/api/session');csrf=json.loads(response['body'])['csrf'];cookie=response['headers']['Set-Cookie'].split(';')[0]
    data={'submission_id':str(uuid.uuid4()),'instrument_version':app.settings['instrument_version'],'consent_version':app.settings['consent_version'],'identity':{'name':'DOCENTE SINTETICO','email':'','phone':''},'answers':{'institution':'COLEGIO SINTETICO','manual.minutes':30.5,'manual.deliveries':20,'manual.basis':'estimated','manual.open_percent':50},'times':[],'measurement':{'date':'','group':'','deliveries':None,'open_answers':None,'condition':'manual','scope':''},'consent':{'participation':True,'data_processing':True,'signature_storage':True},'signature':{'method':'drawn','name':'DOCENTE SINTETICO','strokes':[[[.1+i*.025,.3+i*.01] for i in range(12)]]}}
    headers={'HTTP_X_SURVEY_CSRF':csrf,'HTTP_COOKIE':cookie}
    first=request('/api/responses','POST',data,headers);second=request('/api/responses','POST',data,headers)
    assert first['status']=='200 OK' and first['body']==second['body']
    receipt=json.loads(first['body']);digest=receipt.pop('sha256');assert hashlib.sha256(canonical(receipt).encode()).hexdigest()==digest
    with app.connect() as db:assert db.execute('select count(*) from responses').fetchone()[0]==1
    assert request('/admin/summary')['status'].startswith('401')
    assert request('/submission.js')['status']=='200 OK'
    print('OK: imagen, recepción idempotente, firma, versión, integridad y permisos; base temporal, sin red.')
