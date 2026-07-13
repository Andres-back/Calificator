"""Construcción determinista de puzzles educativos.

El LLM solo aporta el *contenido* (palabras, pistas, pares). La estructura
geométrica (grilla del crucigrama, ubicación de palabras en la sopa de letras,
columnas barajadas) se arma aquí con algoritmos verificables, de modo que el
resultado SIEMPRE sea válido y resoluble. Esto evita el problema clásico de
pedirle al modelo que dibuje la grilla (letras que no coinciden con las
palabras, intersecciones imposibles, posiciones solapadas).
"""
from __future__ import annotations

import random
import unicodedata
from typing import Iterable

# Alfabeto español con frecuencia aproximada para el relleno de la sopa de
# letras: que las letras "sobrantes" parezcan naturales y no delaten las palabras.
_FILLER_ALPHABET = "EEEEEAAAAAOOOOSSSSRRRRNNNNIIIILLLDDDCCTTUUMMPPBBGGVVHHFFQQYYJJZZXK"

# Direcciones para la sopa de letras (delta_fila, delta_col).
_DIR_HORIZONTAL = (0, 1)
_DIR_VERTICAL = (1, 0)
_DIR_DIAG_DOWN = (1, 1)
_DIR_DIAG_UP = (-1, 1)


def strip_accents(text: str) -> str:
    """Quita tildes pero preserva la Ñ como letra propia."""
    text = text.replace("ñ", "\x01").replace("Ñ", "\x02")
    nfkd = unicodedata.normalize("NFD", text)
    cleaned = "".join(ch for ch in nfkd if unicodedata.category(ch) != "Mn")
    return cleaned.replace("\x01", "ñ").replace("\x02", "Ñ")


def normalize_word(word: str) -> str:
    """Normaliza una palabra para usarla en una grilla: MAYÚSCULAS, sin tildes,
    solo letras (conserva la Ñ). Devuelve '' si no queda nada usable."""
    if not word:
        return ""
    word = strip_accents(str(word).strip().upper())
    return "".join(ch for ch in word if ch.isalpha())


# ---------------------------------------------------------------------------
# Crucigrama
# ---------------------------------------------------------------------------

