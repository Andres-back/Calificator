"""Ubica las preguntas en la hoja a petición del docente. Nunca califica.

Spec 175 guardaba la zona que estimaba la lectura de la hoja. Spec 182 ubica
cada pregunta con una cuadrícula rotulada sobre la misma página que ve el
docente: el modelo nombra celdas y aquí se convierten en recuadros. Las zonas
se guardan en la procedencia del desglose, no en los componentes: así no cambian
la nota, los puntajes ni la huella de una devolución ya aprobada.
"""
from __future__ import annotations

import asyncio
import base64
from dataclasses import dataclass
from datetime import datetime, timezone
import logging
from uuid import UUID

from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select

from app.modules.calificaciones import breakdown_service
from app.modules.calificaciones.evidence_manifest import EvidenceManifestError, read_manifest
from app.modules.calificaciones.evidence_preparation import resolve_canonical_pages
from app.modules.calificaciones.models import Calificacion, Entrega
from app.services import answer_grid_locator as grid
from app.services.answer_evidence_regions import (
    FRAME,
    GRID_METHOD,
    GRID_VERSION,
    LOCATED_KEY,
    evidence_version,
    grid_located,
    located_answer_regions,
    location_attempts,
)
from app.services.storage_service import resolve_upload_path

logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 2
MAX_PAGES = 6
# El proxy corta una petición a los 60 s; las hojas se ubican a la vez y deben terminar antes.
TIMEOUT_SECONDS = 50
MAX_OUTPUT_TOKENS = 8000
FEATURE = "calificacion.extraccion"

UNAVAILABLE = (
    "La IA no pudo ubicar las preguntas en este momento. No cambió nada; "
    "intenta de nuevo en unos minutos."
)


@dataclass(frozen=True)
class SheetPage:
    number: int
    content: bytes
    version: str


def _is_question(component) -> bool:
    return getattr(component, "tipo", None) == "pregunta"


def pending_keys(breakdown) -> list[str]:
    """Preguntas del desglose vigente que aún no se ubicaron con la cuadrícula."""
    located = located_answer_regions(breakdown.procedencia_json) if grid_located(breakdown.procedencia_json) else {}
    return [
        component.clave
        for component in breakdown.componentes
        if _is_question(component)
        and not any(region.get("metodo") == GRID_METHOD for region in located.get(component.clave, []))
    ]


def question_numbers(components) -> dict[str, str]:
    """Número visible → clave, solo para números que no se repiten."""
    numbers: dict[str, list[str]] = {}
    for component in components:
        if _is_question(component) and str(component.numero or "").strip():
            numbers.setdefault(str(component.numero).strip(), []).append(component.clave)
    return {number: keys[0] for number, keys in numbers.items() if len(keys) == 1}


async def load_pages(delivery: Entrega | None) -> list[SheetPage]:
    """Las mismas páginas, con la misma versión, que muestra el visor del docente."""
    if delivery is None:
        raise HTTPException(409, "Esta calificación no tiene una entrega con foto.")
    try:
        manifest = read_manifest(delivery)
    except EvidenceManifestError as exc:
        raise HTTPException(409, str(exc)) from exc
    if manifest is not None:
        canonical = await resolve_canonical_pages(delivery, manifest)
        version = evidence_version(delivery.id, canonical.fingerprint)
        return [SheetPage(page.number, page.content, version) for page in canonical.pages[:MAX_PAGES]]
    if not delivery.archivo_url:
        raise HTTPException(409, "Esta entrega no tiene foto: las respuestas se escribieron en línea.")
    from app.modules.calificaciones.evidence_service import EvidencePageError, _render_cached_evidence_page

    try:
        path = resolve_upload_path(delivery.archivo_url)
    except ValueError as exc:
        raise HTTPException(404, "Evidencia no encontrada") from exc
    if not path.is_file():
        raise HTTPException(404, "Evidencia no encontrada")
    pages: list[SheetPage] = []
    number, total = 1, 1
    try:
        while number <= min(total, MAX_PAGES):
            rendered, total, fingerprint = await run_in_threadpool(_render_cached_evidence_page, path, number)
            pages.append(SheetPage(number, await run_in_threadpool(rendered.read_bytes), evidence_version(delivery.id, fingerprint)))
            number += 1
    except EvidencePageError as exc:
        raise HTTPException(404 if exc.not_found else 422, exc.detail) from exc
    return pages


