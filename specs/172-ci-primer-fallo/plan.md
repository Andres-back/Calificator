# Plan: La CI se detiene en el primer fallo de prueba

**Spec**: [spec.md](spec.md) | **Issue**: [#364](https://github.com/Andres-back/Calificator/issues/364)

## Diagnóstico

- `ci.yml` tiene cuatro trabajos que ejecutan pruebas: `backend`, `frontend-quality`, `frontend-e2e-general` (cuatro fragmentos) y `frontend-e2e-contextual`. Ninguno usa una opción de corte, y un trabajo fallido no afecta a los demás.
- En la ronda del 2026-11-11, una prueba de Vitest fallaba a los pocos minutos y la ejecución seguía más de 20 minutos con backend, contenedores y compuertas.
- `test_visual_ci_gates.py` prohíbe `--max-failures` en la suite general. La regla se escribió para que la compuerta no ocultara casos; el pedido del usuario la cambia de forma explícita.
- Esa misma ronda mostró dos fallos que no son de pruebas: la instalación de navegadores de Playwright agotó tres veces su límite de 5 minutos. Se resolvió relanzando solo ese trabajo.

## Decisión

En `.github/workflows/ci.yml`:

- `pytest … -x` en los tres conjuntos del backend, `npm run test:run -- --bail=1` y `--max-failures=1` en las dos suites de Playwright.
- Un paso final «Stop the run at the first failure» en los cuatro trabajos de pruebas, que ejecuta `gh run cancel` sobre la propia ejecución.
- En `backend` y `frontend-quality` el paso corre ante cualquier fallo del trabajo. En los dos trabajos E2E corre solo si falló el paso de pruebas (`steps.e2e.outcome == 'failure'`).
- Esos cuatro trabajos declaran `permissions: contents: read, actions: write`. El permiso general del workflow sigue en solo lectura.
- La matriz de la suite general conserva `fail-fast: false`.

Descartado:

- **`fail-fast: true` en la matriz de fragmentos**: cancelaría los demás fragmentos también por una instalación lenta, que es justo el fallo que conviene relanzar aparte.
- **Cancelar desde los trabajos de compuerta**: corren al final, cuando ya no ahorra tiempo.
- **Cancelar también por la construcción de contenedores**: el pedido habla de pruebas.
- **Reintentar automáticamente la instalación de navegadores**: es otra mejora, con su propio riesgo de ocultar problemas.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `.github/workflows/ci.yml` | corte en el primer fallo y cancelación de la ejecución |
| `tests/spec_governance/test_ci_first_failure.py` | pruebas nuevas de la regla |
| `tests/spec_governance/test_visual_ci_gates.py` | admite `--max-failures` y el identificador del paso de pruebas |

No cambia el producto, las pruebas ni los datos.

## Riesgos

- Una ejecución muestra solo el primer fallo. Si un cambio rompe varias cosas, harán falta varias rondas para verlas todas.
- El paso de cancelación solo se puede comprobar en GitHub Actions. Se valida en el PR con un fallo provocado y se registra en `quickstart.md`.
- El trabajo que cancela puede figurar como «cancelado» en vez de «fallido» si la cancelación llega antes de que termine. La compuerta lo rechaza igual.
- `actions: write` permite al token cancelar y relanzar ejecuciones de este repositorio. Queda limitado a los cuatro trabajos de pruebas.
- Las pruebas inestables pesan más: un fallo intermitente ahora cancela toda la ejecución y obliga a relanzarla.
