"""Servicio de presentaciones de XCalificator.

XCalificator genera el contenido, las imagenes y los archivos descargables.
La vista previa, las imagenes y los archivos se producen desde una fuente canonica unica.
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.session import AsyncSessionLocal
from app.modules.materias import service as materias_service
from app.modules.matriculas.models import Matricula
from app.modules.presentaciones.models import Presentacion
from app.modules.presentaciones.normalizer import normalize_presentation
from app.modules.presentaciones.cleanup_service import cleanup_presentation_exports
from app.modules.presentaciones.editable_pptx_service import build_editable_pptx
from app.modules.presentaciones.local_export import (
    build_local_export,
    extract_slides_for_export,
    pptx_has_slides_and_media,
    render_slide_png,
)
from app.modules.presentaciones.presentation_schema import (
    build_canonical_from_legacy,
    canonical_to_legacy_slides,
    normalize_to_canonical,
)
from app.modules.presentaciones.assets_service import (
    ExportFormat,
    generate_ai_slide_image_detailed,
    get_export_file_path,
    save_export_file,
)
from app.modules.presentaciones.image_prompts import build_presentation_image_prompt
from app.modules.jobs import service as jobs_service
from app.modules.ollama_connector.service import (
    LocalInferenceFailed,
    LocalInferencePending,
    request_local_inference,
)
from app.modules.presentaciones.schemas import PresentacionCreate
from app.shared.enums import JobEstado, JobTipo
from app.modules.imagenes import service as imagenes_service
from app.modules.users.models import User
from app.services.llm_router import LLMRouter
from app.shared.enums import (
    ImageProvider,
    MatriculaEstado,
    PresentacionEstado,
    UserRole,
)

logger = get_logger(__name__)

SLIDES_PROMPT = """Eres un disenador instruccional experto en educacion escolar colombiana.
Disena una presentacion de clase clara, visual, editable cuando convenga y pedagogicamente estructurada.

CONTEXTO
- Tema: {tema}
- Materia: {materia}
- Area: {area}
- Grado: {grado}
- Contexto de la materia: {contexto_materia}
- Titulo: {titulo}
- Nivel: {nivel}
- Tono: {tono}
- Cantidad de diapositivas: {cantidad}
- Instrucciones adicionales: {instrucciones}

OBJETIVO
Genera EXACTAMENTE {cantidad} slides. Cada slide debe indicar su funcion educativa, mensaje central,
contenido visible, necesidad visual, tipo de layout, texto esperado en imagen y notas para el docente.

ROLES PERMITIDOS
cover, objective, prior_knowledge, concept, explanation, example, process, comparison,
activity, comprehension_check, assessment, summary, closing.

ESTRUCTURA PEDAGOGICA POR CANTIDAD
- 3 a 5 slides: cover; objective o prior_knowledge; concept o explanation; example o activity; summary o closing.
- 6 a 8 slides: cover; objective; prior_knowledge; concept; explanation o example; activity; comprehension_check; summary o closing.
- 9 a 12 slides: portada; objetivo; activacion previa; explicacion progresiva; conceptos; dos o mas ejemplos; proceso o comparacion; actividad; comprobacion; resumen; cierre.
- 13 a 16 slides: amplia profundidad, divide procesos complejos, incluye practica guiada y autonoma, evita repetir contenido, cierra con comprobacion y resumen.

ADAPTACION POR AREA
- Matematicas: concepto, procedimiento paso a paso, ejemplo resuelto, practica, comprobacion.
- En Matematicas, toda operacion, cantidad exacta, arreglo de objetos, grafica con valores o procedimiento
  debe ir en una slide EDITABLE como texto o elementos verificables. Nunca delegues cantidades exactas,
  formulas, grupos de puntos ni arreglos rectangulares a una imagen generativa.
- Ciencias: concepto, proceso, fenomeno observable, aplicacion, cuidado o seguridad cuando aplique.
- Lenguaje: definicion, ejemplo, comprension, produccion, actividad.
- Sociales: contexto, causas, consecuencias, comparacion, reflexion.
- Tecnologia: funcionamiento, componentes, proceso, aplicacion, seguridad.
Usa vocabulario adecuado al grado y ejemplos cotidianos; usa contexto colombiano cuando aporte valor.

POLITICA EDITABLE VS FULL_IMAGE
- Usa full_image preferentemente para cover, concept, explanation visual, example visual, process, comparison, summary visual y closing.
- Usa editable preferentemente para objective, prior_knowledge, activity, comprehension_check, assessment, instrucciones, preguntas y ejercicios.
- Decide usando role, layout_hint, valor visual, cantidad de texto y necesidad de edicion. La posicion solo es secundaria.
- Una slide intermedia puede ser full_image. La ultima puede ser editable si es activity, comprehension_check, assessment o ejercicio.
- Si una slide de Matematicas contiene numeros, operaciones, equivalencias, medidas o conteos exactos,
  usa layout_hint "editable" e image_text_expected []. La exactitud matematica nunca depende de la imagen IA.

REGLAS DE CONTENIDO
- Cada title: maximo 7 palabras.
- key_message: maximo 14 palabras.
- Cada slide de contenido: 2 a 4 bullets, frases completas de 8 a 16 palabras.
- Full_image debe tener visual_concept, image_text_expected, title, notes y tags.
- image_text_expected debe contener entre 2 y 4 bloques de texto y maximo aproximado de 45 palabras visibles.
- No uses parrafos largos, tablas densas, rubricas, texto pequeno, formulas complejas ni LaTeX.
- Para slides editables, deja image_text_expected como [].
- "image" puede repetirse como alias legacy de visual_concept para compatibilidad.

CALIDAD PEDAGOGICA OBLIGATORIA
- Escribe contenido que el estudiante pueda aprender directamente, no instrucciones para fabricar la clase.
- Cada slide de contenido debe incluir hechos, definiciones, clasificaciones, procesos o ejemplos especificos del tema.
- Los titulos deben anticipar una idea concreta; evita titulos vacios como "Conceptos clave" o "Actividad".
- El ejemplo debe estar resuelto o explicado. La actividad debe indicar una accion y un producto observable.
- La comprobacion debe contener una pregunta que pueda responderse con lo enseñado en las slides anteriores.
- No repitas el mismo key_message entre slides.
- Cada diapositiva debe responder una pregunta de aprendizaje diferente y agregar conocimiento nuevo.
- Un concepto define que es y que lo distingue; una explicacion responde como o por que ocurre.
- Un ejemplo presenta un caso concreto y muestra el razonamiento, no solo menciona que existe.
- Un proceso ordena pasos y explica que se comprueba en cada uno; una comparacion usa criterios explicitos.
- Ningun bullet puede limitarse a reformular el titulo o el mensaje central.
- No reutilices el mismo ejemplo, analogia o situacion cotidiana en dos diapositivas.
- Prohibido usar frases genericas como "reconocer el tema central", "conectar con situaciones conocidas",
  "comprender que se espera aprender", "relacionar el tema con la clase", "identificar vocabulario esencial",
  "registrar evidencias y dudas" o "ajusta ejemplos al contexto".
- Las notas del docente pueden orientar la clase, pero los bullets visibles siempre deben contener conocimiento util.

ESQUEMA JSON OBLIGATORIO:
{{
  "title": "Titulo general",
  "slides": [
    {{
      "role": "concept",
      "title": "La ley de la inercia",
      "key_message": "Los cuerpos mantienen su estado si ninguna fuerza lo cambia.",
      "bullets": [
        "Un objeto quieto permanece quieto.",
        "Un objeto en movimiento continua avanzando."
      ],
      "example": "Cuando un autobus frena, el cuerpo continua hacia adelante.",
      "activity": "",
      "question": "",
      "visual_concept": "Autobus frenando, pasajeros inclinandose y flechas simples de movimiento.",
      "layout_hint": "full_image",
      "image_text_expected": [
        "LA LEY DE LA INERCIA",
        "Un objeto quieto permanece quieto",
        "Un objeto en movimiento continua avanzando",
        "Al frenar, el cuerpo sigue hacia adelante"
      ],
      "image": "Autobus frenando, pasajeros inclinandose y flechas simples de movimiento.",
      "notes": "Relaciona el concepto con situaciones cotidianas de transporte.",
      "tags": ["fisica", "newton", "inercia"]
    }}
  ]
}}

