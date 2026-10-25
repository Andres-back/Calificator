"""Deterministic application renderer QA: never connect to a school database."""
import argparse
from copy import deepcopy
from datetime import datetime
import json
from pathlib import Path
from types import SimpleNamespace
from uuid import NAMESPACE_URL, uuid5

from app.modules.evaluaciones.export_service import build_evaluation_material, render_evaluation_docx
from app.modules.evaluaciones.visual_render import ResolvedVisualBlock
from app.modules.evaluaciones.visual_schemas import VisualBlock
from app.modules.herramientas.pdf_render import render_material_pdf
import fitz


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sample', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(exist_ok=True, parents=True)
    source = json.loads((args.sample / 'contenido-revisado.json').read_text(encoding='utf-8-sig'))
    questions, answers = [], []
    for index, value in enumerate(source['preguntas'], 1):
        question = deepcopy(value)
        question['contenido_id'] = str(uuid5(NAMESPACE_URL, f'spec125-question-{index}'))
        question['puntaje'] = '0.5'
        answers.append({'numero': index, 'respuesta': question.pop('respuesta_esperada')})
        questions.append(question)
    block = VisualBlock(id=uuid5(NAMESPACE_URL, 'spec125-food'), tipo='imagen', orden=0,
        recurso_id=uuid5(NAMESPACE_URL, 'spec125-food-resource'), pregunta_ids=[questions[0]['contenido_id']],
        seguridad_contenido='publicable_confirmado', descripcion='Alimentos A-F',
        pie='A: leche · B: huevo · C: arroz · D: papa · E: zanahoria · F: manzana')
    image = (args.sample / 'lamina-alimentos.png').read_bytes()
    results = {}
    for mode in ['compacta', 'media', 'amplia']:
        settings = {'schema_version': 1, 'distribucion': mode, 'blanco_negro': True,
            'respuestas': {questions[i - 1]['contenido_id']: {'lineas': lines} for i, lines in [(8, 3), (9, 1), (10, 2)]},
            'materiales': {str(block.id): {'ancho_porcentaje': 25, 'disposicion': 'lateral',
                'alineacion': 'centro', 'convertir_color_confirmado': True}}}
        evaluation = SimpleNamespace(nombre='Los alimentos y sus funciones', descripcion=source['instrucciones'],
            created_at=datetime(2026, 10, 24), preguntas=questions, respuestas_esperadas=answers,
            nota_maxima=5, configuracion_impresion=settings)
        material = build_evaluation_material(evaluation, soluciones=False, visual_blocks=[ResolvedVisualBlock(block, image)])
        pdf = render_material_pdf(material, soluciones=False)
        docx = render_evaluation_docx(material, soluciones=False)
        (args.output / f'{mode}.pdf').write_bytes(pdf)
        (args.output / f'{mode}.docx').write_bytes(docx)
        reader = fitz.open(stream=pdf, filetype='pdf')
        text = '\n'.join(page.get_text() for page in reader)
        for question in questions:
            assert question['enunciado'][:22] in text.replace('\n', ' ')
        assert 'Respuesta:' not in text
        results[mode] = {'pages': len(reader), 'pdf_bytes': len(pdf), 'word_bytes': len(docx)}
        for index, page in enumerate(reader, 1):
            page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3)).save(args.output / f'{mode}-{index}.png')
        reader.close()
    (args.output / 'results.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
    print(json.dumps(results))


if __name__ == '__main__':
    main()
