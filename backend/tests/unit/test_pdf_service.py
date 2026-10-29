"""Synthetic regression contracts for the reviewed fpdf2 security update."""
from copy import deepcopy
from importlib.metadata import version
from pathlib import Path

import fitz
import pytest

from app.services.pdf_service import generate_boletin_pdf, generate_report_pdf


def assert_readable_pdf(content: bytes, expected: list[str]) -> None:
    assert content.startswith(b'%PDF-')
    with fitz.open(stream=content, filetype='pdf') as document:
        assert not document.is_encrypted and document.page_count >= 1
        text = '\n'.join(page.get_text() for page in document)
        for fragment in expected:
            assert fragment in text
        for number, page in enumerate(document, 1):
            assert f'Página {number}' in page.get_text()
            assert not page.get_links()
            assert page.get_pixmap(matrix=fitz.Matrix(1, 1)).width > 0
            for x0, y0, x1, y1, *_ in page.get_text('words'):
                assert 0 <= x0 < x1 <= page.rect.width
                assert 0 <= y0 < y1 <= page.rect.height


def test_fpdf_dependency_matches_reviewed_security_release():
    requirements = (Path(__file__).resolve().parents[2] / 'requirements.txt').read_text()
    assert 'fpdf2==2.8.8' in requirements.splitlines()
    assert version('fpdf2') == '2.8.8'


@pytest.mark.parametrize('count', [0, 1, 3, 45])
def test_report_preserves_every_field_accents_pages_and_input(count):
    data = {f'Fila {index:02d}': f'Revisión sintética número {index:02d}: explica el procedimiento y comprueba la respuesta.' for index in range(count)}
    before = deepcopy(data)
    content = generate_report_pdf(data, 'Reporte de práctica')
    assert data == before
    assert_readable_pdf(content, ['XCalificator', 'Reporte de práctica', *data.keys()])
    if count == 45:
        with fitz.open(stream=content, filetype='pdf') as document:
            assert document.page_count >= 2


@pytest.mark.parametrize('count', [0, 3, 55])
def test_boletin_preserves_rows_accents_and_pagination(count):
    rows = [{'nombre': f'Actividad {index:02d}', 'nota_confirmada': 4.25, 'nota_sugerida': 3.75, 'estado': 'publicada'} for index in range(count)]
    before = deepcopy(rows)
    content = generate_boletin_pdf('Estudiante de prueba', 'Ciencias y comprensión', rows)
    assert rows == before
    assert_readable_pdf(content, ['Boletín', 'Estudiante de prueba', 'Ciencias y comprensión', *[row['nombre'] for row in rows]])
    if count:
        with fitz.open(stream=content, filetype='pdf') as document:
            assert '\n'.join(page.get_text() for page in document).count('4.25') == count


def test_report_renders_markup_as_text_not_external_resources():
    value = '<img src="https://example.invalid/private.png"> <svg><use href="#cycle"/></svg>'
    content = generate_report_pdf({'Texto': value}, 'Contenido literal')
    assert_readable_pdf(content, ['Contenido literal', '<img src=', 'example.invalid/private.png', '<svg>'])


@pytest.mark.parametrize('kind', ['report', 'boletin'])
def test_continuation_page_reserves_space_below_header(kind):
    if kind == 'report':
        content = generate_report_pdf({f'Fila {index}': 'Explica el procedimiento.' for index in range(45)}, 'Reporte sintético')
    else:
        content = generate_boletin_pdf('Estudiante de prueba', 'Ciencias', [
            {'nombre': f'Actividad {index}', 'nota_confirmada': 4.25, 'estado': 'publicada'} for index in range(55)])
    with fitz.open(stream=content, filetype='pdf') as document:
        assert document.page_count >= 2
        for page in document:
            words = page.get_text('words')
            header = next(word for word in words if word[4] == 'XCalificator')
            body = [word for word in words if word != header and word[3] < page.rect.height - 40]
            assert body and min(word[1] for word in body) >= header[3] + 1
