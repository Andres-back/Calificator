# Plan: La prueba del aviso de evaluación asignada no depende de la velocidad del runner

**Spec**: [spec.md](spec.md) | **Issue**: [#357](https://github.com/Andres-back/Calificator/issues/357) | **Tipo**: hotfix (no requiere `plan-approved`)

## Diagnóstico

- La prueba abre el `<details>` del aviso, espera a que tenga el atributo `open` y comprueba una sola vez, sin esperar, que el párrafo interior sea visible.
- `toBeVisible()` revisa también los contenedores. Una prueba temporal, que no se sube, midió el estilo de los contenedores del aviso: justo después de renderizar, dos `div` del modal tienen `opacity: 0` en línea (uno con `transform: translateY(12px) scale(0.96)`); 800 ms después ninguno la tiene. Es la animación de entrada del modal.
- En local la animación termina antes de la comprobación: el archivo pasó 6 de 6 corridas. En la CI, con toda la suite en paralelo, falló en tres ejecuciones con `expect(element).toBeVisible()` sobre ese párrafo.

## Decisión

Envolver la comprobación de visibilidad en `waitFor`, como ya hacen otras pruebas del archivo. No cambia el producto.

Descartado:

- **Desactivar las animaciones en todas las pruebas**: cambia la configuración global de Vitest y puede ocultar otros fallos; merece su propia decisión.
- **Reintentar las pruebas de Vitest en la CI**: tapa el síntoma en vez de corregir la prueba.
- **Quitar la comprobación de visibilidad**: es la que demuestra que el aviso se despliega.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/evaluaciones/components/GenerationWizard.test.tsx` | esperar la visibilidad del texto del aviso |

Sin cambios de producto, backend ni datos.

## Riesgos

- No se pudo reproducir el fallo en local, así que la confirmación definitiva es la CI. La causa se apoya en la medición de la opacidad y en el punto exacto del fallo.
- Otras pruebas pueden tener el mismo patrón. Aquí se corrige solo la que ha fallado.
