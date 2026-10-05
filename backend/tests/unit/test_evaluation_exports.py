from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4

import pytest
from docx import Document
from fastapi import HTTPException

from app.modules.evaluaciones import export_service, router, service


def evaluation():
    return SimpleNamespace(
        id=uuid4(), profesor_id=uuid4(), material_origen_id=None,
        nombre='Comprensión y operaciones', descripcion='Lee y responde cada punto.',
        nota_maxima=5, created_at=datetime(2026, 10, 4),
        preguntas=[
            {'numero': 2, 'enunciado': '¿Cuánto es 3 × 4?', 'puntaje': 2,
             'opciones': [{'texto': 'A) 12', 'correcta': True}, {'texto': 'B) 16', 'correcta': False}],
             'respuesta_correcta': 'clave privada', 'justificacion': 'dato privado'},
            {'numero': 4, 'enunciado': 'Explica qué significa aprender.', 'puntaje': 3},
        ],
        respuestas_esperadas=[{'numero': '2', 'texto': '12'}, {'numero': 4, 'respuesta': 'Construir conocimiento'}],
    )


def text_of(data):
    document = Document(BytesIO(data))
    return '\n'.join(p.text for p in document.paragraphs)


def test_printable_and_word_preserve_questions_options_scores_without_private_keys():
    item = evaluation()
    before = deepcopy(vars(item))
    material = export_service.build_evaluation_material(item, soluciones=False)
    output = text_of(export_service.render_evaluation_docx(material, soluciones=False))
    assert '¿Cuánto es 3 × 4?' in output
    assert 'Explica qué significa aprender.' in output
    assert 'A) 12' in output and 'B) 16' in output and 'A) A)' not in output
    assert '2 puntos' in output and '3 puntos' in output and 'Total: 5 puntos' in output
    assert 'clave privada' not in output and 'dato privado' not in output
    assert 'Construir conocimiento' not in output
    assert vars(item) == before
    assert material['contenido_json']['preguntas'][0]['opciones'] == ['A) 12', 'B) 16']


def test_solutions_match_saved_numbers_and_report_missing_answers():
    item = evaluation()
    item.respuestas_esperadas = [{'numero': '2', 'texto': '12'}]
    material = export_service.build_evaluation_material(item, soluciones=True)
    output = text_of(export_service.render_evaluation_docx(material, soluciones=True))
    assert 'Solucionario docente' in output
    assert 'Respuesta: 12' in output
    assert 'Sin respuesta esperada guardada' in output
    assert 'clave privada' not in output


def test_legacy_embedded_solution_remains_available_only_in_private_document():
    item = evaluation()
    item.respuestas_esperadas = []
    private = text_of(export_service.render_evaluation_docx(export_service.build_evaluation_material(item, soluciones=True), soluciones=True))
    public = text_of(export_service.render_evaluation_docx(export_service.build_evaluation_material(item, soluciones=False), soluciones=False))
    assert 'Respuesta: clave privada' in private
    assert 'clave privada' not in public


def test_reading_material_word_preserves_source_context_and_private_answers():
    material = {'tipo': 'lectura_comprensiva', 'titulo': 'El viaje', 'contenido_json': {
        'texto': 'Nico miró emocionado por la ventana del avión.', 'fuente': 'Texto de clase',
        'preguntas': [{'numero': 1, 'enunciado': '¿Quién viajaba?', 'respuesta_esperada': 'Nico'}],
    }}
    clean = text_of(export_service.render_evaluation_docx(material, soluciones=False))
    solved = text_of(export_service.render_evaluation_docx(material, soluciones=True))
    assert 'Nico miró emocionado' in clean and '¿Quién viajaba?' in clean
    assert 'Respuesta: Nico' not in clean and 'Respuesta: Nico' in solved


@pytest.mark.parametrize('kind', ['crucigrama', 'sopa_letras', 'mapa_conceptual'])
def test_unsupported_word_material_is_explicit_and_not_a_partial_exam(kind):
    with pytest.raises(ValueError, match='PDF'):
        export_service.render_evaluation_docx({'tipo': kind, 'contenido_json': {}}, soluciones=False)


