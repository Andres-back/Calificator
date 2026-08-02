from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.calificaciones import service
from app.shared.enums import PoliticaIntento


class AttemptDB:
    def __init__(self, count: int) -> None:
        self.count = count
        self.scalar_calls = 0

    async def scalar(self, _statement):
        self.scalar_calls += 1
        return self.count


def _evaluation(policy: str | None, allowed: int | None = None) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        politica_intento=policy,
        intentos_permitidos=allowed,
    )


def test_one_attempt_blocks_new_physical_or_online_evidence() -> None:
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            service.ensure_student_can_submit_new_evidence(
                AttemptDB(1),
                _evaluation(PoliticaIntento.UN_INTENTO.value),
                uuid4(),
            )
        )

    assert exc.value.status_code == 409


def test_multiple_attempts_respect_configured_limit() -> None:
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            service.ensure_student_can_submit_new_evidence(
                AttemptDB(2),
                _evaluation(PoliticaIntento.MEJOR_PUNTAJE.value, allowed=2),
                uuid4(),
            )
        )

    assert "limite de 2" in str(exc.value.detail)


def test_free_practice_does_not_consume_or_query_attempts() -> None:
    db = AttemptDB(99)

    asyncio.run(
        service.ensure_student_can_submit_new_evidence(
            db,
            _evaluation(PoliticaIntento.PRACTICA_LIBRE.value),
            uuid4(),
        )
    )

    assert db.scalar_calls == 0


def _grade(*, evaluation_id, score: str, created_at: datetime) -> SimpleNamespace:
    return SimpleNamespace(
        evaluacion_id=evaluation_id,
        nota_confirmada=Decimal(score),
        nota_sugerida=Decimal(score),
        created_at=created_at,
    )


def test_report_selects_best_or_last_attempt_and_excludes_practice() -> None:
    now = datetime.now()
    best_id, last_id, practice_id = uuid4(), uuid4(), uuid4()
    best_eval = SimpleNamespace(
        id=best_id,
        politica_intento=PoliticaIntento.MEJOR_PUNTAJE.value,
    )
    last_eval = SimpleNamespace(
        id=last_id,
        politica_intento=PoliticaIntento.ULTIMO_INTENTO.value,
    )
    practice_eval = SimpleNamespace(
        id=practice_id,
        politica_intento=PoliticaIntento.PRACTICA_LIBRE.value,
    )
    best_score = _grade(evaluation_id=best_id, score="4.8", created_at=now)
    lower_later = _grade(
        evaluation_id=best_id,
        score="3.0",
        created_at=now + timedelta(minutes=1),
    )
    old_last = _grade(evaluation_id=last_id, score="5.0", created_at=now)
    official_last = _grade(
        evaluation_id=last_id,
        score="2.0",
        created_at=now + timedelta(minutes=1),
    )
    practice = _grade(evaluation_id=practice_id, score="5.0", created_at=now)

    selected = service._official_report_rows(
        [
            (best_score, best_eval),
            (lower_later, best_eval),
            (old_last, last_eval),
            (official_last, last_eval),
            (practice, practice_eval),
        ]
    )

    assert [item[0] for item in selected] == [best_score, official_last]
