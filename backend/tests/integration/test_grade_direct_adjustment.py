"""Opt-in PostgreSQL proof of direct grade decisions using only synthetic rows."""
import asyncio
import os
from decimal import Decimal
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient
import pytest
import pytest_asyncio
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.permissions import get_current_user
from app.db.base import Base, import_models
from app.db.session import get_db
from app.modules.calificaciones import service
from app.modules.calificaciones.breakdown_models import CalificacionAjuste, CalificacionComponente, CalificacionDesglose
from app.modules.calificaciones.models import Calificacion, Entrega
from app.modules.calificaciones.router import router
from app.modules.calificaciones.schemas import AjustarNota
from app.modules.evaluaciones.models import Evaluacion
from app.modules.feedback_sharing.models import FeedbackPublication
from app.modules.materias.models import Materia
from app.modules.matriculas.models import Matricula
from app.modules.users.models import User


@pytest_asyncio.fixture
async def database134(monkeypatch):
    url = os.getenv("SPEC134_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Requiere SPEC134_TEST_DATABASE_URL sintética y aislada")
    parsed = urlparse(url)
    assert parsed.hostname in {"localhost", "127.0.0.1", "spec134-db"} and parsed.path == "/spec134"
    schema = "spec134_" + uuid4().hex
    import_models()
    admin = create_async_engine(url)
    async with admin.begin() as connection:
        await connection.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
        await connection.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_async_engine(url, connect_args={"server_settings": {"search_path": schema + ",public"}},
                                 execution_options={"schema_translate_map": {None: schema}})
    monkeypatch.setattr(settings, "FEEDBACK_SHARING_ENABLED", True)
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        yield engine
    finally:
        await engine.dispose()
        async with admin.begin() as connection:
            assert schema.startswith("spec134_") and len(schema) == 40
            await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await admin.dispose()