def test_empty_native_evaluation_does_not_export_a_misleading_document():
    item = evaluation()
    item.preguntas = []
    with pytest.raises(ValueError, match='preguntas'):
        export_service.build_evaluation_material(item, soluciones=False)


def test_workshop_word_preserves_review_criteria_only_in_solutions():
    material = {'tipo': 'taller', 'contenido_json': {
        'objetivo': 'Argumentar', 'puntos': [{'numero': 1, 'enunciado': 'Explica por qué.', 'puntaje': 5, 'lineas_respuesta': 4,
                                           'respuesta_esperada': 'Argumento con evidencia', 'criterio_logro': 'Justifica su respuesta'}],
        'criterios_revision': ['Incluye evidencia verificable'], 'puntaje_total': 5,
    }}
    clean = text_of(export_service.render_evaluation_docx(material, soluciones=False))
    solved = text_of(export_service.render_evaluation_docx(material, soluciones=True))
    assert clean.count('________________________________________________________________') == 4
    assert 'Argumentar' in clean and 'Total: 5 puntos' in clean
    assert 'Incluye evidencia verificable' not in clean
    assert 'Incluye evidencia verificable' in solved and 'Justifica su respuesta' in solved


@pytest.mark.parametrize('location', ['content', 'question'])
def test_graphics_reject_word_explicitly_instead_of_omitting_content(location):
    question = {'numero': 1, 'enunciado': 'Observa el dibujo.'}
    content = {'preguntas': [question]}
    (content if location == 'content' else question)['imagen_url'] = '/grafico.png'
    with pytest.raises(ValueError, match='gráfico'):
        export_service.render_evaluation_docx({'tipo': 'examen', 'contenido_json': content}, soluciones=False)


@pytest.mark.parametrize('format_name', ['pdf', 'docx'])
@pytest.mark.parametrize('role,owned,solutions,allowed', [
    ('profesor', True, False, True), ('profesor', True, True, True),
    ('admin', False, True, True), ('estudiante', False, False, True),
    ('estudiante', True, True, False),
    ('estudiante', False, True, False), ('profesor', False, True, False),
])
def test_exports_share_read_authorization_and_solution_ownership(
    monkeypatch, format_name, role, owned, solutions, allowed,
):
    item = evaluation()
    user = SimpleNamespace(id=item.profesor_id if owned else uuid4(), rol=role,
                           _effective_permissions={'evaluations.read'})
    calls = []

    async def can_read(db, selected_id, current_user):
        calls.append('authorize')
        assert selected_id == item.id and current_user is user
        return item

    async def get_item(*args):
        return item

    monkeypatch.setattr(service, 'ensure_can_read_evaluation', can_read)
    monkeypatch.setattr(service, 'get_evaluation_or_404', get_item)
    from app.modules.herramientas import pdf_render
    monkeypatch.setattr(pdf_render, 'render_material_pdf', lambda *args, **kwargs: b'%PDF-test')
    operation = router.download_evaluation_pdf if format_name == 'pdf' else router.download_evaluation_docx
    kwargs = dict(evaluacion_id=item.id, soluciones=solutions, current_user=user, db=object())
    if format_name == 'pdf':
        kwargs['descargar'] = True
    before = deepcopy(vars(item))
    if allowed:
        response = asyncio.run(operation(**kwargs))
        assert response.status_code == 200
        assert 'private, no-store' == response.headers['cache-control']
        assert 'attachment;' in response.headers['content-disposition']
        if format_name == 'docx':
            assert response.body[:2] == b'PK'
            assert ('Respuesta: 12' in text_of(response.body)) == solutions
    else:
        with pytest.raises(HTTPException) as exc:
            asyncio.run(operation(**kwargs))
        assert exc.value.status_code == 403
    assert calls == ['authorize']
    assert vars(item) == before


