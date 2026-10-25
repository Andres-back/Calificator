"""Presentation-only writes: no blueprint rebuild, key invalidation or delivery pinning."""

from copy import deepcopy
from datetime import timezone

from fastapi import HTTPException
from sqlalchemy import select

from app.modules.evaluaciones.models import Evaluacion, EvaluacionContenidoVersion
from app.modules.evaluaciones.print_settings import PrintSettings, validate_print_scope
from app.modules.evaluaciones.visual_service import content_hash, get_content_revision
from app.shared.utils import utcnow


def _utc(value):
    return (
        value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value
    )


async def set_print_settings(
    db,
    evaluation_id,
    settings: PrintSettings | None,
    *,
    expected_updated_at,
    expected_version_id,
    actor_id,
):
    evaluation = await db.scalar(
        select(Evaluacion)
        .where(Evaluacion.id == evaluation_id, Evaluacion.deleted_at.is_(None))
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    if evaluation is None:
        raise HTTPException(404, "Evaluación no disponible")
    if (
        expected_updated_at is None
        or evaluation.contenido_version_id != expected_version_id
        or _utc(evaluation.updated_at) != _utc(expected_updated_at)
    ):
        raise HTTPException(
            409,
            "La evaluación cambió. Conservamos tus ajustes; vuelve a abrir la versión actual antes de guardar.",
        )
    previous = (
        await get_content_revision(db, evaluation.id, evaluation.contenido_version_id)
        if evaluation.contenido_version_id is not None
        else None
    )
    snapshot = previous.snapshot_json if previous is not None else {}
    try:
        validate_print_scope(
            settings,
            snapshot.get("preguntas", evaluation.preguntas),
            snapshot.get("contenido_visual"),
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    value = settings.model_dump(mode="json") if settings is not None else None
    current = (
        snapshot.get("configuracion_impresion")
        if previous is not None
        else evaluation.configuracion_impresion
    )
    if current == value:
        return evaluation
    if previous is not None:
        updated_snapshot = deepcopy(snapshot)
        updated_snapshot["configuracion_impresion"] = value
        revision = EvaluacionContenidoVersion(
            evaluacion_id=evaluation.id,
            numero_version=previous.numero_version + 1,
            autor_id=actor_id,
            previous_version_id=previous.id,
            source_resource_id=previous.source_resource_id,
            motivo="Ajustes de impresión, sin cambios académicos",
            origen="presentacion",
            snapshot_json=updated_snapshot,
            content_hash=content_hash(updated_snapshot),
            coverage_json=deepcopy(previous.coverage_json),
            recurso_ids=list(previous.recurso_ids),
            legacy_baseline=previous.legacy_baseline,
        )
        db.add(revision)
        await db.flush()
        evaluation.contenido_version_id = revision.id
    evaluation.configuracion_impresion = value
    evaluation.updated_at = utcnow()
    await db.flush()
    return evaluation
