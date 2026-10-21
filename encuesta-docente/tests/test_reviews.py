import json
import unittest
import uuid

import test_app
from app import SurveyApplication


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.fixture = test_app.SurveyTests()
        self.fixture.setUp()
        self.fixture.submit()
        self.record_id = self.fixture.data['submission_id']
        self.review = {'status': 'follow_up', 'tags': ['Piloto', 'Colegio A'], 'notes': 'Confirmar disponibilidad.'}

    def tearDown(self):
        self.fixture.tearDown()

    def update(self, **kwargs):
        return self.fixture.request('/admin/review/' + self.record_id, 'PUT', self.review, **kwargs)

    def test_review_requires_admin_and_same_origin_csrf(self):
        self.assertEqual(self.update()[0], 401)
        self.assertEqual(self.update(admin=True, csrf=False)[0], 403)
        self.assertEqual(self.update(admin=True, origin='https://other.example')[0], 403)
        self.assertEqual(self.update(admin=True)[0], 200)

    def test_review_persists_without_modifying_original_receipt(self):
        before = self.fixture.request('/admin/receipt/' + self.record_id, admin=True)[2]
        self.assertEqual(self.update(admin=True)[0], 200)
        after = self.fixture.request('/admin/receipt/' + self.record_id, admin=True)[2]
        self.assertEqual(before, after)
        self.fixture.app = SurveyApplication(database=self.fixture.app.database, origin='http://127.0.0.1:8092', secret='s'*48, admin_user='research', admin_password='a'*32)
        status, _, body = self.fixture.request('/admin/records', admin=True)
        self.assertEqual(status, 200)
        record = json.loads(body)[0]
        self.assertEqual(record['institution'], 'COLEGIO DE PRUEBA')
        self.assertEqual(record['review']['tags'], self.review['tags'])
        self.assertEqual(record['review']['notes'], self.review['notes'])
        self.assertEqual(record['review']['status'], 'follow_up')

    def test_review_rejects_invalid_metadata(self):
        for field, invalid in [('status', 'anything'), ('status', []), ('tags', ['a']*9), ('tags', ['a'*41]), ('tags', ['']), ('notes', 'a'*2501)]:
            original = self.review[field]
            self.review[field] = invalid
            self.assertEqual(self.update(admin=True)[0], 400, field)
            self.review[field] = original

    def test_review_of_unknown_response_is_not_created(self):
        self.record_id = str(uuid.uuid4())
        self.assertEqual(self.update(admin=True)[0], 404)
        with self.fixture.app.connect() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM response_reviews').fetchone()[0], 0)

    def test_review_update_and_deletion_follow_response_lifecycle(self):
        self.assertEqual(self.update(admin=True)[0], 200)
        self.review.update(status='reviewed', tags=['Piloto', 'Piloto'], notes='Lista.')
        self.assertEqual(self.update(admin=True)[0], 200)
        with self.fixture.app.connect() as db:
            row = db.execute('SELECT status, tags_json FROM response_reviews').fetchone()
            self.assertEqual(row, ('reviewed', '["Piloto"]'))
            db.execute('DELETE FROM responses WHERE id=?', (self.record_id,))
            self.assertEqual(db.execute('SELECT COUNT(*) FROM response_reviews').fetchone()[0], 0)

    def test_reviews_and_database_files_are_private(self):
        self.update(admin=True)
        for path in ['/admin/records', '/admin/receipt/' + self.record_id, '/admin/export.csv']:
            self.assertEqual(self.fixture.request(path, csrf=False)[0], 401)
        for path in ['/data/encuestas.sqlite3', '/response_reviews', '/.env']:
            self.assertEqual(self.fixture.request(path, csrf=False)[0], 404)

    def test_csv_includes_review_classification_without_private_notes(self):
        self.update(admin=True)
        status, _, body = self.fixture.request('/admin/export.csv', admin=True)
        self.assertEqual(status, 200)
        self.assertIn(b'estado_revision', body)
        self.assertIn(b'follow_up', body)
        self.assertIn(b'Colegio A', body)
        self.assertNotIn(self.review['notes'].encode(), body)

    def test_responses_keep_strict_script_policy_and_prevent_edge_injection(self):
        _, headers, _ = self.fixture.request('/')
        headers = dict(headers)
        self.assertEqual(headers['Cache-Control'], 'no-store, no-transform')
        self.assertIn("script-src 'self';", headers['Content-Security-Policy'])
