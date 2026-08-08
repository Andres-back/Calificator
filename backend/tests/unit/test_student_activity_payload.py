from app.modules.evaluaciones.service import build_student_activity_payload


def test_crossword_payload_hides_letters_and_answers() -> None:
    payload = build_student_activity_payload(
        "crucigrama",
        "Conceptos",
        {
            "crucigrama": {"grid": [["S", "O", "L"], ["", "", ""]]},
            "preguntas_horizontales": [
                {"numero": 1, "pista": "Estrella cercana", "respuesta": "SOL", "fila": 0, "columna": 0, "longitud": 3},
            ],
        },
    )

    assert payload is not None
    assert payload["contenido"]["grid_mascara"] == [[True, True, True], [False, False, False]]
    clue = payload["contenido"]["pistas_horizontales"][0]
    assert clue["pista"] == "Estrella cercana"
    assert clue["numero_evaluacion"] == 1
    assert "respuesta" not in clue
    assert "SOL" not in str(payload)


def test_matching_payload_never_exposes_solution_pairs() -> None:
    payload = build_student_activity_payload(
        "emparejar",
        "Relaciona",
        {
            "columna_izquierda": [{"numero": 1, "texto": "Agua"}],
            "columna_derecha": [{"letra": "A", "texto": "H2O"}],
            "soluciones": [{"numero": 1, "letra": "A"}],
            "pares": [{"izquierda": "Agua", "derecha": "H2O"}],
        },
    )

    assert payload is not None
    assert payload["contenido"]["columna_izquierda"] == [{"numero": 1, "texto": "Agua"}]
    assert "soluciones" not in payload["contenido"]
    assert "pares" not in payload["contenido"]


def test_word_search_keeps_board_but_hides_word_locations() -> None:
    payload = build_student_activity_payload(
        "sopa_letras",
        "Busca",
        {
            "grilla": [["S", "O", "L"]],
            "banco_palabras": ["SOL"],
            "palabras": [{"palabra": "SOL", "fila": 0, "col": 0}],
        },
    )

    assert payload is not None
    assert payload["contenido"] == {"grilla": [["S", "O", "L"]], "banco_palabras": ["SOL"]}
