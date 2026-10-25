"""Real PostgreSQL preservation, immutable versions and legacy grading checks."""

from copy import deepcopy
import importlib.util
from pathlib import Path
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import HTTPException
import pytest
import pytest_asyncio
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from tests.integration.test_evaluation_visual_persistence import (
    TEST_URL,
    create_domain_tables,
)
from tests.integration import test_evaluation_visual_persistence as persistence

from app.modules.evaluaciones.models import Evaluacion, EvaluacionContenidoVersion
from app.modules.evaluaciones.print_settings import PrintSettings
from app.modules.evaluaciones.print_service import set_print_settings
from app.modules.evaluaciones.visual_service import content_hash
from app.modules.users.models import User
from app.modules.materias.models import Materia
from app.modules.calificaciones.models import Calificacion, Entrega

database = persistence.database
pytestmark = pytest.mark.skipif(
    not TEST_URL, reason="Requires isolated SPEC101_TEST_DATABASE_URL"
)


@pytest_asyncio.fixture
async def print_scope(database):
    async with database.begin() as connection:
        await connection.run_sync(create_domain_tables)
        await connection.execute(
            text("""CREATE TABLE ai_jobs (id uuid PRIMARY KEY, user_id uuid,
            tipo text, estado text, progreso int DEFAULT 0, input_json jsonb, resultado_json jsonb DEFAULT '{}',
            parent_job_id uuid, entrega_id uuid, stage text, attempt_count int DEFAULT 0,
            claim_token text, created_at timestamptz DEFAULT NOW(), started_at timestamptz,
            finished_at timestamptz, heartbeat_at timestamptz, lease_expires_at timestamptz, error text)""")
        )
    sessions = async_sessionmaker(database, expire_on_commit=False)
    async with sessions() as db:
        teacher = User(
            nombre="Synthetic teacher",
            email=f"{uuid4()}@example.test",
            password_hash="no-login",
            rol="profesor",
        )
        student = User(
            nombre="Synthetic pupil",
            email=f"{uuid4()}@example.test",
            password_hash="no-login",
            rol="estudiante",
        )
        db.add_all([teacher, student])
        await db.flush()
        subject = Materia(
            profesor_id=teacher.id,
            nombre="Synthetic subject",
            codigo_matricula=uuid4().hex[:12],
        )
        db.add(subject)
        await db.flush()
        evaluation = Evaluacion(
            materia_id=subject.id,
            profesor_id=teacher.id,
            nombre="Synthetic evaluation",
            tipo_origen="nativa",
            modalidad="fisica",
            preguntas=[
                {"numero": 1, "enunciado": "Explain the river.", "puntaje": "5"}
            ],
            respuestas_esperadas=[{"numero": 1, "respuesta": "A river flows."}],
        )
        db.add(evaluation)
        await db.commit()
        yield db, teacher, student, subject, evaluation