async def call_route(snapshot: dict, *, image: bytes, text: str, teacher_id: UUID) -> object:
    """Una llamada a la ruta de visión configurada; prueba la de respaldo si la principal falla."""
    from app.db.session import AsyncSessionLocal
    from app.services.ai_api_connections import call_configured_api
    from app.services.ai_credentials_service import get_teacher_ai_credential, resolve_api_credential

    routes = [route for route in (snapshot.get("primary"), snapshot.get("fallback"))
              if isinstance(route, dict) and route.get("model") and route.get("runtime_profile")
              and "vision" in (route.get("capabilities") or [])]
    if not routes:
        raise RuntimeError("vision_route_not_ready")
    encoded = base64.b64encode(image).decode()
    last: Exception = RuntimeError("vision_route_not_ready")
    for route in routes:
        try:
            async with AsyncSessionLocal() as credential_db:
                if route.get("credential_source") == "teacher":
                    key = await get_teacher_ai_credential(credential_db, teacher_id=teacher_id, provider_id=str(route.get("provider") or ""))
                else:
                    key = await resolve_api_credential(credential_db, route.get("connection") or {})
            payload = await call_configured_api(route, key or "", [{"role": "user", "content": [
                {"type": "text", "text": text},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded}", "detail": "high"}},
            ]}], max_tokens=MAX_OUTPUT_TOKENS, json_mode=True, temperature=0, timeout=TIMEOUT_SECONDS)
            choice = (payload.get("choices") or [{}])[0]
            return (choice.get("message") or {}).get("content")
        except Exception as exc:  # noqa: BLE001 - cada proveedor expone sus excepciones
            last = exc
    raise last


async def locate_page(page: SheetPage, numbers: list[str], *, snapshot: dict, teacher_id: UUID) -> dict[str, list[float]]:
    image, cols, rows = await run_in_threadpool(grid.draw_grid, page.content)
    content = await call_route(snapshot, image=image, text=grid.prompt(cols, rows, numbers), teacher_id=teacher_id)
    return grid.parse_locations(content, cols, rows, numbers)


def located_regions(pages: list[SheetPage], results: list, by_number: dict[str, str]) -> tuple[dict[str, list[dict]], int]:
    """Une los recuadros de cada hoja por clave; cuenta las hojas que fallaron."""
    found: dict[str, list[dict]] = {}
    failed = 0
    for page, result in zip(pages, results):
        if isinstance(result, BaseException):
            failed += 1
            continue
        for number, box in result.items():
            key = by_number.get(number)
            if key:
                found.setdefault(key, []).append({
                    "pagina": page.number, "bbox": box, "marco": FRAME,
                    "evidencia_version": page.version, "metodo": GRID_METHOD,
                })
    return found, failed


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
    by_number = question_numbers(breakdown.componentes)
    if not by_number:
        return summary(breakdown)
    if location_attempts(breakdown.procedencia_json) >= MAX_ATTEMPTS:
        raise HTTPException(
            409,
            "Ya se ubicaron las preguntas de esta hoja dos veces. Si el recuadro no coincide, "
            "revisa la hoja completa.",
        )
    delivery = await db.get(Entrega, grade.entrega_id) if grade.entrega_id else None
    pages = await load_pages(delivery)

    from app.services.ai_configuration_resolver import resolve_ai_configuration

    # Valores sueltos: después del rollback los objetos cargados caducan.
    grade_id, breakdown_id, actor_id = grade.id, breakdown.id, actor.id
    snapshot = await resolve_ai_configuration(db, feature=FEATURE, teacher_id=actor_id)
    numbers = list(by_number)
    # La ubicación tarda segundos: no se sostiene una transacción mientras tanto.
    await db.rollback()
    try:
        async with asyncio.timeout(TIMEOUT_SECONDS):
            results = await asyncio.gather(
                *(locate_page(page, numbers, snapshot=snapshot, teacher_id=actor_id) for page in pages),
                return_exceptions=True,
            )
    except TimeoutError as exc:
        logger.warning("answer_location_timeout")
        raise HTTPException(503, UNAVAILABLE) from exc
    found, failed = located_regions(pages, results, by_number)
    if failed == len(pages):
        # Solo el tipo: nunca la foto, el texto ni la respuesta del proveedor.
        logger.warning("answer_location_failed: %s", type(results[0]).__name__)
        raise HTTPException(503, UNAVAILABLE)

    # Mismo orden de bloqueo que la edición docente: nota y luego desglose.
    await db.execute(select(Calificacion.id).where(Calificacion.id == grade_id).with_for_update())
    active = await breakdown_service.get_active_breakdown(db, grade_id, lock=True)
    if active is None or active.id != breakdown_id:
        await db.rollback()
        raise HTTPException(
            409,
            "La calificación cambió mientras se ubicaban las preguntas. Recarga y vuelve a intentarlo.",
        )
    provenance = dict(active.procedencia_json or {})
    previous = located_answer_regions(provenance)
    if not grid_located(provenance):
        # Las zonas de la Spec 175 se conservan solo donde la cuadrícula no encontró la pregunta.
        previous = {key: value for key, value in previous.items() if key not in found}
    provenance[LOCATED_KEY] = {
        "version": GRID_VERSION,
        "metodo": GRID_METHOD,
        "intentos": location_attempts(active.procedencia_json) + 1,
        "regiones": {**previous, **found},
        "ubicado_en": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "actor_id": str(actor_id),
    }
    active.procedencia_json = provenance
    result = summary(active, new=len(found))
    await db.commit()
    return result