Devuelve SOLO JSON valido. No incluyas texto fuera del JSON."""

SLIDES_REVIEW_PROMPT = """Eres el revisor final de una presentacion escolar.
Audita y corrige el borrador antes de mostrarlo a estudiantes.

CONTEXTO
- Tema: {tema}
- Area: {area}
- Grado: {grado}
- Cantidad exacta: {cantidad}

REVISION OBLIGATORIA
- Corrige todo error conceptual, matematico, factual o de lenguaje.
- Verifica cada igualdad, ejemplo, definicion, clasificacion y respuesta.
- No afirmes que dos fracciones equivalentes requieren el mismo numerador o denominador.
- Conserva EXACTAMENTE {cantidad} slides y el mismo esquema JSON.
- Mantiene 2 a 4 bullets completos de 8 a 16 palabras en cada slide de contenido.
- Elimina instrucciones genericas; cada bullet debe ensenar contenido del tema.
- Compara las diapositivas entre si y reescribe ideas equivalentes aunque usen palabras distintas.
- Comprueba que concepto, explicacion y ejemplo cumplan funciones diferentes y progresivas.
- Reemplaza resúmenes prematuros por definiciones, mecanismos, criterios o casos concretos.
- No agregues informacion incierta. Si una frase es ambigua, reemplazala por una verificable.
- Devuelve el arreglo completo corregido, no una lista de observaciones.

BORRADOR
{draft}

