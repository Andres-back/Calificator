# Plan: Estudiantes en mosaico mientras no hay uno seleccionado

**Spec**: [spec.md](spec.md) | **Issue**: [#315](https://github.com/Andres-back/Calificator/issues/315)

## Diagnóstico

En `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`, sin `selectedId` la lista (`grade-review-roster`) ya es `flex-1`, pero desde `xl` comparte la fila con `grade-review-panel`, que solo muestra "Selecciona un estudiante para ver el detalle.". Las filas se apilan con `space-y-1`, así que en escritorio queda una columna larga y media pantalla vacía.

## Decisión

- Un booleano `mosaic = !selectedId && !reviewCompleted`.
- Con `mosaic`, el panel de detalle se oculta (`hidden`) y el contenedor de filas pasa de `space-y-1` a `grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4`. "Más estudiantes" ocupa toda la fila (`col-span-full`).
- Con `mosaic`, buscar y filtrar se ponen en fila desde `sm` (`sm:flex-row`, el filtro con ancho fijo).
- La tarjeta de cada estudiante no cambia: ya tiene casilla, nombre, estado, avisos y nota.

Descartado: un componente nuevo de mosaico, porque duplicaría la fila y las pruebas existentes. También se descartó mostrar un resumen en el panel vacío, porque el usuario pidió usar la pantalla para los estudiantes.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` | Clases condicionales del panel, filtros y lista. |
| `frontend/e2e/grade-review-mosaic.spec.ts` | Nuevo: regresión en 1440px (columnas, ancho y panel vacío oculto) y en 390px (una columna). |

Propietario: dominio de calificaciones (frontend). Sin backend.

## Verificación

La regresión se escribe primero y falla (RED); después pasa (GREEN). Además: `lint`, `typecheck`, la suite unitaria del frontend y las E2E de revisión (`explainable-grading`, `grading-review.a11y`, `mock/grading-review`).