@pytest.mark.asyncio
async def test_migration_only_adds_nullable_column(database):
    async with database.begin() as connection:
        await connection.execute(
            text(
                "CREATE TABLE evaluaciones (id uuid PRIMARY KEY, preguntas jsonb, notas jsonb, evidencia text)"
            )
        )
        await connection.execute(
            text(
                "INSERT INTO evaluaciones VALUES (:id,CAST(:questions AS jsonb),CAST(:grades AS jsonb),'synthetic.png')"
            ),
            {"id": uuid4(), "questions": '[{"numero":1}]', "grades": '{"nota":3.2}'},
        )
        before = dict(
            (await connection.execute(text("SELECT * FROM evaluaciones")))
            .mappings()
            .one()
        )

        def migrate(sync):
            path = (
                Path(__file__).parents[2]
                / "alembic/versions/202610240002_evaluation_print_settings.py"
            )
            spec = importlib.util.spec_from_file_location("print_migration", path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            with Operations.context(MigrationContext.configure(sync)):
                module.upgrade()
            with pytest.raises(RuntimeError):
                module.downgrade()

        await connection.run_sync(migrate)
        after = dict(
            (await connection.execute(text("SELECT * FROM evaluaciones")))
            .mappings()
            .one()
        )
        assert after.pop("configuracion_impresion") is None
        assert after == before


@pytest.mark.asyncio
@pytest.mark.parametrize("versioned", [False, True])
async def test_print_only_preserves_grade_evidence_keys_and_grading_context(
    print_scope, versioned
):
    from app.modules.evaluaciones.grading_visual_context import grading_job_reference

    db, teacher, student, subject, evaluation = print_scope
    original = {
        "nombre": evaluation.nombre,
        "descripcion": None,
        "nota_maxima": "5",
        "preguntas": deepcopy(evaluation.preguntas),
        "respuestas_esperadas": deepcopy(evaluation.respuestas_esperadas),
        "contenido_visual": None,
        "claves_pendientes_revision": [],
        "blueprint": None,
        "metas_profesor": [],
        "criterios": [],
        "modalidad": 'fisica',
    }
    revision = None
    if versioned:
        revision = EvaluacionContenidoVersion(
            evaluacion_id=evaluation.id,
            numero_version=1,
            autor_id=teacher.id,
            motivo="Synthetic baseline",
            origen="subido",
            snapshot_json=original,
            content_hash=content_hash(original),
            recurso_ids=[],
            coverage_json={},
            legacy_baseline=True,
        )
        db.add(revision)
        await db.flush()
        evaluation.contenido_version_id = revision.id
    delivery = Entrega(
        evaluacion_id=evaluation.id,
        estudiante_id=student.id,
        materia_id=subject.id,
        tipo="foto",
        archivo_url="synthetic/evidence.png",
        contenido_version_id=evaluation.contenido_version_id,
    )
    db.add(delivery)
    await db.flush()
    grade = Calificacion(
        evaluacion_id=evaluation.id,
        entrega_id=delivery.id,
        estudiante_id=student.id,
        materia_id=subject.id,
        profesor_id=teacher.id,
        nota_confirmada=3.2,
        estado="publicada",
        resultado_json={"decision_docente": True},
    )
    db.add(grade)
    await db.commit()
    await db.refresh(evaluation)
    before_date, before_version = evaluation.updated_at, evaluation.contenido_version_id
    await set_print_settings(
        db,
        evaluation.id,
        PrintSettings(distribucion="amplia"),
        expected_updated_at=before_date,
        expected_version_id=before_version,
        actor_id=teacher.id,
    )
    await db.commit()
    assert (
        delivery.archivo_url == "synthetic/evidence.png"
        and delivery.contenido_version_id == before_version
    )
    await db.refresh(grade)
    assert float(grade.nota_confirmada) == 3.2 and grade.estado == "publicada"
    assert grade.resultado_json == {"decision_docente": True}
    assert (
        evaluation.preguntas == original["preguntas"]
        and evaluation.respuestas_esperadas == original["respuestas_esperadas"]
    )
    reference = await grading_job_reference(db, evaluation, delivery)
    assert reference.get("contenido_version_id") == (
        str(before_version) if versioned else None
    )
    from app.modules.evaluaciones.grading_visual_context import load_grading_context
    await db.refresh(evaluation, ['blueprint'])
    context = await load_grading_context(db, evaluation, delivery, expected_reference=reference)
    async def synthetic_grader(blueprint, response):
        return float(blueprint['preguntas'][0]['puntaje']) if response == blueprint['respuestas_esperadas'][0]['respuesta'] else 0
    assert await synthetic_grader(context.blueprint, 'A river flows.') == 5
    if versioned:
        current = await db.get(
            EvaluacionContenidoVersion, evaluation.contenido_version_id
        )
        assert current.id != revision.id and revision.snapshot_json == original
        copy = deepcopy(current.snapshot_json)
        assert (
            copy.pop("configuracion_impresion")["distribucion"] == "amplia"
            and copy == original
        )
    else:
        assert evaluation.contenido_version_id is None
        assert not list(await db.scalars(select(EvaluacionContenidoVersion)))
    count = len(list(await db.scalars(select(EvaluacionContenidoVersion))))
    await set_print_settings(
        db,
        evaluation.id,
        PrintSettings(distribucion="amplia"),
        expected_updated_at=evaluation.updated_at,
        expected_version_id=evaluation.contenido_version_id,
        actor_id=teacher.id,
    )
    await db.commit()
    assert len(list(await db.scalars(select(EvaluacionContenidoVersion)))) == count
    with pytest.raises(HTTPException) as error:
        await set_print_settings(
            db,
            evaluation.id,
            PrintSettings(),
            expected_updated_at=before_date,
            expected_version_id=before_version,
            actor_id=teacher.id,
        )
    assert error.value.status_code == 409


@pytest.mark.asyncio
@pytest.mark.parametrize("role", ["estudiante", "profesor", "admin"])
async def test_preparation_rechecks_owner_permissions(print_scope, role):
    from app.modules.evaluaciones.print_preparation import (
        authorize,
        PrintPreparationRequest,
    )

    db, teacher, student, subject, evaluation = print_scope
    outsider = User(
        nombre="Other",
        email=f"{uuid4()}@example.test",
        password_hash="no-login",
        rol=role,
    )
    db.add(outsider)
    await db.flush()
    outsider._effective_permissions = (
        frozenset({"evaluations.update"}) if role != "estudiante" else frozenset()
    )
    request = PrintPreparationRequest(
        evaluacion_id=evaluation.id,
        expected_updated_at=evaluation.updated_at,
        configuracion={},
    )
    if role == "admin":
        assert (await authorize(db, outsider, request)).id == evaluation.id
    else:
        with pytest.raises(HTTPException) as error:
            await authorize(db, outsider, request)
        assert error.value.status_code == 403
