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

# Formato del piloto: respaldo propio, sin mezclar respuestas con el diagnóstico.
feedback_database=$(docker exec encuesta_docente_app python -c 'import os; from pathlib import Path; print(os.environ.get("FEEDBACK_DATABASE_PATH", str(Path(os.environ.get("DATABASE_PATH", "/data/encuestas.sqlite3")).with_name("retroalimentacion-piloto.sqlite3"))))')
if docker exec encuesta_docente_app python -c 'import sys; from pathlib import Path; sys.exit(0 if Path(sys.argv[1]).is_file() else 1)' "$feedback_database"; then
    feedback_snapshot="/data/backup-retroalimentacion-${stamp}.sqlite3"
    docker exec encuesta_docente_app python manage.py --database "$feedback_database" backup "$feedback_snapshot"
    docker cp "encuesta_docente_app:$feedback_snapshot" "$backup_dir/retroalimentacion-${stamp}.sqlite3"
    chmod 600 "$backup_dir/retroalimentacion-${stamp}.sqlite3"
    docker exec encuesta_docente_app python -c 'import sys; from pathlib import Path; p=Path(sys.argv[1]); assert p.parent==Path("/data") and p.name.startswith("backup-retroalimentacion-"); p.unlink()' "$feedback_snapshot"
    find "$backup_dir" -maxdepth 1 -type f -name 'retroalimentacion-*.sqlite3' -mtime +30 -delete
fi
