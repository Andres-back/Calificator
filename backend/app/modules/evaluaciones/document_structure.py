"""Deterministic traversal, scope validation and educational-only projections.

These helpers never infer, write, authorize access, or turn headings into marks.
The caller must first authorize the evaluation and its immutable revision.
"""
from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from decimal import Decimal, ROUND_FLOOR, localcontext
from uuid import UUID

from app.modules.evaluaciones.document_schemas import EvaluationDocument


def document_preorder(document: EvaluationDocument):
    children = defaultdict(list)
    for node in document.nodos:
        children[node.padre_id].append(node)
    for siblings in children.values():
        siblings.sort(key=lambda node: node.orden)
    result, pending = [], list(reversed(children[None]))
    while pending:
        node = pending.pop()
        result.append(node)
        pending.extend(reversed(children[node.id]))
    return result


def validate_document_scope(document: EvaluationDocument, questions: list[dict], *, material_ids=(), max_chars=None):
    from app.core.config import settings

    question_ids, numbers = [], []
    for question in questions:
        try:
            question_ids.append(UUID(str(question['contenido_id'])))
            number = question['numero']
            if isinstance(number, bool) or int(number) != number or int(number) <= 0:
                raise ValueError('invalid number')
            numbers.append(int(number))
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError('Cada pregunta necesita su identidad y número académico únicos.') from exc
    if len(set(numbers)) != len(numbers) or len(set(question_ids)) != len(question_ids):
        raise ValueError('Los números académicos y las identidades de preguntas no deben repetirse.')
    references = [node.pregunta_id for node in document.nodos if node.tipo == 'pregunta']
    if len(set(references)) != len(references) or set(references) != set(question_ids):
        raise ValueError('Cada pregunta de esta evaluación debe aparecer una sola vez en el documento.')
    allowed_material = {UUID(str(value)) for value in material_ids}
    if any(node.bloque_id not in allowed_material for node in document.nodos if node.tipo == 'material'):
        raise ValueError('El material no pertenece a esta evaluación o versión.')
    limit = settings.PHOTO_GRADING_CONTEXT_BUDGET_CHARS if max_chars is None else max_chars
    if sum(len(node.texto or '') + len(node.titulo or '') + len(node.etiqueta_original or '') for node in document.nodos) > limit:
        raise ValueError('El documento supera el límite de lectura; no se guardará recortado.')
    if document.puntuacion_secciones is not None:
        maximum = sum(document.puntuacion_secciones.presupuestos.values())
        compiled = compile_section_scores(document, questions, maximum)
        if any(_positive(expected['puntaje']) != _positive(actual['puntaje']) for expected, actual in zip(compiled, questions)):
            raise ValueError('Los puntos por pregunta no corresponden al reparto confirmado.')
    return document


def assert_document_ready(document: EvaluationDocument):
    if document.revision.estado != 'completa' or not document.revision.confirmado or document.revision.avisos:
        raise ValueError('Revisa y confirma los textos y las secciones antes de entregar el documento.')


def public_document(document: EvaluationDocument, questions: list[dict], *, material_ids=()):
    validate_document_scope(document, questions, material_ids=material_ids)
    assert_document_ready(document)
    return {'schema_version': 1, 'nodos': [
        node.model_dump(mode='json', exclude={'fuente_ids'}, exclude_none=True)
        for node in document_preorder(document)
    ]}


def document_read_fields(snapshot: dict, *, student: bool, material_ids=()):
    raw = snapshot.get('estructura_documento')
    if raw is None:
        return {'estructura_documento': None} if 'estructura_documento' in snapshot else {}
    document = EvaluationDocument.model_validate(raw)
    if student:
        return {'estructura_documento': public_document(document, snapshot.get('preguntas') or [], material_ids=material_ids)}
    validate_document_scope(document, snapshot.get('preguntas') or [], material_ids=material_ids)
    return {'estructura_documento': document.model_dump(mode='json')}


