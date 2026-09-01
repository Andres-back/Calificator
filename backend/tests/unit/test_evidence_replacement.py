from __future__ import annotations

import asyncio
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from app.modules.calificaciones import router
from app.modules.calificaciones.models import Entrega
from app.modules.calificaciones.schemas import ReemplazoEvidenciaCreate
from app.modules.authorization.catalog import default_permissions_for_role
from app.shared.enums import CalificacionEstado, EntregaEstado, EntregaTipo, UserRole


class FakeDB:
    def __init__(self) -> None:
        self.committed = False
        self.refreshed: list[object] = []

    async def commit(self) -> None:
        self.committed = True

    async def refresh(self, value: object) -> None:
        self.refreshed.append(value)


def test_teacher_requests_complete_replacement_without_deleting_current_file(monkeypatch) -> None:
    teacher = SimpleNamespace(
        id=uuid4(), rol=UserRole.PROFESOR.value,
        _effective_permissions=default_permissions_for_role(UserRole.PROFESOR.value),
    )
    delivery = Entrega(
        id=uuid4(),
        evaluacion_id=uuid4(),
        estudiante_id=uuid4(),
        materia_id=uuid4(),
        tipo=EntregaTipo.PDF.value,
        estado=EntregaEstado.CALIFICADA.value,
        archivo_url="/uploads/entregas/paquete-anterior.pdf",
        visual_text_json={
            "pipeline_status": "completed",
            "evidencia_consolidada": {"tipo": "fotos", "paginas": 2},
        },
    )
    grade = SimpleNamespace(
        evaluacion_id=delivery.evaluacion_id,
        entrega=delivery,
        estado=CalificacionEstado.CONFIRMADA.value,
        revisado_por_docente=True,
        nota_confirmada=Decimal("4.0"),
    )
    db = FakeDB()

    async def get_grade(*_args, **_kwargs):
        return grade

    async def can_manage(*_args, **_kwargs):
        return SimpleNamespace(id=delivery.evaluacion_id)

    monkeypatch.setattr(router.service, "get_calificacion_or_404", get_grade)
    monkeypatch.setattr(router.evaluaciones_service, "ensure_can_manage_evaluation", can_manage)

    result = asyncio.run(
        router.solicitar_reemplazo_evidencia(
            uuid4(),
            ReemplazoEvidenciaCreate(motivo="Falta la segunda hoja completa."),
            current_user=teacher,
            db=db,
        )
    )

    assert db.committed is True
    assert delivery.archivo_url == "/uploads/entregas/paquete-anterior.pdf"
    assert delivery.estado == EntregaEstado.REQUIERE_REINTENTO.value
    assert delivery.reemplazo_solicitado is True
    assert delivery.motivo_reemplazo == "Falta la segunda hoja completa."
    assert delivery.evidencia_paginas == 2
    assert grade.estado == CalificacionEstado.REQUIERE_REVISION.value
    assert grade.revisado_por_docente is False
    assert grade.nota_confirmada is None
    assert result.archivo_url == f"/api/calificaciones/entregas/{delivery.id}/evidencia"
