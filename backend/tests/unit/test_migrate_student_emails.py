"""Spec 185: la tabla de migración de correos es determinista y respeta lo existente."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

SCRIPT = Path(__file__).resolve().parents[3] / "scripts" / "migrate_student_emails.py"
spec = spec_from_file_location("migrate_student_emails", SCRIPT)
migration = module_from_spec(spec)
spec.loader.exec_module(migration)


def student(name, email):
    return SimpleNamespace(id=uuid4(), nombre=name, email=email)


def test_the_table_proposes_new_emails_and_numbers_repeats():
    students = [
        student("Daniel Felipe Mora Rosas", "daniel.felipe.1a2b3c4d@alumnos.xcalificator.daimuz.com"),
        student("Diana Fernanda Mora Ruiz", "diana.fernanda.5e6f7a8b@alumnos.xcalificator.daimuz.com"),
        student("Quintero Becerra Xilena Truyot", "quintero.9c0d1e2f@alumnos.xcalificator.daimuz.com"),
    ]
    # Un profesor ya tiene moradf: no se le toca y el estudiante recibe un número.
    rows = migration.plan(students, {"moradf@xcalificator.com"}, {})

    assert [row["correo_propuesto"] for row in rows] == [
        "moradf1@xcalificator.com", "moradf2@xcalificator.com", "quinteroxt@xcalificator.com",
    ]
    assert [row["dudoso"] for row in rows] == ["no", "no", "si"]
    assert rows[0]["orden"] == "nombres primero" and rows[2]["orden"] == "apellidos primero"


def test_a_reviewed_correction_replaces_the_proposal():
    item = student("Quintero Becerra Xilena Truyot", "q@alumnos.xcalificator.daimuz.com")

    rows = migration.plan([item], set(), {str(item.id): "truyotxq"})

    assert rows[0]["correo_propuesto"] == "truyotxq@xcalificator.com"
    assert (rows[0]["dudoso"], rows[0]["corregido"]) == ("no", "si")


def test_running_twice_changes_nothing_the_second_time():
    item = student("Daniel Felipe Mora Rosas", "moradf@xcalificator.com")

    rows = migration.plan([item], set(), {})

    assert rows[0]["correo_propuesto"] == rows[0]["correo_actual"]


def test_the_fingerprint_changes_when_any_email_changes():
    students = [student("Daniel Felipe Mora Rosas", "a@x.com")]
    first = migration.fingerprint(migration.plan(students, set(), {}))

    assert first == migration.fingerprint(migration.plan(students, set(), {}))
    assert first != migration.fingerprint(migration.plan(students, {"moradf@xcalificator.com"}, {}))
