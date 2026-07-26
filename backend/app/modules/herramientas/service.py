"""Servicio de herramientas: despacha al generador correcto y persiste en materiales_generados."""
from __future__ import annotations

import json
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.herramientas.generators import (
    crucigrama,
    cuento,
    emparejar,
    examen,
    ficha,
    flashcards,
    guia,
    lectura_comprensiva,
    mapa_conceptual,
    para_colorear,
    plan_refuerzo,
    quiz_rapido,
    rubrica,
    sopa_letras,
    unir_columnas,
)
from app.modules.materias import service as materias_service
from app.modules.herramientas.schemas import (
    CrucigramaRequest,
    CuentoRequest,
    EmparejarRequest,
    ExamenRequest,
    FichaRequest,
    FlashcardsRequest,
    GuiaRequest,
    LecturaComprensivaRequest,
    MapaConceptualRequest,
    ParaColorearRequest,
    PlanRefuerzoRequest,
    QuizRapidoRequest,
    RubricaRequest,
    SopaLetrasRequest,
    TallerRequest,
    UnirColumnasRequest,
)
from app.modules.users.models import User
from app.modules.imagenes import service as imagenes_service
from app.services.image_router import generate_image
from app.services.llm_router import LLMRouter
from app.shared.enums import MaterialTipo


async def _resolve_materia_id(db: AsyncSession, req: object, current_user: User) -> UUID | None:
    materia_id = getattr(req, "materia_id", None)
    if not materia_id:
        return None
    materia = await materias_service.ensure_can_manage_materia(db, materia_id, current_user)
    return materia.id


async def _save_material(
    db: AsyncSession,
    *,
    profesor_id: UUID,
    materia_id: UUID | None,
    tipo: MaterialTipo,
    titulo: str,
    input_json: dict,
    contenido_json: dict,
) -> object:
    from sqlalchemy import text
    inserted = await db.execute(
        text(
            "INSERT INTO materiales_generados "
            "(profesor_id, materia_id, tipo, titulo, input_json, contenido_json) "
            "VALUES (:p, :m, :t, :ti, CAST(:i AS jsonb), CAST(:c AS jsonb)) "
            "RETURNING id"
        ),
        {
            "p": str(profesor_id),
            "m": str(materia_id) if materia_id else None,
            "t": tipo.value,
            "ti": titulo,
            "i": json.dumps(input_json, default=str),
            "c": json.dumps(contenido_json, default=str),
        },
    )
    material_id = inserted.scalar_one()
    row = await db.execute(
        text(
            "SELECT mg.id, mg.tipo, mg.titulo, mg.materia_id, m.nombre AS materia_nombre, "
            "mg.contenido_json, mg.archivo_url, mg.created_at "
            "FROM materiales_generados mg LEFT JOIN materias m ON m.id = mg.materia_id "
            "WHERE mg.id=:id"
        ),
        {"id": str(material_id)},
    )
    r = row.fetchone()
    await db.commit()
    return {
        "id": r.id,
        "tipo": r.tipo,
        "titulo": r.titulo,
        "materia_id": r.materia_id,
        "materia_nombre": r.materia_nombre,
        "contenido_json": r.contenido_json,
        "archivo_url": r.archivo_url,
        "created_at": r.created_at,
    }


