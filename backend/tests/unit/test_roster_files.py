"""Spec 202: la lista de estudiantes también se importa desde un archivo."""
from __future__ import annotations

import asyncio
import io

import pytest

from app.modules.importacion_estudiantes.roster_files import UnsupportedFile, candidates_from_file, names_from_text
from app.services.storage_service import PRIVATE_MIME_EXTENSIONS


async def no_photo(*_args):
    raise AssertionError("este archivo no debe usar lectura de imagen")


def run(content: bytes, name: str, read_photo=no_photo):
    return asyncio.run(candidates_from_file(content, name, read_photo=read_photo))


def xlsx(rows: list[list]) -> bytes:
    import openpyxl

    workbook = openpyxl.Workbook()
    for row in rows:
        workbook.active.append(row)
    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


def test_excel_con_encabezados_numeros_y_asistencia_solo_deja_los_nombres() -> None:
    content = xlsx([
        ["INSTITUCIÓN EDUCATIVA", None, None, None],
        ["Grado: 5", "Docente:", None, None],
        ["N°", "NOMBRES Y APELLIDOS", "Documento", "Asistencia"],
        [1, "PÉREZ GÓMEZ JUAN DAVID", 1098765432, "X"],
        [2, "DE LA CRUZ MARÍA JOSÉ", 1098765433, "presente"],
        [3, "Ana Sofía Rojas", None, "A"],
        [None, None, None, None],
        ["Total", 3, None, None],
    ])

    found = run(content, "lista.xlsx")

    assert [item["nombre"] for item in found] == ["Pérez Gómez Juan David", "De la Cruz María José", "Ana Sofía Rojas"]
    assert all(item["confianza"] == 0.95 and item["requiere_revision"] is False for item in found)


def test_columnas_de_apellidos_y_nombres_se_unen_en_orden_natural() -> None:
    text = "No | Apellidos | Nombres | Grupo\n1 | Torres Díaz | Samuel | 5A\n2 | López | Mariana Isabel | 5A"

    assert names_from_text(text) == ["Samuel Torres Díaz", "Mariana Isabel López"]


def test_texto_y_word_con_numeracion_y_repetidos() -> None:
    text = "LISTA DE ESTUDIANTES\nGrado 5\n1. Valentina Gómez Ruiz\n2) Samuel Torres\n3 - Mariana López\n4. valentina gómez ruiz\nFirma\n"

    assert names_from_text(text) == ["Valentina Gómez Ruiz", "Samuel Torres", "Mariana López"]
    found = run(text.encode("utf-8"), "lista.txt")
    assert [item["nombre"] for item in found] == ["Valentina Gómez Ruiz", "Samuel Torres", "Mariana López"]


def test_csv_con_punto_y_coma() -> None:
    found = run("estudiante;nota\nJosé Peña;4,5\nLuisa Fernanda Ortiz;3,8\n".encode("cp1252"), "notas.csv")

    assert [item["nombre"] for item in found] == ["José Peña", "Luisa Fernanda Ortiz"]


def test_no_se_toman_como_nombres_filas_que_no_lo_son() -> None:
    text = "Fecha | 2026-11-17\nObservaciones\nx | x | x\nA1B2 | 44\nJuan\n"

    assert names_from_text(text) == []


def test_tope_de_cien_estudiantes() -> None:
    text = "\n".join(f"{index}. Estudiante{chr(65 + index % 26)} Apellido{chr(65 + index // 26)}" for index in range(140))

    assert len(names_from_text(text)) == 100


def test_la_foto_y_el_pdf_escaneado_usan_la_lectura_de_imagen() -> None:
    import fitz

    calls: list[str] = []

    async def read_photo(image: bytes, mime: str):
        calls.append(mime)
        return [{"nombre": f"Estudiante {len(calls)}", "confianza": 0.9, "requiere_revision": False, "advertencias": []},
                {"nombre": "Repetido Entre Hojas", "confianza": 0.9, "requiere_revision": False, "advertencias": []}]

    photo = run(b"\xff\xd8\xff\xe0" + b"0" * 16, "lista.jpg", read_photo)
    assert calls == ["image/jpeg"] and len(photo) == 2

    document = fitz.open()
    for _ in range(5):
        document.new_page()
    scanned = run(document.tobytes(), "lista.pdf", read_photo)
    document.close()

    # Hasta 3 hojas, sin repetir el nombre que aparece en todas.
    assert calls[1:] == ["image/png"] * 3
    assert [item["nombre"] for item in scanned] == ["Estudiante 2", "Repetido Entre Hojas", "Estudiante 3", "Estudiante 4"]


def test_pdf_con_texto_no_usa_la_ia() -> None:
    import fitz

    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 100), "1. Valentina Gomez Ruiz")
    page.insert_text((72, 120), "2. Samuel Torres")
    content = document.tobytes()
    document.close()

    assert [item["nombre"] for item in run(content, "lista.pdf")] == ["Valentina Gomez Ruiz", "Samuel Torres"]


def test_tipos_no_admitidos_y_almacenamiento_privado() -> None:
    with pytest.raises(UnsupportedFile):
        run(b"\x00\x01\x02binario", "lista.exe")
    for mime in ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "text/plain", "application/pdf"):
        assert mime in PRIVATE_MIME_EXTENSIONS
