"""Encuesta independiente. WSGI, SQLite persistente y sin dependencias de XCalificator."""
import base64
import csv
import hashlib
import hmac
import io
import json
import math
import os
import re
import secrets
import sqlite3
import threading
import time
import uuid
from contextlib import contextmanager
from datetime import date, datetime, timezone
from http.cookies import SimpleCookie
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
MAX_BODY = 384 * 1024


class Invalid(ValueError):
    pass


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)


def text(value, limit=2500):
    if not isinstance(value, str) or len(value) > limit:
        raise Invalid('Hay un texto vacío, demasiado largo o con formato incorrecto.')
    return value.strip()


def integer(value, minimum, maximum):
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        raise Invalid('Revise las cantidades: deben ser números enteros dentro del rango indicado.')
    return value


def validate(payload, schema, settings):
    if not isinstance(payload, dict) or set(payload) != {'submission_id', 'instrument_version', 'consent_version', 'identity', 'answers', 'times', 'measurement', 'consent', 'signature'}:
        raise Invalid('El envío no tiene el formato esperado. Actualice la página.')
    try:
        uuid.UUID(payload['submission_id'])
    except (ValueError, TypeError, AttributeError):
        raise Invalid('Identificador de envío inválido.')
    if payload['instrument_version'] != settings['instrument_version'] or payload['consent_version'] != settings['consent_version']:
        raise Invalid('El cuestionario o el consentimiento cambió. Actualice la página antes de responder.')
    consent = payload['consent']
    if not isinstance(consent, dict) or set(consent) != {'participation', 'data_processing', 'signature_storage'}:
        raise Invalid('Revise las autorizaciones.')
    if consent['participation'] is not True or consent['data_processing'] is not True or not isinstance(consent['signature_storage'], bool):
        raise Invalid('Se requiere aceptar la participación y el tratamiento descrito para enviar datos.')
    identity = payload['identity']
    if not isinstance(identity, dict) or set(identity) != {'name', 'email', 'phone'}:
        raise Invalid('Datos de identificación inválidos.')
    if len(text(identity['name'], 180)) < 3:
        raise Invalid('Escriba su nombre completo.')
    email = text(identity['email'], 254)
    text(identity['phone'], 50)
    if email and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
        raise Invalid('Revise el correo electrónico.')
    questions = {q['id']: q for s in schema['sections'] for q in s['questions']}
    answers = payload['answers']
    if not isinstance(answers, dict) or set(answers) - questions.keys():
        raise Invalid('Hay respuestas que no pertenecen a esta versión del instrumento.')
    for key, q in questions.items():
        value = answers.get(key)
        if value in (None, ''):
            if q.get('required'):
                raise Invalid('Complete la institución educativa.')
            continue
        if q['type'] in ('radio', 'scale'):
            if value not in {x['value'] for x in q['options']}:
                raise Invalid('Hay una selección fuera de las opciones del cuestionario.')
        elif q['type'] == 'multi':
            allowed = {x['value'] for x in q['options']}
            if not isinstance(value, list) or len(value) != len(set(value)) or any(v not in allowed for v in value):
                raise Invalid('Revise la selección de tipos de pregunta.')
        elif q['type'] == 'number':
            integer(value, q['min'], q['max'])
        else:
            cleaned = text(value, q.get('maxlength', 2500))
            if q.get('required') and not cleaned:
                raise Invalid('Complete la institución educativa.')
    if '9' in answers.get('1.6', []) and not str(answers.get('1.6.other') or '').strip():
        raise Invalid('Describa el otro tipo de pregunta o quite la opción Otro.')
    if '6' in answers.get('evidence.storage', []) and not str(answers.get('evidence.other') or '').strip():
        raise Invalid('Describa el otro medio de conservación de evaluaciones o quite la opción Otro medio.')
    times = payload['times']
    if not isinstance(times, list) or len(times) != 6:
        raise Invalid('Se esperan seis actividades de tiempo.')
    methods = {x['value'] for x in schema['time_methods']} | {None}
    for item in times:
        if not isinstance(item, dict) or set(item) != {'minutes', 'method', 'note'} or item['method'] not in methods:
            raise Invalid('Revise el método de obtención de los tiempos.')
        text(item['note'], 500)
        value = item['minutes']
        if item['method'] in ('measured', 'estimated'):
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 10080:
                raise Invalid('Indique minutos válidos para cada actividad estimada o cronometrada.')
        elif value is not None:
            raise Invalid('Elija cómo obtuvo el tiempo o deje el dato vacío.')
    if times[0]['minutes'] is not None and times[1]['minutes'] is not None and times[1]['minutes'] > times[0]['minutes'] and not times[1]['note'].strip():
        raise Invalid('El tiempo de abiertas supera el de todas las entregas. Explique si se midieron actividades o sesiones diferentes.')
    measurement = payload['measurement']
    expected = {'date', 'deliveries', 'open_answers', 'group', 'condition', 'scope'}
    if not isinstance(measurement, dict) or set(measurement) != expected:
        raise Invalid('Revise el contexto de la medición.')
    measured = any(t['method'] == 'measured' for t in times)
    for key in ('group', 'scope'):
        text(measurement[key], 500)
    for key in ('deliveries', 'open_answers'):
        if measurement[key] is not None:
            integer(measurement[key], 0 if key == 'open_answers' else 1, 100000)
    if measurement['date']:
        try:
            value = date.fromisoformat(measurement['date'])
            if value > date.today():
                raise ValueError()
        except (ValueError, TypeError):
            raise Invalid('Revise la fecha de medición; no puede estar en el futuro.')
    if measurement['condition'] not in ('manual', 'assisted', 'other', ''):
        raise Invalid('Condición de medición inválida.')
    if measured and (not measurement['date'] or not measurement['group'].strip() or not measurement['scope'].strip() or measurement['deliveries'] is None or not measurement['condition']):
        raise Invalid('Para un tiempo cronometrado complete fecha, grupo, entregas, condición y alcance de la sesión.')
    signature = payload['signature']
    if not isinstance(signature, dict) or set(signature) != {'method', 'name', 'strokes'} or signature['method'] not in ('drawn', 'typed'):
        raise Invalid('Revise la constancia de firma.')
    if text(signature['name'], 180).casefold() != text(identity['name'], 180).casefold():
        raise Invalid('El nombre de la firma debe coincidir con el nombre de identificación.')
    strokes = signature['strokes']
    if not isinstance(strokes, list) or len(strokes) > 100:
        raise Invalid('La firma no tiene un formato admitido.')
    count, length = 0, 0.0
    for stroke in strokes:
        if not isinstance(stroke, list) or len(stroke) < 2:
            raise Invalid('La firma contiene un trazo inválido.')
        previous = None
        for point in stroke:
            count += 1
            if not isinstance(point, list) or len(point) != 2 or any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not 0 <= v <= 1 for v in point):
                raise Invalid('La firma contiene coordenadas inválidas.')
            if previous:
                length += math.dist(previous, point)
            previous = point
    if count > 12000:
        raise Invalid('La firma es demasiado extensa. Bórrela e intente de nuevo.')
    if signature['method'] == 'drawn' and (not consent['signature_storage'] or count < 8 or length < .08):
        raise Invalid('Dibuje su firma y autorice guardar ese dibujo, o elija confirmar con su nombre.')
    if signature['method'] == 'typed' and (strokes or consent['signature_storage']):
        raise Invalid('La confirmación con nombre no debe incluir dibujo de firma.')
    return payload