def build_crossword(
    entries: Iterable[dict],
    *,
    max_size: int = 17,
    seed: int | None = None,
) -> dict | None:
    """Arma un crucigrama conectado a partir de pares respuesta/pista.

    `entries`: iterable de dicts con claves 'respuesta' y 'pista'.
    Devuelve un dict con la grilla densa, las pistas numeradas y metadatos, o
    None si no hay ninguna palabra utilizable.
    """
    rng = random.Random(seed)

    norm: list[dict] = []
    seen: set[str] = set()
    for e in entries:
        answer = normalize_word(e.get("respuesta") or e.get("palabra") or "")
        clue = (e.get("pista") or e.get("definicion") or "").strip()
        if len(answer) < 2 or len(answer) > max_size:
            continue
        if not clue or answer in seen:
            continue
        seen.add(answer)
        norm.append({"answer": answer, "clue": clue})

    if not norm:
        return None

    # Las palabras largas primero generan un esqueleto con más intersecciones.
    norm.sort(key=lambda x: len(x["answer"]), reverse=True)

    grid: dict[tuple[int, int], str] = {}
    placed: list[dict] = []
    unplaced: list[dict] = []

    def can_place(word: str, r: int, c: int, dr: int, dc: int) -> tuple[bool, int]:
        # La celda inmediatamente antes del inicio y después del fin deben estar
        # vacías, para que dos palabras no se fundan en una más larga.
        if (r - dr, c - dc) in grid:
            return False, 0
        if (r + dr * len(word), c + dc * len(word)) in grid:
            return False, 0
        crosses = 0
        for i, ch in enumerate(word):
            rr, cc = r + dr * i, c + dc * i
            cur = grid.get((rr, cc))
            if cur is not None:
                if cur != ch:
                    return False, 0
                crosses += 1  # intersección válida
            else:
                # En celdas nuevas, los vecinos perpendiculares deben estar
                # vacíos para no pegar la palabra paralela a otra existente.
                if dr == 0:
                    if (rr - 1, cc) in grid or (rr + 1, cc) in grid:
                        return False, 0
                else:
                    if (rr, cc - 1) in grid or (rr, cc + 1) in grid:
                        return False, 0
        return True, crosses

    def bbox_with(word: str, r: int, c: int, dr: int, dc: int) -> tuple[int, int]:
        rows = [p[0] for p in grid] + [r, r + dr * (len(word) - 1)]
        cols = [p[1] for p in grid] + [c, c + dc * (len(word) - 1)]
        return (max(rows) - min(rows) + 1, max(cols) - min(cols) + 1)

    # Primera palabra: horizontal en el origen.
    first = norm[0]["answer"]
    for i, ch in enumerate(first):
        grid[(0, i)] = ch
    placed.append({**norm[0], "row": 0, "col": 0, "dir": "H"})

    for entry in norm[1:]:
        word = entry["answer"]
        best: tuple[int, int, int, int, int] | None = None  # crosses,r,c,dr,dc
        cells = list(grid.items())
        for i, ch in enumerate(word):
            for (gr, gc), gch in cells:
                if gch != ch:
                    continue
                for dr, dc in (_DIR_HORIZONTAL, _DIR_VERTICAL):
                    r, c = gr - dr * i, gc - dc * i
                    ok, crosses = can_place(word, r, c, dr, dc)
                    if not ok or crosses < 1:
                        continue
                    h, w = bbox_with(word, r, c, dr, dc)
                    if h > max_size or w > max_size:
                        continue
                    score = crosses * 100 - (h + w)  # prioriza cruces, compacta
                    if best is None or score > best[0]:
                        best = (score, r, c, dr, dc)
        if best:
            _, r, c, dr, dc = best
            for i, ch in enumerate(word):
                grid[(r + dr * i, c + dc * i)] = ch
            placed.append({**entry, "row": r, "col": c, "dir": "H" if dr == 0 else "V"})
        else:
            unplaced.append(entry)

    # Normaliza coordenadas para que empiecen en (0,0).
    min_r = min(r for r, _ in grid)
    min_c = min(c for _, c in grid)
    for p in placed:
        p["row"] -= min_r
        p["col"] -= min_c
    norm_grid = {(r - min_r, c - min_c): ch for (r, c), ch in grid.items()}
    n_rows = max(r for r, _ in norm_grid) + 1
    n_cols = max(c for _, c in norm_grid) + 1
    size = max(n_rows, n_cols)

    dense = [["" for _ in range(n_cols)] for _ in range(n_rows)]
    for (r, c), ch in norm_grid.items():
        dense[r][c] = ch

    # Numeración: cada celda que inicia una palabra recibe un número, en orden
    # de lectura. Una across y una down que arrancan en la misma celda comparten
    # número (regla estándar de crucigramas).
    starts = sorted({(p["row"], p["col"]) for p in placed})
    number_of = {cell: idx + 1 for idx, cell in enumerate(starts)}

    horizontales, verticales = [], []
    for p in placed:
        item = {
            "numero": number_of[(p["row"], p["col"])],
            "pista": p["clue"],
            "respuesta": p["answer"],
            "fila": p["row"],
            "columna": p["col"],
            "longitud": len(p["answer"]),
        }
        (horizontales if p["dir"] == "H" else verticales).append(item)
    horizontales.sort(key=lambda x: x["numero"])
    verticales.sort(key=lambda x: x["numero"])

    return {
        "grid": dense,
        "size": size,
        "filas": n_rows,
        "columnas": n_cols,
        "pistas_horizontal": horizontales,
        "pistas_vertical": verticales,
        "palabras_sin_ubicar": [u["answer"] for u in unplaced],
    }


# ---------------------------------------------------------------------------
# Sopa de letras
# ---------------------------------------------------------------------------

