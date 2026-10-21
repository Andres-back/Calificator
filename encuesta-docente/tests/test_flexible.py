import copy
import json
import unittest
import uuid
import test_app
from app import SurveyApplication


class FlexibleTests(unittest.TestCase):
    def setUp(self):
        self.fx = test_app.SurveyTests()
        self.fx.setUp()
        previous = self.fx.app
        self.fx.app = SurveyApplication(database=previous.database, origin=previous.origin,
            secret='s'*48, admin_user='research', admin_password='a'*32)
        self.fx.data.update(instrument_version=self.fx.app.settings['instrument_version'],
                            consent_version=self.fx.app.settings['consent_version'])

    def tearDown(self):
        self.fx.tearDown()

    def test_all_questions_optional_and_no_invented_zero(self):
        self.assertEqual(self.fx.data['instrument_version'],'5.1-web-flexible')
        self.assertTrue(self.fx.app.settings['flexible_answers'])
        self.assertFalse(any(q.get('required') for s in self.fx.app.schema['sections'] for q in s['questions']))
        self.fx.data['answers'] = {}
        status,_,body = self.fx.submit()
        self.assertEqual(status,200,body)
        receipt = json.loads(body)
        self.assertEqual(receipt['response'],self.fx.data)
        self.assertEqual(receipt['response']['answers'],{})
        self.assertEqual(self.fx.submit()[2],body)

    def test_partial_answers_do_not_block(self):
        self.fx.data['answers'] = {'manual.minutes':32.5,
                                  'evidence.storage':['6'], 'needs.support':['none','archive']}
        self.assertEqual(self.fx.submit()[0],200)

    def test_percent_decimal_and_non_numeric_values_preserved(self):
        for value in (50.5, 0, 100, '50 %', '50,5', 'aprox. la mitad', '120'):
            data=copy.deepcopy(self.fx.data);data['submission_id']=str(uuid.uuid4())
            data['answers']['manual.open_percent']=value
            status,_,body=self.fx.submit(data)
            self.assertEqual(status,200,body)
            self.assertEqual(json.loads(body)['response']['answers']['manual.open_percent'],value)
        for value in (True, [], {}, 'x'*81, float('inf'), -1, 101):
            data=copy.deepcopy(self.fx.data);data['answers']['manual.open_percent']=value
            self.assertEqual(self.fx.submit(data)[0],400)

    def test_original_five_zero_form_preserves_its_rules_and_receipt(self):
        archived = copy.deepcopy(self.fx.data)
        archived.update(instrument_version='5.0-web-medicion',consent_version='CI-NEC-01-v5-2026-10-20')
        archived['answers']={'institution':'PRUEBA','manual.open_percent':50}
        status,_,body=self.fx.submit(archived)
        self.assertEqual(status,200,body)
        receipt=json.loads(body)
        self.assertEqual(receipt['settings']['instrument_version'],'5.0-web-medicion')
        self.assertNotIn('flexible_answers',receipt['settings'])
        self.assertEqual(self.fx.submit(archived)[2],body)
        archived['answers']['manual.open_percent']=50.5
        self.assertEqual(self.fx.submit(archived)[0],400)

    def test_summary_excludes_incomplete_or_text_measurements(self):
        for answers in ({'manual.minutes':32.5}, {'manual.minutes':'32 minutos','manual.deliveries':25,'manual.basis':'estimated'},
                        {'manual.minutes':32.5,'manual.deliveries':25,'manual.basis':'estimated'}):
            data=copy.deepcopy(self.fx.data);data['submission_id']=str(uuid.uuid4());data['answers']=answers
            data['completion_metrics']={'elapsed_seconds':300,'visible_seconds':250,'source':'browser'}
            self.assertEqual(self.fx.submit(data)[0],200)
        report=json.loads(self.fx.request('/admin/summary',admin=True)[2])
        row=next(r for r in report['versions'] if r['version']=='5.1-web-flexible')
        self.assertEqual(row['responses'],3)
        self.assertEqual(row['minutes_per_delivery_by_basis']['estimated'],{'n':1,'mean':1.3})
        self.assertEqual(row['form_duration_n'],3)

    def test_consent_signature_identity_and_csrf_still_required(self):
        self.fx.data['answers']={}
        self.assertEqual(self.fx.submit(csrf=False)[0],403)
        for field in ('participation','data_processing','signature_storage'):
            data=copy.deepcopy(self.fx.data);data['consent'][field]=False
            self.assertEqual(self.fx.submit(data)[0],400)
        data=copy.deepcopy(self.fx.data);data['signature']['strokes']=[]
        self.assertEqual(self.fx.submit(data)[0],400)
        data=copy.deepcopy(self.fx.data);data['identity']['name']=''
        self.assertEqual(self.fx.submit(data)[0],400)

    def test_administrative_correction_accepts_flexible_text_without_rewriting_original(self):
        self.fx.data['answers']={}
        status,_,original=self.fx.submit()
        self.assertEqual(status,200)
        route='/admin/manage/'+self.fx.data['submission_id']
        self.assertEqual(self.fx.request(route)[0],401)
        state=json.loads(self.fx.request(route,admin=True)[2])
        self.assertTrue(state['editable'])
        command=dict(action='correct',expected_revision=0,request_id=str(uuid.uuid4()),
                     reason='Prueba sintética de corrección flexible',
                     patch={'answers':{'manual.open_percent':'aprox. la mitad','manual.minutes':30.5}})
        status,_,body=self.fx.request(route,'POST',command,admin=True)
        self.assertEqual(status,200,body)
        self.assertEqual(self.fx.request('/admin/receipt/'+self.fx.data['submission_id'],admin=True)[2],original)
        state=json.loads(self.fx.request(route,admin=True)[2])
        self.assertEqual(state['effective']['answers']['manual.open_percent'],'aprox. la mitad')


if __name__=='__main__':unittest.main()
