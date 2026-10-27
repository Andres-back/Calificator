"""Render the application's exporters on synthetic Spec130 content, never a database."""
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
import argparse

from app.modules.evaluaciones.export_service import build_evaluation_material, render_evaluation_docx
from app.modules.evaluaciones.print_preparation import render_candidate
from app.modules.evaluaciones.visual_render import ResolvedVisualBlock, render_structured_visual
from app.modules.evaluaciones.visual_schemas import VisualBlock, VisualTable
from tests.fixtures.document_structure import sample_document, identifier


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    output = parser.parse_args().output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    for mode in ('compacta', 'media', 'amplia'):
        document, questions = sample_document()
        for question in questions[:4]:
            question.update(tipo='opcion_multiple', opciones=['A) Agua', 'B) Plástico', 'C) Metal', 'D) Vidrio'])
        for question in questions[4:]:
            question['lineas_respuesta'] = 2
        reading = next(node for node in document['nodos'] if node.get('proposito') == 'lectura')
        reading['texto'] += '\n\n' + ('Cada día observaron la humedad de la tierra y anotaron los cambios. '
            'Una planta creció hacia la luz. Compararon las observaciones sin arrancar sus hojas.\n' * 8)
        table = VisualTable(encabezados=['Día', 'Altura'], filas=[['1', '2 cm'], ['3', '4 cm'], ['5', '6 cm']])
        block = VisualBlock(id=identifier('qa-table'), tipo='tabla', orden=0,
            recurso_id=identifier('qa-table-resource'),
            pregunta_ids=[questions[4]['contenido_id'], questions[5]['contenido_id']], tabla=table,
            seguridad_contenido='publicable_confirmado', pie='Observaciones de la semilla')
        document['nodos'].append({'id': identifier('qa-material'), 'tipo': 'material',
            'padre_id': identifier('comprehension'), 'orden': 3, 'bloque_id': str(block.id)})
        evaluation = SimpleNamespace(nombre='El jardín y sus semillas', descripcion='Lee el texto y responde con tus propias palabras.',
            created_at=datetime(2026, 10, 26), preguntas=questions, respuestas_esperadas=[], nota_maxima=5,
            estructura_documento=document, configuracion_impresion={'distribucion': mode, 'blanco_negro': True})
        material = build_evaluation_material(evaluation, soluciones=False,
            visual_blocks=[ResolvedVisualBlock(block, render_structured_visual(table))])
        (output / f'documento-{mode}.docx').write_bytes(render_evaluation_docx(material, soluciones=False))
        pdf, pages = render_candidate(material)
        (output / f'documento-{mode}.pdf').write_bytes(pdf)
        print(f'{mode}: {pages} páginas PDF; Word generado')


if __name__ == '__main__':
    main()
