from app.modules.herramientas.pdf_render import _render_examen


def test_exam_pdf_recalculates_total_from_question_scores() -> None:
    html = _render_examen(
        {
            "total_puntaje": 7,
            "preguntas": [
                {"numero": 1, "enunciado": "A", "puntaje": 1},
                {"numero": 2, "enunciado": "B", "puntaje": 1.5},
                {"numero": 3, "enunciado": "C", "puntaje": 1},
                {"numero": 4, "enunciado": "D", "puntaje": 1},
                {"numero": 5, "enunciado": "E", "puntaje": 1.5},
                {"numero": 6, "enunciado": "F", "puntaje": 1},
                {"numero": 7, "enunciado": "G", "puntaje": 1},
            ],
        },
        soluciones=False,
    )

    assert "Total: 8 puntos" in html
    assert "Total: 7 puntos" not in html