@pytest.mark.parametrize('format_name', ['pdf', 'docx'])
def test_export_rejects_missing_read_permission_before_loading(monkeypatch, format_name):
    user = SimpleNamespace(id=uuid4(), rol='profesor', _effective_permissions=set())
    operation = router.download_evaluation_pdf if format_name == 'pdf' else router.download_evaluation_docx
    kwargs = dict(evaluacion_id=uuid4(), soluciones=False, current_user=user, db=object())
    if format_name == 'pdf':
        kwargs['descargar'] = False
    with pytest.raises(HTTPException) as exc:
        asyncio.run(operation(**kwargs))
    assert exc.value.status_code == 403


def test_unicode_filename_has_safe_ascii_fallback_and_utf8_name():
    disposition = export_service.document_disposition('Examen áé / "\r\nX: 1', 'docx', True)
    assert '\r' not in disposition and '\n' not in disposition
    assert "filename*=UTF-8''" in disposition and '%C3%A1' in disposition
    disposition.encode('latin-1')


def test_real_pdf_contains_all_saved_questions_without_solutions():
    pytest.importorskip('weasyprint', reason='Render PDF real requiere entorno backend/CI con WeasyPrint')
    import fitz
    from app.modules.herramientas.pdf_render import render_material_pdf
    item = evaluation()
    item.preguntas.append({'numero': 5, 'enunciado': '¿Por qué es útil explicar el resultado?', 'puntaje': 0})
    material = export_service.build_evaluation_material(item, soluciones=False)
    data = render_material_pdf(material, soluciones=False)
    with fitz.open(stream=data, filetype='pdf') as document:
        text = '\n'.join(page.get_text() for page in document)
    assert 'Cuánto es 3' in text and 'Explica qué significa aprender' in text
    assert 'Por qué es útil explicar el resultado' in text
    assert 'clave privada' not in text and 'Construir conocimiento' not in text


def test_foreign_evaluation_access_is_rejected_before_export(monkeypatch):
    async def reject_read(*args):
        raise HTTPException(status_code=403, detail='Not enough permissions')
    monkeypatch.setattr(service, 'ensure_can_read_evaluation', reject_read)
    user = SimpleNamespace(id=uuid4(), rol='profesor', _effective_permissions={'evaluations.read'})
    with pytest.raises(HTTPException) as exc:
        asyncio.run(router.download_evaluation_docx(uuid4(), False, user, object()))
    assert exc.value.status_code == 403


@pytest.mark.parametrize('format_name', ['pdf', 'docx'])
def test_assigned_material_keeps_original_pdf_and_rejects_unsupported_word(monkeypatch, format_name):
    from app.modules.herramientas import pdf_render, service as materials_service
    item = evaluation()
    item.material_origen_id = uuid4()
    original = {'tipo': 'crucigrama', 'titulo': 'Crucigrama original', 'contenido_json': {'cuadricula': [['A']]}}
    user = SimpleNamespace(id=item.profesor_id, rol='profesor', _effective_permissions={'evaluations.read'})
    async def can_read(*args): return item
    async def get_item(*args): return item
    async def get_material(db, selected_id, owner):
        assert selected_id == item.material_origen_id and owner == item.profesor_id
        return original
    def render(material, **kwargs):
        assert material is original
        return b'%PDF-original'
    monkeypatch.setattr(service, 'ensure_can_read_evaluation', can_read)
    monkeypatch.setattr(service, 'get_evaluation_or_404', get_item)
    monkeypatch.setattr(materials_service, 'get_material', get_material)
    monkeypatch.setattr(pdf_render, 'render_material_pdf', render)
    before = deepcopy(original)
    if format_name == 'pdf':
        response = asyncio.run(router.download_evaluation_pdf(item.id, False, False, user, object()))
        assert response.body == b'%PDF-original'
    else:
        with pytest.raises(HTTPException) as exc:
            asyncio.run(router.download_evaluation_docx(item.id, False, user, object()))
        assert exc.value.status_code == 422 and 'PDF' in exc.value.detail
    assert original == before
