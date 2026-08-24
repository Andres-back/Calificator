from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.modules.evaluaciones.schemas import EvaluacionRead
from app.modules.herramientas import service
from app.modules.herramientas.schemas import (
    AsignarMaterialApoyoRequest,
    ConvertirEvaluacionRequest,
    CrucigramaRequest,
    CuentoRequest,
    EmparejarRequest,
    ExamenFromChatRequest,
    ExamenRequest,
    FichaRequest,
    FlashcardsRequest,
    GuiaRequest,
    LecturaComprensivaRequest,
    MapaConceptualRequest,
    MaterialListItem,
    MaterialRead,
    MaterialUpdate,
    MaterialVisibilityRequest,
    ParaColorearRequest,
    PlanRefuerzoRequest,
    QuizRapidoRequest,
    RubricaRequest,
    SopaLetrasRequest,
    TallerRequest,
    UnirColumnasRequest,
)
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/herramientas", tags=["herramientas"])


@router.get("", response_model=list[MaterialListItem])
async def listar_materiales(
    tipo: str | None = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.list_materials(
        db, current_user.id, tipo=tipo, limit=min(limit, 100), offset=offset
    )


@router.post("/sopa-letras", status_code=status.HTTP_201_CREATED)
async def sopa_letras(
    req: SopaLetrasRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_sopa_letras(db, req, current_user)


@router.post("/crucigrama", status_code=status.HTTP_201_CREATED)
async def crucigrama(
    req: CrucigramaRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_crucigrama(db, req, current_user)


@router.post("/unir-columnas", status_code=status.HTTP_201_CREATED)
async def unir_columnas(
    req: UnirColumnasRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_unir_columnas(db, req, current_user)


@router.post("/emparejar", status_code=status.HTTP_201_CREATED)
async def emparejar(
    req: EmparejarRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_emparejar(db, req, current_user)


@router.post("/cuento", status_code=status.HTTP_201_CREATED)
async def cuento(
    req: CuentoRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_cuento(db, req, current_user)


@router.post("/para-colorear", status_code=status.HTTP_201_CREATED)
async def para_colorear(
    req: ParaColorearRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_para_colorear(db, req, current_user)


@router.post("/guia", status_code=status.HTTP_201_CREATED)
async def guia(
    req: GuiaRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_guia(db, req, current_user)


@router.post("/taller", status_code=status.HTTP_201_CREATED)
async def taller(
    req: TallerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_taller(db, req, current_user)


@router.post("/examen-from-chat", status_code=status.HTTP_201_CREATED)
async def examen_from_chat(
    req: ExamenFromChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_examen_from_chat(db, req, current_user)


@router.post("/examen", status_code=status.HTTP_201_CREATED)
async def examen(
    req: ExamenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_examen(db, req, current_user)


@router.post("/rubrica", status_code=status.HTTP_201_CREATED)
async def rubrica(
    req: RubricaRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_rubrica(db, req, current_user)


@router.post("/ficha", status_code=status.HTTP_201_CREATED)
async def ficha(
    req: FichaRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_ficha(db, req, current_user)


@router.post("/quiz-rapido", status_code=status.HTTP_201_CREATED)
async def quiz_rapido(
    req: QuizRapidoRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_quiz_rapido(db, req, current_user)


@router.post("/lectura-comprensiva", status_code=status.HTTP_201_CREATED)
async def lectura_comprensiva(
    req: LecturaComprensivaRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_lectura_comprensiva(db, req, current_user)


@router.post("/mapa-conceptual", status_code=status.HTTP_201_CREATED)
async def mapa_conceptual(
    req: MapaConceptualRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_mapa_conceptual(db, req, current_user)


@router.post("/flashcards", status_code=status.HTTP_201_CREATED)
async def flashcards(
    req: FlashcardsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_flashcards(db, req, current_user)


@router.post("/plan-refuerzo", status_code=status.HTTP_201_CREATED)
async def plan_refuerzo(
    req: PlanRefuerzoRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.gen_plan_refuerzo(db, req, current_user)


@router.get("/materias/{materia_id}/recursos", response_model=list[MaterialListItem])
async def listar_recursos_de_materia(
    materia_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    return await service.list_materials_for_materia(db, materia_id, current_user)

@router.get("/{material_id}", response_model=MaterialRead)
async def ver_material(
    material_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    material = await service.get_material_for_user(db, material_id, current_user)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material no encontrado")
    return material


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def borrar_material(
    material_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    deleted = await service.delete_material(db, material_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material no encontrado")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{material_id}/pdf")
async def material_pdf(
    material_id: UUID,
    soluciones: bool = False,
    descargar: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Devuelve el material renderizado como PDF (estética de la app)."""
    from app.modules.herramientas.pdf_render import render_material_pdf

    if current_user.rol == UserRole.ESTUDIANTE.value and soluciones:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Las soluciones son exclusivas del docente")
    material = await service.get_material_for_user(db, material_id, current_user)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material no encontrado")

    pdf = render_material_pdf(material, soluciones=soluciones)
    slug = (material.get("titulo") or "material").strip().replace('"', "")
    disposition = "attachment" if descargar else "inline"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'{disposition}; filename="{slug}.pdf"',
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.patch("/{material_id}", status_code=status.HTTP_200_OK)
async def actualizar_material(
    material_id: UUID,
    payload: MaterialUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Actualiza campos del material (titulo, materia_id, contenido_json)."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    material = await service.get_material(db, material_id, current_user.id)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material no encontrado")
    updated = await service.update_material(
        db, material_id, current_user, payload.model_dump(exclude_unset=True)
    )
    return updated


@router.post("/{material_id}/asignar-apoyo", response_model=MaterialRead)
async def asignar_como_apoyo(
    material_id: UUID,
    req: AsignarMaterialApoyoRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.assign_material_as_support(
        db, material_id, current_user, req.materia_id
    )


@router.post("/{material_id}/retirar-apoyo", response_model=MaterialRead)
async def retirar_apoyo(
    material_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.withdraw_support_material(db, material_id, current_user)

@router.patch("/{material_id}/visibilidad", response_model=MaterialRead)
async def cambiar_visibilidad_material(
    material_id: UUID,
    req: MaterialVisibilityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.set_material_visibility(
        db, material_id, current_user, visible=req.visible
    )

@router.post("/{material_id}/duplicar", status_code=status.HTTP_201_CREATED)
async def duplicar_material(
    material_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Clona un material existente como copia editable."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.duplicar_material(db, material_id, current_user.id)


@router.get("/{material_id}/evaluaciones", response_model=list[EvaluacionRead])
async def listar_evaluaciones_del_material(
    material_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[object]:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.list_evaluations_for_material(db, material_id, current_user)


@router.post(
    "/{material_id}/convertir-evaluacion",
    response_model=EvaluacionRead,
    status_code=status.HTTP_201_CREATED,
)
async def convertir_a_evaluacion(
    material_id: UUID,
    req: ConvertirEvaluacionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Asigna cualquier material evaluable al ciclo canonico de evaluaciones."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.convertir_a_evaluacion(db, material_id, current_user, req)
