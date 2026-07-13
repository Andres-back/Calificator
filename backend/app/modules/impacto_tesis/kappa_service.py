"""Kappa de Cohen entre calificación IA y calificación docente."""
from __future__ import annotations


def cohen_kappa(ia_notas: list[float], docente_notas: list[float], bins: int = 5) -> float:
    """
    Calcula kappa de Cohen discretizando notas en bins.
    Devuelve -1 si no hay suficientes datos.
    """
    if len(ia_notas) != len(docente_notas) or len(ia_notas) < 2:
        return -1.0

    # Discretizar en categorías
    max_val = max(max(ia_notas), max(docente_notas), 1)
    def _bin(v: float) -> int:
        return min(int(v / max_val * bins), bins - 1)

    ia_cats = [_bin(v) for v in ia_notas]
    doc_cats = [_bin(v) for v in docente_notas]

    n = len(ia_cats)
    categories = list(range(bins))

    # Matriz de confusión
    matrix: list[list[int]] = [[0] * bins for _ in range(bins)]
    for i, d in zip(ia_cats, doc_cats):
        matrix[i][d] += 1

    # Po: acuerdo observado
    po = sum(matrix[c][c] for c in categories) / n

    # Pe: acuerdo esperado por azar
    row_sums = [sum(matrix[c]) / n for c in categories]
    col_sums = [sum(matrix[r][c] for r in categories) / n for c in categories]
    pe = sum(row_sums[c] * col_sums[c] for c in categories)

    if pe == 1.0:
        return 1.0
    return (po - pe) / (1 - pe)
