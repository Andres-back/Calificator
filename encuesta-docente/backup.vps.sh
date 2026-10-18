#!/usr/bin/env bash
set -euo pipefail
umask 077
backup_dir=/var/backups/encuesta-docente
stamp=$(date -u +%Y%m%dT%H%M%SZ)
snapshot="/data/backup-${stamp}.sqlite3"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
docker exec encuesta_docente_app python manage.py backup "$snapshot"
docker cp "encuesta_docente_app:$snapshot" "$backup_dir/encuesta-${stamp}.sqlite3"
chmod 600 "$backup_dir/encuesta-${stamp}.sqlite3"
docker exec encuesta_docente_app python -c 'import sys; from pathlib import Path; p=Path(sys.argv[1]); assert p.parent==Path("/data") and p.name.startswith("backup-"); p.unlink()' "$snapshot"
find "$backup_dir" -maxdepth 1 -type f -name 'encuesta-*.sqlite3' -mtime +30 -delete
