"""One ordered event stream for Word and HTML/PDF, with a flat legacy fallback."""
from app.modules.evaluaciones.document_schemas import EvaluationDocument
from app.modules.evaluaciones.document_structure import document_preorder, validate_document_scope


def document_print_events(content, questions):
    raw = content.get('documento')
    if raw is None:
        return [('pregunta', question, None) for question in questions]
    document = EvaluationDocument.model_validate(raw)
    visuals = {str(item.block.id): item for item in content.get('_document_visuals') or []}
    validate_document_scope(document, questions, material_ids=visuals)
    by_id = {str(question['contenido_id']): question for question in questions}
    events = []
    for node in document_preorder(document):
        if node.tipo == 'pregunta':
            events.append(('pregunta', by_id[str(node.pregunta_id)], node.etiqueta_original))
        elif node.tipo == 'material':
            events.append(('material', visuals[str(node.bloque_id)], None))
        else:
            events.append((node.tipo, node, None))
    return events