def consent_document(settings):
    return [
        {'title': 'Quiénes realizan el estudio', 'text': f"{', '.join(settings['researchers'])}, estudiantes de {settings['institution']}. Investigación de tesis: {settings['research_title']}. Contacto: {', '.join(settings['contact_emails'])}. Teléfono: {settings['contact_phone']}."},
        {'title': 'Propósito y actividades', 'text': 'Identificar necesidades docentes de calificación y retroalimentación y orientar los requisitos de XCalificator. Se le invita a responder un cuestionario sobre su práctica, tiempos, dificultades y preferencias. La duración orientativa es de 15 a 20 minutos. Esta encuesta no mide por sí sola el impacto ni la satisfacción posterior al uso.'},
        {'title': 'Participación voluntaria', 'text': 'Puede no participar, omitir preguntas de opinión o retirarse antes de enviar, sin consecuencias académicas o laborales. No hay pago ni beneficio individual garantizado. El posible beneficio es orientar una herramienta para el trabajo docente. La carga principal es el tiempo de respuesta; existe riesgo de acceso indebido a información personal, que se reduce mediante acceso restringido y resguardo de datos. No incluya datos identificables de estudiantes.'},
        {'title': 'Datos y uso autorizado', 'text': 'Se recogen nombre, institución, contexto docente, respuestas, tiempos y, si los facilita, correo y teléfono. También se conserva la constancia de aceptación, fecha del servidor, versión del cuestionario y del consentimiento y, únicamente si lo autoriza, el dibujo estático de su firma. Los contactos se usan para solicitudes sobre sus datos y para seguimiento si acepta ser contactado. No se recogen presión, velocidad ni patrones biométricos de escritura. El dibujo no verifica por sí solo su identidad.'},
        {'title': 'Confidencialidad y publicación', 'text': 'Los investigadores responsables accederán a los registros identificados para esta investigación. La tesis y un eventual artículo presentarán resultados agrupados, sin publicar nombres, contactos ni firmas. Los registros completos no se publicarán en la página. Las respuestas abiertas se revisarán para retirar identificadores antes de utilizarse en publicaciones. La web y su almacenamiento serán administrados por los investigadores en el servidor destinado al estudio.'},
        {'title': 'Conservación', 'text': settings['retention']},
        {'title': 'Sus derechos y copia', 'text': 'Puede solicitar conocer, consultar, actualizar o rectificar sus datos; obtener prueba de la autorización; pedir revocación o supresión cuando proceda y conocer el uso de su información. Puede dirigirse a los correos indicados y, cuando corresponda, presentar queja ante la Superintendencia de Industria y Comercio. Al enviar recibirá una constancia descargable con un código para identificar su solicitud. Si los datos ya fueron anonimizados de manera irreversible o incorporados a resultados agregados, no será posible aislar su contribución.'},
        {'title': 'Constancia electrónica e invitaciones posteriores', 'text': 'Puede dibujar su firma con el dedo o el ratón, o confirmar mediante su nombre completo y aceptación expresa. El dibujo es opcional y se guarda solo para dejar constancia de este consentimiento; no es una firma digital certificada. Se conserva la relación entre aceptación, contenido, versión y fecha. La autenticidad no queda certificada por esta aplicación. Aceptar esta encuesta no autoriza automáticamente otras pruebas, acceso a información de estudiantes ni participación en el piloto; cualquier invitación posterior tendrá su información y autorización correspondientes.'}
    ]


