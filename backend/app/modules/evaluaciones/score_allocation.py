"""Exact deterministic allocation. No I/O, persistence, grading or provider calls."""
from decimal import Decimal, ROUND_HALF_UP
from copy import deepcopy

from app.modules.evaluaciones.score_schemas import ScorePlan, score_decimal

UNITS = Decimal('10000')


def compile_allocation(plan: ScorePlan, keys: list[str], maximum: Decimal) -> dict[str, Decimal]:
    maximum = score_decimal(maximum)
    if not keys or len(keys) > 100 or len(set(keys)) != len(keys):
        raise ValueError('No pudimos identificar de forma única todas las preguntas de la evaluación.')
    if len({group.id for group in plan.grupos}) != len(plan.grupos):
        raise ValueError('Cada bloque necesita un identificador distinto.')
    covered = [key for group in plan.grupos for key in group.claves]
    if len(covered) != len(set(covered)) or set(covered) != set(keys):
        raise ValueError('Incluye todas las preguntas una sola vez, sin superponer bloques.')
    if sum((group.presupuesto for group in plan.grupos), Decimal(0)) != maximum:
        raise ValueError('Los puntos de los bloques deben sumar exactamente la nota máxima.')
    weights: dict[str, Decimal] = {}
    for group in plan.grupos:
        if not set(group.fijados).issubset(group.claves):
            raise ValueError('Hay puntos fijados para una pregunta que no pertenece al bloque.')
        members = [key for key in keys if key in group.claves]
        free = [key for key in members if key not in group.fijados]
        remaining = int((group.presupuesto - sum(group.fijados.values(), Decimal(0))) * UNITS)
        if remaining < len(free) or (not free and remaining != 0):
            raise ValueError(f'El bloque «{group.titulo}» no tiene puntos suficientes: libera un valor fijado o revisa su total.')
        weights.update(group.fijados)
        if free:
            base, remainder = divmod(remaining, len(free))
            weights.update({key: Decimal(base + (index < remainder)) / UNITS for index, key in enumerate(free)})
    return {key: weights[key] for key in keys}


def reweight_points(obtained: Decimal | None, old_maximum: Decimal, new_maximum: Decimal) -> Decimal | None:
    if not old_maximum.is_finite() or not new_maximum.is_finite() or old_maximum <= 0 or new_maximum <= 0:
        raise ValueError('No se puede comprobar el máximo anterior de una respuesta.')
    if obtained is None:
        return None
    if not obtained.is_finite() or obtained < 0 or obtained > old_maximum:
        raise ValueError('El puntaje anterior necesita revisión antes de cambiar su reparto.')
    return (obtained / old_maximum * new_maximum).quantize(Decimal('.0001'), rounding=ROUND_HALF_UP)


def valuation_display(values: list, original_maximum: object, current_maximum: Decimal) -> list:
    """Project equivalent scores; keep stored model assessments immutable."""
    projected = deepcopy(values)
    try:
        old_maximum = score_decimal(original_maximum)
    except ValueError:
        return projected
    for value in projected:
        if not isinstance(value, dict) or value.get('puntaje') is None:
            continue
        try:
            original = Decimal(str(value['puntaje']))
            equivalent = reweight_points(original, old_maximum, current_maximum)
        except (ValueError, ArithmeticError):
            continue
        value['puntaje_original'] = value['puntaje']
        value['maximo_original'] = format(old_maximum.normalize(), 'f')
        value['puntaje'] = float(equivalent)
        value['origen_puntaje'] = 'equivalente_por_reparto'
        value['explicacion_original'] = value.get('explicacion')
        value['explicacion'] = f"Puntaje equivalente con el nuevo reparto; valoración original: {format(original.normalize(), 'f')} de {format(old_maximum.normalize(), 'f')}. {value.get('explicacion') or ''}".strip()
    return projected
