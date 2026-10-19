import base64
import copy
import hashlib
import io
import json
import sys
import tempfile
import unittest
import uuid
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import InstrumentRouter, SurveyApplication, canonical, study_today


class FeedbackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        options = dict(origin='http://127.0.0.1:8092', secret='s'*48, admin_user='research', admin_password='a'*32)
        self.feedback = SurveyApplication(instrument='feedback', database=Path(self.temp.name)/'feedback.sqlite3', **options)
        self.needs = SurveyApplication(database=Path(self.temp.name)/'needs.sqlite3', **options)
        self.app = InstrumentRouter(self.needs, self.feedback)
        status, headers, body = self.request('/api/session')
        self.assertEqual(status, 200)
        self.csrf = json.loads(body)['csrf']
        self.cookie = dict(headers)['Set-Cookie'].split(';')[0]
        self.data = dict(submission_id=str(uuid.uuid4()), instrument_version=self.feedback.settings['instrument_version'], consent_version=self.feedback.settings['consent_version'], identity={'name':'DOCENTE FICTICIO DEL PILOTO','email':'test@example.org','phone':''}, answers={'institution':'COLEGIO DE PRUEBA','feedback.date':study_today().isoformat(),'feedback.experience':'direct','feedback.functions':['grading','reports'],'feedback.observation':'No logré abrir el reporte al terminar la revisión.','feedback.suggestion':'=PROPUESTA_DE_PRUEBA()'}, times=[], measurement={'date':'','deliveries':None,'open_answers':None,'group':'','condition':'pilot_feedback','scope':''}, consent={'participation':True,'data_processing':True,'signature_storage':True,'feedback_confirmation':True}, signature={'method':'drawn','name':'DOCENTE FICTICIO DEL PILOTO','strokes':[[[.1+i*.025,.3+i*.01] for i in range(12)]]})

    def tearDown(self):
        self.temp.cleanup()

    def request(self, path, method='GET', data=None, admin=False, csrf=True, prefix='/retroalimentacion-piloto', origin='http://127.0.0.1:8092'):
        body = json.dumps(data, ensure_ascii=False).encode() if data is not None else b''
        env = {'REQUEST_METHOD':method,'PATH_INFO':prefix+path,'wsgi.input':io.BytesIO(body),'CONTENT_LENGTH':str(len(body)),'CONTENT_TYPE':'application/json','REMOTE_ADDR':'127.0.0.1','HTTP_ORIGIN':origin}
        if csrf and hasattr(self,'csrf'):
            env.update(HTTP_X_SURVEY_CSRF=self.csrf, HTTP_COOKIE=self.cookie)
        if admin:
            env['HTTP_AUTHORIZATION'] = 'Basic '+base64.b64encode(b'research:'+b'a'*32).decode()
        result = {}
        def start(status, headers): result.update(status=int(status.split()[0]),headers=headers)
        response = b''.join(self.app(env,start))
        return result['status'],result['headers'],response

    def submit(self, data=None, **kwargs):
        return self.request('/api/responses','POST',self.data if data is None else data,**kwargs)

    def test_feedback_receipt_binds_comments_consent_version_and_signature(self):
        data = copy.deepcopy(self.data)
        data['signature'].update(method='drawn',strokes=[[[.1+i*.025,.3+i*.01] for i in range(12)]])
        data['consent']['signature_storage'] = True
        status,_,body = self.submit(data)
        self.assertEqual(status,200)
        receipt=json.loads(body);stated=receipt.pop('sha256')
        self.assertEqual(stated,hashlib.sha256(canonical(receipt).encode()).hexdigest())
        self.assertEqual(receipt['settings']['instrument_code'],'FR-PIL-01')
        self.assertEqual(receipt['schema_snapshot'],self.feedback.schema)
        self.assertTrue(receipt['response']['consent']['feedback_confirmation'])
        self.assertEqual(receipt['response']['signature']['strokes'],data['signature']['strokes'])
        self.assertIn('sin publicar nombres',receipt['consent_document'][4]['text'])

    def test_required_context_and_actual_observation_cannot_be_omitted(self):
        for key, missing in [('institution','  '),('feedback.date',None),('feedback.experience',None),('feedback.functions',[]),('feedback.observation',' \n ')]:
            with self.subTest(key=key):
                data=copy.deepcopy(self.data);data['answers'][key]=missing
                self.assertEqual(self.submit(data)[0],400)

    def test_dates_and_unknown_function_are_rejected(self):
        for value in ['fecha inválida',(study_today()+timedelta(days=1)).isoformat()]:
            data=copy.deepcopy(self.data);data['answers']['feedback.date']=value
            self.assertEqual(self.submit(data)[0],400)
        data=copy.deepcopy(self.data);data['answers']['feedback.functions']=['nonexistent']
        self.assertEqual(self.submit(data)[0],400)

    def test_comments_may_be_critical_and_suggestions_may_be_absent(self):
        self.data['answers']['feedback.suggestion']=None
        self.data['answers']['feedback.priority']='na'
        self.assertEqual(self.submit()[0],200)

    def test_confirmation_and_specific_consent_are_required(self):
        for field in ['participation','data_processing','feedback_confirmation']:
            data=copy.deepcopy(self.data);data['consent'][field]=False
            self.assertEqual(self.submit(data)[0],400)
        data=copy.deepcopy(self.data);del data['consent']['feedback_confirmation']
        self.assertEqual(self.submit(data)[0],400)
        data=copy.deepcopy(self.data);data['consent_version']=self.needs.settings['consent_version']
        self.assertEqual(self.submit(data)[0],400)

    def test_drawn_signature_still_requires_specific_storage_authorization(self):
        self.data['signature'].update(method='drawn',strokes=[[[.1+i*.025,.3+i*.01] for i in range(12)]])
        self.data['consent']['signature_storage'] = False
        self.assertEqual(self.submit()[0],400)

    def test_private_export_excludes_identity_signature_and_unrequested_measurements(self):
        self.submit()
        self.assertEqual(self.request('/admin/records')[0],401)
        self.assertEqual(self.request('/admin/receipt/'+self.data['submission_id'])[0],401)
        status,_,body=self.request('/admin/export.csv',admin=True)
        self.assertEqual(status,200)
        for forbidden in [b'DOCENTE FICTICIO',b'test@example.org',b'measurement.',b'signature',b'feedback_confirmation']:
            self.assertNotIn(forbidden,body)
        self.assertIn('No logré abrir el reporte'.encode(),body)
        self.assertIn(b"'=PROPUESTA_DE_PRUEBA()",body)

    def test_router_keeps_records_and_configuration_separate(self):
        self.submit()
        for app,count in [(self.feedback,1),(self.needs,0)]:
            with app.connect() as db:
                self.assertEqual(db.execute('SELECT count(*) FROM responses').fetchone()[0],count)
        status,_,body=self.request('/api/config',prefix='/encuesta-docente')
        self.assertEqual(status,200)
        self.assertEqual(json.loads(body)['settings']['instrument_code'],'LR-CR-01')
        self.assertEqual(self.request('/api/config')[0],200)
        status,_,body=self.request('/')
        self.assertEqual(status,200)
        self.assertIn(b'9 preguntas',body)
        self.assertNotIn(b'19 preguntas',body)
        self.assertIn('Sus observaciones cuentan.'.encode(),body)
        for path in ['/feedback/settings.json','/feedback/schema.json','/data/retroalimentacion-piloto.sqlite3','/../settings.json']:
            self.assertEqual(self.request(path)[0],404)
        with self.assertRaises(RuntimeError):
            InstrumentRouter(self.needs,self.needs)

    def test_feedback_cannot_reuse_the_needs_instrument_session(self):
        _,_,body=self.request('/api/session',prefix='/encuesta-docente')
        self.csrf=json.loads(body)['csrf'];self.cookie='survey_csrf='+self.csrf
        self.assertEqual(self.submit()[0],403)
        self.assertEqual(self.submit(csrf=False)[0],403)
        self.assertEqual(self.submit(origin='https://other.example')[0],403)

    def test_feedback_retry_is_idempotent_but_changed_comments_cannot_replace_signed_content(self):
        first=self.submit();second=self.submit()
        self.assertEqual(first[0],200);self.assertEqual(first[2],second[2])
        self.data['answers']['feedback.observation']='Comentario distinto'
        self.assertEqual(self.submit()[0],409)

    def test_demo_response_is_explicit_and_not_claimed_as_direct_use(self):
        self.data['answers']['feedback.experience']='demo'
        status,_,body=self.submit();self.assertEqual(status,200)
        self.assertEqual(json.loads(body)['response']['answers']['feedback.experience'],'demo')

    def test_feedback_login_and_review_stay_separate_from_needs(self):
        self.submit()
        status,headers,_=self.request('/admin/')
        self.assertEqual(status,302)
        self.assertEqual(dict(headers)['Location'],'/retroalimentacion-piloto/admin/login')
        status,_,body=self.request('/admin/login')
        self.assertEqual(status,200)
        self.assertIn('Retroalimentación del piloto'.encode(),body)
        status,headers,_=self.request('/admin/login','POST',{'username':'research','password':'a'*32})
        self.assertEqual(status,200)
        session_cookie=dict(headers)['Set-Cookie']
        self.assertIn('pilot_feedback_admin=',session_cookie)
        self.assertIn('Path=/retroalimentacion-piloto/admin;',session_cookie)
        self.cookie+='; '+session_cookie.split(';')[0]
        self.assertEqual(self.request('/admin/records')[0],200)
        self.assertEqual(self.request('/admin/records',prefix='/encuesta-docente')[0],401)
        before=self.request('/admin/receipt/'+self.data['submission_id'])[2]
        status,_,_=self.request('/admin/review/'+self.data['submission_id'],'PUT',{'status':'follow_up','tags':['Piloto'],'notes':'Comentario privado del investigador'})
        self.assertEqual(status,200)
        self.assertEqual(before,self.request('/admin/receipt/'+self.data['submission_id'])[2])
        self.assertEqual(self.request('/admin/logout','POST')[0],204)
        self.assertEqual(self.request('/admin/records')[0],401)


if __name__ == '__main__': unittest.main()
