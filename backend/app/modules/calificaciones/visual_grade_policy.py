"""Publication preflight for versioned grades; no inference or grade mutation."""
from fastapi import HTTPException

from app.modules.evaluaciones.grading_visual_context import load_grading_context


async def ensure_visual_grade_publishable(db, grade, evaluation) -> None:
    delivery = getattr(grade, 'entrega', None)
    if delivery is None or getattr(delivery, 'contenido_version_id', None) is None:
        return
    result = grade.resultado_json or {}
    # A reasoned human decision is distinct from publishing an automatic result.
    # The manual route records actor, reason and its own official breakdown.
    manual_events = [event for event in result.get('_timeline', [])
                     if event.get('actor_id') and event.get('tipo') == 'publicada']
    if (result.get('origen_nota') == 'manual_docente'
            and str(result.get('motivo_nota_manual') or '').strip()
            and grade.revisado_por_docente and manual_events):
        return
    context = await load_grading_context(db, evaluation, delivery)
    if context.revision.snapshot_json.get('claves_pendientes_revision'):
        raise HTTPException(409, 'Comprueba las respuestas correctas del material usado antes de publicar esta nota.')
    provenance = result.get('evaluation_content') or {}
    if (provenance.get('version_id') != str(context.version_id)
            or provenance.get('content_hash') != context.content_hash):
        raise HTTPException(409, 'No pudimos comprobar con qué material se calculó esta nota. Revisa la evidencia antes de publicarla.')
