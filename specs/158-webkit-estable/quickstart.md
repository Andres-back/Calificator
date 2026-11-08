# Validación: Las pruebas de WebKit dejan de obligar a relanzar la CI

## Causa medida (WebKit 26.5 local, `requestAnimationFrame`)

| Situación | Antes | Después |
| --- | --- | --- |
| Página sin diálogo | 395-425 ms por cuadro | 16 ms |
| Diálogo «Volver a calificar» abierto | 471-482 ms | 16 ms |

Con el fondo oculto bajaba a 44 ms y con sus animaciones en pausa a 16 ms, lo que aísla la causa en los círculos animados.

## Repeticiones en WebKit (sin repetición automática, `CI` sin definir)

```
npx playwright test e2e/regrading-score-context.spec.ts --project=webkit-grade-direct --repeat-each=20
  180 passed (14.1m)

npx playwright test e2e/evaluation-ai-wizard.spec.ts e2e/feedback-workspace-responsive.spec.ts \
  --project=webkit --project=webkit-feedback-workspace -g "097 escribir|139 volver desde copia" --repeat-each=20
  100 passed (9.6m)
```

Antes de la corrección, `regrading-score-context.spec.ts:102` fallaba en local en el primer intento.

## Regla de repetición y resumen

```
python -m pytest tests/spec_governance/test_webkit_retries_ci.py -q
  4 passed
CI=1 npx playwright test --list --project=webkit-grade-direct
  Total: 25 tests in 2 files
```

`report-flaky.mjs` escribe en el resumen del trabajo una tabla con proyecto, prueba y primer error, y una advertencia por prueba repetida. Sin resultados, lo indica sin fallar.
