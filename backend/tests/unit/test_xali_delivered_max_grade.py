"""Spec 145: Xali entrega la nota máxima para presentar la nota con la regla común."""
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.modules.xali import service
from app.modules.xali.schemas import XaliEvaluacionEntregadaRead


@pytest.mark.asyncio
async def test_lista_entregadas_incluye_nota_maxima(monkeypatch):
    monkeypatch.setattr(service, "_can_chat_with_calificacion", lambda _c: True)
    calificacion = SimpleNamespace(estado="publicada", nota_confirmada=Decimal("2.95"))
    entrega = SimpleNamespace(id=uuid4())
    evaluacion = SimpleNamespace(id=uuid4(), nombre="Multiplicación", nota_maxima=Decimal("5.00"))
    materia = SimpleNamespace(id=uuid4(), nombre="Matemáticas")
    result = MagicMock()
    result.all.return_value = [(calificacion, entrega, evaluacion, materia)]
    db = SimpleNamespace(execute=AsyncMock(return_value=result))

    items = await service.list_delivered_evaluations_for_student(db, uuid4())

    read = XaliEvaluacionEntregadaRead.model_validate(items[0])
    assert read.nota_confirmada == Decimal("2.95")
    assert read.nota_maxima == Decimal("5.00")


def test_nota_maxima_es_opcional_para_clientes_existentes():
    read = XaliEvaluacionEntregadaRead(
        evaluacion_id=uuid4(), materia_id=uuid4(), materia_nombre="M", evaluacion_nombre="E",
        entrega_id=uuid4(), estado_calificacion="publicada", nota_confirmada=None, puede_chatear=False,
    )
    assert read.nota_maxima is None
