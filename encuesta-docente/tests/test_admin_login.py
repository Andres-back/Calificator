import io
import json
import unittest
from unittest.mock import patch

import test_app
from app import SurveyApplication


class AdminLoginTests(unittest.TestCase):
    def setUp(self):
        self.fixture = test_app.SurveyTests()
        self.fixture.setUp()
        self.cookie = ''

    def tearDown(self):
        self.fixture.tearDown()

    def request(self, path, method='GET', payload=None, csrf=True, origin=None, cookie=None):
        body = json.dumps(payload).encode() if payload is not None else b''
        env = {'REQUEST_METHOD': method, 'PATH_INFO': '/encuesta-docente' + path,
               'wsgi.input': io.BytesIO(body), 'CONTENT_LENGTH': str(len(body)),
               'CONTENT_TYPE': 'application/json', 'REMOTE_ADDR': '127.0.0.1',
               'HTTP_ORIGIN': origin or self.fixture.app.origin,
               'HTTP_COOKIE': '; '.join(filter(None, [self.fixture.cookie, self.cookie if cookie is None else cookie]))}
        if csrf:
            env['HTTP_X_SURVEY_CSRF'] = self.fixture.csrf
        result = {}
        def started(status, headers):
            result.update(status=int(status.split()[0]), headers=dict(headers))
        result['body'] = b''.join(self.fixture.app(env, started))
        return result

    def login(self, **kwargs):
        result = self.request('/admin/login', 'POST', {'username': 'research', 'password': 'a'*32}, **kwargs)
        if result['status'] == 200:
            self.cookie = result['headers']['Set-Cookie'].split(';')[0]
        return result

    def test_browser_gets_login_form_without_basic_popup(self):
        result = self.request('/admin/')
        self.assertEqual(result['status'], 302)
        self.assertEqual(result['headers']['Location'], '/encuesta-docente/admin/login')
        self.assertNotIn('WWW-Authenticate', result['headers'])
        result = self.request('/admin/login')
        self.assertEqual(result['status'], 200)
        self.assertIn(b'id="login-form"', result['body'])
        self.assertEqual(self.request('/login.js')['status'], 200)
        self.assertEqual(self.request('/admin/records')['status'], 401)

    def test_login_requires_valid_credentials_and_same_origin_csrf(self):
        self.assertEqual(self.login(csrf=False)['status'], 403)
        self.assertEqual(self.login(origin='https://other.example')['status'], 403)
        result = self.request('/admin/login', 'POST', {'username': 'research', 'password': 'wrong'})
        self.assertEqual(result['status'], 401)
        self.assertNotIn('WWW-Authenticate', result['headers'])
        result = self.login()
        self.assertEqual(result['status'], 200)
        cookie = result['headers']['Set-Cookie']
        self.assertIn('HttpOnly', cookie)
        self.assertIn('SameSite=Strict', cookie)
        self.assertIn('Path=/encuesta-docente/admin;', cookie)
        self.assertEqual(self.request('/admin/')['status'], 200)
        self.assertEqual(self.request('/admin/records')['status'], 200)

    def test_session_survives_restart_without_modifying_responses(self):
        self.fixture.submit()
        with self.fixture.app.connect() as db:
            original = db.execute('SELECT receipt_json FROM responses').fetchone()[0]
        self.login()
        self.fixture.app = SurveyApplication(database=self.fixture.app.database, origin=self.fixture.app.origin,
                                            secret='s'*48, admin_user='research', admin_password='a'*32)
        self.assertEqual(self.request('/admin/records')['status'], 200)
        with self.fixture.app.connect() as db:
            self.assertEqual(db.execute('SELECT receipt_json FROM responses').fetchone()[0], original)
            stored = db.execute('SELECT token_hash FROM admin_sessions').fetchone()[0]
            self.assertNotEqual(stored, self.cookie.split('=', 1)[1])

    def test_logout_revokes_session_and_rejects_cross_origin_logout(self):
        self.login()
        self.assertEqual(self.request('/admin/logout', 'POST', csrf=False)['status'], 403)
        self.assertEqual(self.request('/admin/records')['status'], 200)
        result = self.request('/admin/logout', 'POST')
        self.assertEqual(result['status'], 204)
        self.assertIn('Max-Age=0', result['headers']['Set-Cookie'])
        self.assertEqual(self.request('/admin/records')['status'], 401)

    def test_expired_tampered_or_old_credential_session_is_rejected(self):
        self.login()
        self.assertEqual(self.request('/admin/records', cookie='survey_admin=' + 'x'*64)['status'], 401)
        with self.fixture.app.connect() as db:
            db.execute('UPDATE admin_sessions SET expires_at=0')
        self.assertEqual(self.request('/admin/records')['status'], 401)
        self.login()
        self.fixture.app.admin_password = 'new-secure-password-'*3
        self.assertEqual(self.request('/admin/records')['status'], 401)

    def test_production_session_is_secure_and_login_is_rate_limited(self):
        self.fixture.app.origin = 'https://survey.example'
        result = self.login()
        self.assertIn('; Secure', result['headers']['Set-Cookie'])
        with patch.object(self.fixture.app, 'limited', return_value=True):
            self.assertEqual(self.login()['status'], 429)
