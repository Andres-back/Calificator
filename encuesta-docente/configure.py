"""Genera configuración local sin mostrar secretos en pantalla ni sobrescribirlos."""
import argparse
import os
import secrets
from pathlib import Path
from urllib.parse import urlsplit

parser=argparse.ArgumentParser()
parser.add_argument('--origin',required=True,help='Origen HTTPS, sin ruta ni barra final')
parser.add_argument('--base-path',default='/encuesta-docente')
args=parser.parse_args()
origin=urlsplit(args.origin)
if origin.scheme!='https' or not origin.netloc or origin.path not in ('','/') or origin.query or origin.fragment or any(c in args.origin for c in '\r\n'):
    parser.error('Indique un origen HTTPS sin ruta.')
if args.base_path and (not args.base_path.startswith('/') or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-/' for c in args.base_path)):
    parser.error('La ruta solo admite minúsculas, números, guiones y barras.')
target=Path(__file__).resolve().parent/'.env'
content=f'PUBLIC_ORIGIN={args.origin.rstrip("/")}\nBASE_PATH={args.base_path.rstrip("/")}\nDATABASE_PATH=/data/encuestas.sqlite3\nSECRET_KEY={secrets.token_urlsafe(48)}\nADMIN_USER=investigacion\nADMIN_PASSWORD={secrets.token_urlsafe(36)}\n'
with target.open('x',encoding='utf-8') as stream:
    stream.write(content)
if os.name!='nt':os.chmod(target,0o600)
print('Configuración creada en .env, sin mostrar los secretos. Consulte ese archivo de forma privada para la contraseña de administración.')
