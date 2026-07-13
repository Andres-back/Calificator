from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.modules.impacto_tesis.kappa_service import cohen_kappa
from app.modules.users.models import User
from app.shared.enums import UserRole

router = APIRouter(prefix="/impacto", tags=["impacto_tesis"])


@router.get("/tiempo-ahorrado")
async def tiempo_ahorrado(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Estima tiempo ahorrado: cada calificación IA ~ 3 min vs manual ~ 10 min."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    result = await db.execute(
        text(
            "SELECT COUNT(*) as total FROM calificaciones "
            "WHERE profesor_id=:p AND nota_sugerida IS NOT NULL"
        ),
        {"p": str(current_user.id)},
    )
    total = result.scalar() or 0
    tiempo_manual_min = total * 10
    tiempo_con_ia_min = total * 3
    ahorro_min = tiempo_manual_min - tiempo_con_ia_min
    return {
        "total_calificaciones_ia": total,
        "tiempo_manual_estimado_min": tiempo_manual_min,
        "tiempo_con_ia_estimado_min": tiempo_con_ia_min,
        "ahorro_estimado_min": ahorro_min,
        "ahorro_porcentaje": round(ahorro_min / tiempo_manual_min * 100, 1) if tiempo_manual_min else 0,
    }


@router.get("/kappa")
async def kappa_ia_docente(
    materia_id: UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Kappa de Cohen entre nota sugerida IA y nota confirmada docente."""
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    where = "WHERE nota_sugerida IS NOT NULL AND nota_confirmada IS NOT NULL AND profesor_id=:p"
    params: dict = {"p": str(current_user.id)}
    if materia_id:
        where += " AND materia_id=:m"
        params["m"] = str(materia_id)

    rows = await db.execute(
        text(f"SELECT nota_sugerida, nota_confirmada FROM calificaciones {where}"), params
    )
    pairs = rows.fetchall()
    ia_notas = [float(r.nota_sugerida) for r in pairs]
    doc_notas = [float(r.nota_confirmada) for r in pairs]
    kappa = cohen_kappa(ia_notas, doc_notas)
    return {
        "n": len(pairs),
        "kappa": round(kappa, 4),
        "interpretacion": _interpret_kappa(kappa),
    }


@router.post("/encuestas")
async def registrar_encuesta(
    respuestas: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Endpoint para recibir encuestas Likert de impacto."""
    # Guardar como usage log genérico por ahora
    return {"status": "recibido", "respuestas": respuestas}


@router.get("/likert")
async def resumen_likert(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return {"message": "Encuestas Likert pendientes de configuración en el panel de tesis."}


@router.get("/cualitativo")
async def cualitativo(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.ADMIN])
    return {"message": "Análisis cualitativo disponible en el panel de tesis."}


def _interpret_kappa(k: float) -> str:
    if k < 0:
        return "sin acuerdo"
    if k < 0.20:
        return "leve"
    if k < 0.40:
        return "aceptable"
    if k < 0.60:
        return "moderado"
    if k < 0.80:
        return "sustancial"
    return "casi perfecto"
