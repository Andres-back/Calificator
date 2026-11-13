"""Spec 185: cambia los correos de las cuentas de estudiante creadas por la app.

Simulación por defecto: imprime una tabla CSV (id, nombre, correo actual, correo
propuesto, orden supuesto, dudoso) y, en la salida de errores, su huella. Solo
toca cuentas con ``rol='estudiante'`` y ``email_es_interno``; los estudiantes con
correo personal y los profesores no cambian.

Aplicar exige la huella de la tabla revisada (``--expected-sha256``): si algo
cambió desde la revisión, no se aplica nada. Las correcciones de la revisión se
pasan con ``--override ID=parte_local``. Antes de cambiar, guarda el mapa
anterior→nuevo en el almacenamiento privado para poder revertir con ``--revert``.

Uso, canalizado al contenedor del backend:
    docker exec -i -w /app xcalificator_backend python - [opciones] < scripts/migrate_student_emails.py
"""

import argparse
import asyncio
import csv
import hashlib
import io
import json
import re
import sys
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select, text

from app.db.base import import_models
from app.db.session import AsyncSessionLocal, engine
from app.modules.importacion_estudiantes import student_email as se
from app.modules.users.models import User
from app.services.storage_service import get_upload_dir

BACKUP_DIR = (".private", "student-email-migration")
LOCAL = re.compile(r"^[a-z0-9]{2,40}$")


def plan(students, others: set[str], overrides: dict[str, str]) -> list[dict]:
    """Propuesta determinista: mismo orden (alta, id) y mismos correos ya ocupados."""
    taken = set(others)
    rows = []
    for student in students:
        proposal = se.propose(student.nombre)
        local = overrides.get(str(student.id), proposal.local)
        new = se.first_free(local, taken)
        taken.add(new)
        rows.append({
            "id": str(student.id),
            "nombre": student.nombre,
            "correo_actual": student.email,
            "correo_propuesto": new,
            "orden": "apellidos primero" if proposal.surnames_first else "nombres primero",
            "dudoso": "si" if proposal.doubtful and str(student.id) not in overrides else "no",
            "corregido": "si" if str(student.id) in overrides else "no",
        })
    return rows


def fingerprint(rows: list[dict]) -> str:
    mapping = [[row["id"], row["correo_actual"], row["correo_propuesto"]] for row in rows]
    return hashlib.sha256(json.dumps(mapping, separators=(",", ":")).encode()).hexdigest()


async def load(db):
    students = list(await db.scalars(
        select(User).where(User.rol == "estudiante", User.email_es_interno.is_(True))
        .order_by(User.created_at, User.id)
    ))
    ids = {student.id for student in students}
    others = {email for user_id, email in (await db.execute(select(User.id, func.lower(User.email)))).all() if user_id not in ids}
    return students, others


async def run(args):
    try:
        await _run(args)
    finally:
        await engine.dispose()


async def _run(args):
    import_models()
    overrides = {}
    for item in args.override or []:
        user_id, _, local = item.partition("=")
        UUID(user_id)
        if not LOCAL.match(local):
            raise SystemExit(f"Corrección inválida para {user_id}: use solo letras y números (2 a 40).")
        overrides[user_id] = local
    async with AsyncSessionLocal() as db:
        if args.revert:
            return await revert(db, args.revert)
        if not args.apply:
            await db.execute(text("SET TRANSACTION READ ONLY"))
        students, others = await load(db)
        rows = plan(students, others, overrides)
        digest = fingerprint(rows)
        if not args.apply:
            out = io.StringIO()
            writer = csv.DictWriter(out, fieldnames=list(rows[0]) if rows else ["id"])
            writer.writeheader()
            writer.writerows(rows)
            sys.stdout.write(out.getvalue())
            print(json.dumps({"modo": "simulacion", "cuentas": len(rows),
                              "dudosos": sum(row["dudoso"] == "si" for row in rows), "sha256": digest}), file=sys.stderr)
            await db.rollback()
            return
        if digest != args.expected_sha256:
            raise SystemExit("La tabla cambió desde la revisión: no se aplicó nada. Genere y revise una nueva simulación.")
        # Bloquea las cuentas y vuelve a comprobar con los datos bloqueados.
        await db.execute(select(User.id).where(User.id.in_([UUID(row["id"]) for row in rows])).with_for_update())
        students, others = await load(db)
        rows = plan(students, others, overrides)
        if fingerprint(rows) != args.expected_sha256:
            raise SystemExit("La tabla cambió durante la aplicación: no se aplicó nada.")
        by_id = {str(student.id): student for student in students}
        changes = [row for row in rows if row["correo_actual"].lower() != row["correo_propuesto"]]
        backup = get_upload_dir().resolve().joinpath(*BACKUP_DIR)
        backup.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        path = backup / f"{stamp}-{digest[:12]}.json"
        path.write_text(json.dumps([{"id": row["id"], "anterior": row["correo_actual"], "nuevo": row["correo_propuesto"]} for row in changes]), encoding="utf-8")
        # Dos pasos para no chocar con la restricción única al intercambiar correos.
        for row in changes:
            by_id[row["id"]].email = f"migrando-{row['id']}@{se.DOMAIN}.invalid"
        await db.flush()
        for row in changes:
            by_id[row["id"]].email = row["correo_propuesto"]
        await db.commit()
        print(json.dumps({"modo": "aplicado", "cambiados": len(changes), "respaldo": path.name, "sha256": digest}))


async def revert(db, name: str):
    path = get_upload_dir().resolve().joinpath(*BACKUP_DIR, name)
    if path.parent != get_upload_dir().resolve().joinpath(*BACKUP_DIR) or not path.is_file():
        raise SystemExit("Respaldo no encontrado.")
    entries = json.loads(path.read_text(encoding="utf-8"))
    users = {str(user.id): user for user in await db.scalars(
        select(User).where(User.id.in_([UUID(item["id"]) for item in entries])).with_for_update())}
    restorable = [item for item in entries if item["id"] in users and users[item["id"]].email == item["nuevo"]]
    for item in restorable:
        users[item["id"]].email = f"revirtiendo-{item['id']}@{se.DOMAIN}.invalid"
    await db.flush()
    for item in restorable:
        users[item["id"]].email = item["anterior"]
    await db.commit()
    print(json.dumps({"modo": "revertido", "restaurados": len(restorable), "omitidos": len(entries) - len(restorable)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--expected-sha256")
    parser.add_argument("--override", action="append", metavar="ID=parte_local")
    parser.add_argument("--revert", metavar="ARCHIVO_DE_RESPALDO")
    args = parser.parse_args()
    if args.apply and not args.expected_sha256:
        parser.error("Aplicar exige --expected-sha256 de la tabla revisada.")
    if args.apply and args.revert:
        parser.error("Use --apply o --revert, no ambos.")
    asyncio.run(run(args))
