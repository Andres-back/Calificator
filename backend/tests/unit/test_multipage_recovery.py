import asyncio
import json
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.modules.calificaciones import recovery_service as service


def records():
    evaluation = SimpleNamespace(
        id=uuid4(), profesor_id=uuid4(), estado="en_calificacion", deleted_at=None
    )
    student_id = uuid4()
    delivery = SimpleNamespace(
        id=uuid4(),
        evaluacion_id=evaluation.id,
        estudiante_id=student_id,
        estado="requiere_reintento",
        archivo_url="/uploads/synthetic.pdf",
    )
    grade = SimpleNamespace(
        id=uuid4(),
        evaluacion_id=evaluation.id,
        profesor_id=evaluation.profesor_id,
        estudiante_id=student_id,
        entrega_id=delivery.id,
        nota_sugerida=None,
        nota_confirmada=None,
        revisado_por_docente=False,
        estado="requiere_revision",
        resultado_json={
            "motivo_revision": "student_answers_not_detected",
            "evidencia_consolidada": {"paginas": 3},
        },
    )
    return evaluation, delivery, grade


@pytest.mark.parametrize(
    "field,value,reason",
    [
        ("nota_sugerida", Decimal("0"), "existing_score"),
        ("nota_sugerida", Decimal("3.66"), "existing_score"),
        ("nota_confirmada", Decimal("0"), "existing_score"),
        ("revisado_por_docente", True, "teacher_decision"),
        ("estado", "publicada", "teacher_decision"),
        ("estado", "procesando", "not_failed"),
    ],
)
def test_recovery_never_replaces_scores_or_decisions(field, value, reason):
    _, delivery, grade = records()
    setattr(grade, field, value)
    assert service.recovery_skip_reason(grade, delivery) == reason


class DB:
    def __init__(self, evaluation, delivery, grade, active=None):
        self.values = [grade, delivery, active]
        self.evaluation = evaluation
        self.commands = []
        self.queries = []

    async def scalar(self, query, *args):
        self.queries.append(query)
        return self.values.pop(0)

    async def get(self, *args):
        return self.evaluation

    async def execute(self, *args):
        self.commands.append(args)


def test_dry_run_reads_only_and_never_enqueues(monkeypatch, tmp_path):
    evaluation, delivery, grade = records()
    db = DB(evaluation, delivery, grade)
    evidence = tmp_path / "synthetic.pdf"
    evidence.write_bytes(b"synthetic immutable evidence")
    monkeypatch.setattr(service, "resolve_upload_path", lambda _: evidence)

    async def forbidden(*args, **kwargs):
        raise AssertionError("dry run cannot enqueue")

    monkeypatch.setattr(service, "enqueue_persisted_grading", forbidden)
    result = asyncio.run(
        service.recover_failed_grade(
            db,
            grade_id=grade.id,
            evaluation_id=evaluation.id,
            teacher_id=evaluation.profesor_id,
        )
    )
    assert result["eligible"] and not result["queued"]
    assert db.commands == []
    assert all(getattr(q, "_for_update_arg", None) is None for q in db.queries)


def test_execution_locks_revalidates_backs_up_and_audits(monkeypatch, tmp_path):
    evaluation, delivery, grade = records()
    db = DB(evaluation, delivery, grade)
    evidence = tmp_path / "synthetic.pdf"
    original = b"synthetic immutable evidence"
    evidence.write_bytes(original)
    monkeypatch.setattr(service, "resolve_upload_path", lambda _: evidence)
    monkeypatch.setattr(
        service, "resolve_private_upload_path", lambda key: tmp_path / key
    )
    monkeypatch.setattr(service, "_snapshot", lambda row: vars(row).copy())
    queued = []

    async def enqueue(*args, **kwargs):
        queued.append(kwargs)

    monkeypatch.setattr(service, "enqueue_persisted_grading", enqueue)
    result = asyncio.run(
        service.recover_failed_grade(
            db,
            grade_id=grade.id,
            evaluation_id=evaluation.id,
            teacher_id=evaluation.profesor_id,
            execute=True,
        )
    )
    assert result["queued"] and len(queued) == 1
    assert len(db.commands) == 1
    assert db.queries[0]._for_update_arg is not None
    assert db.queries[1]._for_update_arg is not None
    assert queued[0]["calificacion"] is grade
    assert queued[0]["entrega"] is delivery
    assert queued[0]["evidence_metadata"] == {"paginas": 3}
    backups = list((tmp_path / ".private/grading-recovery").glob("*.json"))
    assert len(backups) == 1
    saved = json.loads(backups[0].read_text(encoding="utf-8"))
    assert saved["grade"]["resultado_json"] == grade.resultado_json
    assert saved["evidence_sha256"] == result["evidence_sha256"]
    assert evidence.read_bytes() == original


def test_recovery_wrong_scope_and_active_work_are_not_enqueued(monkeypatch, tmp_path):
    evaluation, delivery, grade = records()
    with pytest.raises(ValueError):
        asyncio.run(
            service.recover_failed_grade(
                DB(evaluation, delivery, grade),
                grade_id=grade.id,
                evaluation_id=uuid4(),
                teacher_id=evaluation.profesor_id,
                execute=True,
            )
        )
    evidence = tmp_path / "synthetic.pdf"
    evidence.write_bytes(b"synthetic")
    monkeypatch.setattr(service, "resolve_upload_path", lambda _: evidence)
    db = DB(evaluation, delivery, grade, active=uuid4())
    result = asyncio.run(
        service.recover_failed_grade(
            db,
            grade_id=grade.id,
            evaluation_id=evaluation.id,
            teacher_id=evaluation.profesor_id,
            execute=True,
        )
    )
    assert not result["eligible"] and result["reason"] == "active_job"
    assert db.commands == []
