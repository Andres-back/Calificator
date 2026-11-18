# Plan: La revisión adicional de calificación no agota su límite de salida

**Spec**: [spec.md](spec.md) | **Issue**: [#429](https://github.com/Andres-back/Calificator/issues/429)

## Decisión

En `backend/app/modules/calificaciones/agents.py`:

- Constante `COMPARATOR_MAX_OUTPUT_TOKENS = 2048`, usada en la llamada de `comparator_agent` en lugar del 1.024 fijo.
- `COMPARATOR_PROMPT` añade la extensión máxima de los tres textos libres y pide no repetir las calificaciones recibidas.

## Costo

Hasta 1.024 tokens de salida más por discrepancia, solo cuando el modelo los usa. La instrucción de brevedad apunta a reducir el consumo real.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/agents.py` | límite de salida e instrucción de brevedad |
| `backend/tests/unit/test_comparator_feedback.py` | prueba nueva |

## Riesgo

Bajo. No cambia el modelo, la ruta ni la regla de consenso. No recalifica nada existente.
