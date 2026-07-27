"""Servicio de refuerzos pedagógicos generados por Xali."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.modules.xali.refuerzo_models import XaliRefuerzo
from app.services.llm_router import LLMRouter
from app.modules.materias.models import Materia

logger = get_logger(__name__)

REINFORCEMENT_PROMPT = """Eres un asistente pedagógico que ayuda a docentes a preparar actividades de refuerzo.

Contexto proporcionado por el sistema de calificación:
- Materia: {materia}
- Criterio con dificultad: {criterio}
- Porcentaje de logro del grupo: {logro}%
- Estudiantes afectados: {dificultad} de {total}

Instrucciones:
1. Genera un recurso de tipo "{tipo}" para reforzar este criterio.
2. Usa lenguaje claro y directamente aplicable en el aula.
3. No inventes competencias, edades o contenidos no relacionados.
4. No etiquetes estudiantes ("bajo rendimiento", "problemas de aprendizaje").
5. Incluye duración estimada, materiales necesarios e instrucciones.

Devuelve SOLO JSON con esta estructura:
{{
  "titulo": "Título del recurso",
  "objetivo": "Objetivo de aprendizaje",
  "duracion_minutos": 30,
  "materiales": ["lista", "de", "materiales"],
  "instrucciones": "Descripción paso a paso",
  "actividad_principal": "Descripción de la actividad",
  "evidencia_aprendizaje": "Cómo verificar que se logró el objetivo",
  "adaptacion_nivel": "Cómo adaptar para diferentes niveles"
}}
"""


async def generar_refuerzo(
    db: AsyncSession,
    profesor_id: UUID,
    materia_id: UUID,
    criterio_nombre: str,
    porcentaje_logro: float,
    estudiantes_con_dificultad: int,
    total_estudiantes: int,
    tipo: str,
) -> dict:
    """Llama a Xali para generar un refuerzo pedagógico y lo guarda."""
    # Obtener nombre de materia
    materia = await db.scalar(select(Materia.nombre).where(Materia.id == materia_id))
    materia_nombre = materia or ""

    prompt = REINFORCEMENT_PROMPT.format(
        materia=materia_nombre,
        criterio=criterio_nombre,
        logro=porcentaje_logro,
        dificultad=estudiantes_con_dificultad,
        total=total_estudiantes,
        tipo=tipo,
    )

    llm = LLMRouter(user_id=profesor_id)
    respuesta = await llm.generate_json(task_type="guia", prompt=prompt)

    contenido = respuesta.get("content", {})
    modelo = respuesta.get("model", "desconocido")

    ref = XaliRefuerzo(
        profesor_id=profesor_id,
        materia_id=materia_id,
        tipo=tipo,
        criterio_nombre=criterio_nombre,
        contexto_json={
            "porcentaje_logro": porcentaje_logro,
            "estudiantes_con_dificultad": estudiantes_con_dificultad,
            "total_estudiantes": total_estudiantes,
        },
        contenido_json=contenido if isinstance(contenido, dict) else {"texto": str(contenido)},
        prompt_usado=prompt,
        modelo=modelo,
    )
    db.add(ref)
    await db.commit()
    await db.refresh(ref)

    return {
        "id": ref.id,
        "tipo": ref.tipo,
        "estado": ref.estado,
        "criterio_nombre": ref.criterio_nombre,
        "contexto_json": ref.contexto_json,
        "contenido_json": ref.contenido_json,
        "modelo": ref.modelo,
        "material_id": ref.material_id,
        "created_at": ref.created_at,
        "updated_at": ref.updated_at,
    }


async def obtener_refuerzo(db: AsyncSession, refuerzo_id: UUID) -> dict | None:
    ref = await db.scalar(select(XaliRefuerzo).where(XaliRefuerzo.id == refuerzo_id))
    if not ref:
        return None
    return {
        "id": ref.id, "tipo": ref.tipo, "estado": ref.estado,
        "criterio_nombre": ref.criterio_nombre,
        "contexto_json": ref.contexto_json,
        "contenido_json": ref.contenido_json,
        "modelo": ref.modelo, "material_id": ref.material_id,
        "created_at": ref.created_at, "updated_at": ref.updated_at,
    }


async def actualizar_refuerzo(db: AsyncSession, refuerzo_id: UUID, contenido_json: dict | None = None, estado: str | None = None) -> dict | None:
    ref = await db.scalar(select(XaliRefuerzo).where(XaliRefuerzo.id == refuerzo_id))
    if not ref:
        return None
    if contenido_json is not None:
        ref.contenido_json = contenido_json
        if ref.estado == "borrador":
            ref.estado = "aprobado"
    if estado is not None:
        ref.estado = estado
    await db.commit()
    await db.refresh(ref)
    return {
        "id": ref.id, "tipo": ref.tipo, "estado": ref.estado,
        "criterio_nombre": ref.criterio_nombre,
        "contexto_json": ref.contexto_json,
        "contenido_json": ref.contenido_json,
        "modelo": ref.modelo, "material_id": ref.material_id,
        "created_at": ref.created_at, "updated_at": ref.updated_at,
    }