class SurveyApplication:
    def __init__(self, *, database=None, origin=None, secret=None, admin_user=None, admin_password=None, base_path=None):
        self.settings = json.loads((ROOT / 'settings.json').read_text(encoding='utf-8'))
        self.schema = json.loads((ROOT / 'public/schema.json').read_text(encoding='utf-8'))
        self.consent = consent_document(self.settings)
        self.origin = (origin or os.environ.get('PUBLIC_ORIGIN', '')).rstrip('/')
        self.base = (base_path if base_path is not None else os.environ.get('BASE_PATH', '/encuesta-docente')).rstrip('/')
        self.secret = secret or os.environ.get('SECRET_KEY', '')
        self.admin_user = admin_user if admin_user is not None else os.environ.get('ADMIN_USER', '')
        self.admin_password = admin_password if admin_password is not None else os.environ.get('ADMIN_PASSWORD', '')
        if len(self.secret) < 32 or not self.origin or (self.base and not re.fullmatch(r'/[a-z0-9/-]+', self.base)):
            raise RuntimeError('Configure PUBLIC_ORIGIN, BASE_PATH y SECRET_KEY (mínimo 32 caracteres).')
        parsed = urlsplit(self.origin)
        if parsed.path or parsed.query or parsed.fragment or parsed.scheme not in ('https', 'http') or (parsed.scheme != 'https' and parsed.hostname not in ('127.0.0.1', 'localhost')):
            raise RuntimeError('PUBLIC_ORIGIN debe ser un origen HTTPS, o HTTP local para desarrollo.')
        self.database = Path(database or os.environ.get('DATABASE_PATH', str(ROOT / 'data/encuestas.sqlite3')))
        self.database.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute('PRAGMA journal_mode=WAL')
            db.execute('CREATE TABLE IF NOT EXISTS responses (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, payload_hash TEXT NOT NULL, receipt_hash TEXT NOT NULL, receipt_json TEXT NOT NULL)')
        if os.name != 'nt':
            os.chmod(self.database.parent, 0o700)
            os.chmod(self.database, 0o600)
        self.rate, self.rate_lock = {}, threading.Lock()

    @contextmanager
    def connect(self):
        connection = sqlite3.connect(self.database, timeout=15)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def limited(self, environ, admin=False):
        digest = hmac.new(self.secret.encode(), (environ.get('REMOTE_ADDR', '') + ('admin' if admin else 'public')).encode(), hashlib.sha256).hexdigest()
        window, limit = (300, 20) if admin else (60, 40)
        now = time.monotonic()
        with self.rate_lock:
            if len(self.rate) > 5000:
                self.rate = {k: v for k, v in self.rate.items() if now - v[0] < 300}
            started, count = self.rate.get(digest, (now, 0))
            if now - started >= window:
                started, count = now, 0
            self.rate[digest] = (started, count + 1)
            return count >= limit

    def token(self):
        value = str(int(time.time())) + '.' + secrets.token_urlsafe(24)
        return value + '.' + hmac.new(self.secret.encode(), value.encode(), hashlib.sha256).hexdigest()

    def csrf_ok(self, environ):
        try:
            cookies = SimpleCookie(environ.get('HTTP_COOKIE', ''))
            token = environ.get('HTTP_X_SURVEY_CSRF', '')
            if not token or not hmac.compare_digest(cookies['survey_csrf'].value, token):
                return False
            stamp, nonce, signature = token.split('.')
            expected = hmac.new(self.secret.encode(), (stamp + '.' + nonce).encode(), hashlib.sha256).hexdigest()
            return hmac.compare_digest(signature, expected) and 0 <= time.time() - int(stamp) < 43200 and environ.get('HTTP_ORIGIN') == self.origin
        except (KeyError, ValueError):
            return False

    def authorized(self, environ):
        if not self.admin_user or len(self.admin_password) < 20:
            return False
        try:
            value = environ.get('HTTP_AUTHORIZATION', '')
            if not value.startswith('Basic '):
                return False
            user, password = base64.b64decode(value[6:], validate=True).decode().split(':', 1)
            return hmac.compare_digest(user.encode(), self.admin_user.encode()) and hmac.compare_digest(password.encode(), self.admin_password.encode())
        except (ValueError, UnicodeError):
            return False

    def __call__(self, environ, start_response):
        def respond(status, value, mime='application/json; charset=utf-8', extra=()):
            body = value if isinstance(value, bytes) else canonical(value).encode('utf-8')
            headers = [('Content-Type', mime), ('Content-Length', str(len(body))), ('Cache-Control', 'no-store'), ('X-Content-Type-Options', 'nosniff'), ('Referrer-Policy', 'no-referrer'), ('X-Frame-Options', 'DENY'), ('Permissions-Policy', 'camera=(), microphone=(), geolocation=()'), ('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'")]
            start_response(status, headers + list(extra))
            return [body]
        path = environ.get('PATH_INFO', '')
        if path == self.base and self.base:
            return respond('302 Found', b'', extra=[('Location', self.base + '/')])
        if not path.startswith(self.base + '/'):
            return respond('404 Not Found', {'error': 'Página no encontrada.'})
        path = path[len(self.base):]
        method = environ.get('REQUEST_METHOD', 'GET')
        try:
            if path == '/health' and method == 'GET':
                with self.connect() as db:
                    db.execute('SELECT 1').fetchone()
                return respond('200 OK', {'status': 'ok'})
            if path == '/api/config' and method == 'GET':
                return respond('200 OK', {'settings': self.settings, 'schema': self.schema, 'consent_document': self.consent})
            if path == '/api/session' and method == 'GET':
                if self.limited(environ):
                    return respond('429 Too Many Requests', {'error': 'Espere un minuto antes de volver a intentar.'})
                token = self.token()
                secure = '; Secure' if self.origin.startswith('https://') else ''
                return respond('200 OK', {'csrf': token}, extra=[('Set-Cookie', f'survey_csrf={token}; Path={self.base or "/"}; HttpOnly; SameSite=Strict; Max-Age=43200{secure}')])
            if path == '/api/responses' and method == 'POST':
                if not self.settings['enabled']:
                    return respond('503 Service Unavailable', {'error': 'La recolección está cerrada.'})
                if self.limited(environ):
                    return respond('429 Too Many Requests', {'error': 'Espere un minuto y vuelva a enviar.'})
                if not self.csrf_ok(environ):
                    return respond('403 Forbidden', {'error': 'La sesión de envío venció. Actualice la autorización de envío e intente de nuevo.'})
                length = int(environ.get('CONTENT_LENGTH') or '0')
                if length < 1 or length > MAX_BODY:
                    return respond('413 Content Too Large', {'error': 'El envío supera el tamaño permitido.'})
                if environ.get('CONTENT_TYPE', '').split(';')[0].strip().lower() != 'application/json':
                    return respond('415 Unsupported Media Type', {'error': 'Se requiere JSON.'})
                payload = validate(json.loads(environ['wsgi.input'].read(length).decode('utf-8')), self.schema, self.settings)
                encoded = canonical(payload)
                payload_hash = hashlib.sha256(encoded.encode()).hexdigest()
                now = datetime.now(timezone.utc).isoformat()
                receipt = {'submission_id': payload['submission_id'], 'received_at_utc': now, 'settings': self.settings, 'consent_document': self.consent, 'schema_snapshot': self.schema, 'response': payload}
                receipt_hash = hashlib.sha256(canonical(receipt).encode()).hexdigest()
                result = {**receipt, 'sha256': receipt_hash}
                with self.connect() as db:
                    db.execute('INSERT OR IGNORE INTO responses VALUES (?, ?, ?, ?, ?)', (payload['submission_id'], now, payload_hash, receipt_hash, canonical(result)))
                    row = db.execute('SELECT payload_hash, receipt_json FROM responses WHERE id=?', (payload['submission_id'],)).fetchone()
                if row[0] != payload_hash:
                    return respond('409 Conflict', {'error': 'Este envío ya se guardó con otro contenido. Conserve su constancia; contacte a los investigadores para corregirlo.'})
                return respond('200 OK', json.loads(row[1]))
            if path == '/admin' or path.startswith('/admin/'):
                if not self.authorized(environ):
                    if self.limited(environ, admin=True):
                        return respond('429 Too Many Requests', {'error': 'Demasiados intentos. Espere cinco minutos.'})
                    return respond('401 Unauthorized', {'error': 'Acceso reservado a investigadores.'}, extra=[('WWW-Authenticate', 'Basic realm="Investigación XCalificator", charset="UTF-8"')])
                if method != 'GET':
                    return respond('405 Method Not Allowed', {'error': 'Método no permitido.'})
                if path == '/admin':
                    return respond('302 Found', b'', extra=[('Location', self.base + '/admin/')])
                if path == '/admin/export.csv':
                    with self.connect() as db:
                        rows = db.execute('SELECT id, created_at, receipt_json FROM responses ORDER BY created_at').fetchall()
                    data = io.StringIO(newline='')
                    writer = csv.writer(data)
                    writer.writerow(['codigo', 'fecha_recepcion_utc', 'version', 'campo', 'pregunta', 'valor', 'respuesta_textual', 'estado'])
                    def cell(value):
                        display = canonical(value) if isinstance(value, (list, dict)) else '' if value is None else str(value)
                        return "'" + display if display.lstrip().startswith(('=', '+', '-', '@', '\t', '\r')) else display
                    for id, stamp, document in rows:
                        stored = json.loads(document)
                        value = stored['response']
                        original_schema = stored.get('schema_snapshot', self.schema)
                        questions = {q['id']: q for s in original_schema['sections'] for q in s['questions']}
                        fields = {'context.' + k: value['answers'].get(k) for k in questions}
                        fields.update({'measurement.' + k: v for k, v in value['measurement'].items()})
                        for i, item in enumerate(value['times'], 1):
                            fields.update({f'time.{i}.{k}': v for k, v in item.items()})
                        for key, val in fields.items():
                            state = 'sin_respuesta' if val is None or val == '' or val == [] else ('no_aplica' if val == 'na' else 'declinada' if val == 'skip' else 'respondida')
                            label, decoded = key, val
                            if key.startswith('context.'):
                                question = questions[key.removeprefix('context.')]
                                label = question['label']
                                options = {o['value']: o['label'] for o in question.get('options', [])}
                                if options:
                                    decoded = '; '.join(options.get(v, str(v)) for v in val) if isinstance(val, list) else options.get(val, val)
                            elif key.startswith('time.'):
                                _, number, component = key.split('.')
                                label = original_schema['time_activities'][int(number)-1] + ' · ' + {'minutes':'minutos por grupo','method':'método de obtención','note':'observación'}[component]
                                if component == 'method':
                                    decoded = {m['value']:m['label'] for m in original_schema['time_methods']}.get(val,val)
                            elif key.startswith('measurement.'):
                                label = {'date':'Fecha de medición','deliveries':'Entregas efectivamente calificadas','open_answers':'Respuestas abiertas calificadas','group':'Grupo medido','condition':'Condición de medición','scope':'Alcance e incidencias'}[key.removeprefix('measurement.')]
                            writer.writerow([id, stamp, value['instrument_version'], key, label, cell(val), cell(decoded), state])
                    return respond('200 OK', ('\ufeff' + data.getvalue()).encode('utf-8'), 'text/csv; charset=utf-8', [('Content-Disposition', 'attachment; filename="respuestas_codificadas.csv"')])
                if path == '/admin/records':
                    with self.connect() as db:
                        rows = db.execute('SELECT id, created_at, receipt_json FROM responses ORDER BY created_at DESC').fetchall()
                    return respond('200 OK', [{'id': r[0], 'received_at': r[1], 'name': json.loads(r[2])['response']['identity']['name']} for r in rows])
                if path.startswith('/admin/receipt/'):
                    id = path.removeprefix('/admin/receipt/')
                    with self.connect() as db:
                        row = db.execute('SELECT receipt_json FROM responses WHERE id=?', (id,)).fetchone()
                    return respond('200 OK', json.loads(row[0])) if row else respond('404 Not Found', {'error': 'No se encontró la constancia.'})
                if path in ('/admin', '/admin/'):
                    return respond('200 OK', (ROOT / 'public/admin.html').read_bytes(), 'text/html; charset=utf-8')
                return respond('404 Not Found', {'error': 'Ruta no encontrada.'})
            files = {'/': ('index.html', 'text/html'), '/app.js': ('app.js', 'text/javascript'), '/admin.js': ('admin.js', 'text/javascript'), '/styles.css': ('styles.css', 'text/css')}
            if path in files and method == 'GET':
                name, mime = files[path]
                return respond('200 OK', (ROOT / 'public' / name).read_bytes(), mime + '; charset=utf-8')
            return respond('404 Not Found', {'error': 'Página no encontrada.'})
        except (Invalid, ValueError, UnicodeError, TypeError, KeyError) as exc:
            message = str(exc) if isinstance(exc, Invalid) else 'No se pudo interpretar el envío. Revise los campos.'
            return respond('400 Bad Request', {'error': message})
        except (sqlite3.Error, OSError):
            return respond('503 Service Unavailable', {'error': 'No se confirmó el guardado. Conserve esta página abierta y vuelva a intentar.'})


def create_application():
    return SurveyApplication()


if __name__ == '__main__':
    import argparse
    from socketserver import ThreadingMixIn
    from wsgiref.simple_server import WSGIServer, WSGIRequestHandler, make_server
    parser = argparse.ArgumentParser(description='Vista local de la encuesta; producción usa Gunicorn.')
    parser.add_argument('--port', type=int, default=8092)
    args = parser.parse_args()
    os.environ.setdefault('PUBLIC_ORIGIN', f'http://127.0.0.1:{args.port}')
    os.environ.setdefault('SECRET_KEY', secrets.token_urlsafe(48))
    class Server(ThreadingMixIn, WSGIServer):
        daemon_threads = True
    class Quiet(WSGIRequestHandler):
        def log_message(self, *args):
            pass
    server = make_server('127.0.0.1', args.port, create_application(), server_class=Server, handler_class=Quiet)
    print(f'Encuesta local: http://127.0.0.1:{args.port}' + os.environ.get('BASE_PATH', '/encuesta-docente') + '/', flush=True)
    server.serve_forever()
