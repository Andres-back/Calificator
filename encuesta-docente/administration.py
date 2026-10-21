"""Append-only administrative layer; signed responses are never updated or deleted."""
import copy
import csv
import hashlib
import io
import json
import re
import uuid
from datetime import datetime, timezone


class AdminError(ValueError):
    def __init__(self, message, status='400 Bad Request'):
        super().__init__(message)
        self.status = status


def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)


def migrate(db):
    db.execute('''CREATE TABLE IF NOT EXISTS response_admin_events (
        response_id TEXT NOT NULL REFERENCES responses(id),
        revision INTEGER NOT NULL CHECK(revision > 0),
        request_id TEXT NOT NULL UNIQUE,
        command_hash TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('correct','remove','restore')),
        actor TEXT NOT NULL, created_at TEXT NOT NULL, reason TEXT NOT NULL,
        changes_json TEXT NOT NULL,
        PRIMARY KEY(response_id, revision))''')


def event_rows(db, record_id=None):
    sql = 'SELECT response_id,revision,action,actor,created_at,reason,changes_json FROM response_admin_events'
    return db.execute(sql + (' WHERE response_id=?' if record_id else '') + ' ORDER BY response_id,revision',
                      (record_id,) if record_id else ()).fetchall()


def project(record_id, receipt, rows):
    original = receipt['response']
    effective = copy.deepcopy({k: original[k] for k in ('identity', 'answers')})
    result = dict(id=record_id, revision=0, deleted=False, corrected=False,
                  original=original, effective=effective, history=[])
    schema = receipt.get('schema_snapshot')
    settings = receipt.get('settings')
    # Unknown legacy contexts stay readable, removable and restorable, not guessed.
    result['editable'] = bool(isinstance(schema, dict) and isinstance(settings, dict)
                              and original['instrument_version'] in ('5.0-web-medicion', '4.0-web-breve', '1.0-web')
                              and settings.get('instrument_version') == original['instrument_version'])
    result['edit_notice'] = '' if result['editable'] else 'Esta versión no tiene un contexto de edición compatible. Puede consultar el original o gestionar su conservación.'
    for _, revision, action, actor, stamp, reason, changes_json in rows:
        changes = json.loads(changes_json)
        if action == 'correct':
            for path, change in changes.items():
                group, key = path.split('.', 1)
                effective[group][key] = change['after']
            result['corrected'] = True
        else:
            result['deleted'] = action == 'remove'
        result['revision'] = revision
        result['history'].append(dict(revision=revision, action=action, actor=actor, created_at=stamp,
                                      reason=reason, changes=changes))
    return result


def get_state(db, record_id):
    if not db.in_transaction:
        db.execute('BEGIN')
    row = db.execute('SELECT receipt_json FROM responses WHERE id=?', (record_id,)).fetchone()
    if not row:
        raise AdminError('No se encontró la respuesta en este formulario.', '404 Not Found')
    receipt = json.loads(row[0])
    return project(record_id, receipt, event_rows(db, record_id)), receipt


def states(db):
    if not db.in_transaction:
        db.execute('BEGIN')
    events = {}
    for row in event_rows(db):
        events.setdefault(row[0], []).append(row)
    return {record_id: project(record_id, json.loads(document), events.get(record_id, []))
            for record_id, document in db.execute('SELECT id,receipt_json FROM responses').fetchall()}


def clean_text(value, limit, minimum=0):
    if not isinstance(value, str) or len(value) > limit or len(value.strip()) < minimum:
        raise AdminError('Revise el texto: es obligatorio o supera el tamaño permitido.')
    return value.strip()


def correction(state, receipt, patch, validate):
    if not state['editable']:
        raise AdminError(state['edit_notice'])
    if not isinstance(patch, dict) or not patch or set(patch) - {'identity', 'answers'}:
        raise AdminError('Solo puede corregir identificación y preguntas; la firma y la versión se conservan.')
    candidate = copy.deepcopy(state['effective'])
    for group, values in patch.items():
        allowed = {'name', 'email', 'phone'} if group == 'identity' else {
            q['id'] for section in receipt['schema_snapshot']['sections'] for q in section['questions']}
        if not isinstance(values, dict) or not values or set(values) - allowed:
            raise AdminError('Hay campos que no pertenecen a esta versión del formulario.')
        candidate[group].update(values)
    identity = candidate['identity']
    identity['name'] = clean_text(identity['name'], 180, 3)
    identity['email'] = clean_text(identity['email'], 254)
    identity['phone'] = clean_text(identity['phone'], 50)
    if identity['email'] and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', identity['email']):
        raise AdminError('Revise el correo electrónico.')
    probe = copy.deepcopy(receipt['response'])
    probe['answers'] = candidate['answers']
    # The original identity/signature pair is validated, not forged for the correction.
    validate(probe, receipt['schema_snapshot'], receipt['settings'])
    changes = {}
    for group, values in patch.items():
        for key in values:
            before = state['effective'][group].get(key)
            after = candidate[group][key]
            if encoded(before) != encoded(after):
                changes[group + '.' + key] = dict(before=before, after=after)
    if not changes:
        raise AdminError('No hay cambios para guardar.')
    return changes