def document_context(evaluation, *, max_chars=None):
    from app.core.config import settings

    def value(name, default=None):
        return evaluation.get(name, default) if isinstance(evaluation, dict) else getattr(evaluation, name, default)

    raw = value('estructura_documento')
    if raw is None:
        return ''
    document = raw if isinstance(raw, EvaluationDocument) else EvaluationDocument.model_validate(raw)
    questions = value('preguntas', [])
    manifest = value('contenido_visual') or {}
    material_ids = [block['id'] for block in manifest.get('bloques', [])]
    validate_document_scope(document, questions, material_ids=material_ids, max_chars=max_chars)
    assert_document_ready(document)
    by_id = {UUID(str(question['contenido_id'])): question for question in questions}
    lines = []
    for node in document_preorder(document):
        if node.tipo == 'seccion':
            lines.append('Sección ' + ' '.join(text for text in (node.etiqueta_original, node.titulo) if text))
        elif node.tipo == 'texto':
            lines.append(node.texto)
        elif node.tipo == 'pregunta':
            question = by_id[node.pregunta_id]
            label = f' (etiqueta original: {node.etiqueta_original})' if node.etiqueta_original else ''
            lines.append(f'Pregunta {question["numero"]}{label}')
        # Material bytes/descriptions go through the existing authorized visual channel.
    context = '\n\n'.join(lines)
    limit = settings.PHOTO_GRADING_CONTEXT_BUDGET_CHARS if max_chars is None else max_chars
    if len(context) > limit:
        raise ValueError('El contexto del documento supera el límite de lectura; no se enviará incompleto.')
    return context


def _positive(value):
    try:
        result = Decimal(str(value))
        if not result.is_finite() or result <= 0:
            raise ValueError('nonpositive')
        return result
    except (ArithmeticError, ValueError, TypeError) as exc:
        raise ValueError('Cada pregunta y sección necesita un valor positivo válido.') from exc


def section_question_groups(document):
    """Only selected non-overlapping groups; ungraded sections carry no points."""
    scoring = document.puntuacion_secciones
    if scoring is None:
        return {}
    by_id = {node.id: node for node in document.nodos}
    groups = {identifier: [] for identifier in scoring.presupuestos}
    if any(by_id.get(identifier) is None or by_id[identifier].tipo != 'seccion' for identifier in groups):
        raise ValueError('Elige secciones de este documento para asignarles puntos.')
    for node in document_preorder(document):
        if node.tipo != 'pregunta':
            continue
        parent, matches = node.padre_id, []
        while parent is not None:
            if parent in groups:
                matches.append(parent)
            parent = by_id[parent].padre_id
        if len(matches) != 1:
            raise ValueError('Cada pregunta debe pertenecer a un solo grupo con puntaje; no sumes padre y subsección a la vez.')
        groups[matches[0]].append(node.pregunta_id)
    if any(not identifiers for identifiers in groups.values()):
        raise ValueError('Una sección sin preguntas no recibe puntos.')
    return groups


