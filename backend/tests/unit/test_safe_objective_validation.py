import pytest

from app.modules.calificaciones.objective_validation import build_safe_objective_validation


def question(identity="q1", number=1, kind="opcion_multiple", key="A", **extras):
    return {"id": identity, "numero": number, "tipo": kind, "respuesta_correcta": key,
            "puntaje": "0.625", **extras}


def photo(answer="A", identity="q1", number=1, page=1, **extras):
    return {"question_id": identity, "question_number": number, "answer": answer,
            "page": page, "legible": True, "confidence": 0.99, **extras}


def resolve(questions, rows, *, keys=None, photographic=True):
    return build_safe_objective_validation(
        {"preguntas": questions, "respuestas_esperadas": keys or []}, rows, photographic=photographic,
    )


@pytest.mark.parametrize("answer,expected", [("A", True), ("B", False), ("D", False),
    ("A y B", None), ("A/B", None), ("A (marcada), B (marcada)", None),
    ("E", None), ("", None), (None, None)])
def test_single_mark_is_required(answer, expected):
    assert resolve([question()], [photo(answer)])[0]["correcta"] is expected


@pytest.mark.parametrize("key,answer,expected", [
    ("Verdadero", "Falso", False), ("V", "Verdadero", True), (False, "F", True),
    ("true", "Falso", False), ("Verdadero", "V y F", None), ("Sí", "V", None),
])
def test_truth_values_are_not_substring_matches(key, answer, expected):
    assert resolve([question(kind="verdadero_falso", key=key)], [photo(answer)])[0]["correcta"] is expected


@pytest.mark.parametrize("flags", [
    {"legible": False}, {"partial": True}, {"respuesta_parcial": True},
    {"needs_review": True}, {"requiere_revision": True}, {"correction_detected": True},
    {"blank": True}, {"present": False}, {"multiple_marks": True},
    {"warnings": ["Double mark"]}, {"confidence": 0.84},
    {"confidence": float("nan")}, {"confidence": True}, {"page": 0},
])
def test_uncertainty_never_becomes_zero(flags):
    decision = resolve([question()], [photo("B", **flags)])[0]
    assert decision["correcta"] is None
    assert decision["motivo"] == "lectura_no_verificable"


def test_conflicting_pages_never_select_last_reading_and_page_order_does_not_matter():
    rows = [photo("A", page=1), photo("B", page=2)]
    forward = resolve([question()], rows)
    reverse = resolve([question()], list(reversed(rows)))
    assert forward == reverse
    assert forward[0]["correcta"] is None
    assert forward[0]["paginas"] == [1, 2]
    assert forward[0]["motivo"] == "lectura_ambigua"
    assert "Hoja 1: A" in forward[0]["respuesta_detectada"]
    assert "Hoja 2: B" in forward[0]["respuesta_detectada"]


def test_same_answer_repeated_keeps_all_pages():
    decision = resolve([question()], [photo(page=2), photo(page=1)])[0]
    assert decision["correcta"] is True
    assert decision["paginas"] == [1, 2]


def test_repeated_number_needs_stable_id_for_both_key_and_answer():
    questions = [question("a", 1, key="A"), question("b", 1, key="B")]
    decisions = resolve(questions, [photo("A", "a"), photo("A", "b", page=2)])
    assert [(row["clave"], row["correcta"]) for row in decisions] == [("pregunta:a", True), ("pregunta:b", False)]
    decisions = resolve(questions, [photo("B", identity=None)])
    assert all(row["correcta"] is None and row["motivo"] == "identidad_ambigua" for row in decisions)


def test_duplicate_keys_and_unknown_id_do_not_fall_back_to_number():
    assert resolve([question()], [photo(identity="not-q1")])[0]["correcta"] is None
    assert all(row["correcta"] is None for row in resolve([question(), question()], [photo()]))
    assert resolve([question()], [photo(number=7)])[0]["correcta"] is None


def test_official_key_requires_identity_not_position_and_no_contradictions():
    no_key = question(key=None)
    assert resolve([no_key], [photo()], keys=["A"])[0]["correcta"] is None
    assert resolve([no_key], [photo()], keys=[{"numero": 1, "respuesta": "A"}])[0]["correcta"] is True
    assert resolve([question()], [photo()], keys=[{"numero": 1, "respuesta": "B"}])[0]["correcta"] is None
    assert resolve([no_key], [photo()], keys=[{"numero": 1, "respuesta": "A"}, {"numero": 1, "respuesta": "B"}])[0]["correcta"] is None


def test_options_validate_letter_and_text_together():
    item = question(opciones=["Leche", "Pan", "Zanahoria", "Manzana"])
    assert resolve([item], [photo("A. Pan")])[0]["correcta"] is None
    assert resolve([item], [photo("Pan")])[0]["correcta"] is False
    assert resolve([item], [photo("A (marcada), B. Pan")])[0]["correcta"] is True
    assert resolve([question(multiple=True)], [photo()])[0]["correcta"] is None


def test_open_drawing_and_rubric_are_not_binary():
    assert resolve([question(kind="abierta"), question("draw", 2, kind="dibujo")], [photo("B")]) == []


def test_mixed_evaluation_uses_declared_source_and_preserves_online_false():
    questions = [question(modalidad_respuesta="fisica"), question("q2", 2, kind="verdadero_falso", key=False, modalidad_respuesta="online")]
    rows = [{**photo("B"), "_objective_source": "photo"},
            {"question_id": "q1", "question_number": 1, "answer": "A", "_objective_source": "online"},
            {"question_id": "q2", "question_number": 2, "answer": False, "_objective_source": "online"}]
    decisions = resolve(questions, rows)
    assert [item["correcta"] for item in decisions] == [False, True]


def test_missing_answer_is_pending_and_digital_source_does_not_require_photo_fields():
    assert resolve([question()], [])[0]["motivo"] == "sin_lectura"
    assert resolve([question()], [{"pregunta": 1, "respuesta": "B"}], photographic=False)[0]["correcta"] is False
    assert resolve([question()], [{"pregunta": 1, "respuesta": "B"}])[0]["correcta"] is None
