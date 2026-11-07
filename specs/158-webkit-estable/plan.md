# Plan: Las pruebas de WebKit dejan de obligar a relanzar la CI

**Spec**: [spec.md](spec.md) | **Issue**: [#336](https://github.com/Andres-back/Calificator/issues/336)

## Diagnóstico

- `frontend/playwright.config.ts` tiene `retries: 0` para todo. Los proyectos WebKit no tienen reglas propias.
- La caída "WebKit encountered an internal error" ocurre en `page.goto`, antes de que la prueba haga nada, y en pruebas distintas cada vez. No es una carrera de una prueba concreta.
- `regrading-score-context.spec.ts:119` hace clic en "Enviar a calificar" justo después de marcar la casilla. En WebKit, Playwright espera hasta 30 s a que el botón quede "estable", lo que apunta a una animación o a un cambio de estado que no termina.
- `evaluation-ai-wizard.spec.ts:452` espera `data-writing="true"`. El modo de escritura se activa con `focusin` en un `requestAnimationFrame`, así que un foco perdido o tardío lo deja en `false`.
- `feedback-workspace-responsive.spec.ts:163` pulsa Enter en una secuencia de botones; si un Enter llega antes de que el paso anterior termine, el siguiente botón no aparece.

## Decisión

1. **Repetición solo para WebKit en CI.** Cada proyecto WebKit recibe `retries: process.env.CI ? 1 : 0`. Playwright marca esas pruebas como "flaky" y el resumen del trabajo las lista, así que no se ocultan. Una prueba que falla dos veces sigue rompiendo el trabajo.
2. **Cada prueba concreta se corrige por su causa.** Por ejemplo, esperar a que el diálogo termine su animación, a que el campo tenga el foco o a que aparezca el paso anterior antes de pulsar el siguiente. Si la causa está en la aplicación, se corrige ahí con su prueba.
3. **Validación.** Cada prueba corregida se repite 20 veces en WebKit (`--repeat-each=20`), en local si está disponible o en CI.

Descartado:
- **Repetir todas las pruebas:** ocultaría fallos de Chromium, que hoy es estable.
- **Subir tiempos límite:** solo retrasa la falla.
- **Repetir solo ante el error "internal error":** Playwright no permite repeticiones condicionadas por el error sin cambiar las importaciones de más de 100 archivos de prueba.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/playwright.config.ts` | `retries` de los proyectos WebKit en CI |
| `.github/workflows/ci.yml` | resumen de pruebas inestables, si el reportero actual no lo muestra |
| Las cuatro pruebas de la tabla y, si hace falta, su componente | espera de la condición real |
| `tests/spec_governance/` | prueba de la regla de repetición |

## Riesgos

- Una repetición alarga un trabajo cuando ocurre: unos minutos, frente a los 25 de relanzarlo entero.
- Una prueba nueva y realmente inestable podría pasar con la repetición. El resumen la deja a la vista.