def build_word_search(
    words: Iterable[str],
    *,
    size: int = 15,
    allow_diagonal: bool = True,
    allow_reverse: bool = True,
    seed: int | None = None,
) -> dict:
    """Coloca cada palabra en una grilla cuadrada y rellena el resto.

    Garantiza que cada palabra colocada esté realmente presente en las
    coordenadas reportadas. Devuelve la grilla, las ubicaciones y el banco.
    """
    rng = random.Random(seed)

    norm: list[str] = []
    seen: set[str] = set()
    for w in words:
        nw = normalize_word(w)
        if len(nw) < 2 or nw in seen:
            continue
        seen.add(nw)
        norm.append(nw)

    longest = max((len(w) for w in norm), default=0)
    n = max(size, longest)

    directions = [_DIR_HORIZONTAL, _DIR_VERTICAL]
    if allow_diagonal:
        directions += [_DIR_DIAG_DOWN, _DIR_DIAG_UP]
    if allow_reverse:
        directions += [(-dr, -dc) for dr, dc in list(directions)]

    def attempt(grid: list[list[str | None]], word: str) -> dict | None:
        order = list(directions)
        rng.shuffle(order)
        for dr, dc in order:
            # Rango de inicios válidos para que la palabra entre completa.
            r_lo = 0 if dr >= 0 else (len(word) - 1)
            r_hi = (n - len(word)) if dr > 0 else (n - 1 if dr == 0 else n - 1)
            c_lo = 0 if dc >= 0 else (len(word) - 1)
            c_hi = (n - len(word)) if dc > 0 else (n - 1 if dc == 0 else n - 1)
            if r_hi < r_lo or c_hi < c_lo:
                continue
            starts = [(r, c) for r in range(r_lo, r_hi + 1) for c in range(c_lo, c_hi + 1)]
            rng.shuffle(starts)
            for r, c in starts:
                ok = True
                for i, ch in enumerate(word):
                    cur = grid[r + dr * i][c + dc * i]
                    if cur is not None and cur != ch:
                        ok = False
                        break
                if ok:
                    return {"r": r, "c": c, "dr": dr, "dc": dc}
        return None

    placements: list[dict] = []
    grid: list[list[str | None]] = [[None] * n for _ in range(n)]
    # Reintenta agrandando la grilla si alguna palabra larga no entra.
    for _ in range(4):
        grid = [[None] * n for _ in range(n)]
        placements = []
        ok_all = True
        for word in sorted(norm, key=len, reverse=True):
            pos = attempt(grid, word)
            if pos is None:
                ok_all = False
                break
            for i, ch in enumerate(word):
                grid[pos["r"] + pos["dr"] * i][pos["c"] + pos["dc"] * i] = ch
            placements.append({"palabra": word, **pos})
        if ok_all:
            break
        n += 1

    # Rellena las celdas vacías.
    for r in range(n):
        for c in range(n):
            if grid[r][c] is None:
                grid[r][c] = rng.choice(_FILLER_ALPHABET)

    def label(dr: int, dc: int) -> tuple[str, bool]:
        if dr == 0:
            base = "horizontal"
        elif dc == 0:
            base = "vertical"
        else:
            base = "diagonal"
        invertida = dr < 0 or (dr == 0 and dc < 0)
        return base, invertida

    palabras = []
    for p in placements:
        dr, dc = p["dr"], p["dc"]
        base, invertida = label(dr, dc)
        end_r = p["r"] + dr * (len(p["palabra"]) - 1)
        end_c = p["c"] + dc * (len(p["palabra"]) - 1)
        palabras.append({
            "palabra": p["palabra"],
            "fila": p["r"],
            "col": p["c"],
            "fila_fin": end_r,
            "col_fin": end_c,
            "direccion": base,
            "invertida": invertida,
        })

    return {
        "grid": [list(row) for row in grid],
        "size": n,
        "palabras": palabras,
        "banco_palabras": [p["palabra"] for p in placements],
        "palabras_sin_ubicar": [w for w in norm if w not in {p["palabra"] for p in placements}],
    }


# ---------------------------------------------------------------------------
# Unir columnas / Emparejar
# ---------------------------------------------------------------------------

_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def build_matching(pairs: Iterable[dict], *, seed: int | None = None) -> dict:
    """Construye dos columnas con la derecha barajada y su clave de respuestas.

    `pairs`: iterable de dicts con 'izquierda'/'derecha' (o 'concepto'/'definicion').
    """
    rng = random.Random(seed)

    clean: list[tuple[str, str]] = []
    seen: set[str] = set()
    for p in pairs:
        a = (p.get("izquierda") or p.get("concepto") or p.get("termino") or "").strip()
        b = (p.get("derecha") or p.get("definicion") or p.get("pareja") or "").strip()
        if not a or not b or a.lower() in seen:
            continue
        seen.add(a.lower())
        clean.append((a, b))

    columna_izquierda = [{"numero": i + 1, "texto": a} for i, (a, _) in enumerate(clean)]

    shuffled = list(enumerate(clean))
    rng.shuffle(shuffled)
    # Evita que la columna barajada quede idéntica al orden original.
    if len(shuffled) > 1 and all(j == orig for j, (orig, _) in enumerate(shuffled)):
        shuffled.append(shuffled.pop(0))

    columna_derecha = []
    letra_de: dict[int, str] = {}
    for j, (orig_i, (_, b)) in enumerate(shuffled):
        letra = _LETTERS[j] if j < len(_LETTERS) else f"X{j}"
        columna_derecha.append({"letra": letra, "texto": b})
        letra_de[orig_i] = letra

    soluciones = [{"numero": i + 1, "letra": letra_de[i]} for i in range(len(clean))]
    pares = [{"izquierda": a, "derecha": b} for a, b in clean]

    return {
        "columna_izquierda": columna_izquierda,
        "columna_derecha": columna_derecha,
        "soluciones": soluciones,
        "pares": pares,
    }
