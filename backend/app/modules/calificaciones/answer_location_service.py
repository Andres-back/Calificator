"""Ubica las respuestas en la foto a petición del docente. Nunca califica.

La lectura reutiliza el lector de hojas de la calificación y solo conserva las
zonas. Se guardan en la procedencia del desglose, no en los componentes: así no
cambian la nota, los puntajes ni la huella de una devolución ya aprobada.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
import logging
from uuid import UUID, uuid4

import aiofiles
from fastapi import HTTPException
from sqlalchemy import select

from app.modules.calificaciones import breakdown_service
from app.modules.calificaciones.evidence_manifest import EvidenceManifestError, read_manifest
from app.modules.calificaciones.evidence_preparation import resolve_canonical_pages
from app.modules.calificaciones.models import Calificacion, Entrega
from app.services.answer_evidence_regions import (
    LOCATED_KEY,
    attach_answer_regions,
    located_answer_regions,
    location_attempts,
    public_answer_regions,
)
from app.services.storage_service import resolve_upload_path, validate_mime

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 2
# El proxy corta una petición a los 60 s; la lectura debe terminar antes.
TIMEOUT_SECONDS = 50
FEATURE = "calificacion.extraccion"

UNAVAILABLE = (
    "La IA no pudo ubicar las respuestas en este momento. No cambió nada; "
    "intenta de nuevo en unos minutos."
)


@dataclass(frozen=True)
class Photo:
    content: bytes
    mime: str
    canonical: object | None = None


def _is_question(component) -> bool:
    return getattr(component, "tipo", None) == "pregunta"


def pending_keys(breakdown) -> list[str]:
    """Preguntas del desglose vigente que aún no tienen zona propia ni ubicada."""
    located = located_answer_regions(breakdown.procedencia_json)
    return [
        component.clave
        for component in breakdown.componentes
        if _is_question(component)
        and not public_answer_regions((component.evidencia_json or {}).get("regiones"))
        and component.clave not in located
    ]


def reading_context(evaluation_name: str, components) -> dict:
    """Solo lo necesario para reconocer cada pregunta; nunca claves ni puntajes."""
    return {
        "nombre": evaluation_name,
        "preguntas": [
            {
                "id": str(component.clave).removeprefix("pregunta:"),
                "numero": component.numero,
                "enunciado": component.titulo,
            }
            for component in components
            if _is_question(component)
        ],
    }


async def load_photo(delivery: Entrega | None) -> Photo:
    if delivery is None:
        raise HTTPException(409, "Esta calificación no tiene una entrega con foto.")
    try:
        manifest = read_manifest(delivery)
    except EvidenceManifestError as exc:
        raise HTTPException(409, str(exc)) from exc
    if manifest is not None:
        canonical = await resolve_canonical_pages(delivery, manifest)
        first = canonical.pages[0]
        return Photo(first.content, first.mime, canonical)
    if not delivery.archivo_url:
        raise HTTPException(409, "Esta entrega no tiene foto: las respuestas se escribieron en línea.")
    try:
        path = resolve_upload_path(delivery.archivo_url)
    except ValueError as exc:
        raise HTTPException(404, "Evidencia no encontrada") from exc
    if not path.is_file():
        raise HTTPException(404, "Evidencia no encontrada")
    async with aiofiles.open(path, "rb") as source:
        content = await source.read()
    return Photo(content, validate_mime(content, path.name))


async def read_regions(photo: Photo, *, context: dict, tracking: dict) -> dict:
    """Una lectura por hoja con la ruta de IA configurada para leer evidencias."""
    from app.services.vision_extractor import VisionExtractor

    extraction = await VisionExtractor(tracking=tracking).extract(
        photo.content,
        photo.mime,
        blueprint=context,
        purpose="student_response",
        **({"canonical_pages": photo.canonical} if photo.canonical is not None else {}),
    )
    return extraction.model_dump(mode="json")


def located_from_reading(components, reading: dict, delivery_id: UUID, wanted: set[str]) -> dict[str, list[dict]]:
    """Empareja la lectura con las preguntas; conserva solo las que faltaban."""
    probes = [
        {"clave": component.clave, "numero": component.numero, "evidencia_json": {}}
        for component in components
        if _is_question(component)
    ]
    attach_answer_regions(probes, reading, delivery_id)
    found = {}
    for probe in probes:
        regions = public_answer_regions(probe["evidencia_json"].get("regiones"))
        if regions and probe["clave"] in wanted:
            found[probe["clave"]] = regions
    return found


def summary(breakdown, *, new: int = 0) -> dict:
    return {
        "ubicadas": new,
        "pendientes": len(pending_keys(breakdown)),
        "intentos": location_attempts(breakdown.procedencia_json),
        "intentos_maximos": MAX_ATTEMPTS,
    }


async def locate_answers(db, *, grade: Calificacion, evaluation, actor) -> dict:
    breakdown = await breakdown_service.get_active_breakdown(db, grade.id)
    if breakdown is None:
        raise HTTPException(404, "Esta calificación no tiene desglose verificable.")
    wanted = set(pending_keys(breakdown))
    if not wanted:
        return summary(breakdown)
    if location_attempts(breakdown.procedencia_json) >= MAX_ATTEMPTS:
        raise HTTPException(
            409,
            "Ya se buscaron las respuestas de esta hoja dos veces. Las que faltan "
            "no se distinguen en la foto; revísalas en la hoja completa.",
        )
    delivery = await db.get(Entrega, grade.entrega_id) if grade.entrega_id else None
    photo = await load_photo(delivery)

    from app.services.ai_configuration_resolver import resolve_ai_configuration

    # Valores sueltos: después del rollback los objetos cargados caducan.
    grade_id, delivery_id, breakdown_id, actor_id = grade.id, delivery.id, breakdown.id, actor.id
    evaluation_id = evaluation.id
    context = reading_context(str(evaluation.nombre or ""), breakdown.componentes)
    snapshot = await resolve_ai_configuration(db, feature=FEATURE, teacher_id=actor_id)
    tracking = {
        "pipeline_run_id": str(uuid4()),
        "evaluacion_id": str(evaluation_id),
        "calificacion_id": str(grade_id),
        "entrega_id": str(delivery_id),
        "teacher_id": str(actor_id),
        "_ai_config": snapshot,
        "_require_configured_route": True,
    }
    # La lectura tarda segundos: no se sostiene una transacción mientras tanto.
    await db.rollback()
    try:
        async with asyncio.timeout(TIMEOUT_SECONDS):
            reading = await read_regions(photo, context=context, tracking=tracking)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - el proveedor expone varias excepciones
        # Solo el tipo y el código: nunca la foto, el texto ni la respuesta del proveedor.
        logger.warning("answer_location_failed: %s %s", type(exc).__name__, getattr(exc, "code", ""))
        raise HTTPException(503, UNAVAILABLE) from exc

    # Mismo orden de bloqueo que la edición docente: nota y luego desglose.
    await db.execute(select(Calificacion.id).where(Calificacion.id == grade_id).with_for_update())
    active = await breakdown_service.get_active_breakdown(db, grade_id, lock=True)
    if active is None or active.id != breakdown_id:
        await db.rollback()
        raise HTTPException(
            409,
            "La calificación cambió mientras se ubicaban las respuestas. Recarga y vuelve a intentarlo.",
        )
    found = located_from_reading(active.componentes, reading, delivery_id, set(pending_keys(active)))
    provenance = dict(active.procedencia_json or {})
    previous = provenance.get(LOCATED_KEY) if isinstance(provenance.get(LOCATED_KEY), dict) else {}
    provenance[LOCATED_KEY] = {
        "version": 1,
        "intentos": location_attempts(active.procedencia_json) + 1,
        "regiones": {**(previous.get("regiones") or {}), **found},
        "ubicado_en": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "actor_id": str(actor_id),
    }
    active.procedencia_json = provenance
    result = summary(active, new=len(found))
    await db.commit()
    return result
