from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4
from pathlib import Path
import runpy

import pytest
from fastapi import HTTPException

from app.modules.calificaciones.revision_service import (
    ensure_reprocessing_allowed,
    revision_snapshot,
    operation_fingerprint,
)
from app.modules.calificaciones.schemas import ReemplazoEvidenciaCreate


def grade(**changes):
    values = dict(
        id=uuid4(),
        estado="confirmada",
        revisado_por_docente=True,
        nota_confirmada=Decimal("0"),
        nota_sugerida=Decimal("2.5"),
        confianza=Decimal(".8"),
        feedback="Respuesta anterior",
        resultado_json={"grader_a": {"nota": 2.5}},
        updated_at=datetime(2026, 10, 22),
        entrega=SimpleNamespace(
            archivo_url="/uploads/entregas/old.pdf",
            tipo="mixta",
            respuesta_texto="Parte online",
            visual_text_json={"evidencia_consolidada": {"paginas": 2}},
            contenido_version_id=None,
            estado="calificada",
        ),
    )
    return SimpleNamespace(**{**values, **changes})


def test_reopening_requires_confirmation_but_not_a_written_reason():
    current = grade()
    with pytest.raises(HTTPException) as denied:
        ensure_reprocessing_allowed(current, current.updated_at, False)
    assert denied.value.status_code == 409
    ensure_reprocessing_allowed(
        current, current.updated_at.replace(tzinfo=timezone.utc), True
    )


@pytest.mark.parametrize("state", ["sugerida", "requiere_revision"])
def test_unconfirmed_grade_can_be_reprocessed_without_extra_confirmation(state):
    current = grade(estado=state, revisado_por_docente=False, nota_confirmada=None)
    ensure_reprocessing_allowed(current, current.updated_at, False)


@pytest.mark.parametrize("state", ["procesando", "anulada"])
def test_processing_and_annulled_grades_are_not_reopened(state):
    current = grade(estado=state)
    with pytest.raises(HTTPException):
        ensure_reprocessing_allowed(current, current.updated_at, True)


def test_stale_version_does_not_overwrite_new_teacher_decision():
    with pytest.raises(HTTPException) as denied:
        ensure_reprocessing_allowed(grade(), datetime(2026, 10, 21), True)
    assert denied.value.status_code == 409


def test_snapshot_preserves_zero_evidence_online_response_and_independent_json():
    current = grade()
    snapshot = revision_snapshot(current)
    assert snapshot["nota_confirmada"] == "0"
    assert snapshot["entrega"]["archivo_url"] == current.entrega.archivo_url
    assert snapshot["entrega"]["respuesta_texto"] == "Parte online"
    current.resultado_json["grader_a"]["nota"] = 5
    assert snapshot["resultado_json"]["grader_a"]["nota"] == 2.5


def test_fingerprint_is_stable_and_covers_content_reason_and_action():
    args = dict(
        version=datetime(2026, 10, 22), reason="", confirmed=True, content=b"photo"
    )
    first = operation_fingerprint(**args)
    assert first == operation_fingerprint(**args)
    assert first != operation_fingerprint(**{**args, "content": b"another photo"})
    assert first != operation_fingerprint(**{**args, "reason": "Corrección"})
    assert first != operation_fingerprint(**{**args, "content": None})


@pytest.mark.parametrize(
    "payload", [{}, {"motivo": None}, {"motivo": ""}, {"motivo": "a"}]
)
def test_student_replacement_reason_is_optional_without_minimum(payload):
    ReemplazoEvidenciaCreate(**payload)


@pytest.mark.parametrize("has_history", [False, True])
def test_migration_downgrade_refuses_to_remove_material_history(
    monkeypatch, has_history
):
    from alembic import op

    removed = []
    monkeypatch.setattr(
        op, "get_bind", lambda: SimpleNamespace(scalar=lambda _: has_history)
    )
    monkeypatch.setattr(op, "drop_table", removed.append)
    migration = runpy.run_path(
        str(
            Path(__file__).resolve().parents[2]
            / "alembic/versions/202610220001_grading_revisions.py"
        )
    )
    assert migration["down_revision"] == "202610200001"
    if has_history:
        with pytest.raises(RuntimeError, match="historial"):
            migration["downgrade"]()
        assert not removed
    else:
        migration["downgrade"]()
        assert removed == ["calificacion_revisiones"]
