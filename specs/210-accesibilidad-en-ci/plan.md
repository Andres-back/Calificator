# Plan: Correr la suite de accesibilidad en cada PR

**Spec**: [spec.md](spec.md) | **Issue**: [#441](https://github.com/Andres-back/Calificator/issues/441)

## Decisión

- `.github/workflows/ci.yml`: paso «Run accessibility checks» en `frontend-e2e-contextual`, después de las regresiones contextuales. Ese trabajo ya instala Chromium y sube los diagnósticos de `frontend/test-results/`. La condición del paso que cancela la ejecución incluye `steps.a11y.outcome`.
- `tests/spec_governance/test_accessibility_ci.py`: exige el paso, su corte en el primer fallo, su orden y que la suite tenga archivos.
- `tests/spec_governance/test_ci_first_failure.py`: la comprobación de la condición de corte acepta la condición ampliada.

Se eligió un paso propio, en lugar de encadenarlo con las pruebas contextuales, para que el fallo quede identificado por nombre en GitHub.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `.github/workflows/ci.yml` | paso de accesibilidad y condición de corte |
| `tests/spec_governance/test_accessibility_ci.py` | gobernanza nueva |
| `tests/spec_governance/test_ci_first_failure.py` | condición ampliada |

## Costo

Cerca de un minuto más en el trabajo contextual (16 pruebas con API simulada).

## Riesgo

Bajo. Si una prueba de accesibilidad es inestable, ahora detendrá PR: se corrige en su spec.
