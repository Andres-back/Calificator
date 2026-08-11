import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4


from app.modules.calificaciones import service
from app.modules.calificaciones.schemas import CalificacionManualCreate
from app.shared.enums import CalificacionEstado


class FakeDB:
    def __init__(self, *, scalar_values=None, scalars_values=None):
        self.scalar_values = list(scalar_values or [])
        self.scalars_values = list(scalars_values or [])
        self.added = []
        self.commits = 0

    async def scalar(self, _statement):
        return self.scalar_values.pop(0)

    async def scalars(self, _statement):
        return self.scalars_values.pop(0)

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        self.commits += 1

    async def refresh(self, _value):
        return None


def test_teacher_can_set_and_publish_grade_without_document() -> None:
    student_id = uuid4()
    teacher = SimpleNamespace(id=uuid4(), nombre="Docente")
    evaluation = SimpleNamespace(
        id=uuid4(), materia_id=uuid4(), nota_maxima=Decimal("5"),
    )
    db = FakeDB(scalar_values=[uuid4(), None])

    grade = asyncio.run(service.set_manual_grade(
        db,
        evaluation,
        CalificacionManualCreate(
            estudiante_id=student_id,
            nota_confirmada=Decimal("3.5"),
            motivo="Valoracion directa del docente",
        ),
        teacher,
    ))

    assert grade.entrega_id is None
    assert grade.estudiante_id == student_id
    assert grade.nota_confirmada == Decimal("3.5")
    assert grade.estado == CalificacionEstado.PUBLICADA.value
    assert grade.resultado_json["origen_nota"] == "manual_docente"
    assert db.commits == 1


def test_deadline_assigns_one_published_zero_only_to_missing_students() -> None:
    delivered, graded, missing = uuid4(), uuid4(), uuid4()
    deadline = datetime.now(timezone.utc) - timedelta(minutes=1)
    evaluation = SimpleNamespace(
        id=uuid4(), materia_id=uuid4(), profesor_id=uuid4(),
        fecha_limite_entrega=deadline,
    )
    db = FakeDB(scalar_values=[evaluation.id], scalars_values=[
        [delivered, graded, missing],
        [delivered],
        [graded],
    ])

    created = asyncio.run(service.assign_overdue_zero_grades(db, evaluation))

    assert len(created) == 1
    assert created[0].estudiante_id == missing
    assert created[0].nota_confirmada == Decimal("0")
    assert created[0].estado == CalificacionEstado.PUBLICADA.value
    assert created[0].resultado_json["sin_entrega"] is True
    assert db.commits == 1


def test_duration_minutes_do_not_create_a_delivery_deadline() -> None:
    evaluation = SimpleNamespace(
        fecha_limite_entrega=None,
        fecha_publicacion=datetime.now(timezone.utc) - timedelta(days=1),
        tiempo_limite_minutos=15,
    )
    db = FakeDB()

    assert service.evaluation_deadline(evaluation) is None
    assert asyncio.run(service.assign_overdue_zero_grades(db, evaluation)) == []
    assert db.commits == 0


def test_draft_evaluation_never_assigns_automatic_zeros() -> None:
    evaluation = SimpleNamespace(
        estado="borrador",
        fecha_limite_entrega=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db = FakeDB()

    assert asyncio.run(service.assign_overdue_zero_grades(db, evaluation)) == []
    assert db.commits == 0
