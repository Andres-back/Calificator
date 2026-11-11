# Validación: Spec 167

Entorno: Windows 11, Python 3.13 y Node 22. Pruebas unitarias con dobles en memoria, E2E de Playwright con la API simulada, y una comprobación contra la API y PostgreSQL locales con datos sintéticos. Las pruebas de integración con PostgreSQL las ejecuta el CI.

## Pruebas primero: RED

| Prueba | Resultado antes de la corrección (`main` @ `3ddc2d3`) |
| --- | --- |
| `pytest tests/unit/test_breakdown_teacher_adjustment.py` (en `backend/`) | ❌ 3 de 7 fallan con 409 «Puntaje inválido para pregunta:N». La cuarta prueba nueva protege el flujo actual al resolver la última pendiente |
| `npx playwright test e2e/explainable-grading.spec.ts --project=chromium -g "167"` (en `frontend/`) | ❌ 2 de 2: se ofrece «Recargar versión vigente» ante un 422, y el aviso dice «nota recalculada» con preguntas pendientes |

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| `pytest tests/unit/test_breakdown_teacher_adjustment.py` | ✅ 7 |
| `pytest tests/unit -k "breakdown or desglose or calificacion or grade or rounding or explainable"` | ✅ 237 |
| `ruff check --select F401,F821,F822,F823,F841` de los dos archivos de backend | ✅ |
| `npx playwright test e2e/explainable-grading.spec.ts --project=chromium` | ✅ 31, incluida «un conflicto 409 no sobrescribe la revisión vigente» |
| `npx vitest run src/modules/calificaciones` | ✅ 332 en 40 archivos |
| `npx tsc --noEmit` y `npx eslint` de los archivos cambiados | ✅ |
| `python scripts/build_system_inventory.py --check` y `pytest tests/spec_governance` (en la raíz) | ✅ |

## Comprobación contra la API y PostgreSQL locales

Calificación sintética de una entrega en línea cuyo calificador falló: cinco preguntas sin puntaje, estado `requiere_revision`.

| Paso (`PUT /api/calificaciones/{id}/desglose`) | Antes | Después |
| --- | --- | --- |
| Guardar la pregunta 1 | 409; en pantalla «La calificación cambió en otra revisión» | 200, versión 2; estado `requiere_revision`, sin `nota_confirmada` |
| Guardar las preguntas 2, 3 y 4, una por una | 409 | 200 cada una; el estado y la nota no cambian |
| Guardar la pregunta 5, la última pendiente | 409 | 200, versión 6; estado `ajustada`, `nota_confirmada` 3.50 |
| 3 puntos en una pregunta de 1 | 409 | 422 «El puntaje de la pregunta 1 debe estar entre 0 y 1.» |
| Guardar con la versión 1 ya superada | 409 | 409, sin cambios |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (validar solo lo que cambia) | `test_167_a_pending_question_is_saved_while_another_stays_pending` y `test_167_a_scored_question_can_be_corrected_while_another_is_pending` |
| FR-002 (la pendiente sigue pendiente) | `test_167_a_pending_question_is_saved_while_another_stays_pending` |
| FR-003 (sin confirmar con pendientes) | las dos pruebas anteriores y la tabla contra PostgreSQL |
| FR-004 (sin pendientes, flujo actual) | `test_167_resolving_the_last_pending_question_sets_the_grade_as_before` y las tres pruebas previas del archivo |
| FR-005 (422 fuera de rango) | `test_167_out_of_range_points_on_the_edited_question_are_a_validation_error` |
| FR-006 (aviso de conflicto solo con 409) | las dos pruebas E2E «167» y «un conflicto 409 no sobrescribe la revisión vigente» |
| FR-007 (regresión) | la tabla RED |

## Observaciones

- «Pendiente» significa aquí pregunta sin puntaje. Una pregunta con puntaje marcada para revisión no cambia de comportamiento: guardar otra sigue dejando la nota `ajustada`, como antes.
- No se comprobó la pantalla contra el backend real: el frontend se validó con la API simulada de Playwright y el backend con la API real. Tampoco se comprobó en vivo que la calificación con avance parcial siga en el filtro «Por revisar»; el filtro depende del estado, que no cambia.
- `GradeComponentEditor.tsx` no necesitó cambios: ya muestra el botón de recarga solo cuando recibe `onReload`.
- Las pruebas E2E nuevas corrieron en Chromium. WebKit las ejecuta el CI.
- La corrección no cambia filas de producción. Las calificaciones que hoy tienen preguntas pendientes se podrán resolver por pregunta después del despliegue.
