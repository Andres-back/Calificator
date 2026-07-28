from datetime import date
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.modules.asistencia.schemas import AsistenciaDiaUpsert
from app.modules.asistencia.service import build_attendance_summary, ensure_attendance_date_is_valid


def test_attendance_summary_counts_marked_and_pending_students() -> None:
    summary = build_attendance_summary(
        6,
        ["presente", "presente", "tarde", "ausente", "excusa"],
    )

    assert summary.model_dump() == {
        "total": 6,
        "presentes": 2,
        "tarde": 1,
        "ausentes": 1,
        "excusas": 1,
        "pendientes": 1,
    }


def test_future_attendance_date_is_rejected() -> None:
    with pytest.raises(HTTPException) as exc:
        ensure_attendance_date_is_valid(
            date(2026, 7, 29),
            today=date(2026, 7, 28),
        )

    assert exc.value.status_code == 422
    assert exc.value.detail == "No puedes registrar asistencia en una fecha futura."


def test_duplicate_student_in_daily_payload_is_rejected() -> None:
    student_id = uuid4()

    with pytest.raises(ValidationError, match="dos veces al mismo estudiante"):
        AsistenciaDiaUpsert.model_validate(
            {
                "fecha": "2026-07-28",
                "registros": [
                    {"estudiante_id": str(student_id), "estado": "presente"},
                    {"estudiante_id": str(student_id), "estado": "tarde"},
                ],
            }
        )
