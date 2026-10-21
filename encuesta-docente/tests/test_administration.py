"""Synthetic responses only: administrative changes never rewrite signed receipts."""
import copy
import json
import uuid
import unittest
import subprocess
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import test_app
import test_feedback
from app import SurveyApplication


class ManagementTests(unittest.TestCase):
    def setUp(self):
        self.fx = test_app.SurveyTests()
        self.fx.setUp()
        self.assertEqual(self.fx.submit()[0], 200)
        self.id = self.fx.data['submission_id']
        self.route = '/admin/manage/' + self.id
        self.original = self.fx.request('/admin/receipt/' + self.id, admin=True)[2]

    def tearDown(self):
        self.assertEqual(self.fx.request('/admin/receipt/' + self.id, admin=True)[2], self.original)
        self.fx.tearDown()

    def command(self, action='correct', revision=0, **extra):
        return dict(action=action, expected_revision=revision, request_id=str(uuid.uuid4()),
                    reason='Corrección solicitada en muestra sintética.', **extra)

    def post(self, data, **options):
        return self.fx.request(self.route, 'POST', data, admin=True, **options)

    def view(self):
        status, _, body = self.fx.request(self.route, admin=True)
        self.assertEqual(status, 200, body)
        return json.loads(body)

    def test_permissions_origin_missing_record(self):
        cmd = self.command('remove', confirm_id=self.id)
        self.assertEqual(self.fx.request(self.route)[0], 401)
        self.assertEqual(self.fx.request(self.route, 'POST', cmd)[0], 401)
        self.assertEqual(self.post(cmd, csrf=False)[0], 403)
        self.assertEqual(self.post(cmd, origin='https://other.example')[0], 403)
        self.assertEqual(self.fx.request('/admin/manage/' + str(uuid.uuid4()), admin=True)[0], 404)
        self.assertEqual(self.fx.request('/admin/corrections.csv')[0], 401)

    def test_correction_append_only_idempotent_and_conflict(self):
        cmd = self.command(patch={'identity': {'name': 'NOMBRE RECTIFICADO'},
                                  'answers': {'area': 'Matemáticas', 'manual.minutes': 45, 'manual.basis': 'estimated'}})
        status, _, body = self.post(cmd)
        self.assertEqual(status, 200, body)
        self.assertEqual(self.post(cmd)[2], body)
        state = self.view()
        self.assertEqual(state['revision'], 1)
        self.assertEqual(state['effective']['identity']['name'], 'NOMBRE RECTIFICADO')
        self.assertEqual(state['original']['identity']['name'], self.fx.data['identity']['name'])
        self.assertEqual(state['history'][0]['actor'], 'research')
        self.assertEqual(state['history'][0]['changes']['identity.name']['before'], self.fx.data['identity']['name'])
        changed = copy.deepcopy(cmd)
        changed['reason'] = 'Otro motivo'
        self.assertEqual(self.post(changed)[0], 409)
        self.assertEqual(self.post(self.command(patch={'answers': {'area': 'Ciencias'}}))[0], 409)
        self.assertEqual(len(self.view()['history']), 1)

    def test_validates_protected_fields_and_original_question_types(self):
        patches = [{'signature': {}}, {'instrument_version': 'otra'}, {'times': []},
                   {'answers': {'manual.open_percent': 101}}, {'answers': {'manual.deliveries': 2.5}},
                   {'answers': {'unknown': 'dato'}}, {'identity': {'name': 'a'}},
                   {'identity': {'email': 'incorrecto'}}, {'answers': {'3.1': ['1']}},
                   {'answers': {'1.6': [['1']]}}, {'answers': {'needs.support': ['none', 'archive']}},
                   {'answers': {'manual.minutes': 30}}, {}, {'answers': {'institution': 'COLEGIO DE PRUEBA'}}]
        for patch in patches:
            with self.subTest(patch=patch):
                self.assertEqual(self.post(self.command(patch=patch))[0], 400)
        self.assertEqual(self.view()['revision'], 0)

    def test_remove_restore_counts_exports_and_transitions(self):
        self.assertEqual(self.post(self.command('remove', confirm_id='otro'))[0], 400)
        self.assertEqual(self.post(self.command('remove', confirm_id=self.id))[0], 200)
        self.assertTrue(self.view()['deleted'])
        records = json.loads(self.fx.request('/admin/records', admin=True)[2])
        self.assertTrue(records[0]['deleted'])
        report = json.loads(self.fx.request('/admin/summary', admin=True)[2])
        self.assertEqual(report['removed_responses'], 1)
        row = report['versions'][0]
        self.assertEqual((row['received_responses'], row['responses'], row['removed_responses']), (1, 0, 1))
        self.assertNotIn(self.id.encode(), self.fx.request('/admin/export.csv', admin=True)[2])
        self.assertNotIn(self.id.encode(), self.fx.request('/admin/corrections.csv', admin=True)[2])
        self.assertEqual(self.post(self.command(revision=1, patch={'answers': {'area': 'Otra'}}))[0], 400)
        self.assertEqual(self.post(self.command('remove', revision=1, confirm_id=self.id))[0], 400)
        self.assertEqual(self.post(self.command('restore', revision=1))[0], 200)
        self.assertIn(self.id.encode(), self.fx.request('/admin/export.csv', admin=True)[2])
        self.assertEqual(self.view()['revision'], 2)

    def test_migration_repeated_and_exports_separate(self):
        with self.fx.app.connect() as db:
            db.execute('DROP TABLE response_admin_events')
        options = dict(database=self.fx.app.database, origin=self.fx.app.origin, secret='s'*48,
                       admin_user='research', admin_password='a'*32)
        self.fx.app = SurveyApplication(**options)
        self.fx.app = SurveyApplication(**options)
        self.assertEqual(self.post(self.command(patch={'answers': {'area': '=PRUEBA()'}}))[0], 200)
        corrected = self.fx.request('/admin/corrections.csv', admin=True)[2]
        self.assertIn(b"'=PRUEBA()", corrected)
        self.assertNotIn(b'test@example', corrected)
        self.assertNotIn(b'Correcci\xc3\xb3n solicitada', corrected)
        self.assertNotIn(b'=PRUEBA()', self.fx.request('/admin/export.csv', admin=True)[2])

    def test_reason_unknown_keys_and_booleans_rejected(self):
        for overrides in ({'reason': ''}, {'reason': ' '*10}, {'forged_actor': 'otro'},
                          {'expected_revision': True}, {'request_id': 'bad'}, {'action': []}):
            cmd = self.command('remove', confirm_id=self.id)
            cmd.update(overrides)
            self.assertEqual(self.post(cmd)[0], 400)

    def test_concurrent_updates_only_one_wins(self):
        commands = [self.command(patch={'answers': {'area': value}}) for value in ('Uno', 'Dos')]
        with ThreadPoolExecutor(max_workers=2) as pool:
            codes = list(pool.map(lambda cmd: self.post(cmd)[0], commands))
        self.assertEqual(sorted(codes), [200, 409])
        self.assertEqual(self.view()['revision'], 1)

    def test_original_report_not_silently_replaced_by_correction(self):
        self.fx.data['submission_id'] = str(uuid.uuid4())
        self.fx.data['answers'].update({'manual.minutes': 100, 'manual.deliveries': 10, 'manual.basis': 'estimated'})
        self.assertEqual(self.fx.submit()[0], 200)
        route = '/admin/manage/' + self.fx.data['submission_id']
        self.assertEqual(self.fx.request(route, 'POST', self.command(patch={'answers': {'manual.minutes': 50}}), admin=True)[0], 200)
        report = json.loads(self.fx.request('/admin/summary', admin=True)[2])
        self.assertEqual(report['versions'][0]['minutes_per_delivery_by_basis']['estimated']['mean'], 10)

    def test_old_version_uses_its_own_options(self):
        old = copy.deepcopy(self.fx.data)
        old.update(submission_id=str(uuid.uuid4()), instrument_version='4.0-web-breve', consent_version='CI-NEC-01-v4-2026-10-19')
        self.assertEqual(self.fx.submit(old)[0], 200)
        route = '/admin/manage/' + old['submission_id']
        self.assertEqual(self.fx.request(route, 'POST', self.command(patch={'answers': {'manual.duration': '60to119', 'manual.basis': 'estimated'}}), admin=True)[0], 200)
        self.assertEqual(self.fx.request(route, 'POST', self.command(revision=1, patch={'answers': {'manual.minutes': 40}}), admin=True)[0], 400)

    def test_later_retry_returns_original_confirmation(self):
        cmd = self.command(patch={'answers': {'area': 'Primero'}})
        first = self.post(cmd)
        self.assertEqual(first[0], 200)
        self.assertEqual(self.post(self.command(revision=1, patch={'answers': {'area': 'Después'}}))[0], 200)
        self.assertEqual(self.post(cmd)[2], first[2])
        self.assertEqual(self.view()['effective']['answers']['area'], 'Después')

    def test_pilot_crud_and_instrument_isolation(self):
        fx = test_feedback.FeedbackTests()
        fx.setUp()
        try:
            self.assertEqual(fx.submit()[0], 200)
            record_id = fx.data['submission_id']
            route = '/admin/manage/' + record_id
            original = fx.request('/admin/receipt/' + record_id, admin=True)[2]
            self.assertEqual(fx.request(route, 'POST', self.command(patch={'answers': {'feedback.observation': 'Observación rectificada de muestra'}}), admin=True)[0], 200)
            self.assertEqual(fx.request(route, admin=True, prefix='/encuesta-docente')[0], 404)
            self.assertEqual(fx.request(route, 'POST', self.command('remove', revision=1, confirm_id=record_id), admin=True)[0], 200)
            self.assertEqual(fx.request(route, 'POST', self.command('restore', revision=2), admin=True)[0], 200)
            self.assertEqual(fx.request('/admin/receipt/' + record_id, admin=True)[2], original)
            self.assertEqual(len(json.loads(fx.request(route, admin=True)[2])['history']), 3)
        finally:
            fx.tearDown()

    def test_snapshotless_legacy_stays_readable_not_editable(self):
        with self.fx.app.connect() as db:
            doc = json.loads(db.execute('SELECT receipt_json FROM responses WHERE id=?', (self.id,)).fetchone()[0])
            del doc['schema_snapshot']
            db.execute('UPDATE responses SET receipt_json=? WHERE id=?', (json.dumps(doc), self.id))
        self.original = self.fx.request('/admin/receipt/' + self.id, admin=True)[2]
        self.assertFalse(self.view()['editable'])
        self.assertEqual(self.post(self.command(patch={'answers': {'area': 'Otra'}}))[0], 400)
        self.assertEqual(self.post(self.command('remove', confirm_id=self.id))[0], 200)

    def test_atomic_failure_rolls_back_and_preserves_all_hashes(self):
        with self.fx.app.connect() as db:
            before = db.execute('SELECT * FROM responses').fetchall()
            db.execute("CREATE TRIGGER fail_event BEFORE INSERT ON response_admin_events BEGIN SELECT RAISE(ABORT,'synthetic failure'); END")
        self.assertEqual(self.post(self.command(patch={'answers': {'area': 'Otra'}}))[0], 503)
        with self.fx.app.connect() as db:
            self.assertEqual(db.execute('SELECT * FROM responses').fetchall(), before)
            self.assertEqual(db.execute('SELECT count(*) FROM response_admin_events').fetchone()[0], 0)
            db.execute('DROP TRIGGER fail_event')
        self.assertEqual(self.view()['revision'], 0)

    def test_hundred_response_list_and_report_use_bounded_queries(self):
        import administration
        from app import canonical, summary
        with self.fx.app.connect() as db:
            row = db.execute('SELECT * FROM responses').fetchone()
            for _ in range(99):
                record_id = str(uuid.uuid4())
                doc = json.loads(row[4])
                doc['submission_id'] = doc['response']['submission_id'] = record_id
                db.execute('INSERT INTO responses VALUES (?,?,?,?,?)', (record_id, *row[1:4], canonical(doc)))
            queries = []
            db.set_trace_callback(queries.append)
            result = administration.report(db, self.fx.app.settings['instrument_version'], summary)
            self.assertEqual(result['active_responses'], 100)
            self.assertLessEqual(len([q for q in queries if q.startswith('SELECT')]), 3)

    def test_explicit_custodian_deletion_remains_available_after_events(self):
        self.assertEqual(self.post(self.command(patch={'answers': {'area': 'Otra'}}))[0], 200)
        script = str(Path(__file__).resolve().parents[1] / 'manage.py')
        wrong = subprocess.run([sys.executable, script, '--database', str(self.fx.app.database), 'delete', self.id,
                                '--confirm-id', 'incorrecto'], capture_output=True, text=True)
        self.assertNotEqual(wrong.returncode, 0)
        self.assertEqual(self.view()['revision'], 1)
        result = subprocess.run([sys.executable, script, '--database', str(self.fx.app.database), 'delete', self.id,
                                 '--confirm-id', self.id], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        with self.fx.app.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM responses').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT count(*) FROM response_admin_events').fetchone()[0], 0)
        # This test alone explicitly invokes the custodian's confirmed physical deletion.
        self.original = self.fx.request('/admin/receipt/' + self.id, admin=True)[2]


if __name__ == '__main__':
    unittest.main()
