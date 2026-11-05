# Validación: Spec 149

Entorno: Windows 11, Node y Playwright (Chromium) con los datos simulados de `e2e/fixtures/explainableGrading` (30 estudiantes). Sin backend.

## Pruebas primero: RED

| Prueba (en `frontend/`) | Resultado antes de la corrección (`main` @ `8d5afd8`) |
| --- | --- |
| `npx playwright test e2e/grade-review-mosaic.spec.ts --project=chromium` | ❌ 1440px: `Expected: >= 3, Received: 1` columnas. ✅ 390px (una columna, igual que antes). |

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| `npx playwright test e2e/grade-review-mosaic.spec.ts --project=chromium` | ✅ 2 |
| E2E de revisión (`explainable-grading`, `accessibility/grading-review.a11y`, `mock/grading-review.mock`, `grade-direct-review`, `teacher-review-context`, `grade-evidence-review`, `spec141-visual`) en Chromium | ✅ 123 |
| `npx vitest run src/modules/calificaciones` | ✅ 318 |
| `npm run lint` y `npx tsc --noEmit` | ✅ |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (mosaico a todo el ancho) | `149 sin estudiante seleccionado…`: 3 o más columnas y más del 80 % del ancho |
| FR-002 (sin panel vacío) | el mismo caso: "Selecciona un estudiante para ver el detalle." oculto |
| FR-003 (lista lateral de una columna) | el mismo caso, después de "Mostrar estudiantes" |
| FR-004 (buscar y filtrar en una fila) | revisión visual en 1600px dark: la búsqueda a la izquierda y el filtro de 16rem a la derecha |
| FR-005 (regresión) | la tabla RED |

## Observaciones

- Las tarjetas son las mismas filas de antes. La casilla, el nombre, el estado, los avisos y la nota no cambian, así que la selección por lotes y las pruebas existentes se conservan.