async def seed(db, *, incomplete=False, breakdown=True):
    teacher = User(nombre="Docente sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="profesor")
    student = User(nombre="Alumno sintético", email=f"{uuid4()}@example.test", password_hash="no-login", rol="estudiante")
    db.add_all([teacher, student]); await db.flush()
    subject = Materia(profesor_id=teacher.id, nombre="Nota sintética", codigo_matricula=uuid4().hex[:12])
    db.add(subject); await db.flush()
    db.add(Matricula(materia_id=subject.id, estudiante_id=student.id))
    evaluation = Evaluacion(materia_id=subject.id, profesor_id=teacher.id, nombre="Lectura sintética", tipo_origen="nativa", estado="publicada", modalidad="online", nota_maxima=5)
    db.add(evaluation); await db.flush()
    delivery = Entrega(evaluacion_id=evaluation.id, estudiante_id=student.id, materia_id=subject.id, tipo="online", estado="revisada", respuesta_texto="Respuesta sintética conservada")
    db.add(delivery); await db.flush()
    grade = Calificacion(evaluacion_id=evaluation.id, entrega_id=delivery.id, estudiante_id=student.id, materia_id=subject.id, profesor_id=teacher.id,
                         nota_sugerida=Decimal("4.1"), nota_confirmada=Decimal("4.1"), estado="publicada", revisado_por_docente=True,
                         feedback="Identificaste el personaje. Explica por qué cambió de opinión.", resultado_json={"grader_a": {"nota": 4.1}})
    db.add(grade); await db.flush()
    active = None
    if breakdown:
        active = CalificacionDesglose(calificacion_id=grade.id, version=1, origen="automatico", activo=True,
            cobertura_estado="incompleta" if incomplete else "completa", puntos_obtenidos=Decimal("1.9") if incomplete else Decimal("3.9"), puntos_posibles=5,
            nota_maxima=5, nota_base=Decimal("1.9") if incomplete else Decimal("3.9"), ajuste_global=Decimal("0.2"), nota_antes_redondeo=Decimal("4.1"), regla_redondeo="half_up", decimales=2,
            nota_final=Decimal("4.1"), requiere_revision=incomplete, bloqueos_json=["componente_pendiente:pregunta:2"] if incomplete else [], procedencia_json={"primera_sugerencia": 4.1})
        active.componentes = [CalificacionComponente(clave=f"pregunta:{i}", orden=i, numero=str(i), tipo="pregunta", titulo=f"Pregunta {i}",
            respuesta_estudiante=f"Respuesta {i}", respuesta_referencia=f"Referencia {i}", puntos_obtenidos=points, puntos_maximos=maximum,
            estado="revision_pendiente" if points is None else "parcial", explicacion_verificable="Análisis original", origen="consenso_ia",
            requiere_revision=points is None, evidencia_json={"paginas": [1]}, valoraciones_json=[{"puntaje": float(points or 0), "confianza": 0.91}])
            for i, points, maximum in [(1, Decimal("1.9"), 3), (2, None if incomplete else Decimal("2"), 2)]]
        db.add(active); await db.flush()
    publication = FeedbackPublication(calificacion_id=grade.id, estudiante_id=student.id, evaluacion_id=evaluation.id, materia_id=subject.id,
        authorized_by=teacher.id, breakdown_id=active.id if active else None, revision=1, content_fingerprint="a" * 64, payload_json={"nota": 4.1}, state="authorized")
    db.add(publication); await db.commit(); await db.refresh(grade)
    return teacher, student, grade, delivery, active, publication


def change(grade, active, score="4.5"):
    return AjustarNota(nota_confirmada=score, actualizado_en_esperado=grade.updated_at,
                      version_desglose_esperada=active.version if active else None, operacion_id=uuid4())


@pytest.mark.asyncio
@pytest.mark.parametrize("incomplete,has_breakdown", [(False, True), (True, True), (False, False)])
async def test_persisted_note_history_and_evidence_are_consistent(database134, incomplete, has_breakdown):
    sessions = async_sessionmaker(database134, expire_on_commit=False)
    async with sessions() as db:
        teacher, _, grade, delivery, active, publication = await seed(db, incomplete=incomplete, breakdown=has_breakdown)
        grade_id, publication_id, delivery_id = grade.id, publication.id, delivery.id
        request = change(grade, active)
        await service.ajustar_nota(db, grade, request, actor=teacher)
        await service.ajustar_nota(db, grade, request, actor=teacher)
    async with sessions() as db:
        saved = await db.get(Calificacion, grade_id)
        assert saved.nota_confirmada == Decimal("4.5") and saved.nota_sugerida == Decimal("4.1")
        book = await service.list_calificaciones_for_evaluacion(db, saved.evaluacion_id)
        assert [(row.id, row.nota_confirmada) for row in book] == [(grade_id, Decimal("4.5"))]
        assert saved.estado == "ajustada" and saved.resultado_json["grader_a"] == {"nota": 4.1}
        assert len(saved.resultado_json["_timeline"]) == 1
        assert saved.resultado_json["_timeline"][0]["actor_id"] == str(teacher.id)
        assert (await db.get(Entrega, delivery_id)).respuesta_texto == "Respuesta sintética conservada"
        assert (await db.get(FeedbackPublication, publication_id)).state == "suspended"
        current = await service.get_active_breakdown(db, grade_id)
        if has_breakdown:
            assert current.version == 2 and current.nota_final == saved.nota_confirmada
            assert current.ajuste_global == (Decimal("2.6") if incomplete else Decimal("0.6"))
            assert current.componentes[1].puntos_obtenidos == (None if incomplete else Decimal("2"))
            assert current.componentes[0].origen == "consenso_ia"
            assert current.requiere_revision is incomplete
            assert (await db.scalar(select(func.count()).select_from(CalificacionAjuste))) == 1
            assert (await db.scalar(select(func.count()).select_from(CalificacionDesglose))) == 2
        else:
            assert current is None


@pytest.mark.asyncio
async def test_failure_rolls_back_note_version_audit_and_suspension(database134, monkeypatch):
    sessions = async_sessionmaker(database134, expire_on_commit=False)
    async with sessions() as db:
        teacher, _, grade, _, active, publication = await seed(db)
        grade_id, publication_id = grade.id, publication.id
        real_suspend = service.suspend_grade_publications
        async def fail_after_suspend(db, grade_id):
            await real_suspend(db, grade_id)
            raise RuntimeError("Fallo sintético antes del commit")
        monkeypatch.setattr(service, "suspend_grade_publications", fail_after_suspend)
        with pytest.raises(RuntimeError):
            await service.ajustar_nota(db, grade, change(grade, active), actor=teacher)
    async with sessions() as db:
        saved = await db.get(Calificacion, grade_id)
        assert saved.nota_confirmada == Decimal("4.1") and saved.estado == "publicada"
        assert "_timeline" not in saved.resultado_json
        assert (await db.get(FeedbackPublication, publication_id)).state == "authorized"
        assert (await service.get_active_breakdown(db, grade_id)).version == 1
        assert (await db.scalar(select(func.count()).select_from(CalificacionAjuste))) == 0


@pytest.mark.asyncio
async def test_route_rejects_student_other_teacher_and_missing_permission(database134):
    sessions = async_sessionmaker(database134, expire_on_commit=False)
    async with sessions() as db:
        teacher, student, grade, _, active, _ = await seed(db)
        other = User(nombre="Otro docente", email=f"{uuid4()}@example.test", password_hash="no-login", rol="profesor")
        db.add(other); await db.commit()
        request = change(grade, active).model_dump(mode="json")
        app = FastAPI(); app.include_router(router, prefix="/api")
        actor = {"current": teacher}
        async def current():
            if actor["current"] is None:
                raise HTTPException(401, "Sin sesión")
            return actor["current"]
        async def database():
            yield db
        app.dependency_overrides[get_current_user] = current
        app.dependency_overrides[get_db] = database
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://synthetic.test") as client:
            for denied in [student, other, teacher, None]:
                actor["current"] = denied
                if denied:
                    denied._effective_permissions = set() if denied is teacher else {"grading.grade"}
                response = await client.patch(f"/api/calificaciones/{grade.id}/ajustar", json=request)
                assert response.status_code == (401 if denied is None else 403)
            actor["current"] = teacher; teacher._effective_permissions = {"grading.grade"}
            response = await client.patch(f"/api/calificaciones/{grade.id}/ajustar", json=request)
            assert response.status_code == 200 and Decimal(response.json()["nota_confirmada"]) == Decimal("4.5")


@pytest.mark.asyncio
async def test_two_simultaneous_decisions_only_one_wins(database134):
    sessions = async_sessionmaker(database134, expire_on_commit=False)
    async with sessions() as db:
        teacher, _, grade, _, active, _ = await seed(db)
        grade_id = grade.id
        requests = [change(grade, active, score) for score in ["4.5", "4.7"]]
    async def save(request):
        async with sessions() as db:
            candidate = await service.get_calificacion_or_404(db, grade_id)
            try:
                await service.ajustar_nota(db, candidate, request, actor=teacher)
                return 200
            except HTTPException as error:
                return error.status_code
    assert sorted(await asyncio.wait_for(asyncio.gather(*(save(request) for request in requests)), timeout=10)) == [200, 409]
    async with sessions() as db:
        assert (await db.scalar(select(func.count()).select_from(CalificacionAjuste))) == 1
