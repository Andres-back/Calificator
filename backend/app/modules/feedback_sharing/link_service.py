"""Recover only current authorized link copies, never rotate on a read."""
from fastapi import HTTPException
from sqlalchemy import select

from app.core.config import settings
from app.modules.feedback_sharing.access_policy import authorize_evaluation, db_now, guard_access
from app.modules.feedback_sharing.credentials import open_credential
from app.modules.feedback_sharing.models import FeedbackAccess, FeedbackPublication
from app.modules.feedback_sharing.service import _lock_managed_access, audit_control


async def copy_accesses(db, actor, evaluation_id, access_ids):
    await authorize_evaluation(db, actor, evaluation_id)
    # Do not disclose whether an ID from another evaluation exists.
    allowed = list((await db.execute(select(FeedbackAccess.id, FeedbackAccess.calificacion_id)
        .join(FeedbackPublication, FeedbackAccess.publication_id == FeedbackPublication.id)
        .where(FeedbackPublication.evaluacion_id == evaluation_id, FeedbackAccess.id.in_(access_ids))
        .order_by(FeedbackAccess.calificacion_id, FeedbackAccess.id))).all())
    results = {}
    for access_id, _ in allowed:
        try:
            async with db.begin_nested():
                access, publication = await _lock_managed_access(db, actor, access_id)
                if publication.evaluacion_id != evaluation_id:
                    raise HTTPException(404, 'Este enlace ya no está disponible.')
                code = None
                if access.state != 'active':
                    code = 'disabled'
                elif await db_now(db) >= access.expires_at:
                    code = 'expired'
                if code:
                    results[access_id] = {'id':str(access_id), 'code':code,
                        'error':'El enlace está vencido o desactivado. Puedes revisar sus opciones sin crear otro automáticamente.'}
                    continue
                await guard_access(db, access)
                if not access.credential_encrypted:
                    results[access_id] = {'id':str(access_id), 'code':'legacy_unrecoverable',
                        'error':'Este enlace antiguo no guardó una copia recuperable. Si no lo conservas, puedes reemplazarlo de forma explícita.'}
                    continue
                token = open_credential(access.credential_encrypted, access.credential_digest)
                results[access_id] = {'id':str(access.id), 'calificacion_id':str(access.calificacion_id),
                    'estudiante':publication.payload_json['estudiante'], 'expires_at':access.expires_at.isoformat(),
                    'url':f"{settings.PUBLIC_APP_URL.rstrip('/')}/devolucion#{token}"}
        except HTTPException:
            results[access_id] = {'id':str(access_id), 'code':'unavailable',
                'error':'No podemos copiar este enlace. Actualiza su estado y revisa las opciones.'}
    rows = [results.get(access_id, {'id':str(access_id), 'code':'unavailable',
        'error':'Este enlace no está disponible en esta evaluación.'}) for access_id in access_ids]
    await audit_control(db, 'links_copied', evaluation_id, actor.id,
        {'requested':len(access_ids), 'copied':sum('url' in row for row in rows)}, entity_type='feedback_evaluation')
    return {'resultados':rows}
