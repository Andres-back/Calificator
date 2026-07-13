"""Tests de los constructores deterministas de puzzles.

Verifican la invariante clave: los puzzles construidos en Python siempre son
válidos y resolubles (a diferencia de las grillas que antes inventaba el LLM).
"""
from app.modules.herramientas.puzzle_builder import (
    build_crossword,
    build_matching,
    build_word_search,
    normalize_word,
)


def test_normalize_word_strips_accents_keeps_enie() -> None:
    assert normalize_word("  fotosíntesis ") == "FOTOSINTESIS"
    assert normalize_word("niño") == "NIÑO"
    assert normalize_word("H2O!") == "HO"


def test_crossword_letters_match_grid() -> None:
    entries = [
        {"respuesta": "FOTOSINTESIS", "pista": "a"},
        {"respuesta": "CLOROFILA", "pista": "b"},
        {"respuesta": "OXIGENO", "pista": "c"},
        {"respuesta": "RAIZ", "pista": "d"},
        {"respuesta": "TALLO", "pista": "e"},
        {"respuesta": "HOJA", "pista": "f"},
    ]
    cw = build_crossword(entries, max_size=17, seed=7)
    assert cw is not None
    grid = cw["grid"]
    rows, cols = len(grid), len(grid[0])

    for item in cw["pistas_horizontal"]:
        r, c, w = item["fila"], item["columna"], item["respuesta"]
        assert all(grid[r][c + i] == w[i] for i in range(len(w)))
    for item in cw["pistas_vertical"]:
        r, c, w = item["fila"], item["columna"], item["respuesta"]
        assert all(grid[r + i][c] == w[i] for i in range(len(w)))

    assert cw["size"] <= 17


def test_crossword_is_connected() -> None:
    entries = [
        {"respuesta": "CELULA", "pista": "a"},
        {"respuesta": "NUCLEO", "pista": "b"},
        {"respuesta": "MEMBRANA", "pista": "c"},
        {"respuesta": "ORGANULO", "pista": "d"},
        {"respuesta": "CITOPLASMA", "pista": "e"},
    ]
    cw = build_crossword(entries, max_size=17, seed=2)
    grid = cw["grid"]
    filled = {(r, c) for r in range(len(grid)) for c in range(len(grid[0])) if grid[r][c]}
    seen, stack = set(), [next(iter(filled))]
    while stack:
        cell = stack.pop()
        if cell in seen:
            continue
        seen.add(cell)
        r, c = cell
        for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nb = (r + dr, c + dc)
            if nb in filled and nb not in seen:
                stack.append(nb)
    assert seen == filled  # un solo componente conexo


def test_crossword_numbering_shared_on_same_start() -> None:
    cw = build_crossword(
        [{"respuesta": "CASA", "pista": "a"}, {"respuesta": "CARRO", "pista": "b"}],
        seed=1,
    )
    # Ambas empiezan con C; si comparten celda inicial deben compartir número.
    by_cell = {}
    for item in cw["pistas_horizontal"] + cw["pistas_vertical"]:
        by_cell.setdefault((item["fila"], item["columna"]), set()).add(item["numero"])
    assert all(len(nums) == 1 for nums in by_cell.values())


def test_crossword_empty_returns_none() -> None:
    assert build_crossword([], seed=1) is None
    assert build_crossword([{"respuesta": "A", "pista": "x"}], seed=1) is None  # < 2 letras


def test_word_search_all_words_present() -> None:
    words = ["LUZ", "SOMBRA", "ESPEJO", "VIDRIO", "OPACO", "REFLEXIÓN"]
    ws = build_word_search(words, size=12, seed=3)
    n = ws["size"]
    grid = ws["grid"]

    assert len(grid) == n and all(len(row) == n for row in grid)
    assert all(grid[r][c] for r in range(n) for c in range(n))  # sin huecos
    assert not ws["palabras_sin_ubicar"]

    for p in ws["palabras"]:
        w = normalize_word(p["palabra"])
        steps = len(w) - 1
        dr = 0 if steps == 0 else (p["fila_fin"] - p["fila"]) // steps
        dc = 0 if steps == 0 else (p["col_fin"] - p["col"]) // steps
        assert all(grid[p["fila"] + dr * i][p["col"] + dc * i] == w[i] for i in range(len(w)))


def test_word_search_grows_for_long_word() -> None:
    # Palabra más larga que el tamaño pedido: la grilla debe crecer.
    ws = build_word_search(["TRANSPARENTE", "LUZ"], size=8, seed=1)
    assert ws["size"] >= len("TRANSPARENTE")
    assert not ws["palabras_sin_ubicar"]


def test_matching_solution_key_is_correct() -> None:
    pairs = [
        {"izquierda": "Sólido", "derecha": "Roca"},
        {"izquierda": "Líquido", "derecha": "Agua"},
        {"izquierda": "Gaseoso", "derecha": "Aire"},
        {"izquierda": "Luminoso", "derecha": "Sol"},
    ]
    m = build_matching(pairs, seed=1)
    izq = {x["numero"]: x["texto"] for x in m["columna_izquierda"]}
    der = {x["letra"]: x["texto"] for x in m["columna_derecha"]}
    original = {a: b for a, b in [(p["izquierda"], p["derecha"]) for p in pairs]}

    for sol in m["soluciones"]:
        assert original[izq[sol["numero"]]] == der[sol["letra"]]
    assert len(m["soluciones"]) == 4


def test_matching_right_column_is_shuffled() -> None:
    pairs = [{"izquierda": f"T{i}", "derecha": f"D{i}"} for i in range(6)]
    m = build_matching(pairs, seed=0)
    derecha = [d["texto"] for d in m["columna_derecha"]]
    assert derecha != [p["derecha"] for p in pairs]
