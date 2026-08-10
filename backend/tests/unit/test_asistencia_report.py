from datetime import date

import pytest
from fastapi import HTTPException

from app.modules.asistencia.service import (
    build_attendance_report_summary,
    validate_attendance_report_range,
)


def test_attendance_report_summary_counts_and_percentage() -> None:
    summary = build_attendance_report_summary(
        ['presente', 'presente', 'tarde', 'ausente', 'excusa'],
    )

    assert summary.model_dump() == {
        'total_registros': 5,
        'presentes': 2,
        'tarde': 1,
        'ausentes': 1,
        'excusas': 1,
        'porcentaje_asistencia': 60.0,
    }


def test_attendance_report_rejects_inverted_range() -> None:
    with pytest.raises(HTTPException) as exc:
        validate_attendance_report_range(
            date(2026, 7, 29),
            date(2026, 7, 1),
            today=date(2026, 7, 30),
        )

    assert exc.value.status_code == 422
    assert exc.value.detail == 'La fecha inicial no puede ser posterior a la fecha final.'


def test_attendance_report_rejects_future_end_date() -> None:
    with pytest.raises(HTTPException) as exc:
        validate_attendance_report_range(
            date(2026, 7, 1),
            date(2026, 8, 1),
            today=date(2026, 7, 30),
        )

    assert exc.value.status_code == 422
    assert exc.value.detail == 'El reporte no puede incluir fechas futuras.'
