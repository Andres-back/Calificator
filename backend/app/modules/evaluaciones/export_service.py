"""Documentos de solo lectura a partir del contenido guardado; nunca usa IA."""
from __future__ import annotations

from copy import deepcopy
from decimal import Decimal, InvalidOperation
from io import BytesIO
import re
import unicodedata
from urllib.parse import quote

from app.modules.evaluaciones.service import sanitize_student_payload
from app.modules.evaluaciones.visual_render import ResolvedVisualBlock, append_visual_docx
from app.modules.evaluaciones.reading_service import evaluation_reading
from app.modules.evaluaciones.print_layout import option_columns

MISSING_ANSWER = 'Sin respuesta esperada guardada'
WORD_TYPES = {'examen', 'quiz_rapido', 'taller', 'ficha', 'lectura_comprensiva'}


def _text(value: object) -> str:
    if isinstance(value, dict):
        return str(value.get('texto') or value.get('enunciado') or value.get('valor') or '')
    if isinstance(value, list):
        return '; '.join(_text(item) for item in value)
    return str(value) if value is not None else ''


def _answer(item: dict) -> object:
    return next((item[key] for key in ('respuesta', 'texto', 'respuesta_esperada', 'valor', 'respuesta_correcta')
                 if item.get(key) not in (None, '', [])), None)


def build_evaluation_material(evaluation, *, soluciones: bool, visual_blocks: list[ResolvedVisualBlock] | None = None) -> dict:
    expected = {str(answer.get('numero', index)): _answer(answer)
                for index, answer in enumerate(evaluation.respuestas_esperadas or [], 1)
                if isinstance(answer, dict)}
    questions = []
    pending_visuals = {str(item.block.id): item for item in visual_blocks or []}
    for index, raw in enumerate(evaluation.preguntas or [], 1):
        raw = raw if isinstance(raw, dict) else {'enunciado': str(raw)}
        clean = sanitize_student_payload(deepcopy(raw))
        number = raw.get('numero', index)
        clean['numero'] = number
        clean['opciones'] = [_text(option) for option in clean.get('opciones') or []]
        # Only trusted, internally resolved values enter the rendering channel.
        clean.pop('_evaluation_visuals', None)
        related = [item for item in pending_visuals.values()
                   if str(raw.get('contenido_id')) in {str(value) for value in item.block.pregunta_ids}]
        if related:
            clean['_evaluation_visuals'] = related
            for item in related:
                pending_visuals.pop(str(item.block.id))
        if soluciones:
            # El contrato canónico separado es la fuente de verdad de la clave.
            answer = expected.get(str(number))
            if answer is None:
                # Compatibilidad con claves antiguas guardadas dentro de la pregunta.
                answer = raw.get('respuesta_correcta')
            clean['respuesta_correcta'] = _text(answer) if answer is not None else MISSING_ANSWER
        questions.append(clean)
    if not questions:
        raise ValueError('La evaluación aún no tiene preguntas para visualizar o descargar.')
    if pending_visuals:
        raise ValueError('Revisa a qué preguntas pertenece el material antes de descargar la evaluación.')
    return {'tipo': 'examen', 'titulo': evaluation.nombre, 'created_at': evaluation.created_at,
            'contenido_json': {'titulo': evaluation.nombre,
                              'texto': evaluation_reading(evaluation), 'impresion_compacta': True,
                              'instrucciones': evaluation.descripcion or 'Lee y responde cada punto.',
                              'preguntas': questions, 'total_puntaje': evaluation.nota_maxima}}


def document_disposition(name: str, extension: str, attachment: bool) -> str:
    name = ''.join(c for c in name if c.isalnum() or c in ' -_').strip()[:100] or 'evaluacion'
    ascii_name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().strip() or 'evaluacion'
    mode = 'attachment' if attachment else 'inline'
    return f'{mode}; filename="{ascii_name}.{extension}"; filename*=UTF-8\'\'{quote(name + "." + extension)}'


