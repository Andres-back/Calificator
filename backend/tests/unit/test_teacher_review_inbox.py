import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.modules.calificaciones import service


class Result:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class FakeDB:
    def __init__(self, *, scalar_values, execute_values):
        self.scalar_values = list(scalar_values)
        self.execute_values = list(execute_values)
        self.statements = []

    async def scalar(self, statement):
        self.statements.append(statement)
        return self.scalar_values.pop(0)

    async def execute(self, statement):
        self.statements.append(statement)
        return Result(self.execute_values.pop(0))


def test_teacher_inbox_groups_open_claims_and_pending_grades() -> None:
    teacher_id = uuid4()
    now = datetime.now(timezone.utc)
    evaluation = SimpleNamespace(id=uuid4(), nombre="Prueba de fracciones")
    subject = SimpleNamespace(id=uuid4(), nombre="Matematicas")
    student = SimpleNamespace(id=uuid4(), nombre="Estudiante Uno")
    claim_grade = SimpleNamespace(id=uuid4())
    claim = SimpleNamespace(
        id=uuid4(),
        estado="abierta",
        metadata_json={"motivo": "nota"},
        descripcion="Solicito revisar la suma del ejercicio.",
        created_at=now,
    )
    pending_grade = SimpleNamespace(
        id=uuid4(),
        estado="requiere_revision",
        resultado_json={"motivo_revision": "confianza_baja"},
        updated_at=now,
    )
    db = FakeDB(
        scalar_values=[1, 1],
        execute_values=[
            [(claim, claim_grade, evaluation, subject, student)],
            [(pending_grade, evaluation, subject, student)],
        ],
    )

    inbox = asyncio.run(service.obtener_bandeja_docente(
        db,
        profesor_id=teacher_id,
    ))

    assert inbox["reclamos_abiertos"] == 1
    assert inbox["pendientes_revision"] == 1
    assert inbox["reclamos"][0]["motivo"] == "nota"
    assert inbox["reclamos"][0]["calificacion_id"] == claim_grade.id
    assert inbox["pendientes"][0]["estado"] == "requiere_revision"
    assert inbox["pendientes"][0]["motivo"] == "confianza_baja"
    assert any("calificaciones.profesor_id" in str(statement) for statement in db.statements)
