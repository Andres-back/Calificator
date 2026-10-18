"""Operaciones locales del custodio. No expone respuestas por red."""
import argparse
import hashlib
import json
import os
import sqlite3
from pathlib import Path
from app import canonical

parser = argparse.ArgumentParser()
parser.add_argument('--database', default=os.environ.get('DATABASE_PATH', 'data/encuestas.sqlite3'))
commands = parser.add_subparsers(dest='command', required=True)
commands.add_parser('stats')
commands.add_parser('verify')
backup = commands.add_parser('backup')
backup.add_argument('destination')
delete = commands.add_parser('delete')
delete.add_argument('id')
delete.add_argument('--confirm-id', required=True)
args = parser.parse_args()
path = Path(args.database)
if not path.is_file():
    parser.error('No existe la base de datos indicada.')
db = sqlite3.connect(path)
try:
    if args.command == 'stats':
        print(json.dumps({'respuestas': db.execute('SELECT count(*) FROM responses').fetchone()[0]}))
    elif args.command == 'backup':
        target = Path(args.destination)
        if target.exists():
            parser.error('El destino ya existe; elija un archivo nuevo.')
        target.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(target) as destination:
            db.backup(destination)
        if os.name != 'nt':
            os.chmod(target, 0o600)
        print('Respaldo SQLite creado. Contiene datos personales: guárdelo con acceso restringido.')
    elif args.command == 'verify':
        count = 0
        for _, payload_hash, receipt_hash, encoded in db.execute('SELECT id,payload_hash,receipt_hash,receipt_json FROM responses'):
            receipt = json.loads(encoded)
            stated = receipt.pop('sha256')
            actual = hashlib.sha256(canonical(receipt).encode()).hexdigest()
            payload_actual = hashlib.sha256(canonical(receipt['response']).encode()).hexdigest()
            if stated != receipt_hash or actual != receipt_hash or payload_actual != payload_hash:
                raise SystemExit('Se detectó una constancia con discrepancia de contenido. Preserve el respaldo e investigue.')
            count += 1
        print(f'{count} constancias verificadas. No constituye certificación de identidad ni sello externo de tiempo.')
    elif args.command == 'delete':
        if args.id != args.confirm_id:
            parser.error('El código y --confirm-id deben coincidir.')
        with db:
            db.execute('PRAGMA secure_delete=ON')
            result = db.execute('DELETE FROM responses WHERE id=?', (args.id,))
        db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
        db.execute('VACUUM')
        print(f'Registros eliminados: {result.rowcount}. Gestione también sus exportaciones, constancias y respaldos conforme al procedimiento de supresión.')
finally:
    db.close()
