"""Kappa con categorías fijadas previamente y faltantes explícitos."""
from __future__ import annotations


def cohen_kappa(
    first: list[float],
    second: list[float],
    *,
    boundaries: list[float],
) -> dict:
    if len(first) != len(second):
        return {"available": False, "value": None, "reason": "different_lengths", "n": 0}
    if len(first) < 2:
        return {"available": False, "value": None, "reason": "insufficient_sample", "n": len(first)}
    fixed = sorted(set(float(value) for value in boundaries))
    if not fixed:
        return {"available": False, "value": None, "reason": "categories_not_configured", "n": len(first)}

    def category(value: float) -> int:
        return sum(float(value) > boundary for boundary in fixed)

    first_categories = [category(value) for value in first]
    second_categories = [category(value) for value in second]
    category_count = len(fixed) + 1
    matrix = [[0] * category_count for _ in range(category_count)]
    for left, right in zip(first_categories, second_categories):
        matrix[left][right] += 1
    count = len(first_categories)
    observed = sum(matrix[index][index] for index in range(category_count)) / count
    rows = [sum(matrix[index]) / count for index in range(category_count)]
    columns = [sum(matrix[row][column] for row in range(category_count)) / count for column in range(category_count)]
    expected = sum(rows[index] * columns[index] for index in range(category_count))
    if expected >= 1.0:
        return {"available": False, "value": None, "reason": "degenerate_distribution", "n": count}
    return {
        "available": True,
        "value": (observed - expected) / (1 - expected),
        "reason": None,
        "n": count,
        "boundaries": fixed,
    }
