"""Spec 148: la decisión del empate llega a lecturas, analítica y PDF (datos sintéticos)."""
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from app.modules.calificaciones import grade_rounding as rule
from app.modules.calificaciones.schemas import BoletinItem
from app.modules.evaluaciones.schemas import EvaluacionRead
from app.modules.feedback_sharing import projection
from app.modules.xali.schemas import XaliEvaluacionEntregadaRead
from app.services.pdf_service import boletin_grade_text


def test_tasa_de_aprobacion_usa_la_nota_presentada_y_excluye_empates_sin_decidir():
    grades = [(Decimal("2.94"), None), (Decimal("2.96"), None), (Decimal("2.95"), "arriba"), (Decimal("2.95"), None)]
    assert rule.approval_rate(grades, Decimal("5")) == 2 / 3
    assert rule.approval_rate([(Decimal("2.95"), None)], Decimal("5")) == 0
    assert rule.approval_rate([], Decimal("5")) == 0


def test_lecturas_del_estudiante_incluyen_la_decision():
    item = BoletinItem(evaluacion_id=uuid4(), evaluacion_nombre="E", nota_confirmada=Decimal("2.95"),
                       nota_sugerida=None, nota_maxima=Decimal("5"), estado="publicada", feedback=None,
                       redondeo_empate="arriba")
    assert item.redondeo_empate == "arriba"
    assert "mi_redondeo_empate" in EvaluacionRead.model_fields
    xali = XaliEvaluacionEntregadaRead(evaluacion_id=uuid4(), materia_id=uuid4(), materia_nombre="M",
                                       evaluacion_nombre="E", entrega_id=uuid4(), estado_calificacion="publicada",
                                       nota_confirmada=Decimal("2.95"), nota_maxima=Decimal("5"),
                                       redondeo_empate="abajo", puede_chatear=True)
    assert xali.redondeo_empate == "abajo"


def _grade(**extra):
    values = dict(id=uuid4(), estudiante_id=uuid4(), evaluacion_id=uuid4(), materia_id=uuid4(), estado="publicada",
                  nota_confirmada=Decimal("2.95"), revisado_por_docente=True, feedback="Bien", entrega_id=None,
                  updated_at=None)
    values.update(extra)
    return SimpleNamespace(**values)


EVALUATION = SimpleNamespace(id=uuid4(), nombre="E", nota_maxima=Decimal("5"), preguntas=[], criterios=[],
                             metas_profesor=[], estructura_documento=None)


def test_huella_de_devolucion_no_cambia_sin_decision(monkeypatch):
    monkeypatch.setattr(projection, "answers_released", lambda _evaluation: False)
    legacy = _grade()
    current = _grade(**{key: getattr(legacy, key) for key in vars(legacy)}, redondeo_empate=None)
    args = (EVALUATION, "Estudiante", "Materia", None)
    assert projection.review_source_fingerprint(legacy, *args) == projection.review_source_fingerprint(current, *args)
    decided = _grade(**{key: getattr(legacy, key) for key in vars(legacy)}, redondeo_empate="arriba")
    assert projection.review_source_fingerprint(decided, *args) != projection.review_source_fingerprint(legacy, *args)


def test_devolucion_resumen_incluye_la_decision_solo_si_existe(monkeypatch):
    monkeypatch.setattr(projection, "answers_released", lambda _evaluation: False)
    review = SimpleNamespace(id=uuid4(), feedback_text="Explicaste bien por qué el agua se evapora; en la pregunta 2 revisa el papel de la temperatura.", scope="summary", source_fingerprint=None)
    for decision, expected in ((None, False), ("arriba", True)):
        grade = _grade(redondeo_empate=decision)
        review.source_fingerprint = projection.review_source_fingerprint(grade, EVALUATION, "Estudiante", "Materia", None)
        payload = projection.build_review_projection(grade, EVALUATION, "Estudiante", "Materia", None, review).payload
        assert ("redondeo_empate" in payload) is expected
        if expected:
            assert payload["redondeo_empate"] == "arriba"


def test_pdf_muestra_la_nota_presentada():
    assert boletin_grade_text({"nota_confirmada": Decimal("2.96"), "nota_maxima": Decimal("5")}) == "3.0"
    assert boletin_grade_text({"nota_confirmada": Decimal("2.95"), "nota_maxima": Decimal("5"), "redondeo_empate": "abajo"}) == "2.9"
    assert boletin_grade_text({"nota_confirmada": Decimal("2.95"), "nota_maxima": Decimal("5")}) == "2.95 (por decidir)"
    assert boletin_grade_text({"nota_confirmada": None, "nota_sugerida": None}) == "-"
    # Filas antiguas sin nota máxima conservan su texto exacto.
    assert boletin_grade_text({"nota_confirmada": "4.5"}) == "4.5"
