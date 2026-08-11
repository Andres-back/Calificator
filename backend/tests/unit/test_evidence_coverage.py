from app.modules.calificaciones.orchestrator import _evidence_coverage
from app.shared.enums import EvaluacionModalidad


def blueprint(count: int) -> dict:
    return {
        "modalidad": EvaluacionModalidad.FISICA.value,
        "preguntas": [{"numero": number} for number in range(1, count + 1)],
    }


def test_complete_multi_page_evidence_has_full_coverage() -> None:
    result = _evidence_coverage(
        blueprint(4),
        {"preguntas_detectadas": [1, 2, 3, 4]},
    )
    assert result["cobertura"] == 1.0
    assert result["faltantes"] == []
    assert result["requiere_revision"] is False


def test_consecutive_missing_block_requires_teacher_review() -> None:
    result = _evidence_coverage(
        blueprint(6),
        {"preguntas_detectadas": [1, 2, 5, 6]},
    )
    assert result["faltantes"] == [3, 4]
    assert result["bloque_faltante_maximo"] == 2
    assert result["requiere_revision"] is True