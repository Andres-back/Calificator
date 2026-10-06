"""Regresión en PostgreSQL aislado; nunca usa DATABASE_URL como fallback."""
import asyncio
import os
from copy import deepcopy
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import import_models
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.evaluaciones.models import Evaluacion, EvaluacionBlueprint
from app.modules.evaluaciones.schemas import EvaluacionUpdate
from app.modules.evaluaciones.service import get_evaluation_or_404, update_evaluation
from app.modules.materias.models import Materia
from app.modules.users.models import User

TEST_URL = os.getenv("SPEC084_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not TEST_URL, reason="Requiere SPEC084_TEST_DATABASE_URL aislada")
import_models()


async def fixture(db):
    teacher = User(nombre="Docente sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="profesor")
    student = User(nombre="Alumno sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="estudiante")
    db.add_all([teacher, student])
    await db.flush()
    subject = Materia(profesor_id=teacher.id, nombre="Materia sintética", codigo_matricula=uuid4().hex[:12])
    db.add(subject)
    await db.flush()
    evaluation = Evaluacion(
        profesor_id=teacher.id, materia_id=subject.id, nombre="Evaluación histórica", tipo_origen="externa_digitalizada",
        estado="publicada", modalidad="fisica", nota_maxima=5, recepcion_habilitada=True,
        criterios=[{"nombre": "Dominio", "puntaje_maximo": 5}],
        preguntas=[{"numero": 1, "tipo": "abierta", "enunciado": "Representa doce", "puntaje": 5, "metadata": {"legacy": [1, 2]}}],
        respuestas_esperadas=[{"numero": 1, "respuesta": {"alternatives": ["12", "doce"]}}],
    )
    db.add(evaluation)
    await db.flush()
    blueprint = EvaluacionBlueprint(evaluacion_id=evaluation.id, nivel_contexto="reconstruido", dba=[], metas=[],
        criterios=evaluation.criterios, preguntas=evaluation.preguntas, respuestas_esperadas=evaluation.respuestas_esperadas,
        errores_comunes=["Histórico"], contexto_rag=[{"source": "ficticia"}], reglas_feedback={"legacy": True})
    submission = Entrega(evaluacion_id=evaluation.id, estudiante_id=student.id, materia_id=subject.id, tipo="foto", estado="calificada", archivo_url="fixture/no-real-file.jpg", visual_text_json={"keep": True})
    db.add_all([blueprint, submission])
    await db.flush()
    grade = Calificacion(evaluacion_id=evaluation.id, estudiante_id=student.id, profesor_id=teacher.id,
        materia_id=subject.id, entrega_id=submission.id, estado="confirmada", nota_confirmada=3.8,
        feedback="Retroalimentación histórica sintética", resultado_json={"legacy": [1, 2]})
    db.add(grade)
    await db.commit()
    return evaluation.id, submission.id, grade.id


@pytest.mark.asyncio
async def test_limited_update_preserves_persisted_evidence_grades_and_complex_keys():
    engine = create_async_engine(TEST_URL)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as db:
            evaluation_id, submission_id, grade_id = await fixture(db)
            evaluation = await get_evaluation_or_404(db, evaluation_id)
            before = deepcopy((evaluation.preguntas, evaluation.respuestas_esperadas, evaluation.blueprint.preguntas,
                evaluation.blueprint.respuestas_esperadas, evaluation.blueprint.contexto_rag, evaluation.blueprint.reglas_feedback))
            await update_evaluation(db, evaluation, EvaluacionUpdate(expected_updated_at=evaluation.updated_at,
                criterios=[{"nombre": "Comprensión", "peso_porcentaje": 100, "puntaje_maximo": 5}]))
        async with sessions() as db:
            saved = await get_evaluation_or_404(db, evaluation_id)
            assert (saved.preguntas, saved.respuestas_esperadas, saved.blueprint.preguntas,
                saved.blueprint.respuestas_esperadas, saved.blueprint.contexto_rag, saved.blueprint.reglas_feedback) == before
            submission = await db.get(Entrega, submission_id)
            grade = await db.get(Calificacion, grade_id)
            assert submission.archivo_url == "fixture/no-real-file.jpg"
            assert submission.visual_text_json == {"keep": True}
            assert grade.estado == "confirmada" and float(grade.nota_confirmada) == 3.8
            assert grade.feedback == "Retroalimentación histórica sintética"
            assert grade.resultado_json == {"legacy": [1, 2]}
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_concurrent_criteria_edits_cannot_overwrite_the_first_saved_version():
    engine = create_async_engine(TEST_URL)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with sessions() as setup:
            evaluation_id, _, _ = await fixture(setup)
        async with sessions() as first, sessions() as second:
            current = await get_evaluation_or_404(first, evaluation_id)
            stale = await get_evaluation_or_404(second, evaluation_id)
            version = current.updated_at
            await first.scalar(select(Evaluacion).where(Evaluacion.id == evaluation_id).with_for_update())
            pending = asyncio.create_task(update_evaluation(second, stale, EvaluacionUpdate(expected_updated_at=version,
                criterios=[{"nombre": "Segunda", "puntaje_maximo": 5}])))
            await asyncio.sleep(0.05)
            assert not pending.done()
            await update_evaluation(first, current, EvaluacionUpdate(expected_updated_at=version,
                criterios=[{"nombre": "Primera", "puntaje_maximo": 5}]))
            with pytest.raises(HTTPException) as exc:
                await asyncio.wait_for(pending, timeout=5)
            assert exc.value.status_code == 409
            await second.rollback()
        async with sessions() as db:
            assert (await get_evaluation_or_404(db, evaluation_id)).criterios[0]["nombre"] == "Primera"
    finally:
        await engine.dispose()