Devuelve SOLO JSON valido con la forma {{"slides": [...]}}."""


GENERIC_PRESENTATION_MARKERS = (
    "reconocer el tema central",
    "conectar con situaciones conocidas",
    "comprender que se espera aprender",
    "relacionar el tema con la clase",
    "recordar ideas que ya conocemos",
    "plantear preguntas iniciales",
    "identificar vocabulario esencial",
    "registrar evidencias y dudas",
    "ajusta ejemplos al contexto",
)

PRESENTATION_STOPWORDS = {
    "para", "como", "sobre", "entre", "desde", "hasta", "este", "esta", "estos",
    "estas", "cada", "tambien", "puede", "pueden", "porque", "cuando", "donde",
    "mediante", "usando", "tema", "clase", "ejemplo", "concepto", "aprendizaje",
}


PEDAGOGICAL_ROLES = {
    "cover",
    "objective",
    "prior_knowledge",
    "concept",
    "explanation",
    "example",
    "process",
    "comparison",
    "activity",
    "comprehension_check",
    "assessment",
    "summary",
    "closing",
}
EDITABLE_ROLES = {
    "objective",
    "prior_knowledge",
    "activity",
    "comprehension_check",
    "assessment",
}
FULL_IMAGE_ROLES = {
    "cover",
    "concept",
    "explanation",
    "example",
    "process",
    "comparison",
    "summary",
    "closing",
}
LAYOUT_HINTS = {"editable", "full_image", "cover", "support"}


def _is_admin(user: User) -> bool:
    return user.rol == UserRole.ADMIN.value


async def _resolve_presentacion_context(
    db: AsyncSession, payload: PresentacionCreate, current_user: User
) -> tuple[UUID, PresentacionCreate]:
    if payload.materia_id:
        materia = await materias_service.ensure_can_manage_materia(
            db, payload.materia_id, current_user
        )
        enriched = payload.model_copy(
            update={
                "materia_nombre": materia.nombre,
                "area": payload.area or materia.area,
                "grado": payload.grado or materia.grado,
                "contexto_materia": materia.descripcion or payload.contexto_materia,
            }
        )
        return materia.profesor_id, enriched
    return current_user.id, payload


async def create_presentacion(
    db: AsyncSession,
    payload: PresentacionCreate,
    current_user: User,
) -> Presentacion:
    profesor_id, payload = await _resolve_presentacion_context(
        db, payload, current_user
    )
    input_data = payload.model_dump(mode="json")
    ai_config: dict = {}
    try:
        from app.services.ai_configuration_resolver import resolve_ai_configuration

        ai_config = await resolve_ai_configuration(
            db, feature="presentaciones", teacher_id=profesor_id
        )
    except Exception as exc:
        logger.warning(
            "Presentation AI snapshot unavailable; using institutional route: %s",
            type(exc).__name__,
        )
    slides_json = {
        "input": input_data,
        "slides": [],
        "title": payload.titulo,
        "publicada": False,
        "_ai_config": ai_config,
    }
    slides_json["canonical"] = normalize_to_canonical(slides_json, input_data)
    pres = Presentacion(
        profesor_id=profesor_id,
        materia_id=payload.materia_id,
        titulo=payload.titulo,
        estado=PresentacionEstado.QUEUED.value,
        slides_json=slides_json,
    )
    db.add(pres)
    await db.flush()
    await jobs_service.create_job(
        db,
        user_id=profesor_id,
        tipo=JobTipo.PRESENTACION.value,
        input_json={"presentacion_id": str(pres.id)},
        job_id=pres.id,
    )
    await db.commit()
    await db.refresh(pres)
    return pres


async def generate_presentacion_assets(presentacion_id: UUID) -> str:
    async with AsyncSessionLocal() as db:
        pres = await get_presentacion_or_404(db, presentacion_id)
        try:
            state = await jobs_service.get_job_state(db, presentacion_id)
            if state in {JobEstado.SUCCESS.value, JobEstado.FAILED.value}:
                return state
            await jobs_service.mark_job_running(db, presentacion_id)
            await db.commit()
            await _run_generation(db, pres)
            await jobs_service.finish_job(
                db,
                presentacion_id,
                estado=JobEstado.SUCCESS.value,
                resultado_json={
                    "status": JobEstado.SUCCESS.value,
                    "presentacion_id": str(presentacion_id),
                },
            )
            await db.commit()
            return JobEstado.SUCCESS.value
        except LocalInferencePending:
            pres.estado = PresentacionEstado.RUNNING.value
            pres.error = None
            pres.slides_json = _with_canonical_generation(
                pres,
                estado=PresentacionEstado.RUNNING.value,
                etapa="esperando_ollama_local",
                progreso=25,
                mensaje="Esperando el resultado de Ollama en tu computador.",
                error_amigable=None,
            )
            await db.commit()
            return "waiting_connector"
        except Exception as exc:  # noqa: BLE001
            logger.exception("Presentation generation failed for %s", presentacion_id)
            pres.estado = PresentacionEstado.FAILED.value
            pres.error = str(exc)[:500]
            pres.slides_json = _with_canonical_generation(
                pres,
                estado=PresentacionEstado.FAILED.value,
                etapa="error",
                progreso=0,
                mensaje=None,
                error_amigable="No se pudo generar la presentacion.",
            )
            await jobs_service.finish_job(
                db,
                presentacion_id,
                estado=JobEstado.FAILED.value,
                resultado_json={
                    "status": JobEstado.FAILED.value,
                    "presentacion_id": str(presentacion_id),
                },
                error=str(exc),
            )
            await db.commit()
            return JobEstado.FAILED.value


async def _run_generation(db: AsyncSession, pres: Presentacion) -> None:
    payload = _payload_from_presentacion(pres)
    pres.estado = PresentacionEstado.RUNNING.value
    pres.error = None
    pres.slides_json = _with_canonical_generation(
        pres,
        estado=PresentacionEstado.RUNNING.value,
        etapa="generacion",
        progreso=20,
        mensaje="Generando contenido de la presentacion.",
        error_amigable=None,
    )
    await db.commit()

    stored_snapshot = (pres.slides_json or {}).get("_ai_config")
    ai_config = stored_snapshot if isinstance(stored_snapshot, dict) else None
    slides_normalized = await _generate_slides(
        payload,
        pres.profesor_id,
        ai_config=ai_config,
        source_job_id=pres.id,
    )
    await _attach_slide_images(
        db, pres, slides_normalized, payload, ai_config=ai_config
    )
    for slide in slides_normalized:
        slide.pop("_legacy_layout_fallback", None)
    legacy_data = {
        **(pres.slides_json or {}),
        "title": payload.titulo,
        "slides": slides_normalized,
        "publicada": bool((pres.slides_json or {}).get("publicada")),
    }
    legacy_data.pop("canonical", None)
    legacy_data["canonical"] = _canonical_for_presentacion(
        pres,
        legacy_data,
        estado=PresentacionEstado.RUNNING.value,
        etapa="exportacion",
        progreso=70,
        mensaje="Preparando archivos descargables.",
        error_amigable=None,
    )
    pres.slides_json = legacy_data
    await db.commit()

    await _store_local_export_result(db, pres, "pptx")
    await _store_local_export_result(db, pres, "pdf")
    pres.estado = PresentacionEstado.SUCCESS.value
    pres.error = None
    pres.slides_json = _with_canonical_generation(
        pres,
        estado=PresentacionEstado.SUCCESS.value,
        etapa="finalizado",
        progreso=100,
        mensaje="Presentacion generada correctamente.",
        error_amigable=None,
    )
    await db.commit()


class _PresentationLLM:
    """Presentation-only adapter; it never receives student evidence."""

    def __init__(
        self,
        *,
        profesor_id: UUID,
        source_job_id: UUID | None,
        ai_config: dict | None,
    ) -> None:
        self.profesor_id = profesor_id
        self.source_job_id = source_job_id
        self.ai_config = dict(ai_config) if ai_config else {}
        self.primary = self.ai_config.get("primary") or {}
        self.call_index = 0
        self.router = LLMRouter(user_id=profesor_id, ai_config=ai_config)

    async def generate_json(self, task_type: str, prompt: str) -> dict:
        if self.primary.get("provider") != "ollama_local":
            return await self.router.generate_json(task_type, prompt)
        if self.source_job_id is None:
            raise RuntimeError("La presentación local no tiene un trabajo persistente")

        model = str(self.primary.get("model") or "").strip()
        if not model:
            raise RuntimeError("No hay un modelo local seleccionado para presentaciones")
        self.call_index += 1
        try:
            async with AsyncSessionLocal() as local_db:
                response = await request_local_inference(
                    local_db,
                    profesor_id=self.profesor_id,
                    source_job_id=self.source_job_id,
                    stage=f"presentacion:{self.call_index}",
                    feature=task_type,
                    model_id=model,
                    payload={
                        "operation": "chat",
                        "messages": [{"role": "user", "content": prompt}],
                        "format": "json",
                    },
                )
        except LocalInferenceFailed:
            fallback = self.ai_config.get("fallback") or {}
            if fallback.get("credential_source") != "institutional":
                raise
            fallback_snapshot = {
                **self.ai_config,
                "primary": fallback,
                "fallback": None,
            }
            return await LLMRouter(
                user_id=self.profesor_id,
                ai_config=fallback_snapshot,
            ).generate_json(task_type, prompt)

        message = response.get("message") or {}
        raw = str(message.get("content") or response.get("response") or "")
        return LLMRouter._parse_json(raw, task_type)


async def _generate_slides(
    payload: PresentacionCreate,
    profesor_id: UUID,
    *,
    ai_config: dict | None = None,
    source_job_id: UUID | None = None,
) -> list[dict]:
    llm = _PresentationLLM(
        profesor_id=profesor_id,
        source_job_id=source_job_id,
        ai_config=ai_config,
    )
    base_prompt = SLIDES_PROMPT.format(
        tema=payload.tema,
        materia=payload.materia_nombre or "General",
        area=payload.area or "",
        grado=payload.grado or "",
        contexto_materia=payload.contexto_materia or "sin contexto adicional",
        titulo=payload.titulo,
        nivel=getattr(payload, "nivel", "primaria"),
        tono=getattr(payload, "tono", "divulgativo"),
        cantidad=payload.cantidad_slides,
        instrucciones=payload.instrucciones or "ninguna",
    )
    prompt = base_prompt
    last_issues = ["La IA no devolvio una lista de diapositivas."]
    best_candidate: list[dict] = []
    best_score: tuple[int, int] | None = None
    for attempt in range(1, 4):
        raw = await llm.generate_json("presentacion", prompt)
        if isinstance(raw, dict):
            slides_raw: Any = raw.get("slides", [])
        elif isinstance(raw, list):
            slides_raw = raw
        else:
            slides_raw = []
        if isinstance(slides_raw, list) and slides_raw:
            polished = _polish_slides_for_export(
                normalize_presentation(slides_raw), topic=payload.tema
            )
            candidate = _apply_pedagogical_slide_defaults(polished, payload)
            last_issues = _presentation_quality_issues(candidate, payload)
            score = (abs(len(candidate) - payload.cantidad_slides), len(last_issues))
            if best_score is None or score < best_score:
                best_candidate = candidate
                best_score = score
            if not last_issues:
                return await _review_slides_for_accuracy(llm, candidate, payload)
        else:
            candidate = []
            last_issues = ["La respuesta no contiene el arreglo slides."]
        logger.warning(
            "Presentation content rejected on attempt %d: %s",
            attempt,
            "; ".join(last_issues[:8]),
        )
        previous = json.dumps(candidate, ensure_ascii=False)[:9000]
        prompt = (
            base_prompt
            + "\n\nCORRECCION OBLIGATORIA\n"
            + "El borrador anterior fue rechazado por estas razones:\n- "
            + "\n- ".join(last_issues[:12])
            + "\nReescribe TODA la presentacion, conserva la cantidad exacta y devuelve solo JSON."
            + (f"\nBORRADOR RECHAZADO:\n{previous}" if previous else "")
        )
    if best_candidate:
        repaired = _repair_incomplete_presentation(best_candidate, payload)
        repair_issues = _presentation_quality_issues(repaired, payload)
        if not repair_issues:
            logger.warning(
                "Presentation content required deterministic completion after provider retries: %s",
                "; ".join(last_issues[:8]),
            )
            return await _review_slides_for_accuracy(llm, repaired, payload)
        last_issues = repair_issues

    raise RuntimeError(
        "La IA no produjo contenido pedagogico suficientemente completo: "
        + "; ".join(last_issues[:5])
    )


async def _review_slides_for_accuracy(
    llm: _PresentationLLM,
    slides: list[dict],
    payload: PresentacionCreate,
) -> list[dict]:
    """Run one final factual pass without making availability depend on it."""
    prompt = SLIDES_REVIEW_PROMPT.format(
        tema=payload.tema,
        area=payload.area or payload.materia_nombre or "General",
        grado=payload.grado or payload.nivel or "",
        cantidad=payload.cantidad_slides,
        draft=json.dumps({"slides": slides}, ensure_ascii=False),
    )
    try:
        raw = await llm.generate_json("presentacion", prompt)
    except LocalInferencePending:
        raise
    except Exception:  # noqa: BLE001
        logger.exception("Presentation factual review provider failed")
        return slides

    if isinstance(raw, dict):
        reviewed_raw: Any = raw.get("slides", [])
    elif isinstance(raw, list):
        reviewed_raw = raw
    else:
        reviewed_raw = []
    if not isinstance(reviewed_raw, list) or not reviewed_raw:
        logger.warning("Presentation factual review returned no slides")
        return slides

    reviewed = _apply_pedagogical_slide_defaults(
        _polish_slides_for_export(
            normalize_presentation(reviewed_raw),
            topic=payload.tema,
        ),
        payload,
    )
    issues = _presentation_quality_issues(reviewed, payload)
    if issues:
        logger.warning(
            "Presentation factual review rejected: %s", "; ".join(issues[:8])
        )
        return slides
    return reviewed


def _contains_generic_marker(value: Any) -> bool:
    normalized = " ".join(str(value or "").lower().split())
    return any(marker in normalized for marker in GENERIC_PRESENTATION_MARKERS)


def _semantic_tokens(value: Any, *, topic: str = "") -> set[str]:
    def stem(token: str) -> str:
        for suffix in ("amientos", "imiento", "aciones", "mente", "ando", "iendo", "ados", "adas", "idos", "idas", "aron", "ieron", "es", "s"):
            if token.endswith(suffix) and len(token) - len(suffix) >= 4:
                return token[:-len(suffix)]
        return token

    tokens = {stem(token) for token in re.findall(r"[a-záéíóúñü]{4,}", str(value or "").lower())}
    topic_tokens = {stem(token) for token in re.findall(r"[a-záéíóúñü]{4,}", str(topic or "").lower())}
    return tokens - PRESENTATION_STOPWORDS - topic_tokens


def _semantic_overlap(left: Any, right: Any, *, topic: str = "") -> float:
    left_tokens = _semantic_tokens(left, topic=topic)
    right_tokens = _semantic_tokens(right, topic=topic)
    if min(len(left_tokens), len(right_tokens)) < 5:
        return 0.0
    return len(left_tokens & right_tokens) / min(len(left_tokens), len(right_tokens))


def _repair_role_bullets(
    role: str,
    *,
    topic: str,
    area: str,
    grade: str,
) -> list[str]:
    context = f"en {area}" if area else "en esta clase"
    templates = {
        "objective": [
            f"Al finalizar, podras explicar {topic} con vocabulario claro y preciso.",
            f"Tambien podras aplicar la idea en un ejemplo adecuado para el grado {grade}.",
        ],
        "prior_knowledge": [
            f"Relaciona {topic} con conocimientos que utilizaste en clases anteriores.",
            "Escribe una prediccion inicial y comparala con la explicacion de la clase.",
        ],
        "example": [
            f"Observa un caso concreto de {topic} y reconoce cada elemento importante.",
            "Sigue la explicacion del ejemplo antes de resolver una situacion semejante.",
        ],
        "process": [
            f"Organiza el procedimiento de {topic} en pasos pequenos y verificables.",
            "Comprueba cada paso antes de avanzar para detectar errores a tiempo.",
        ],
        "comparison": [
            f"Compara dos representaciones de {topic} e identifica sus semejanzas principales.",
            "Explica una diferencia usando evidencia visible en los ejemplos presentados.",
        ],
        "activity": [
            f"Resuelve en equipo una situacion breve relacionada con {topic}.",
            "Registra el procedimiento y prepara una explicacion para compartir con el grupo.",
        ],
        "comprehension_check": [
            f"Explica con tus palabras la idea principal de {topic}.",
            "Justifica tu respuesta usando un ejemplo trabajado durante la presentacion.",
        ],
        "assessment": [
            f"Aplica lo aprendido sobre {topic} en una situacion nueva.",
            "Muestra el procedimiento y revisa la respuesta antes de entregarla.",
        ],
        "summary": [
            f"Resume las ideas esenciales de {topic} usando palabras propias.",
            "Relaciona el concepto, el ejemplo y la actividad desarrollada durante la clase.",
        ],
        "closing": [
            f"Selecciona el aprendizaje mas importante sobre {topic} y explicalo brevemente.",
            "Propone una situacion cotidiana donde puedas volver a aplicar esta idea.",
        ],
    }
    return templates.get(
        role,
        [
            f"Estudia {topic} mediante una explicacion concreta y progresiva {context}.",
            "Usa el ejemplo visible para reconocer elementos, relaciones y aplicaciones principales.",
        ],
    )


def _repair_incomplete_presentation(
    slides: list[dict],
    payload: PresentacionCreate,
) -> list[dict]:
    count = payload.cantidad_slides
    repaired = [dict(slide) for slide in slides[:count]]
    while len(repaired) < count:
        repaired.append({"title": "", "bullets": [], "role": "concept"})
    repaired = _apply_pedagogical_slide_defaults(repaired, payload)

    topic = str(payload.tema or payload.titulo).strip()
    area = str(payload.area or payload.materia_nombre or "").strip()
    grade = str(payload.grado or payload.nivel or "").strip()
    seen_messages: set[str] = set()

    for index, slide in enumerate(repaired):
        role = _normalize_role(
            slide.get("role"), index=index, title=str(slide.get("title") or "")
        )
        slide["role"] = role
        title = str(slide.get("title") or "").strip()
        if not title or _contains_generic_marker(title):
            slide["title"] = _clip_text(f"{topic}: paso {index + 1}", 52)

        bullets = [
            bullet
            for bullet in _clean_text_list(
                slide.get("bullets"), max_items=4, max_chars=160
            )
            if not _contains_generic_marker(bullet)
        ]
        for fallback in _repair_role_bullets(role, topic=topic, area=area, grade=grade):
            if len(bullets) >= 2 and _visible_words(bullets) >= 14:
                break
            if fallback.lower() not in {item.lower() for item in bullets}:
                bullets.append(_clip_text(fallback, 160))
        slide["bullets"] = bullets

        message = str(slide.get("key_message") or "").strip()
        normalized_message = " ".join(message.lower().split())
        if (
            not message
            or _contains_generic_marker(message)
            or normalized_message in seen_messages
        ):
            message = _clip_text(
                f"{topic}: {slide.get('title') or f'idea {index + 1}'}",
                110,
            )
            normalized_message = " ".join(message.lower().split())
        slide["key_message"] = message
        seen_messages.add(normalized_message)

        if role == "activity" and (
            not str(slide.get("activity") or "").strip()
            or _contains_generic_marker(slide.get("activity"))
        ):
            slide["activity"] = (
                f"Resuelve un ejemplo de {topic} y explica el procedimiento al grupo."
            )
        if role in {"comprehension_check", "assessment"} and (
            not str(slide.get("question") or "").strip()
            or _contains_generic_marker(slide.get("question"))
        ):
            slide["question"] = f"Como aplicarias {topic} en una situacion diferente?"

    return _merge_structured_content_into_bullets(repaired)


def _presentation_quality_issues(
    slides: list[dict], payload: PresentacionCreate
) -> list[str]:
    issues: list[str] = []
    if len(slides) != payload.cantidad_slides:
        issues.append(
            f"Se esperaban {payload.cantidad_slides} diapositivas y llegaron {len(slides)}."
        )
    messages: dict[str, int] = {}
    repeated_statements: dict[str, int] = {}
    instructional_content: list[tuple[int, str]] = []
    for index, slide in enumerate(slides):
        role = str(slide.get("role") or "concept")
        bullets = _clean_text_list(slide.get("bullets"), max_items=4, max_chars=160)
        visible = (
            " ".join(
                str(slide.get(field) or "")
                for field in ("title", "key_message", "example", "activity", "question")
            )
            + " "
            + " ".join(bullets)
        )
        normalized = " ".join(visible.lower().split())
        if role != "cover" and len(bullets) < 2:
            issues.append(
                f"La diapositiva {index + 1} tiene menos de dos ideas visibles."
            )
        if role != "cover" and len(normalized.split()) < 16:
            issues.append(
                f"La diapositiva {index + 1} no desarrolla contenido suficiente."
            )
        for marker in GENERIC_PRESENTATION_MARKERS:
            if marker in normalized:
                issues.append(
                    f"La diapositiva {index + 1} usa contenido generico: {marker}."
                )
                break
        if role == "activity" and not str(slide.get("activity") or "").strip():
            issues.append(
                f"La diapositiva {index + 1} no define una actividad concreta."
            )
        if (
            role in {"comprehension_check", "assessment"}
            and not str(slide.get("question") or "").strip()
        ):
            issues.append(
                f"La diapositiva {index + 1} no incluye una pregunta comprobable."
            )
        message = " ".join(str(slide.get("key_message") or "").lower().split())
        if message:
            messages[message] = messages.get(message, 0) + 1
        if role in {"concept", "explanation", "example", "process", "comparison"}:
            instructional_content.append((index, visible))
        for bullet in bullets:
            statement = " ".join(re.findall(r"[a-záéíóúñü0-9]+", bullet.lower()))
            if len(statement.split()) >= 6:
                repeated_statements[statement] = repeated_statements.get(statement, 0) + 1
    if any(count > max(2, len(slides) // 3) for count in messages.values()):
        issues.append("El mismo mensaje central se repite en demasiadas diapositivas.")
    if any(count > 1 for count in repeated_statements.values()):
        issues.append("Una misma explicación visible se repite en varias diapositivas.")
    for position, (left_index, left_content) in enumerate(instructional_content):
        for right_index, right_content in instructional_content[position + 1:]:
            if _semantic_overlap(left_content, right_content, topic=payload.tema) >= 0.55:
                issues.append(
                    f"Las diapositivas {left_index + 1} y {right_index + 1} repiten casi la misma explicación."
                )
                break
    return issues[:20]


def _eligible_image_indices(n: int, densidad: str) -> set[int]:
    """Qué slides reciben imagen IA según densidad (ahorro de costo)."""
    if n <= 0:
        return set()
    if densidad == "alta":
        return set(range(n))
    if densidad == "baja":
        return set(range(0, n, 3))
    return set(range(0, n, 2))  # media (default)


SLIDE_IMAGE_SIZE = "1536x1024"


def _full_image_index(slides: list[dict]) -> int | None:
    """Fallback legacy: la ultima slide se trataba como infografia."""
    return len(slides) - 1 if len(slides) >= 3 else None


def _normalize_role(value: Any, *, index: int, title: str = "") -> str:
    role = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if role in PEDAGOGICAL_ROLES:
        return role
    text = title.lower()
    if index == 0:
        return "cover"
    if "objetivo" in text or "proposito" in text or "propósito" in text:
        return "objective"
    if "previo" in text or "saberes" in text:
        return "prior_knowledge"
    if "actividad" in text or "experimento" in text or "practica" in text:
        return "activity"
    if "pregunta" in text or "verificacion" in text or "comprobacion" in text:
        return "comprehension_check"
    if "evaluacion" in text or "assessment" in text:
        return "assessment"
    if "ejemplo" in text:
        return "example"
    if "proceso" in text or "paso" in text:
        return "process"
    if "compar" in text:
        return "comparison"
    if "resumen" in text:
        return "summary"
    if "cierre" in text or "repaso" in text:
        return "closing"
    return "concept"


def _normalize_layout_hint(value: Any, *, role: str, index: int, legacy: bool) -> str:
    hint = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if hint in LAYOUT_HINTS:
        return "full_image" if hint == "cover" and role != "cover" else hint
    if legacy:
        return "cover" if index == 0 else "support"
    if role in EDITABLE_ROLES:
        return "editable"
    if role in FULL_IMAGE_ROLES:
        return "full_image"
    return "support"


def _clean_text_list(
    value: Any, *, max_items: int = 8, max_chars: int = 90
) -> list[str]:
    if not isinstance(value, list):
        value = [value] if value else []
    cleaned: list[str] = []
    for item in value:
        text = _clip_text(str(item), max_chars).strip()
        if text and text != "None":
            cleaned.append(text)
        if len(cleaned) >= max_items:
            break
    return cleaned


def _visible_words(lines: list[str]) -> int:
    return sum(len(str(line).split()) for line in lines)


_EXACT_MATH_PATTERN = re.compile(
    r"(?:\d+(?:[.,]\d+)?\s*(?:=|[+\-*/]|x)\s*(?:\d+(?:[.,]\d+)?|\?))"
    r"|(?:\?\s*(?:=|[+\-*/]|x)\s*\?)",
    re.IGNORECASE,
)
_MATH_CONTEXT_MARKERS = (
    "matematic",
    "aritmetic",
    "algebra",
    "geometr",
    "calculo",
    "factor",
    "multiplica",
    "division",
    "fraccion",
    "decimal",
    "ecuacion",
)


def _slide_has_exact_math_content(
    slide: dict,
    *,
    area: str | None = None,
    topic: str | None = None,
) -> bool:
    """Evita usar imagen generativa como fuente de verdad matematica.

    Los modelos de imagen pueden dibujar cinco objetos cuando el texto pide
    seis. Las operaciones y cantidades exactas se mantienen en layouts
    editables, donde el contenido visible procede del texto validado.
    """
    bullets = slide.get("bullets") if isinstance(slide.get("bullets"), list) else []
    tags = slide.get("tags") if isinstance(slide.get("tags"), list) else []
    content = " ".join(
        str(value or "")
        for value in [
            area,
            topic,
            slide.get("title"),
            slide.get("key_message"),
            slide.get("example"),
            slide.get("activity"),
            slide.get("question"),
            *bullets,
            *tags,
        ]
    ).lower()
    if not any(marker in content for marker in _MATH_CONTEXT_MARKERS):
        return False
    normalized_content = content.replace(chr(0x00D7), "x").replace(chr(0x00F7), "/")
    return bool(_EXACT_MATH_PATTERN.search(normalized_content))


def _default_image_text(slide: dict, *, role: str) -> list[str]:
    title = str(slide.get("title") or "").strip()
    key_message = str(slide.get("key_message") or "").strip()
    bullets = slide.get("bullets") if isinstance(slide.get("bullets"), list) else []
    lines: list[str] = []
    if title:
        lines.append(_clip_text(title, 42).upper())
    if key_message:
        lines.append(_clip_text(key_message, 72))
    for bullet in bullets:
        if len(lines) >= 4:
            break
        text = str(bullet).strip()
        if text:
            lines.append(_clip_text(text, 72))
    if role == "cover" and len(lines) > 2:
        lines = lines[:2]
    return lines[:4]


def _default_tags(payload: PresentacionCreate, slide: dict, role: str) -> list[str]:
    raw = slide.get("tags") if isinstance(slide.get("tags"), list) else []
    tags = _clean_text_list(raw, max_items=6, max_chars=28)
    for candidate in (payload.area, payload.grado, payload.tema, role):
        text = str(candidate or "").strip().lower()
        if text and text not in tags:
            tags.append(text)
    return tags[:6]


def _apply_pedagogical_slide_defaults(
    slides: list[dict], payload: PresentacionCreate
) -> list[dict]:
    normalized: list[dict] = []
    for index, slide in enumerate(slides):
        legacy = not any(
            slide.get(key)
            for key in ("role", "layout_hint", "visual_concept", "key_message")
        )
        role = _normalize_role(
            slide.get("role"), index=index, title=str(slide.get("title") or "")
        )
        layout_hint = _normalize_layout_hint(
            slide.get("layout_hint"), role=role, index=index, legacy=legacy
        )
        exact_math_content = _slide_has_exact_math_content(
            slide,
            area=payload.area,
            topic=payload.tema,
        )
        visual_concept = str(slide.get("visual_concept") or "").strip()
        legacy_image = str(slide.get("image") or "").strip()
        if (
            not visual_concept
            and legacy_image
            and not legacy_image.startswith("/static/")
        ):
            visual_concept = legacy_image
        if not visual_concept and layout_hint == "full_image":
            visual_concept = (
                f"Escena educativa clara sobre {slide.get('title') or payload.tema}"
            )
        if exact_math_content:
            layout_hint = "editable"
            visual_concept = ""

        image_text_expected = _clean_text_list(
            slide.get("image_text_expected"), max_items=4, max_chars=90
        )
        if exact_math_content:
            image_text_expected = []
        if layout_hint == "full_image" and not image_text_expected:
            image_text_expected = _default_image_text(slide, role=role)
        if layout_hint != "full_image" and role in EDITABLE_ROLES:
            image_text_expected = []
        if _visible_words(image_text_expected) > 45:
            compact: list[str] = []
            words = 0
            for line in image_text_expected:
                line_words = str(line).split()
                remaining = max(0, 45 - words)
                if remaining <= 0:
                    break
                compact.append(" ".join(line_words[:remaining]))
                words += len(compact[-1].split())
            image_text_expected = compact

        enriched = {
            **slide,
            "_legacy_layout_fallback": legacy,
            "role": role,
            "key_message": _clip_text(str(slide.get("key_message") or ""), 110),
            "example": _clip_text(str(slide.get("example") or ""), 180),
            "activity": _clip_text(str(slide.get("activity") or ""), 180),
            "question": _clip_text(str(slide.get("question") or ""), 160),
            "visual_concept": visual_concept,
            "layout_hint": layout_hint,
            "image_text_expected": image_text_expected,
            "tags": _default_tags(payload, slide, role),
        }
        if exact_math_content:
            enriched.pop("image_asset", None)
            enriched.pop("slide_type", None)
            enriched.pop("layout", None)
            enriched["image"] = "/static/placeholder_educational.svg"
        elif visual_concept:
            enriched["image"] = visual_concept
        normalized.append(enriched)
    return _merge_structured_content_into_bullets(_apply_role_sequence(normalized))


def _role_sequence_for_count(count: int) -> dict[int, str]:
    if count < 3:
        return {}
    if count == 3:
        return {0: "cover", 1: "objective", count - 1: "closing"}
    if count == 4:
        return {0: "cover", 1: "objective", 2: "concept", 3: "activity"}
    if count == 5:
        return {0: "cover", 1: "objective", 2: "concept", 3: "activity", 4: "summary"}
    if count == 6:
        return {0: "cover", 1: "objective", 2: "concept", 3: "example", 4: "activity", 5: "summary"}
    if count == 7:
        return {0: "cover", 1: "objective", 2: "prior_knowledge", 3: "concept", 4: "example", 5: "activity", 6: "summary"}
    if count == 8:
        return {0: "cover", 1: "objective", 2: "prior_knowledge", 3: "concept", 4: "explanation", 5: "activity", 6: "comprehension_check", 7: "summary"}
    sequence = {
        0: "cover",
        1: "objective",
        2: "prior_knowledge",
        3: "concept",
        count - 4: "activity",
        count - 3: "comprehension_check",
        count - 2: "summary",
        count - 1: "closing",
    }
    development_roles = ("explanation", "example", "process", "comparison")
    for index in range(4, count - 4):
        sequence[index] = development_roles[(index - 4) % len(development_roles)]
    return {index: role for index, role in sequence.items() if 0 <= index < count}


def _apply_role_sequence(slides: list[dict]) -> list[dict]:
    sequence = _role_sequence_for_count(len(slides))
    labels = {
        "cover": "Inicio de la clase",
        "objective": "Objetivo de aprendizaje",
        "prior_knowledge": "Conocimientos previos",
        "concept": "Concepto clave",
        "activity": "Actividad",
        "comprehension_check": "Comprobacion",
        "summary": "Resumen",
        "closing": "Cierre",
    }
    generic_titles = {
        "portada",
        "inicio",
        "inicio de la clase",
        "objetivo",
        "objetivo de aprendizaje",
        "conocimientos previos",
        "concepto",
        "concepto clave",
        "ejemplo",
        "explicacion",
        "actividad",
        "comprobacion",
        "verificacion",
        "resumen",
        "cierre",
    }
    for index, target_role in sequence.items():
        slide = slides[index]
        previous_role = str(slide.get("role") or "")
        if previous_role == target_role:
            continue
        slide["role"] = target_role
        slide["layout_hint"] = _normalize_layout_hint(
            None, role=target_role, index=index, legacy=False
        )
        if slide["layout_hint"] == "editable":
            slide["image_text_expected"] = []
            slide.pop("slide_type", None)
            if slide.get("layout") == "full_image":
                slide.pop("layout", None)
        elif slide["layout_hint"] == "full_image" and not slide.get(
            "image_text_expected"
        ):
            slide["image_text_expected"] = _default_image_text(slide, role=target_role)
        title = str(slide.get("title") or "").strip()
        if title.lower() in generic_titles or previous_role != target_role:
            slide["title"] = labels.get(
                target_role, title or f"Diapositiva {index + 1}"
            )
        if target_role == "comprehension_check" and not slide.get("question"):
            slide["question"] = (
                "Que idea clave puedes explicar con tus propias palabras?"
            )
        if target_role == "activity" and not slide.get("activity"):
            slide["activity"] = (
                "Aplica la idea principal en una situacion cercana al grupo."
            )
    return slides


def _merge_structured_content_into_bullets(slides: list[dict]) -> list[dict]:
    """Hace visibles ejemplos, actividades y preguntas en los archivos exportados."""
    for slide in slides:
        bullets = _clean_text_list(slide.get("bullets"), max_items=4, max_chars=160)
        role = str(slide.get("role") or "")
        additions: list[tuple[str, str]] = []
        if role == "example":
            additions.append(("Ejemplo", str(slide.get("example") or "")))
        if role == "activity":
            additions.append(("Actividad", str(slide.get("activity") or "")))
        if role in {"comprehension_check", "assessment"}:
            additions.append(("Pregunta", str(slide.get("question") or "")))
        combined = " ".join(bullets).lower()
        for label, value in additions:
            clean_value = _clip_text(value, 105).strip()
            if clean_value and clean_value.lower() not in combined and len(bullets) < 4:
                bullets.append(f"{label}: {clean_value}")
                combined += " " + clean_value.lower()
        slide["bullets"] = bullets
    return slides


def _has_pedagogical_intent(slide: dict) -> bool:
    if slide.get("_legacy_layout_fallback"):
        return False
    return any(
        slide.get(key)
        for key in (
            "role",
            "layout_hint",
            "visual_concept",
            "key_message",
            "image_text_expected",
        )
    )


def _should_be_full_image(
    slide: dict, *, index: int, legacy_full_idx: int | None
) -> bool:
    if _slide_has_exact_math_content(slide):
        return False
    if not _has_pedagogical_intent(slide):
        return index == legacy_full_idx
    role = _normalize_role(
        slide.get("role"), index=index, title=str(slide.get("title") or "")
    )
    layout_hint = str(slide.get("layout_hint") or "").strip().lower()
    image_text_expected = _clean_text_list(
        slide.get("image_text_expected"), max_items=4, max_chars=90
    )
    visual_concept = str(
        slide.get("visual_concept") or slide.get("image") or ""
    ).strip()
    if role in EDITABLE_ROLES and layout_hint != "full_image":
        return False
    if layout_hint == "editable":
        return False
    if layout_hint == "full_image":
        return bool(visual_concept and image_text_expected)
    return bool(
        role in FULL_IMAGE_ROLES
        and visual_concept
        and image_text_expected
        and _visible_words(image_text_expected) <= 45
    )


def _image_kind_for_slide(
    slide: dict, *, index: int, legacy_full_idx: int | None
) -> str:
    role = _normalize_role(
        slide.get("role"), index=index, title=str(slide.get("title") or "")
    )
    if role == "cover" or (index == 0 and not _has_pedagogical_intent(slide)):
        return "cover"
    if _should_be_full_image(slide, index=index, legacy_full_idx=legacy_full_idx):
        return "full_image"
    if role == "activity":
        return "activity"
    if role in {"process", "comparison"}:
        return "technical"
    if role in {"summary", "closing"}:
        return "closing"
    return "support"


async def _attach_slide_images(
    db: AsyncSession,
    pres: Presentacion,
    slides: list[dict],
    payload: PresentacionCreate,
    *,
    ai_config: dict | None = None,
) -> None:
    """Genera las imágenes IA de la presentación en 3 fases:

    1) plan secuencial: prompt final por slide (cover/support/full_image) y
       búsqueda de reutilizables en la biblioteca por prompt_hash;
    2) generación en paralelo solo de las que faltan;
    3) registro secuencial de TODAS (success/reused/failed) en
       `imagenes_generadas` con el prompt exacto usado.
    """
    if not getattr(payload, "incluir_imagenes", True):
        return
    densidad = getattr(payload, "densidad_imagenes", "alta") or "alta"
    estrategia = getattr(payload, "proveedor_imagenes", "mixto") or "mixto"
    legacy_full_idx = _full_image_index(slides)
    eligible = _eligible_image_indices(len(slides), densidad)
    for index, slide in enumerate(slides):
        if _should_be_full_image(slide, index=index, legacy_full_idx=legacy_full_idx):
            eligible.add(index)
    eligible = {
        index for index in eligible if not _slide_has_exact_math_content(slides[index])
    }
    if not eligible:
        return
    eligible_order = {
        slide_index: order for order, slide_index in enumerate(sorted(eligible))
    }

    # ── Fase 1: plan + dedupe por biblioteca ────────────────────────────────
    plans: list[dict] = []
    for index in sorted(eligible):
        slide = slides[index]
        title = str(slide.get("title") or f"Diapositiva {index + 1}")
        raw_prompt = str(
            slide.get("visual_concept")
            or slide.get("image")
            or f"Ilustracion educativa sobre {title}"
        )
        bullets = slide.get("bullets") if isinstance(slide.get("bullets"), list) else []
        provider = _image_provider_for_slide(
            index=index,
            eligible_order=eligible_order,
            strategy=estrategia,
            title=title,
            prompt=raw_prompt,
        )
        kind = _image_kind_for_slide(
            slide, index=index, legacy_full_idx=legacy_full_idx
        )
        if kind == "full_image":
            # full_image siempre por OpenAI: es quien renderiza texto legible.
            provider = ImageProvider.OPENAI
        bundle = build_presentation_image_prompt(
            kind,
            raw_prompt=raw_prompt,
            title=title,
            bullets=bullets,
            topic=payload.tema,
            area=payload.area,
            grade=payload.grado,
            nivel=getattr(payload, "nivel", None),
            provider=provider,
            role=str(slide.get("role") or ""),
            key_message=str(slide.get("key_message") or ""),
            visual_concept=str(slide.get("visual_concept") or raw_prompt),
            image_text_expected=slide.get("image_text_expected"),
            tags=slide.get("tags"),
        )
        slide["image"] = bundle.prompt_usado
        slide["image_provider"] = provider.value
        if kind == "full_image":
            slide["slide_type"] = "full_image"
            slide["layout"] = "full_image"
            slide["image_text_expected"] = bundle.image_text_expected
            slide["text_content"] = " ".join(
                str(item)
                for item in [
                    slide.get("key_message"),
                    *bullets,
                    slide.get("example"),
                    slide.get("activity"),
                    slide.get("question"),
                ]
                if str(item or "").strip()
            )
            slide["tags"] = _clean_text_list(
                slide.get("tags"), max_items=6, max_chars=28
            )
        modelo, calidad = imagenes_service.provider_model_quality(provider.value)
        prompt_hash = imagenes_service.compute_prompt_hash(
            bundle.prompt_usado, modelo=modelo, calidad=calidad, size=SLIDE_IMAGE_SIZE
        )
        reuse_row = await imagenes_service.find_reusable_by_prompt_hash(db, prompt_hash)
        plans.append(
            {
                "index": index,
                "slide": slide,
                "title": title,
                "bundle": bundle,
                "provider": provider,
                "reuse_row": reuse_row,
                "result": None,
            }
        )

    # ── Fase 2: generación en paralelo (solo lo que no se reutiliza) ────────
    sem = asyncio.Semaphore(3)

    async def _one(plan: dict) -> None:
        reuse = plan["reuse_row"]
        if reuse is not None:
            plan["result"] = {
                "url": reuse.public_url,
                "path": reuse.file_path,
                "provider": reuse.proveedor,
                "reused": True,
                "placeholder": False,
                "error": None,
            }
            return
        async with sem:
            try:
                plan["result"] = await generate_ai_slide_image_detailed(
                    plan["title"],
                    plan["bundle"].prompt_usado,
                    provider=plan["provider"],
                    db=db,
                    teacher_id=pres.profesor_id,
                    ai_config=ai_config,
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("No se pudo generar imagen para slide %d", plan["index"])
                plan["result"] = {
                    "url": "",
                    "path": None,
                    "provider": plan["provider"].value,
                    "reused": False,
                    "placeholder": True,
                    "error": str(exc)[:500],
                }

    await asyncio.gather(*(_one(plan) for plan in plans))

    # ── Fase 3: aplicar a slides + registro en biblioteca ───────────────────
    for plan in plans:
        result = plan["result"] or {}
        slide = plan["slide"]
        bundle = plan["bundle"]
        if result.get("url"):
            slide["image_asset"] = result["url"]
        is_real = bool(result.get("url")) and not result.get("placeholder")
        estado = (
            "reused"
            if (result.get("reused") and is_real)
            else ("success" if is_real else "failed")
        )
        await imagenes_service.register_imagen_generada(
            db,
            prompt_original=bundle.prompt_original,
            prompt_normalizado=bundle.prompt_normalizado,
            prompt_usado=bundle.prompt_usado,
            restricciones=bundle.restricciones,
            proveedor=str(result.get("provider") or plan["provider"].value),
            descripcion=imagenes_service.build_default_description(
                tipo_uso=bundle.tipo_uso, titulo=plan["title"], tema=payload.tema
            ),
            tags=_clean_text_list(slide.get("tags"), max_items=6, max_chars=28)
            or imagenes_service.build_default_tags(
                tema=payload.tema,
                area=payload.area,
                grado=payload.grado,
                tipo_uso=bundle.tipo_uso,
            ),
            tema=payload.tema,
            area=payload.area,
            grado=payload.grado,
            materia_id=pres.materia_id,
            tipo_uso=bundle.tipo_uso,
            modulo_origen="presentaciones",
            size=SLIDE_IMAGE_SIZE,
            file_path=(result.get("path") if is_real else None),
            public_url=(result.get("url") if is_real else None),
            estado=estado,
            reusable=is_real,
            user_id=pres.profesor_id,
            presentation_id=pres.id,
            slide_index=plan["index"],
            error=result.get("error"),
            commit=False,
        )
    try:
        await db.commit()
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo confirmar el registro de imágenes generadas")
        await db.rollback()


def _polish_slides_for_export(slides: list[dict], *, topic: str = "") -> list[dict]:
    polished: list[dict] = []
    for index, slide in enumerate(slides):
        title = _slide_title(str(slide.get("title") or ""), index=index, topic=topic)
        bullets = slide.get("bullets") if isinstance(slide.get("bullets"), list) else []
        # Viñetas completas y educativas (ideas claras), no fragmentos de 2 palabras.
        compact_bullets = [
            _clip_text(str(item), 160) for item in bullets if str(item).strip()
        ]
        compact_bullets = [item for item in compact_bullets if len(item) >= 3][:4]
        if not compact_bullets:
            note = str(slide.get("notes") or "Idea clave para trabajar en clase.")
            compact_bullets = [_clip_text(note, 95)]
        polished.append(
            {
                **slide,
                "title": title,
                "bullets": compact_bullets,
                "notes": _clip_text(str(slide.get("notes") or ""), 140),
            }
        )
    return polished


def _slide_title(value: str, *, index: int, topic: str) -> str:
    cleaned = " ".join(str(value).split()).strip()
    generic = {
        "portada",
        "objetivo",
        "conceptos",
        "cierre",
        "introduccion",
        "introducción",
    }
    if cleaned.lower() in generic:
        replacements = {
            0: _short_topic_title(topic) or "Inicio de la clase",
            1: "Objetivo de aprendizaje",
            2: "Conceptos clave",
        }
        cleaned = replacements.get(index, cleaned)
    return _clip_text(cleaned or f"Diapositiva {index + 1}", 42)


def _short_topic_title(topic: str) -> str:
    cleaned = " ".join(str(topic).split()).strip()
    if len(cleaned) <= 34:
        return cleaned
    for separator in (" y ", ": ", " - ", ", "):
        head = cleaned.split(separator, 1)[0].strip()
        if 10 <= len(head) <= 34:
            return head
    words: list[str] = []
    for word in cleaned.split():
        candidate = " ".join([*words, word])
        if len(candidate) > 34:
            break
        words.append(word)
    return " ".join(words)


def _clip_text(value: str, max_chars: int) -> str:
    cleaned = " ".join(str(value).replace("\n", " ").split())
    if len(cleaned) <= max_chars:
        return cleaned
    return cleaned[: max(0, max_chars - 1)].rstrip(" .,;:") + "…"


def _image_provider_for_slide(
    *,
    index: int,
    eligible_order: dict[int, int],
    strategy: str,
    title: str,
    prompt: str,
) -> ImageProvider:
    return ImageProvider.OPENAI


def _fallback_slides(payload: PresentacionCreate) -> list[dict]:
    count = max(3, payload.cantidad_slides)
    base = [
        (
            "cover",
            "Inicio de la clase",
            ["Reconocer el tema central.", "Conectar con situaciones conocidas."],
            "full_image",
        ),
        (
            "objective",
            "Proposito de aprendizaje",
            ["Comprender que se espera aprender.", "Relacionar el tema con la clase."],
            "editable",
        ),
        (
            "prior_knowledge",
            "Saberes previos",
            ["Recordar ideas que ya conocemos.", "Plantear preguntas iniciales."],
            "editable",
        ),
        (
            "concept",
            "Conceptos clave",
            ["Identificar vocabulario esencial.", "Relacionar ideas principales."],
            "full_image",
        ),
        (
            "activity",
            "Actividad en clase",
            ["Trabajar en parejas o grupos.", "Registrar evidencias y dudas."],
            "editable",
        ),
        (
            "summary",
            "Cierre y verificacion",
            ["Compartir conclusiones.", "Responder una pregunta de salida."],
            "full_image",
        ),
    ]
    slides: list[dict] = []
    for idx in range(count):
        role, title, bullets, layout_hint = base[idx % len(base)]
        visual_concept = f"Ilustracion educativa sobre {payload.tema} para {title}"
        slides.append(
            {
                "role": role,
                "title": f"{title}: {payload.tema}",
                "key_message": f"Comprender {payload.tema} con ejemplos claros.",
                "bullets": bullets,
                "example": "",
                "activity": "Ajusta esta actividad al grupo."
                if role == "activity"
                else "",
                "question": "Que idea clave puedes explicar con tus palabras?"
                if role in {"summary", "closing"}
                else "",
                "visual_concept": visual_concept,
                "layout_hint": layout_hint,
                "image_text_expected": []
                if layout_hint == "editable"
                else [title.upper(), f"Idea clave sobre {payload.tema}"],
                "image": visual_concept,
                "notes": "Ajusta ejemplos al contexto del grupo.",
                "tags": [
                    str(payload.area or "").lower(),
                    str(payload.tema or "").lower(),
                    role,
                ],
            }
        )
    return slides


def _payload_from_presentacion(pres: Presentacion) -> PresentacionCreate:
    input_data = (pres.slides_json or {}).get("input")
    if not isinstance(input_data, dict):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La presentacion no tiene datos de entrada.",
        )
    return PresentacionCreate.model_validate(input_data)


async def _store_local_export_result(
    db: AsyncSession, pres: Presentacion, export_as: ExportFormat
) -> None:
    slides = extract_slides_for_export(pres.slides_json)
    canonical = build_canonical_from_legacy(pres.slides_json, pres)
    if not slides:
        slides = canonical_to_legacy_slides(canonical)
    if not slides:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La presentacion no tiene slides para exportar.",
        )
    editable = False
    if export_as == "pptx":
        try:
            content = build_editable_pptx(canonical)
            editable = True
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Editable PPTX export failed for %s; using local fallback: %s",
                pres.id,
                exc,
            )
            content = build_local_export(pres.titulo, slides, export_as)
    else:
        content = build_local_export(pres.titulo, slides, export_as)
    file_url = await save_export_file(content, pres.id, export_as)
    if export_as == "pptx":
        pres.pptx_url = file_url
    else:
        pres.pdf_url = file_url
    pres.slides_json = _with_canonical_exports(
        pres, export_as, file_url, len(content), editable=editable
    )
    await db.commit()
    await db.refresh(pres)


async def export_presentacion(
    db: AsyncSession,
    pres: Presentacion,
    export_as: ExportFormat,
) -> Presentacion:
    await _store_local_export_result(db, pres, export_as)
    return pres


async def list_presentaciones(
    db: AsyncSession, current_user: User
) -> list[Presentacion]:
    if _is_admin(current_user):
        stmt = select(Presentacion).order_by(Presentacion.created_at.desc())
    else:
        materia_ids = await _student_materia_ids(db, current_user.id)
        stmt = (
            select(Presentacion)
            .where(
                or_(
                    Presentacion.profesor_id == current_user.id,
                    and_(
                        Presentacion.materia_id.in_(materia_ids),
                        Presentacion.slides_json["publicada"].as_boolean().is_(True),
                    ),
                )
            )
            .order_by(Presentacion.created_at.desc())
        )

    result = await db.scalars(stmt)
    return list(result)


async def _student_materia_ids(db: AsyncSession, estudiante_id: UUID) -> list[UUID]:
    result = await db.scalars(
        select(Matricula.materia_id).where(
            Matricula.estudiante_id == estudiante_id,
            Matricula.estado == MatriculaEstado.ACTIVO.value,
        )
    )
    return list(result)


async def get_presentacion_or_404(
    db: AsyncSession, presentacion_id: UUID
) -> Presentacion:
    pres = await db.scalar(
        select(Presentacion).where(Presentacion.id == presentacion_id)
    )
    if not pres:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Presentacion no encontrada"
        )
    return pres


async def ensure_can_read_presentacion(
    db: AsyncSession, presentacion_id: UUID, current_user: User
) -> Presentacion:
    pres = await get_presentacion_or_404(db, presentacion_id)
    if _is_admin(current_user) or pres.profesor_id == current_user.id:
        return pres
    if (
        pres.materia_id
        and (pres.slides_json or {}).get("publicada") is True
    ):
        materia_ids = await _student_materia_ids(db, current_user.id)
        if pres.materia_id in materia_ids:
            return pres
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
    )


async def ensure_can_manage_presentacion(
    db: AsyncSession, presentacion_id: UUID, current_user: User
) -> Presentacion:
    pres = await get_presentacion_or_404(db, presentacion_id)
    if _is_admin(current_user) or pres.profesor_id == current_user.id:
        return pres
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
    )


def build_preview_metadata(pres: Presentacion) -> dict[str, Any]:
    slides = extract_slides_for_export(pres.slides_json)
    return {
        "id": pres.id,
        "titulo": pres.titulo,
        "total": len(slides),
        "slides": [
            {
                "numero": index + 1,
                "titulo": str(slide.get("title") or f"Diapositiva {index + 1}"),
                "image_url": f"/api/presentaciones/{pres.id}/preview/{index + 1}.png",
            }
            for index, slide in enumerate(slides)
        ],
    }


def render_preview_slide(pres: Presentacion, slide_number: int) -> bytes:
    slides = extract_slides_for_export(pres.slides_json)
    if slide_number < 1 or slide_number > len(slides):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Diapositiva no encontrada"
        )
    index = slide_number - 1
    return render_slide_png(pres.titulo, slides[index], index, len(slides))


def build_estado(pres: Presentacion) -> dict:
    progress_by_state = {
        PresentacionEstado.QUEUED.value: 10,
        PresentacionEstado.RUNNING.value: 60,
        PresentacionEstado.SUCCESS.value: 100,
        PresentacionEstado.FAILED.value: 0,
    }
    return {
        "id": pres.id,
        "estado": pres.estado,
        "progreso": progress_by_state.get(pres.estado, 0),
        "pptx_url": pres.pptx_url,
        "pdf_url": pres.pdf_url,
        "error": pres.error,
    }


def get_download_path(pres: Presentacion, export_as: ExportFormat):
    path = get_export_file_path(pres.id, export_as)
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado"
        )
    return path


async def ensure_current_pptx_download(db: AsyncSession, pres: Presentacion):
    """Regenerate legacy text-only PPTX files when canonical slides have visuals."""
    path = get_download_path(pres, "pptx")
    canonical = build_canonical_from_legacy(pres.slides_json, pres)
    slides = (
        canonical.get("slides") if isinstance(canonical.get("slides"), list) else []
    )
    has_visuals = any(
        isinstance(slide, dict)
        and isinstance(slide.get("imagen"), dict)
        and bool(slide["imagen"].get("url"))
        for slide in slides
    )
    if has_visuals and not pptx_has_slides_and_media(path.read_bytes()):
        logger.info(
            "Regenerating legacy text-only PPTX",
            extra={"presentation_id": str(pres.id)},
        )
        await _store_local_export_result(db, pres, "pptx")
        path = get_download_path(pres, "pptx")
    return path


async def delete_presentacion(db: AsyncSession, pres: Presentacion) -> None:
    presentation_id = pres.id
    await db.delete(pres)
    await db.commit()
    await cleanup_presentation_exports(presentation_id)


def _canonical_for_presentacion(
    pres: Presentacion,
    slides_json: dict[str, Any] | None,
    *,
    estado: str | None = None,
    etapa: str | None = None,
    progreso: int | None = None,
    mensaje: str | None = None,
    error_amigable: str | None = None,
) -> dict[str, Any]:
    canonical = build_canonical_from_legacy(slides_json, pres)
    if estado is not None:
        canonical["generation"]["estado"] = estado
    if etapa is not None:
        canonical["generation"]["etapa"] = etapa
    if progreso is not None:
        canonical["generation"]["progreso"] = progreso
    if mensaje is not None:
        canonical["generation"]["mensaje"] = mensaje
    if error_amigable is not None:
        canonical["generation"]["error_amigable"] = error_amigable
    return canonical


def _with_canonical_generation(
    pres: Presentacion,
    *,
    estado: str,
    etapa: str | None,
    progreso: int | None,
    mensaje: str | None,
    error_amigable: str | None,
) -> dict[str, Any]:
    slides_json = dict(pres.slides_json or {})
    slides_json["canonical"] = _canonical_for_presentacion(
        pres,
        slides_json,
        estado=estado,
        etapa=etapa,
        progreso=progreso,
        mensaje=mensaje,
        error_amigable=error_amigable,
    )
    return slides_json


def _with_canonical_exports(
    pres: Presentacion,
    export_as: ExportFormat,
    file_url: str,
    file_size: int,
    *,
    editable: bool = False,
) -> dict[str, Any]:
    slides_json = dict(pres.slides_json or {})
    canonical = _canonical_for_presentacion(pres, slides_json)
    if export_as == "pptx":
        canonical["exports"]["pptx"] = {
            "url": file_url,
            "editable": editable,
            "bytes": file_size,
        }
    else:
        canonical["exports"]["pdf"] = {"url": file_url, "bytes": file_size}
    slides_json["canonical"] = canonical
    return slides_json