def execute(db, record_id, command, actor, validate):
    common = {'action', 'expected_revision', 'request_id', 'reason'}
    if not isinstance(command, dict) or not isinstance(command.get('action'), str):
        raise AdminError('Revise la acción administrativa.')
    action = command['action']
    extras = {'correct': {'patch'}, 'remove': {'confirm_id'}, 'restore': set()}
    if action not in extras or set(command) != common | extras[action]:
        raise AdminError('El cambio no tiene el formato esperado.')
    revision = command['expected_revision']
    if isinstance(revision, bool) or not isinstance(revision, int) or revision < 0:
        raise AdminError('Vuelva a consultar la respuesta antes de modificarla.')
    try:
        request_id = str(uuid.UUID(command['request_id']))
    except (ValueError, TypeError, AttributeError):
        raise AdminError('El identificador del cambio no es válido.')
    reason = clean_text(command['reason'], 1000, 1)
    digest = hashlib.sha256(encoded(command).encode()).hexdigest()
    db.execute('BEGIN IMMEDIATE')
    prior = db.execute('SELECT response_id,revision,action,command_hash FROM response_admin_events WHERE request_id=?', (request_id,)).fetchone()
    if prior:
        if prior[0] != record_id or prior[3] != digest:
            raise AdminError('Este identificador ya se usó para otro cambio.', '409 Conflict')
        return dict(id=record_id, revision=prior[1], action=prior[2])
    state, receipt = get_state(db, record_id)
    if revision != state['revision']:
        raise AdminError('Otra pestaña modificó esta respuesta. Conserve sus cambios y vuelva a consultar antes de guardar.', '409 Conflict')
    if action == 'correct':
        if state['deleted']:
            raise AdminError('Restaure la respuesta antes de corregirla.')
        changes = correction(state, receipt, command['patch'], validate)
    else:
        deleting = action == 'remove'
        if deleting and command['confirm_id'] != record_id:
            raise AdminError('Escriba el código exacto para confirmar la eliminación de la lista.')
        if state['deleted'] == deleting:
            raise AdminError('La respuesta ya está en ese estado. Actualice la lista.')
        changes = {'deleted': dict(before=state['deleted'], after=deleting)}
    db.execute('INSERT INTO response_admin_events VALUES (?,?,?,?,?,?,?,?,?)',
               (record_id, revision + 1, request_id, digest, action, actor,
                datetime.now(timezone.utc).isoformat(), reason, encoded(changes)))
    return dict(id=record_id, revision=revision + 1, action=action)


def report(db, current_version, summarize):
    views = states(db)
    rows = db.execute('SELECT id,receipt_json FROM responses').fetchall()
    result = summarize([(document,) for record_id, document in rows if not views[record_id]['deleted']], current_version)
    received, removed = {}, {}
    for view in views.values():
        version = view['original']['instrument_version']
        received[version] = received.get(version, 0) + 1
        removed[version] = removed.get(version, 0) + int(view['deleted'])
    present = {r['version'] for r in result['versions']}
    for version in received.keys() - present:
        result['versions'].extend(summarize([], version)['versions'])
    for row in result['versions']:
        row['received_responses'] = received.get(row['version'], 0)
        row['removed_responses'] = removed.get(row['version'], 0)
    result['versions'].sort(key=lambda r: r['version'])
    result.update(received_responses=len(views), active_responses=sum(not v['deleted'] for v in views.values()),
                  removed_responses=sum(v['deleted'] for v in views.values()), source='original_active')
    return result


def csv_cell(value):
    value = encoded(value) if isinstance(value, (list, dict)) else '' if value is None else str(value)
    return "'" + value if value.lstrip().startswith(('=', '+', '-', '@', '\t', '\r')) else value


def corrections_csv(db):
    output = io.StringIO(newline='')
    writer = csv.writer(output)
    writer.writerow(['codigo', 'version', 'revision', 'campo', 'pregunta', 'valor', 'respuesta_textual', 'origen'])
    views = states(db)
    for record_id, document in db.execute('SELECT id,receipt_json FROM responses ORDER BY created_at'):
        view = views[record_id]
        if view['deleted']:
            continue
        receipt = json.loads(document)
        for section in receipt.get('schema_snapshot', {}).get('sections', []):
            for question in section['questions']:
                key = question['id']
                value = view['effective']['answers'].get(key)
                options = {o['value']: o['label'] for o in question.get('options', [])}
                decoded = '; '.join(str(options.get(v, v)) for v in value) if isinstance(value, list) else options.get(value, value)
                source = 'corrección administrativa' if any('answers.' + key in e['changes'] for e in view['history']) else 'original'
                writer.writerow([csv_cell(v) for v in (record_id, view['original']['instrument_version'], view['revision'],
                                                       key, question['label'], value, decoded, source)])
    return ('\ufeff' + output.getvalue()).encode('utf-8')
