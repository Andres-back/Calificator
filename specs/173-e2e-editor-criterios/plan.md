# Plan: La prueba E2E del editor de criterios no mide durante la animación

**Spec**: [spec.md](spec.md) | **Issue**: [#366](https://github.com/Andres-back/Calificator/issues/366) | **Tipo**: hotfix (no requiere `plan-approved`)

## Diagnóstico

- La prueba abre el editor, lee `editor.boundingBox()` y después, en llamadas aparte, la posición de la cabecera y de los botones.
- El propio archivo documenta que el diálogo «anima desde scale(.96)» (comentario del ayudante `touch`). Durante esa animación el diálogo se desplaza y se escala.
- Si la lectura del diálogo y la de la cabecera caen en cuadros distintos, la cabecera puede aparecer unos píxeles por encima del borde leído antes.
- En local la prueba pasa: 5 de 5 repeticiones en Chromium. El fallo se vio solo en la CI.

## Decisión

Envolver la medición de cabecera y botones en `expect(async () => { … }).toPass()`, que la repite hasta que se cumple. La comprobación del tamaño táctil (`touch`) queda después, fuera del bloque.

Descartado:

- **Esperar un tiempo fijo antes de medir**: frágil y más lento.
- **Desactivar las animaciones en las pruebas E2E**: cambia la configuración global y oculta problemas reales de la animación.
- **Reintentar Chromium en la CI**: tapa el síntoma; la Spec 158 lo limitó a WebKit a propósito.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/e2e/resources-responsive.spec.ts` | medición repetida hasta ser estable |

Sin cambios de producto, backend ni datos.

## Riesgos

- No se reprodujo el fallo en local, así que la confirmación es la CI. La causa se deduce del punto del fallo y de la animación documentada en el archivo.
- Otras pruebas E2E pueden medir posiciones durante una animación. Aquí se corrige solo la que ha fallado.
