import copy
import hashlib
import json
import unittest
from datetime import datetime, timezone

import test_app
import test_feedback
from app import InstrumentRouter, SurveyApplication, canonical


class SignaturePolicyTests(unittest.TestCase):
    def setUp(self):
        self.fixtures = [test_app.SurveyTests(), test_feedback.FeedbackTests()]
        for fixture in self.fixtures:
            fixture.setUp()

    def tearDown(self):
        for fixture in self.fixtures:
            fixture.tearDown()

    def test_both_instruments_reject_name_only_for_new_submissions(self):
        for fixture in self.fixtures:
            with self.subTest(instrument=type(fixture).__name__):
                data = copy.deepcopy(fixture.data)
                data['signature'].update(method='typed', strokes=[])
                data['consent']['signature_storage'] = False
                status, _, body = fixture.submit(data)
                self.assertEqual(status, 400)
                self.assertIn('dibujar su firma', json.loads(body)['error'])

    def test_both_instruments_reject_empty_or_insufficient_ink(self):
        for fixture in self.fixtures:
            for strokes in ([], [[[.1,.1],[.11,.11]]], [[[.1,.1]] * 12]):
                with self.subTest(instrument=type(fixture).__name__, strokes=strokes):
                    data = copy.deepcopy(fixture.data)
                    data['signature']['strokes'] = strokes
                    self.assertEqual(fixture.submit(data)[0], 400)

    def test_both_instruments_require_explicit_drawing_storage_consent(self):
        for fixture in self.fixtures:
            data = copy.deepcopy(fixture.data)
            data['consent']['signature_storage'] = False
            self.assertEqual(fixture.submit(data)[0], 400)

    def test_both_instruments_save_drawing_and_show_it_in_private_receipt(self):
        for fixture in self.fixtures:
            status, _, body = fixture.submit()
            self.assertEqual(status, 200)
            expected = json.loads(body)
            status, _, body = fixture.request('/admin/receipt/' + fixture.data['submission_id'], admin=True)
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(body), expected)
            self.assertEqual(expected['response']['signature']['strokes'], fixture.data['signature']['strokes'])
            self.assertTrue(expected['settings']['require_drawn_signature'])

    def test_historical_name_only_receipts_remain_unchanged_and_readable(self):
        for fixture in self.fixtures:
            app = getattr(fixture, 'feedback', fixture.app)
            data = copy.deepcopy(fixture.data)
            settings = copy.deepcopy(app.settings)
            settings.pop('require_drawn_signature')
            feedback = settings.get('kind') == 'pilot_feedback'
            old_version = 'CI-PIL-RET-01-v1-2026-10-19' if feedback else 'CI-NEC-01-v3-2026-10-18'
            settings['consent_version'] = data['consent_version'] = old_version
            data['signature'].update(method='typed', strokes=[])
            data['consent']['signature_storage'] = False
            now = datetime.now(timezone.utc).isoformat()
            receipt = {'submission_id': data['submission_id'], 'received_at_utc': now,
                       'settings': settings, 'schema_snapshot': app.schema,
                       'consent_document': [{'title': 'Constancia anterior',
                                             'text': 'Aceptación mediante nombre completo y autorización expresa.'}],
                       'response': data}
            receipt_hash = hashlib.sha256(canonical(receipt).encode()).hexdigest()
            receipt['sha256'] = receipt_hash
            encoded = canonical(receipt)
            with app.connect() as db:
                db.execute('INSERT INTO responses VALUES (?, ?, ?, ?, ?)',
                           (data['submission_id'], now, hashlib.sha256(canonical(data).encode()).hexdigest(), receipt_hash, encoded))
            reopened = SurveyApplication(database=app.database, instrument='feedback' if feedback else 'needs',
                origin=app.origin, secret=app.secret, admin_user=app.admin_user, admin_password=app.admin_password)
            if feedback:
                fixture.feedback = reopened
                fixture.app = InstrumentRouter(fixture.needs, reopened)
            else:
                fixture.app = reopened
            status, _, body = fixture.request('/admin/receipt/' + data['submission_id'], admin=True)
            self.assertEqual(status, 200)
            self.assertEqual(body.decode(), encoded)
            self.assertEqual(fixture.request('/admin/records', admin=True)[0], 200)
            self.assertEqual(fixture.request('/admin/export.csv', admin=True)[0], 200)
            unsigned = {key: value for key, value in json.loads(body).items() if key != 'sha256'}
            self.assertEqual(hashlib.sha256(canonical(unsigned).encode()).hexdigest(), receipt_hash)
            self.assertEqual(fixture.submit(data)[0], 400)


if __name__ == '__main__':
    unittest.main()