def compile_section_scores(document, questions, maximum):
    """Compile once into canonical maxima, exact cents and stable largest remainders."""
    scoring = document.puntuacion_secciones
    if scoring is None:
        return deepcopy(questions)
    if not scoring.confirmado:
        raise ValueError('Confirma la propuesta de puntajes por sección antes de guardar.')
    maximum = _positive(maximum)
    if maximum != maximum.quantize(Decimal('.01')) or sum(scoring.presupuestos.values()) != maximum:
        raise ValueError('Los puntajes de las secciones deben sumar exactamente la nota máxima, con hasta dos decimales.')
    ids = {UUID(str(question['contenido_id'])) for question in questions}
    if len(ids) != len(questions) or set(scoring.pesos_base) != ids:
        raise ValueError('Revisa los pesos base de todas las preguntas actuales antes de repartir.')
    groups = section_question_groups(document)
    if {qid for values in groups.values() for qid in values} != ids:
        raise ValueError('El reparto debe cubrir todas las preguntas de la evaluación.')
    values = {}
    numbers = {UUID(str(question['contenido_id'])): int(question['numero']) for question in questions}
    groups = {section: sorted(qids, key=lambda qid: numbers[qid]) for section, qids in groups.items()}
    if scoring.ajustes:
        if set(scoring.ajustes) != ids:
            raise ValueError('Los ajustes internos deben incluir todas las preguntas.')
        for section, qids in groups.items():
            if sum(scoring.ajustes[qid] for qid in qids) != scoring.presupuestos[section]:
                raise ValueError('Los ajustes de cada sección deben sumar exactamente su puntaje.')
        values = scoring.ajustes
    else:
        with localcontext() as ctx:
            ctx.prec = 50
            for section, qids in groups.items():
                cents = int(scoring.presupuestos[section] * 100)
                total_weight = sum(scoring.pesos_base[qid] for qid in qids)
                quotas = [Decimal(cents) * scoring.pesos_base[qid] / total_weight for qid in qids]
                floors = [int(quota.to_integral_value(rounding=ROUND_FLOOR)) for quota in quotas]
                ranked = sorted(range(len(qids)), key=lambda index: (-(quotas[index] - floors[index]), index))
                for index in ranked[:cents - sum(floors)]:
                    floors[index] += 1
                if min(floors) <= 0:
                    raise ValueError('Ese puntaje es demasiado pequeño para repartir al menos 0,01 a cada pregunta.')
                values.update({qid: Decimal(value) / 100 for qid, value in zip(qids, floors)})
    return [{**deepcopy(question), 'puntaje': format(values[UUID(str(question['contenido_id']))], '.2f')} for question in questions]


def _scoring_identity(document, questions, maximum):
    scoring = document.puntuacion_secciones if document else None
    return (scoring.model_dump(mode='json') if scoring else None,
        {str(key): tuple(sorted(map(str, value))) for key, value in section_question_groups(document).items()} if scoring else {},
        dict((str(question['contenido_id']), format(_positive(question['puntaje']).normalize(), 'f')) for question in questions),
        format(Decimal(str(maximum)).normalize(), 'f'))


def apply_section_scoring(previous, document, old_questions, questions, old_maximum, maximum, *, confirmed=False):
    """A transient confirmation is required for a changed proposal or restoring bases."""
    old = previous.puntuacion_secciones if previous else None
    new = document.puntuacion_secciones if document else None
    if old is None and new is None:
        return deepcopy(questions)
    if new is None:
        if not confirmed:
            raise ValueError('Confirma el retorno a los puntajes base antes de desactivar el reparto.')
        ids = {UUID(str(question['contenido_id'])) for question in questions}
        if set(old.pesos_base) != ids or sum(old.pesos_base.values()) != Decimal(str(maximum)):
            raise ValueError('Los puntajes base no corresponden a esta escala o a las preguntas actuales. Revisa el reparto antes de desactivarlo.')
        return [{**deepcopy(question), 'puntaje': format(old.pesos_base[UUID(str(question['contenido_id']))], 'f')} for question in questions]
    old_values = {UUID(str(question['contenido_id'])): _positive(question['puntaje']) for question in old_questions}
    for qid, weight in new.pesos_base.items():
        expected = old.pesos_base.get(qid, old_values.get(qid)) if old else old_values.get(qid)
        if expected is not None and expected != weight:
            raise ValueError('Los pesos base originales deben conservarse; usa ajustes internos para cambiar el reparto.')
    try:
        changed = previous is None or _scoring_identity(previous, old_questions, old_maximum) != _scoring_identity(document, questions, maximum)
    except ValueError:
        changed = True
    if changed and not confirmed:
        raise ValueError('Confirma la nueva propuesta después de cambiar secciones, preguntas, escala o puntos.')
    compiled = compile_section_scores(document, questions, maximum)
    if not confirmed and any(_positive(item['puntaje']) != _positive(actual['puntaje']) for item, actual in zip(compiled, questions)):
        raise ValueError('Los puntajes no coinciden con la propuesta confirmada. Revísala antes de guardar.')
    return compiled
