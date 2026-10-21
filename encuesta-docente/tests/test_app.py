import base64
import copy
import hashlib
import io
import json
import sys
import tempfile
import unittest
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import SurveyApplication, canonical, consent_document


class SurveyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.app = SurveyApplication(database=Path(self.temp.name)/'responses.sqlite3', origin='http://127.0.0.1:8092', secret='s'*48, admin_user='research', admin_password='a'*32)
        # Congelar las regresiones del contrato 5.0, incluso tras publicar versiones nuevas.
        archived = Path(__file__).resolve().parents[1]/'versions/5.0-web-medicion'
        self.app.settings = json.loads((archived/'settings.json').read_text(encoding='utf-8'))
        self.app.schema = json.loads((archived/'schema.json').read_text(encoding='utf-8'))
        self.app.consent = consent_document(self.app.settings)
        status, headers, response = self.request('/api/session')
        self.assertEqual(status, 200)
        self.csrf = json.loads(response)['csrf']
        self.cookie = dict(headers)['Set-Cookie'].split(';')[0]
        self.data = dict(submission_id=str(uuid.uuid4()), instrument_version=self.app.settings['instrument_version'], consent_version=self.app.settings['consent_version'], identity={'name':'DOCENTE PRUEBA SINTÉTICA', 'email':'test@example.org','phone':''}, answers={'institution':'COLEGIO DE PRUEBA','1.2':'1','9.1':'=NO_PUBLICAR()'}, times=[], measurement={'date':'','deliveries':None,'open_answers':None,'group':'','condition':'manual','scope':''}, consent={'participation':True,'data_processing':True,'signature_storage':True}, signature={'method':'drawn','name':'DOCENTE PRUEBA SINTÉTICA','strokes':[[[.1+i*.025,.3+i*.01] for i in range(12)]]})

    def tearDown(self):
        self.temp.cleanup()

    def request(self, path, method='GET', data=None, csrf=True, admin=False, origin=None):
        body = json.dumps(data,ensure_ascii=False).encode() if data is not None else b''
        env={'REQUEST_METHOD':method,'PATH_INFO':'/encuesta-docente'+path,'wsgi.input':io.BytesIO(body),'CONTENT_LENGTH':str(len(body)),'CONTENT_TYPE':'application/json','REMOTE_ADDR':'127.0.0.1','HTTP_ORIGIN':origin or 'http://127.0.0.1:8092'}
        if csrf and hasattr(self,'csrf'):
            env.update(HTTP_X_SURVEY_CSRF=self.csrf,HTTP_COOKIE=self.cookie)
        if admin:
            env['HTTP_AUTHORIZATION']='Basic '+base64.b64encode(b'research:'+b'a'*32).decode()
        result={}
        def start(status,headers):result.update(status=int(status.split()[0]),headers=headers)
        response=b''.join(self.app(env,start))
        return result['status'],result['headers'],response

    def submit(self,data=None,**kwargs):
        return self.request('/api/responses','POST',data or self.data,**kwargs)

    def test_submission_and_receipt_bound_to_consent(self):
        status,_,body=self.submit();self.assertEqual(status,200)
        receipt=json.loads(body); stated=receipt.pop('sha256')
        self.assertEqual(stated,hashlib.sha256(canonical(receipt).encode()).hexdigest())
        self.assertEqual(receipt['response']['consent_version'],self.app.settings['consent_version'])
        self.assertEqual(len(receipt['consent_document']),8)
        self.assertEqual(receipt['schema_snapshot'],self.app.schema)
        self.assertEqual(receipt['response']['times'],[])

    def test_retry_is_idempotent_and_content_change_is_rejected(self):
        first=self.submit();second=self.submit();self.assertEqual(first[2],second[2])
        self.data['answers']['9.1']='Cambio';self.assertEqual(self.submit()[0],409)
        with self.app.connect() as db:self.assertEqual(db.execute('SELECT count(*) FROM responses').fetchone()[0],1)

    def test_missing_consent_rejected(self):
        for key in ['participation','data_processing']:
            data=copy.deepcopy(self.data);data['consent'][key]=False
            self.assertEqual(self.submit(data)[0],400)

    def test_cross_origin_and_missing_csrf_rejected(self):
        self.assertEqual(self.submit(csrf=False)[0],403)
        self.assertEqual(self.submit(origin='https://other.example')[0],403)

    def test_admin_requires_auth_and_export_excludes_identity(self):
        self.submit();self.assertEqual(self.request('/admin/records',csrf=False)[0],401)
        self.assertEqual(self.request('/admin/receipt/'+self.data['submission_id'],csrf=False)[0],401)
        status,_,body=self.request('/admin/export.csv',admin=True)
        self.assertEqual(status,200);self.assertNotIn(b'DOCENTE PRUEBA',body);self.assertNotIn(b'test@example',body)
        self.assertIn(b"'=NO_PUBLICAR()",body)

    def test_time_ranges_preserve_provenance_without_inventing_minutes(self):
        self.data.update(instrument_version='4.0-web-breve',consent_version='CI-NEC-01-v4-2026-10-19')
        self.data['answers'].update({'manual.duration':'60to119','manual.basis':'measured','manual.deliveries':24})
        status,_,body=self.submit();self.assertEqual(status,200)
        response=json.loads(body)['response']
        self.assertEqual(response['answers']['manual.duration'],'60to119')
        self.assertEqual(response['answers']['manual.basis'],'measured')
        self.assertEqual(response['times'],[])

    def test_inconsistent_duration_and_basis_rejected(self):
        for duration,basis in [(None,'measured'),('unknown','estimated'),('na','measured'),('60to119','na')]:
            data=copy.deepcopy(self.data);data['answers'].update({'manual.duration':duration,'manual.basis':basis})
            self.assertEqual(self.submit(data)[0],400)

    def test_no_support_cannot_be_combined_with_support_needs(self):
        self.data['answers']['needs.support']=['none','archive']
        self.assertEqual(self.submit()[0],400)
        self.data['answers']['needs.support']=['none']
        self.assertEqual(self.submit()[0],200)

    def test_missing_not_applicable_and_declined_remain_distinct(self):
        self.data['answers'].update({'3.1':'na','3.2':'skip','rubric.use':None})
        status,_,body=self.submit();self.assertEqual(status,200)
        response=json.loads(body)['response']
        self.assertEqual(response['answers']['3.1'],'na')
        self.assertEqual(response['answers']['3.2'],'skip')
        self.assertIsNone(response['answers']['rubric.use'])

    def test_double_mark_or_unknown_option_rejected(self):
        for value in [['1','5'],'6',{'value':'5'}]:
            data=copy.deepcopy(self.data);data['answers']['3.1']=value
            self.assertEqual(self.submit(data)[0],400)

    def test_drawn_signature_requires_ink_consent_and_valid_coordinates(self):
        data=copy.deepcopy(self.data);data['signature'].update(method='drawn',strokes=[[[.1+i*.025,.3+i*.01] for i in range(12)]])
        data['consent']['signature_storage']=False
        self.assertEqual(self.submit(data)[0],400)
        data['consent']['signature_storage']=True;self.assertEqual(self.submit(data)[0],200)
        data['submission_id']=str(uuid.uuid4());data['signature']['strokes'][0][0]=[-1,5]
        self.assertEqual(self.submit(data)[0],400)

    def test_outdated_consent_rejected(self):
        self.data['consent_version']='antigua';self.assertEqual(self.submit()[0],400)

    def test_server_restart_preserves_data(self):
        self.submit()
        reopened=SurveyApplication(database=self.app.database,origin=self.app.origin,secret='s'*48)
        with reopened.connect() as db:self.assertEqual(db.execute('SELECT count(*) FROM responses').fetchone()[0],1)

    def test_path_traversal_and_data_are_not_public(self):
        for path in ['/data/responses.sqlite3','/../settings.json','/schema.json','/api/responses']:
            self.assertEqual(self.request(path)[0],404)

    def test_frontend_and_admin_base_path(self):
        self.assertEqual(self.request('/')[0],200)
        self.assertEqual(self.request('/app.js')[0],200)
        self.assertEqual(self.request('/admin.js')[0],200)
        self.assertEqual(self.request('/admin',admin=True)[0],302)
        self.assertEqual(self.request('/admin/',admin=True)[0],200)

    def test_evidence_neutral_responses_and_priorities_are_preserved(self):
        self.data['answers'].update({'evidence.storage':['1','3'],'evidence.retrieval':'1','evidence.traceability':'na','evidence.reporting':'1','needs.support':['archive','reports']})
        status,_,body=self.submit();self.assertEqual(status,200)
        answers=json.loads(body)['response']['answers']
        self.assertEqual(answers['evidence.retrieval'],'1')
        self.assertEqual(answers['evidence.traceability'],'na')
        self.assertEqual(answers['needs.support'],['archive','reports'])
        status,_,body=self.request('/admin/export.csv',admin=True)
        self.assertEqual(status,200)
        self.assertIn('Ninguna dificultad'.encode(),body)

    def test_historical_receipt_exports_using_original_schema(self):
        self.submit()
        archived=self.app.settings.copy();archived.update(json.loads((Path(__file__).resolve().parents[1]/'versions/3.3-web/settings.json').read_text(encoding='utf-8')))
        old_schema=json.loads((Path(__file__).resolve().parents[1]/'versions/3.3-web/schema.json').read_text(encoding='utf-8'))
        with self.app.connect() as db:
            row=db.execute('SELECT id,receipt_json FROM responses').fetchone()
            receipt=json.loads(row[1]);receipt['schema_snapshot']=old_schema;receipt['settings']=archived
            receipt['response']['instrument_version']='3.3-web'
            receipt['response']['answers']={'institution':'COLEGIO DE PRUEBA','4.17':'5'}
            receipt['response']['times']=[{'minutes':None,'method':None,'note':''} for _ in range(6)]
            receipt['response']['times'][0].update(minutes=60,method='estimated')
            db.execute('UPDATE responses SET receipt_json=? WHERE id=?',(canonical(receipt),row[0]))
        status,_,body=self.request('/admin/export.csv',admin=True)
        self.assertEqual(status,200)
        self.assertIn(b'3.3-web',body)
        self.assertIn(b'time.1.minutes',body)
        self.assertIn(b'context.4.17',body)

    def test_brief_instrument_does_not_accept_unrequested_chronometry(self):
        self.data['times']=[{'minutes':30,'method':'estimated','note':''}]
        self.assertEqual(self.submit()[0],400)
        self.data['times']=[];self.data['measurement']['deliveries']=24
        self.assertEqual(self.submit()[0],400)

    def test_previous_instrument_is_not_silently_relabelled(self):
        self.data['instrument_version']='3.1-web'
        self.assertEqual(self.submit()[0],400)

    def test_assisted_times_are_rejected_even_without_measured_values(self):
        for condition in ['assisted','other','']:
            data=copy.deepcopy(self.data);data['measurement']['condition']=condition
            self.assertEqual(self.submit(data)[0],400)

    def test_single_optional_demo_invitation_and_no_usage_questions(self):
        questions=[q for s in self.app.schema['sections'] for q in s['questions']]
        self.assertEqual([q['id'] for q in questions if q['id'].startswith('10.')],['10.3'])
        self.assertNotIn('exposure',[q['id'] for q in questions])
        self.data['answers']['10.3']='3'
        self.assertEqual(self.submit()[0],200)


if __name__=='__main__':unittest.main()
