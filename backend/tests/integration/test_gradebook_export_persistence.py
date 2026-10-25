from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from spec128_database import database128  # noqa: F401
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.calificaciones.service import list_calificaciones_for_evaluacion
from app.modules.evaluaciones.models import Evaluacion
from app.modules.materias.models import Materia
from app.modules.users.models import User


@pytest.mark.asyncio
async def test_128_export_reads_real_current_attempts_without_mutation(database128):
    sessions = async_sessionmaker(database128, expire_on_commit=False)
    async with sessions() as db:
        teacher = User(nombre="Docente sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="profesor")
        student = User(nombre="Alumno sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="estudiante")
        db.add_all([teacher, student]); await db.flush()
        subject = Materia(profesor_id=teacher.id, nombre="CSV sintético", codigo_matricula=uuid4().hex[:12])
        db.add(subject); await db.flush()
        evaluation = Evaluacion(materia_id=subject.id, profesor_id=teacher.id, nombre="Lectura", tipo_origen="nativa",
                                estado="publicada", modalidad="fisica", nota_maxima=5, politica_intento="mejor_puntaje")
        db.add(evaluation); await db.flush()
        deliveries = [Entrega(evaluacion_id=evaluation.id, estudiante_id=student.id, materia_id=subject.id,
                              tipo="online", estado="calificada", respuesta_texto="Respuesta sintética") for _ in range(3)]
        db.add_all(deliveries); await db.flush()
        grades = [Calificacion(evaluacion_id=evaluation.id, entrega_id=deliveries[i].id, estudiante_id=student.id, materia_id=subject.id,
                               profesor_id=teacher.id, nota_confirmada=Decimal(score), nota_sugerida=Decimal("2"),
                               estado=state, resultado_json={}, created_at=datetime(2026, 10, 25) + timedelta(seconds=i))
                  for i, (score, state) in enumerate([("4.25", "ajustada"), ("0", "publicada"), ("5", "anulada")])]
        db.add_all(grades); await db.commit()
        before = [(row.id, row.nota_confirmada, row.estado, row.updated_at) for row in grades]
        selected = await list_calificaciones_for_evaluacion(db, evaluation.id)
        assert [row.id for row in selected] == [grades[0].id]
        evaluation.politica_intento = "ultimo_intento"; await db.commit()
        assert [row.id for row in await list_calificaciones_for_evaluacion(db, evaluation.id)] == [grades[1].id]
        current = list(await db.scalars(select(Calificacion).order_by(Calificacion.created_at)))
        assert [(row.id, row.nota_confirmada, row.estado, row.updated_at) for row in current] == before
