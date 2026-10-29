"""Four synthetic exports for visual comparison of the reviewed fpdf2 update."""
from __future__ import annotations

import argparse
from importlib.metadata import version
import json
from pathlib import Path

import fitz

from app.services.pdf_service import generate_boletin_pdf, generate_report_pdf


def render(directory: Path) -> None:
    package = version('fpdf2')
    if package not in {'2.8.2', '2.8.8'}:
        raise ValueError('Only the reviewed comparison versions')
    target = directory / f'fpdf-{package}'
    target.mkdir(parents=True, exist_ok=True)
    fields = {f'Fila {index:02d}': f'Revisión sintética número {index:02d}: explica el procedimiento y comprueba la respuesta.' for index in range(45)}
    rows = [{'nombre': f'Actividad {index:02d}', 'nota_confirmada': 4.25, 'nota_sugerida': 3.75, 'estado': 'publicada'} for index in range(55)]
    samples = {
        'reporte-breve': generate_report_pdf(dict(list(fields.items())[:3]), 'Reporte de práctica'),
        'reporte-multipagina': generate_report_pdf(fields, 'Reporte de práctica'),
        'boletin-breve': generate_boletin_pdf('Estudiante de prueba', 'Ciencias y comprensión', rows[:3]),
        'boletin-multipagina': generate_boletin_pdf('Estudiante de prueba', 'Ciencias y comprensión', rows),
    }
    report = {'synthetic_only': True, 'fpdf_version': package, 'real_ai_calls': 0, 'samples': []}
    for name, content in samples.items():
        with (target / f'{name}.pdf').open('xb') as stream:
            stream.write(content)
        with fitz.open(stream=content, filetype='pdf') as document:
            pages = []
            for number, page in enumerate(document, 1):
                png = target / f'{name}-pagina-{number}.png'
                if png.exists():
                    raise ValueError('Existing visual output preserved')
                page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False).save(png)
                pages.append({'page': number, 'size': list(page.rect), 'text': page.get_text()})
            report['samples'].append({'name': name, 'pages': pages})
    with (target / 'report.json').open('x', encoding='utf8') as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2)
    print(json.dumps({'fpdf': package, 'files': len(samples), 'pages': sum(len(sample['pages']) for sample in report['samples'])}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('directory', type=Path)
    render(parser.parse_args().directory)
