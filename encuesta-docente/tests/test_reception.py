import copy
import json
import unittest
import test_app


class ReceptionTests(unittest.TestCase):
    def setUp(self):
        self.fx = test_app.SurveyTests()
        self.fx.setUp()

    def tearDown(self):
        self.fx.tearDown()

    def test_numeric_minutes_deliveries_and_limits(self):
        self.fx.data['answers'].update({'manual.minutes':32.5,'manual.basis':'measured','manual.deliveries':25,'manual.open_percent':70})
        self.assertEqual(self.fx.submit()[0],200)
        for key,value in [('manual.minutes',-1),('manual.minutes',float('inf')),('manual.deliveries',2.5),('manual.open_percent',101)]:
            data=copy.deepcopy(self.fx.data);data['answers'][key]=value
            self.assertEqual(self.fx.submit(data)[0],400)

    def test_new_questions_and_instrument_versions_are_explicit(self):
        questions=[q for s in self.fx.app.schema['sections'] for q in s['questions']]
        self.assertEqual(len(questions),24)
        self.assertEqual([q['number'] for q in questions],list(range(1,25)))
        ids={q['id'] for q in questions}
        self.assertTrue({'manual.minutes','manual.deliveries','manual.open_percent','handwriting.legibility','camera.quality','evidence.returned','evidence.backup_after_return'}<=ids)
        self.assertNotIn('manual.duration',ids)
        self.assertNotIn('5 a 7 minutos',self.fx.app.consent[1]['text'])

    def test_summary_requires_admin_and_separates_versions(self):
        self.assertEqual(self.fx.request('/admin/summary')[0],401)
        self.assertEqual(self.fx.submit()[0],200)
        status,_,body=self.fx.request('/admin/summary',admin=True)
        self.assertEqual(status,200)
        rows=json.loads(body)['versions']
        row=next(r for r in rows if r['version']=='5.0-web-medicion')
        self.assertEqual(row['responses'],1)
        self.assertEqual(row['teachers_declared'],1)
        self.assertEqual(row['minutes_per_delivery_n'],0)

    def test_completion_metrics_and_current_consent(self):
        self.fx.data['completion_metrics']={'elapsed_seconds':300,'visible_seconds':200,'source':'browser'}
        status,_,body=self.fx.submit();self.assertEqual(status,200)
        self.assertEqual(json.loads(body)['response']['completion_metrics']['elapsed_seconds'],300)
        bad=copy.deepcopy(self.fx.data);bad['completion_metrics']['visible_seconds']=400
        self.assertEqual(self.fx.submit(bad)[0],400)

    def test_old_open_form_retains_its_original_version(self):
        data=copy.deepcopy(self.fx.data)
        data.update(instrument_version='4.0-web-breve',consent_version='CI-NEC-01-v4-2026-10-19')
        data['answers'].update({'manual.duration':'60to119','manual.basis':'estimated'})
        status,_,body=self.fx.submit(data);self.assertEqual(status,200)
        receipt=json.loads(body)
        self.assertEqual(receipt['settings']['instrument_version'],'4.0-web-breve')
        self.assertIn('5 a 7 minutos',receipt['consent_document'][1]['text'])
        before=body
        self.assertEqual(self.fx.submit(data)[2],before)

    def test_incompatible_versions_are_not_combined_in_summary(self):
        old=copy.deepcopy(self.fx.data);old.update(instrument_version='4.0-web-breve',consent_version='CI-NEC-01-v4-2026-10-19')
        old['answers'].update({'manual.duration':'60to119','manual.basis':'estimated','manual.deliveries':20})
        self.assertEqual(self.fx.submit(old)[0],200)
        import uuid
        self.fx.data['submission_id']=str(uuid.uuid4())
        self.fx.data['answers'].update({'manual.minutes':32.5,'manual.basis':'estimated','manual.deliveries':25,'manual.open_percent':40})
        self.assertEqual(self.fx.submit()[0],200)
        status,_,body=self.fx.request('/admin/summary',admin=True);self.assertEqual(status,200)
        rows={r['version']:r for r in json.loads(body)['versions']}
        self.assertEqual(rows['4.0-web-breve']['minutes_per_delivery_n'],0)
        self.assertEqual(rows['5.0-web-medicion']['minutes_per_delivery_by_basis']['estimated'],{'n':1,'mean':1.3})
        self.assertEqual(self.fx.request('/admin/summary.csv')[0],401)
        csv=self.fx.request('/admin/summary.csv',admin=True)[2]
        self.assertNotIn(b'DOCENTE',csv);self.assertIn(b'4.0-web-breve',csv)

    def test_rejection_logging_never_contains_input(self):
        data=copy.deepcopy(self.fx.data);data['identity']['email']='CONTACTO_PRIVADO_INVALIDO'
        with self.assertLogs('survey',level='WARNING') as log:
            status,_,body=self.fx.submit(data)
        self.assertEqual(status,400);self.assertEqual(json.loads(body)['field'],'identity-email')
        self.assertNotIn('CONTACTO_PRIVADO',' '.join(log.output))


if __name__=='__main__':unittest.main()