async def list_materials(
    db: AsyncSession,
    profesor_id: UUID,
    *,
    tipo: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Lista los materiales de un profesor (sin el contenido completo)."""
    from sqlalchemy import text

    clauses = ["mg.profesor_id = :p"]
    params: dict = {"p": str(profesor_id), "limit": limit, "offset": offset}
    if tipo:
        clauses.append("mg.tipo = :tipo")
        params["tipo"] = tipo
    where = " AND ".join(clauses)
    rows = await db.execute(
        text(
            f"SELECT mg.id, mg.tipo, mg.titulo, mg.materia_id, m.nombre AS materia_nombre, mg.archivo_url, mg.created_at "
            f"FROM materiales_generados mg LEFT JOIN materias m ON m.id = mg.materia_id "
            f"WHERE {where} "
            f"ORDER BY mg.created_at DESC LIMIT :limit OFFSET :offset"
        ),
        params,
    )
    return [
        {
            "id": r.id,
            "tipo": r.tipo,
            "titulo": r.titulo,
            "materia_id": r.materia_id,
            "materia_nombre": r.materia_nombre,
            "archivo_url": r.archivo_url,
            "created_at": r.created_at,
        }
        for r in rows.fetchall()
    ]


async def delete_material(db: AsyncSession, material_id: UUID, profesor_id: UUID) -> bool:
    """Borra un material del profesor. Devuelve True si existía."""
    from sqlalchemy import text

    result = await db.execute(
        text("DELETE FROM materiales_generados WHERE id = :id AND profesor_id = :p"),
        {"id": str(material_id), "p": str(profesor_id)},
    )
    await db.commit()
    return (result.rowcount or 0) > 0


async def get_material(db: AsyncSession, material_id: UUID, profesor_id: UUID) -> dict | None:
    """Carga un material por id, restringido a su profesor."""
    from sqlalchemy import text

    row = await db.execute(
        text(
            "SELECT mg.id, mg.tipo, mg.titulo, mg.materia_id, m.nombre AS materia_nombre, "
            "mg.contenido_json, mg.archivo_url, mg.created_at "
            "FROM materiales_generados mg LEFT JOIN materias m ON m.id = mg.materia_id "
            "WHERE mg.id = :id AND mg.profesor_id = :p"
        ),
        {"id": str(material_id), "p": str(profesor_id)},
    )
    r = row.fetchone()
    if r is None:
        return None
    return {
        "id": r.id,
        "tipo": r.tipo,
        "titulo": r.titulo,
        "materia_id": r.materia_id,
        "materia_nombre": r.materia_nombre,
        "contenido_json": r.contenido_json,
        "archivo_url": r.archivo_url,
        "created_at": r.created_at,
    }


async def gen_sopa_letras(db: AsyncSession, req: SopaLetrasRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await sopa_letras.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.SOPA_LETRAS, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_crucigrama(db: AsyncSession, req: CrucigramaRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await crucigrama.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.CRUCIGRAMA, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_unir_columnas(db: AsyncSession, req: UnirColumnasRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await unir_columnas.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.UNIR_COLUMNAS, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_emparejar(db: AsyncSession, req: EmparejarRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await emparejar.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.EMPAREJAR, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_cuento(db: AsyncSession, req: CuentoRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await cuento.generate(req, llm)
    image_prompt = cuento.build_image_prompt(req, result)
    image = await generate_image(prompt=image_prompt, image_type="educativa_profesional", size="1024x1024")
    await imagenes_service.register_imagen_generada(
        db,
        prompt_original=image_prompt,
        prompt_usado=image.prompt_used or image_prompt,
        proveedor=image.provider,
        tipo_uso="apoyo_visual",
        modulo_origen="herramientas",
        size="1024x1024",
        public_url=image.url,
        estado="failed" if image.is_placeholder else "success",
        reusable=not image.is_placeholder,
        user_id=current_user.id,
        materia_id=materia_id,
        tema=getattr(req, "tema", None),
        area=getattr(req, "area", None),
        grado=getattr(req, "grado", None),
        descripcion=imagenes_service.build_default_description(
            tipo_uso="apoyo_visual", titulo=req.titulo, tema=getattr(req, "tema", None)
        ),
        tags=imagenes_service.build_default_tags(
            tema=getattr(req, "tema", None), area=getattr(req, "area", None),
            grado=getattr(req, "grado", None), tipo_uso="cuento",
        ),
        commit=False,
    )
    result["imagen"] = {
        "url": image.url,
        "b64_data": image.b64_data,
        "provider": image.provider,
        "is_placeholder": image.is_placeholder,
        "prompt": image_prompt,
    }
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.CUENTO, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_para_colorear(db: AsyncSession, req: ParaColorearRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    prompt = para_colorear.build_prompt(req)
    image = await generate_image(prompt=prompt, image_type="para_colorear", size="1024x1024")
    await imagenes_service.register_imagen_generada(
        db,
        prompt_original=prompt,
        prompt_usado=image.prompt_used or prompt,
        proveedor=image.provider,
        tipo_uso="actividad",
        modulo_origen="herramientas",
        size="1024x1024",
        public_url=image.url,
        estado="failed" if image.is_placeholder else "success",
        reusable=not image.is_placeholder,
        user_id=current_user.id,
        materia_id=materia_id,
        tema=getattr(req, "tema", None),
        area=getattr(req, "area", None),
        grado=getattr(req, "grado", None),
        descripcion=imagenes_service.build_default_description(
            tipo_uso="actividad", titulo=req.titulo, tema=getattr(req, "tema", None)
        ),
        tags=imagenes_service.build_default_tags(
            tema=getattr(req, "tema", None), area=getattr(req, "area", None),
            grado=getattr(req, "grado", None), tipo_uso="para_colorear",
        ),
        commit=False,
    )
    result = para_colorear.build_content(
        req,
        {
            "url": image.url,
            "b64_data": image.b64_data,
            "provider": image.provider,
            "is_placeholder": image.is_placeholder,
            "prompt": prompt,
        },
    )
    return await _save_material(
        db,
        profesor_id=current_user.id,
        materia_id=materia_id,
        tipo=MaterialTipo.PARA_COLOREAR,
        titulo=req.titulo,
        input_json=req.model_dump(),
        contenido_json=result,
    )


async def gen_guia(db: AsyncSession, req: GuiaRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await guia.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.GUIA, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_taller(db: AsyncSession, req: TallerRequest, current_user: User) -> dict:
    # Taller usa el mismo generador que guía con ajuste
    from app.modules.herramientas.generators.base import TOOLS_SYSTEM, build_base_context
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    ctx = build_base_context(req)
    prompt = f"""{TOOLS_SYSTEM}\n\n{ctx}\nCantidad de puntos: {req.cantidad_puntos}\n
Genera un taller pedagógico práctico. Devuelve JSON:
{{"titulo":"...","objetivo":"...","puntos":[{{"numero":1,"enunciado":"...","espacio_respuesta":"..."}}]}}"""
    result = await llm.generate_json("taller", prompt)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.TALLER, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_examen(db: AsyncSession, req: ExamenRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await examen.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.EXAMEN, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_rubrica(db: AsyncSession, req: RubricaRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await rubrica.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.RUBRICA, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_ficha(db: AsyncSession, req: FichaRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await ficha.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.FICHA, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_quiz_rapido(db: AsyncSession, req: QuizRapidoRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await quiz_rapido.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.QUIZ_RAPIDO, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_lectura_comprensiva(db: AsyncSession, req: LecturaComprensivaRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await lectura_comprensiva.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.LECTURA_COMPRENSIVA, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_mapa_conceptual(db: AsyncSession, req: MapaConceptualRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await mapa_conceptual.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.MAPA_CONCEPTUAL, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_flashcards(db: AsyncSession, req: FlashcardsRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await flashcards.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.FLASHCARDS, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )


async def gen_plan_refuerzo(db: AsyncSession, req: PlanRefuerzoRequest, current_user: User) -> dict:
    materia_id = await _resolve_materia_id(db, req, current_user)
    llm = LLMRouter(user_id=current_user.id)
    result = await plan_refuerzo.generate(req, llm)
    return await _save_material(
        db, profesor_id=current_user.id, materia_id=materia_id,
        tipo=MaterialTipo.PLAN_REFUERZO, titulo=req.titulo,
        input_json=req.model_dump(), contenido_json=result,
    )
