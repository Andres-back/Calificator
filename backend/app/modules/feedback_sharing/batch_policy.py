"""Pure rules for an explicit batch decision, never a background acceptance."""
from decimal import Decimal, InvalidOperation
from types import SimpleNamespace
import unicodedata

from fastapi import HTTPException

from app.modules.feedback_sharing.projection import digest
from app.modules.feedback_sharing.quality_policy import ensure_feedback_coherence

CONFIRMED = {'confirmada', 'ajustada', 'publicada'}
AVAILABLE = CONFIRMED | {'sugerida', 'requiere_revision'}


def batch_score(grade, evaluation) -> Decimal:
    if grade.estado not in AVAILABLE:
        raise HTTPException(409, 'Esta entrega todavía no tiene una nota disponible para aceptar.')
    if grade.estado in CONFIRMED:
        if not grade.revisado_por_docente:
            raise HTTPException(409, 'Revisa la decisión docente guardada antes de publicarla.')
        score = grade.nota_confirmada
    else:
        score = grade.nota_sugerida
    try:
        value, maximum = Decimal(str(score)), Decimal(str(evaluation.nota_maxima))
        if not value.is_finite() or not maximum.is_finite() or maximum <= 0 or not 0 <= value <= maximum:
            raise ValueError('score')
    except (InvalidOperation, ValueError, TypeError):
        raise HTTPException(409, 'Falta una nota válida dentro de la escala de esta evaluación.') from None
    return value


def delivery_message(original: str) -> str:
    text = (original or '').strip()
    normalized = ''.join(c for c in unicodedata.normalize('NFKD', text.casefold()) if not unicodedata.combining(c))
    marker = 'Borrador basado en el desglose:'
    # Only the existing, known system envelope. Unknown uncertainty is kept and
    # still subject to normal quality review; never regex away substantive text.
    if normalized.startswith('retroalimentacion provisional:') and text.count(marker) == 1:
        return text.partition(marker)[2].strip()
    return text


def source_fingerprint(source) -> str:
    # Do not change Spec120's identity and invalidate previously healthy links.
    return digest({'source': source.source_fingerprint, 'suggested': source.grade.nota_sugerida, 'schema': 122})


def prepare_candidate(source, existing_payload=None):
    note = batch_score(source.grade, source.evaluation)
    message = delivery_message((existing_payload or {}).get('retroalimentacion', source.grade.feedback))
    if not message:
        raise HTTPException(409, 'Añade una retroalimentación antes de aceptar esta devolución.')
    ensure_feedback_coherence(SimpleNamespace(feedback=message), [{'estado': 'correcta' if note == source.evaluation.nota_maxima else 'parcial'}])
    warnings = []
    if source.grade.estado not in CONFIRMED:
        warnings.append('Aceptarás la nota sugerida que se muestra.')
    if source.breakdown and (source.breakdown.requiere_revision or source.breakdown.cobertura_estado != 'completa' or source.breakdown.nota_final != note):
        warnings.append('Se entregará un resumen; el detalle por pregunta sigue pendiente de revisión.')
    if message != (source.grade.feedback or '').strip():
        warnings.append('El mensaje de entrega se muestra separado de los avisos del análisis original, que se conservarán.')
    return {'source_fingerprint': source_fingerprint(source), 'nota': str(note),
        'feedback_text': message, 'scope': 'summary', 'avisos': warnings}
