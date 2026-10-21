"""Render-only QA corpus. All content is synthetic and deterministic.

Run inside the isolated backend/renderer test network with an output directory
mounted separately; never connect this script to application or school data.
"""
import argparse
import json
from datetime import datetime
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from uuid import NAMESPACE_URL, uuid5

import fitz
import httpx
from PIL import Image, ImageDraw

from app.modules.evaluaciones.export_service import build_evaluation_material, render_evaluation_docx
from app.modules.evaluaciones.visual_render import ResolvedVisualBlock, render_structured_visual
from app.modules.evaluaciones.visual_schemas import VisualBlock, VisualChart, VisualTable
from app.modules.herramientas.pdf_render import render_material_pdf
from tests.fixtures.evaluation_visuals import TABLES


def identifier(name):
    return uuid5(NAMESPACE_URL, 'xcalificator.example.test/spec101/' + name)


def sample_material():
    questions = [{'numero': index + 1, 'contenido_id': str(identifier(f'question-{index}')),
                  'enunciado': text, 'puntaje': 1} for index, text in enumerate([
        'Compara el precio de los dos periodos.', 'Calcula el aumento de precio.',
        'Explica qué periodo tiene el precio más alto.', 'Observa el triángulo y describe sus lados.',
        'Interpreta las partes del gráfico circular.', 'Compara los valores de la segunda tabla.',
        'Describe la relación de la tercera tabla.', 'Explica la información de la cuarta tabla.',
    ])]
    blocks = []
    for index, rows in enumerate(TABLES):
        table = VisualTable(encabezados=list(rows[0]), filas=[list(row) for row in rows[1:]])
        block = VisualBlock(id=identifier(f'table-{index}'), tipo='tabla', orden=index,
            pregunta_ids=[identifier(f'question-{number}') for number in ([0, 1, 2] if index == 0 else [index + 4])],
            recurso_id=identifier(f'table-resource-{index}'), tabla=table,
            descripcion=f'Tabla {index + 1} con datos de clase', seguridad_contenido='publicable_confirmado')
        blocks.append(ResolvedVisualBlock(block, render_structured_visual(table)))
    chart = VisualChart(tipo='circular', categorias=['Cuento', 'Poesía', 'Ciencia'],
        series=[{'nombre': 'Libros', 'valores': [12, 6, 8]}], unidad='libros')
    block = VisualBlock(id=identifier('chart'), tipo='grafica', orden=5, pregunta_ids=[identifier('question-4')],
        recurso_id=identifier('chart-resource'), grafica=chart, descripcion='Libros de la biblioteca',
        seguridad_contenido='publicable_confirmado')
    blocks.append(ResolvedVisualBlock(block, render_structured_visual(chart)))
    image = Image.new('RGB', (1200, 650), 'white')
    draw = ImageDraw.Draw(image)
    draw.line([(100, 550), (600, 80), (1100, 550), (100, 550)], fill='#4338ca', width=9)
    for point, text in [((580, 25), 'A'), ((60, 575), 'B'), ((1110, 575), 'C')]:
        draw.text(point, text, fill='#0f172a', font_size=35)
    output = BytesIO()
    image.save(output, format='PNG')
    block = VisualBlock(id=identifier('drawing'), tipo='imagen', orden=4, pregunta_ids=[identifier('question-3')],
        recurso_id=identifier('drawing-resource'), descripcion='Triángulo con vértices A B C',
        seguridad_contenido='publicable_confirmado')
    blocks.append(ResolvedVisualBlock(block, output.getvalue()))
    evaluation = SimpleNamespace(nombre='Lectura de tablas y figuras', descripcion='Observa el material y responde cada pregunta.',
        nota_maxima=8, created_at=datetime(2026, 10, 19), preguntas=questions,
        respuestas_esperadas=[{'numero': index + 1, 'respuesta': f'Clave sintética del punto {index + 1}'} for index in range(8)])
    return build_evaluation_material(evaluation, soluciones=False, visual_blocks=blocks)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    material = sample_material()
    word = render_evaluation_docx(material, soluciones=False)
    pdf = render_material_pdf(material, soluciones=False)
    converted = httpx.post('http://document-renderer:8080/convert', content=word,
        headers={'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'},
        timeout=55, trust_env=False)
    converted.raise_for_status()
    if converted.headers.get('content-type') != 'application/pdf':
        raise ValueError('The renderer did not return a PDF')
    (args.output / 'evaluation.docx').write_bytes(word)
    results = {}
    for name, data in [('evaluation-pdf', pdf), ('evaluation-word-render', converted.content)]:
        (args.output / f'{name}.pdf').write_bytes(data)
        with fitz.open(stream=data, filetype='pdf') as document:
            text = '\n'.join(page.get_text() for page in document)
            assert 'Clave sintética' not in text
            for number in range(1, 5):
                assert f'Tabla {number} con datos de clase' in text
            assert 'Triángulo con vértices A B C' in text
            assert 'Libros de la biblioteca' in text
            assert text.count('Tabla 1 con datos de clase') == 1
            for index, page in enumerate(document, 1):
                page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(args.output / f'{name}-{index}.png')
            results[name] = {'pages': len(document), 'bytes': len(data)}
    print(json.dumps(results))


if __name__ == '__main__':
    main()
