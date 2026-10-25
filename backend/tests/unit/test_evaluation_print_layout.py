from copy import deepcopy
from io import BytesIO
from uuid import uuid4
import pytest

from PIL import Image

from app.modules.evaluaciones.print_layout import prepare_print_material
from app.modules.evaluaciones.visual_render import ResolvedVisualBlock
from app.modules.evaluaciones.visual_schemas import VisualBlock


@pytest.mark.parametrize('mode', ['compacta', 'media', 'amplia'])
def test_real_pdf_preserves_reading_drawing_closed_choices_and_page_count(mode):
    pytest.importorskip('weasyprint')
    import fitz
    from app.modules.evaluaciones.print_preparation import render_candidate
    from app.modules.evaluaciones.export_service import render_evaluation_docx
    from docx import Document

    source = material(mode)
    content = source['contenido_json']
    content['texto'] = 'Lectura común: el río lleva el agua hacia la desembocadura.\n' * 18
    content['preguntas'][1]['opciones'] = ['A) Cabecera', 'B) Afluente', 'C) Desembocadura', 'D) Cuenca']
    drawing = content['preguntas'][0]['contenido_id']
    content['configuracion_impresion']['respuestas'] = {drawing: {'dibujo_mm': 50}}
    content['preguntas'][0]['enunciado'] = 'Dibuja un río y señala su desembocadura.'
    data, pages = render_candidate(source)
    with fitz.open(stream=data, filetype='pdf') as document:
        assert len(document) == pages
        text = '\n'.join(page.get_text() for page in document)
        assert text.count('Lectura común:') == 18
        assert 'Dibuja un río' in text and all(value in text for value in ['Cabecera', 'Afluente', 'Desembocadura', 'Cuenca'])
        assert 'Respuesta:' not in text
        assert any('Elige.' in page.get_text() and 'Cuenca' in page.get_text() for page in document)
    word = Document(BytesIO(render_evaluation_docx(source, soluciones=False)))
    assert any(table.style.name == 'Table Grid' and table.rows[0].height.cm >= 5 for table in word.tables if table.rows[0].height)


def material(mode='compacta', **extra):
    return {'tipo': 'examen', 'contenido_json': {'preguntas': [
        {'numero': 1, 'contenido_id': str(uuid4()), 'tipo': 'abierta', 'enunciado': 'Explica.', 'puntaje': '0.5'},
        {'numero': 2, 'contenido_id': str(uuid4()), 'tipo': 'opcion_multiple', 'enunciado': 'Elige.', 'opciones': ['A) Uno', 'B) Dos'], 'puntaje': '0.500'},
    ], 'configuracion_impresion': {'distribucion': mode, **extra}}}


def test_opt_in_only_and_common_score_does_not_change_question_values():
    legacy = {'tipo': 'examen', 'contenido_json': {'preguntas': []}}
    assert prepare_print_material(legacy) == legacy
    source = material()
    before = deepcopy(source)
    prepared = prepare_print_material(source)['contenido_json']
    assert source == before
    assert prepared['_print_common_score'] == '0.5'
    assert prepared['preguntas'][0]['_print_lines'] == 2
    assert prepared['preguntas'][1]['_print_lines'] == 0
    assert prepared['preguntas'][1]['puntaje'] == '0.500'


def test_internal_layout_keys_cannot_be_injected_without_a_valid_configuration():
    value = {'tipo': 'examen', 'contenido_json': {'_print_common_score': '<bad>',
        'preguntas': [{'_print_lateral': True, '_print_drawing_mm': '100;bad'}]}}
    prepared = prepare_print_material(value)
    assert '_print_common_score' not in prepared['contenido_json']
    assert prepared['contenido_json']['preguntas'] == [{}]


def test_explicit_response_space_wins_over_presets_and_stored_lines():
    source = material('amplia')
    question = source['contenido_json']['preguntas'][0]
    question['lineas_respuesta'] = 6
    config = source['contenido_json']['configuracion_impresion']
    config['respuestas'] = {question['contenido_id']: {'lineas': 3}}
    assert prepare_print_material(source)['contenido_json']['preguntas'][0]['_print_lines'] == 3


def test_color_conversion_requires_confirmation_and_never_overwrites_original():
    source = material()
    question = source['contenido_json']['preguntas'][0]
    block_id = uuid4()
    data = BytesIO()
    Image.new('RGB', (12, 12), 'red').save(data, 'PNG')
    original = data.getvalue()
    block = VisualBlock(id=block_id, tipo='imagen', orden=0,
        pregunta_ids=[question['contenido_id']], recurso_id=uuid4(), seguridad_contenido='publicable_confirmado')
    question['_evaluation_visuals'] = [ResolvedVisualBlock(block, original)]
    prepared = prepare_print_material(source)['contenido_json']
    assert prepared['preguntas'][0]['_evaluation_visuals'][0].image_bytes == original
    assert prepared['advertencias_impresion']
    source['contenido_json']['configuracion_impresion']['materiales'] = {
        str(block_id): {'convertir_color_confirmado': True, 'disposicion': 'lateral'}}
    prepared = prepare_print_material(source)['contenido_json']
    assert prepared['preguntas'][0]['_print_lateral'] is True
    converted = prepared['preguntas'][0]['_evaluation_visuals'][0].image_bytes
    with Image.open(BytesIO(converted)) as image:
        assert image.mode in {'L', 'LA'}
    assert question['_evaluation_visuals'][0].image_bytes == original
