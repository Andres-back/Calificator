from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.modules.herramientas import service
from app.modules.herramientas.schemas import (
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


@router.get("/{material_id}", response_model=MaterialRead)
async def ver_material(
    material_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    material = await service.get_material(db, material_id, current_user.id)
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Devuelve el material renderizado como PDF (estética de la app)."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    from app.modules.herramientas.pdf_render import render_material_pdf

    material = await service.get_material(db, material_id, current_user.id)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material no encontrado")

    pdf = render_material_pdf(material, soluciones=soluciones)
    slug = (material.get("titulo") or "material").strip().replace('"', "")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{slug}.pdf"'},
    )


@router.patch("/{material_id}", status_code=status.HTTP_200_OK)
async def actualizar_material(
    material_id: UUID,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Actualiza campos del material (titulo, materia_id, contenido_json)."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    material = await service.get_material(db, material_id, current_user.id)
    if material is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material no encontrado")
    updated = await service.update_material(db, material_id, current_user.id, payload)
    return updated


@router.post("/{material_id}/duplicar", status_code=status.HTTP_201_CREATED)
async def duplicar_material(
    material_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Clona un material existente como copia editable."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.duplicar_material(db, material_id, current_user.id)


class ConvertirEvaluacionRequest(BaseModel):
    materia_id: UUID | None = None
    nombre: str | None = None
    nota_maxima: float = 5.0


@router.post("/{material_id}/convertir-evaluacion", status_code=status.HTTP_201_CREATED)
async def convertir_a_evaluacion(
    material_id: UUID,
    req: ConvertirEvaluacionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Convierte un examen/quiz/rubrica en una evaluacion BORRADOR."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    return await service.convertir_a_evaluacion(
        db, material_id, current_user.id,
        materia_id=req.materia_id,
        nombre=req.nombre,
        nota_maxima=req.nota_maxima,
    )