def render_evaluation_docx(material: dict, *, soluciones: bool) -> bytes:
    from docx import Document
    from docx.oxml.ns import qn
    from docx.shared import Cm, Pt, RGBColor

    kind = material.get('tipo')
    if kind not in WORD_TYPES:
        raise ValueError('Este material conserva su formato en PDF. Su conversión completa a Word aún no está disponible.')
    content = deepcopy(material.get('contenido_json') or {})
    question_key = {'taller': 'puntos', 'ficha': 'ejercicios'}.get(kind, 'preguntas')
    questions = content.get(question_key) or []
    if not questions:
        raise ValueError('El contenido aún no tiene preguntas para descargar en Word. Puedes consultar su PDF.')
    # No se omiten imágenes/contexto gráficos silenciosamente para aparentar una exportación íntegra.
    graphic_keys = ('imagen', 'imagen_url', 'imagenes', 'grafico', 'diagrama', 'ilustracion')
    if any(content.get(k) for k in graphic_keys) or any(isinstance(q, dict) and any(q.get(k) for k in graphic_keys) for q in questions):
        raise ValueError('La evaluación incluye contenido gráfico que debes conservar en PDF; Word no está disponible para este material.')
    document = Document()
    section = document.sections[0]
    section.page_width, section.page_height = Cm(21), Cm(29.7)
    section.top_margin = section.bottom_margin = Cm(1.8)
    section.left_margin = section.right_margin = Cm(2)
    for style_name in ('Normal', 'Title', 'Heading 1', 'Heading 2'):
        style = document.styles[style_name]
        style.font.name = 'Arial'
        style.font.color.rgb = RGBColor(0, 0, 0)
        # Word's theme can override an explicit font and add a blue title rule.
        # These printouts use a plain, portable typographic hierarchy.
        fonts = style.element.get_or_add_rPr().rFonts
        if fonts is not None:
            for key in ('asciiTheme', 'hAnsiTheme', 'eastAsiaTheme', 'cstheme'):
                fonts.attrib.pop(qn('w:' + key), None)
        if style.element.pPr is not None:
            for border in list(style.element.pPr.findall(qn('w:pBdr'))):
                style.element.pPr.remove(border)
    normal = document.styles['Normal']
    normal.font.size = Pt(11)
    normal.paragraph_format.space_after = Pt(7)
    normal.paragraph_format.line_spacing = 1.15
    compact = bool(content.get('impresion_compacta'))
    if compact:
        normal.paragraph_format.space_after = Pt(4)
        normal.paragraph_format.line_spacing = 1.05
    document.core_properties.author = 'XCalificator'
    document.core_properties.last_modified_by = 'XCalificator'
    title = _text(content.get('titulo') or material.get('titulo') or 'Evaluación')
    document.add_paragraph(title, 'Title')
    document.add_paragraph('Solucionario docente' if soluciones else 'Evaluación para estudiantes')
    document.add_paragraph('Nombre: __________________________________   Grado: __________')
    document.add_paragraph('Fecha: __________________   Nota: __________')
    for key, label in (('objetivo', 'Objetivo'), ('instrucciones', 'Instrucciones'), ('estrategia_lectora', 'Estrategia')):
        if content.get(key):
            document.add_paragraph(f'{label}: {_text(content[key])}')
    if content.get('texto'):
        document.add_paragraph('Texto de lectura', 'Heading 1')
        document.add_paragraph(_text(content['texto']))
        if content.get('fuente'):
            document.add_paragraph(f'Fuente: {_text(content["fuente"])}')
    for index, raw in enumerate(questions, 1):
        raw = raw if isinstance(raw, dict) else {'enunciado': str(raw)}
        safe = sanitize_student_payload(raw)
        number = raw.get('numero', index)
        score = raw.get('puntaje')
        suffix = f' ({score} puntos)' if score is not None else ''
        paragraph = document.add_paragraph()
        paragraph.paragraph_format.keep_with_next = True
        paragraph.add_run(f'{number}. {_text(safe.get("enunciado"))}{suffix}').bold = True
        for visual in raw.get('_evaluation_visuals') or []:
            if not isinstance(visual, ResolvedVisualBlock):
                raise ValueError('El material visual necesita revisión antes de descargar.')
            append_visual_docx(document, visual)
        options = [re.sub(r'^\s*[A-Za-z][).]\s*', '', _text(option)) for option in safe.get('opciones') or []]
        if compact and option_columns(options) == 2:
            table = document.add_table(rows=(len(options) + 1) // 2, cols=2)
            for index_option, option in enumerate(options):
                paragraph = table.cell(index_option // 2, index_option % 2).paragraphs[0]
                paragraph.text = f'{chr(65 + index_option)}) {option}'
                paragraph.paragraph_format.space_after = Pt(2)
                paragraph.paragraph_format.keep_with_next = index_option < len(options) - 1
        else:
            for option_index, option in enumerate(options):
                p = document.add_paragraph(f'{chr(65 + option_index)}) {option}')
                p.paragraph_format.left_indent = Cm(0.5)
        if soluciones:
            answer = next((raw[k] for k in ('respuesta_correcta', 'respuesta_esperada', 'respuesta')
                           if raw.get(k) not in (None, '', [])), MISSING_ANSWER)
            document.add_paragraph(f'Respuesta: {_text(answer)}')
            for key, label in (('evidencia_textual', 'Evidencia'), ('justificacion', 'Por qué'), ('criterio_logro', 'Criterio')):
                if raw.get(key):
                    document.add_paragraph(f'{label}: {_text(raw[key])}')
        elif not safe.get('opciones'):
            try:
                lines = max(1, min(8, int(raw.get('lineas_respuesta') or (3 if kind in {'taller', 'lectura_comprensiva'} else 2))))
            except (TypeError, ValueError):
                lines = 3
            for line in range(lines):
                paragraph = document.add_paragraph('________________________________________________________________')
                paragraph.paragraph_format.keep_with_next = line < lines - 1
    if soluciones and content.get('criterios_revision'):
        document.add_paragraph('Criterios de revisión', 'Heading 1')
        for criterion in content['criterios_revision']:
            document.add_paragraph(_text(criterion))
    scores = [q.get('puntaje') if isinstance(q, dict) else None for q in questions]
    total = content.get('total_puntaje', content.get('puntaje_total'))
    if all(score is not None for score in scores):
        try:
            total = sum(Decimal(str(score)) for score in scores)
        except InvalidOperation:
            pass
    if total is not None:
        document.add_paragraph(f'Total: {total} puntos')
    output = BytesIO()
    document.save(output)
    return output.getvalue()
