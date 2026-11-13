"""Spec 185: correos de estudiante con apellido + iniciales."""

import pytest

from app.modules.importacion_estudiantes import student_email as se


@pytest.mark.parametrize("name,local,surnames_first,doubtful", [
    # Ejemplo del usuario: nombres primero.
    ("Daniel Felipe Mora Rosas", "moradf", False, False),
    # Listas oficiales: apellidos primero, en mayúsculas.
    ("MEJIA JULIO WINDERLIS JOSAIN", "mejiawj", True, False),
    ("CARDONA VARGAS JUAN JOSE", "cardonajj", True, False),
    ("Zambrano Muñoz Laura Camila", "zambranolc", True, False),
    # Un solo nombre: se usa completo.
    ("GUERRERO GOMEZ YOMAR", "guerreroyomar", True, False),
    ("Salomé Botina Guerrero", "botinasalome", False, False),
    ("Juan Carlos Pérez", "perezjc", False, False),
    ("Pérez Juan Carlos", "perezjc", True, False),
    ("Mora Daniel", "moradaniel", True, False),
    # Partículas: apellido compuesto y nombre con partículas.
    ("De La Hoz Pérez María José", "delahozmj", True, False),
    ("María de los Ángeles Peña Díaz", "penama", False, False),
    # Sin evidencia: se supone el orden de las listas oficiales y se marca dudoso.
    ("Quintero Becerra Xilena Truyot", "quinteroxt", True, True),
])
def test_proposes_surname_plus_initials(name, local, surnames_first, doubtful):
    proposal = se.propose(name)

    assert (proposal.local, proposal.surnames_first, proposal.doubtful) == (local, surnames_first, doubtful)


def test_accents_enye_and_symbols_are_removed():
    assert se.propose("Ñañez O'Neil Íñigo").local.isalnum()
    assert se.propose("NUÑEZ PIÑA SOFÍA").local == "nunezsofia"


def test_an_empty_name_is_flagged():
    assert se.propose("  ") == se.Proposal("estudiante", True, True)


def test_repeated_emails_get_a_number():
    taken = {"moradf@xcalificator.com", "moradf1@xcalificator.com"}

    assert se.first_free("moradf", set()) == "moradf@xcalificator.com"
    assert se.first_free("moradf", taken) == "moradf2@xcalificator.com"


def test_the_local_part_is_bounded():
    assert len(se.propose("A" * 80 + " Juan").local) <= se.MAX_LOCAL
