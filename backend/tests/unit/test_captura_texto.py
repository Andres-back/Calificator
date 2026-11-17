"""Spec 201: texto desde foto o archivo para llenar campos sin digitar."""
from __future__ import annotations

import asyncio
import io

import pytest

from app.modules.captura_texto.service import (
    MAX_SCANNED_PAGES,
    UnsupportedFile,
    capture_text,
    detect_kind,
)

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 32
JPG = b"\xff\xd8\xff\xe0" + b"0" * 32


def run(content: bytes, name: str, read_image=None):
    async def never(*_args):
        raise AssertionError("este archivo no debe usar lectura de imagen")

    return asyncio.run(capture_text(content, name, None, read_image=read_image or never))


def docx_bytes() -> bytes:
    import docx

    document = docx.Document()
    document.add_paragraph("La gota Lila vivía en una nube blanca.")
    table = document.add_table(rows=2, cols=2)
    table.cell(0, 0).text, table.cell(0, 1).text = "Palabra", "Significado"
    table.cell(1, 0).text, table.cell(1, 1).text = "Nube", "Agua en el cielo"
    document.add_paragraph("Un día el sol brilló fuerte.")
    output = io.BytesIO()
    document.save(output)
    return output.getvalue()


def xlsx_bytes(rows=3) -> bytes:
    import openpyxl

    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "Lista"
    sheet.append(["N.º", "Estudiante", "Nota"])
    for index in range(1, rows):
        sheet.append([index, f"Estudiante {index}", 4.5])
    sheet.append([None, None, None])
    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


def pdf_bytes(pages: list[str]) -> bytes:
    import fitz

    document = fitz.open()
    for text in pages:
        page = document.new_page()
        if text:
            page.insert_text((72, 100), text)
    data = document.tobytes()
    document.close()
    return data


def test_reconoce_el_tipo_por_contenido_y_rechaza_lo_que_no_lee() -> None:
    assert detect_kind(PNG, "x.bin") == "imagen"
    assert detect_kind(JPG, "") == "imagen"
    assert detect_kind(pdf_bytes(["hola"]), "sin-extension") == "pdf"
    assert detect_kind(docx_bytes(), "lectura.pdf") == "docx"  # manda el contenido, no la extensión
    assert detect_kind(xlsx_bytes(), "lista") == "xlsx"
    assert detect_kind(b"a;b\n1;2\n", "notas.csv") == "csv"
    assert detect_kind("Texto con tildes: canción".encode(), "apuntes") == "texto"
    with pytest.raises(UnsupportedFile):
        detect_kind(b"\x00\x01\x02\x03binario", "programa.exe")
    with pytest.raises(UnsupportedFile):
        detect_kind(b"PK\x03\x04roto", "archivo.zip")
    with pytest.raises(UnsupportedFile):
        run(b"", "vacio.txt")


def test_word_conserva_parrafos_y_tablas_en_orden() -> None:
    captured = run(docx_bytes(), "lectura.docx")

    assert captured.origen == "Word"
    assert captured.texto == (
        "La gota Lila vivía en una nube blanca.\n\nPalabra | Significado\nNube | Agua en el cielo\n\nUn día el sol brilló fuerte."
    )
    assert captured.advertencias == []


def test_excel_entrega_una_fila_por_linea_sin_filas_vacias() -> None:
    captured = run(xlsx_bytes(), "lista.xlsx")

    assert captured.origen == "Excel"
    assert captured.texto.splitlines() == ["N.º | Estudiante | Nota", "1 | Estudiante 1 | 4.5", "2 | Estudiante 2 | 4.5"]


def test_csv_y_texto_respetan_tildes_en_distintas_codificaciones() -> None:
    csv_text = run("nombre;nota\nJosé Peña;4,5\n".encode("cp1252"), "notas.csv")
    assert csv_text.origen == "CSV" and csv_text.texto == "nombre | nota\nJosé Peña | 4,5"

    plain = run("﻿Primera línea\r\n\r\n\r\nSegunda línea   \r\n".encode("utf-8"), "apuntes.txt")
    assert plain.origen == "texto" and plain.texto == "Primera línea\n\nSegunda línea"


def test_pdf_con_texto_no_usa_la_ia() -> None:
    captured = run(pdf_bytes(["Erase una vez una gota", "Fin del cuento"]), "cuento.pdf")

    assert captured.origen == "PDF"
    assert "Erase una vez una gota" in captured.texto and "Fin del cuento" in captured.texto


def test_la_foto_se_lee_con_la_instruccion_de_transcripcion_literal() -> None:
    calls = []

    async def read_image(content, mime, name, user_id):
        calls.append((mime, name, user_id))
        return "=== PÁGINA 1 ===\nMientras avanzaba, vio a unos niños.\n\n\n\nLila se puso triste.", ["Se corrigió la orientación."]

    captured = asyncio.run(capture_text(JPG, "hoja.jpg", None, read_image=read_image))

    assert calls == [("image/jpeg", "hoja.jpg", None)]
    assert captured.origen == "foto"
    assert captured.texto == "Mientras avanzaba, vio a unos niños.\n\nLila se puso triste."
    assert captured.advertencias == ["Se corrigió la orientación."]


def test_pdf_escaneado_lee_hoja_por_hoja_y_avisa_del_tope() -> None:
    seen = []

    async def read_image(content, mime, name, user_id):
        seen.append(name)
        if "hoja 2" in name:
            raise RuntimeError("fallo de esa hoja")
        return f"Texto de {name.split('·')[-1].strip()}", []

    captured = asyncio.run(capture_text(pdf_bytes([""] * (MAX_SCANNED_PAGES + 2)), "escaneo.pdf", None, read_image=read_image))

    assert captured.origen == "PDF escaneado"
    assert len(seen) == MAX_SCANNED_PAGES and captured.paginas == MAX_SCANNED_PAGES
    assert "Texto de hoja 1" in captured.texto and "Texto de hoja 3" in captured.texto and "hoja 2" not in captured.texto
    assert "No se pudo leer la hoja 2." in captured.advertencias
    assert any(f"se leyeron las primeras {MAX_SCANNED_PAGES}" in warning for warning in captured.advertencias)


def test_sin_texto_legible_se_avisa_en_vez_de_devolver_vacio_en_silencio() -> None:
    async def read_image(*_args):
        return "", []

    captured = asyncio.run(capture_text(PNG, "borrosa.png", None, read_image=read_image))

    assert captured.texto == ""
    assert captured.advertencias == ["No se encontró texto legible. Prueba con una foto más nítida o con otro archivo."]
