from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import get_current_user, require_role
from app.db.session import get_db
from app.modules.users.models import User
from app.services.pdf_service import generate_report_pdf
from app.shared.enums import UserRole

router = APIRouter(prefix="/reportes", tags=["reportes"])


@router.get("/materia/{materia_id}")
async def reporte_materia(
    materia_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    # Estadísticas de calificaciones por materia
    stats = await db.execute(
        text(
            "SELECT "
            "COUNT(*) as total_calificaciones, "
            "AVG(nota_confirmada) as promedio_confirmada, "
            "AVG(nota_sugerida) as promedio_sugerida, "
            "COUNT(CASE WHEN revisado_por_docente THEN 1 END) as revisadas_por_docente "
            "FROM calificaciones WHERE materia_id=:m"
        ),
        {"m": str(materia_id)},
    )
    row = stats.fetchone()
    return {
        "materia_id": materia_id,
        "total_calificaciones": row.total_calificaciones,
        "promedio_nota_confirmada": float(row.promedio_confirmada or 0),
        "promedio_nota_sugerida": float(row.promedio_sugerida or 0),
        "revisadas_por_docente": row.revisadas_por_docente,
    }


@router.get("/estudiante/{estudiante_id}")
async def reporte_estudiante(
    estudiante_id: UUID,
    materia_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if current_user.rol == UserRole.ESTUDIANTE.value and current_user.id != estudiante_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="No autorizado")

    rows = await db.execute(
        text(
            "SELECT c.*, e.nombre as eval_nombre, e.nota_maxima "
            "FROM calificaciones c "
            "JOIN evaluaciones e ON e.id = c.evaluacion_id "
            "WHERE c.estudiante_id=:s AND c.materia_id=:m "
            "ORDER BY c.created_at DESC"
        ),
        {"s": str(estudiante_id), "m": str(materia_id)},
    )
    calificaciones = [dict(r._mapping) for r in rows]
    notas = [float(c["nota_confirmada"] or c["nota_sugerida"] or 0) for c in calificaciones]
    return {
        "estudiante_id": estudiante_id,
        "materia_id": materia_id,
        "total_evaluaciones": len(calificaciones),
        "promedio": sum(notas) / len(notas) if notas else 0,
        "calificaciones": calificaciones,
    }


@router.get("/profesor/resumen")
async def resumen_profesor(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    rows = await db.execute(
        text(
            "SELECT m.nombre, COUNT(c.id) as total_cals, AVG(c.nota_confirmada) as promedio "
            "FROM materias m "
            "LEFT JOIN calificaciones c ON c.materia_id=m.id "
            "WHERE m.profesor_id=:p "
            "GROUP BY m.id, m.nombre"
        ),
        {"p": str(current_user.id)},
    )
    return {
        "profesor_id": current_user.id,
        "materias": [
            {"nombre": r.nombre, "total_calificaciones": r.total_cals, "promedio": float(r.promedio or 0)}
            for r in rows
        ],
    }


@router.post("/export/pdf")
async def export_pdf(
    materia_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])
    data = await reporte_materia(materia_id, current_user, db)
    pdf_bytes = generate_report_pdf(data, f"Reporte Materia {materia_id}")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=reporte_{materia_id}.pdf"},
    )
