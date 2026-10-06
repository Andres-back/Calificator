# Tareas: revisión de calificaciones clara y compacta

**Issue**: #180. **Spec/plan**: aprobados el 2026-10-06. Checklist revisado con autorización explícita, 8/8 satisfechos. Análisis: 9 FR y 4 SC construibles cubiertos por 12 tareas, sin conflicto crítico; SC-005 piloto posterior.

## Fase 1: Preparación

- [x] T001 Registrar el resultado de revisión autorizada de `specs/087-calificacion-clara/checklists/ux.md` y verificar ignorados/estado del worktree antes de iniciar código.

## Fase 2: Fundamentos

- [x] T002 Añadir regresión inicial del caso de la captura y motivos desconocidos en `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.test.ts` y `ReviewTriagePanel.test.tsx`; ejecutar antes de modificar presentación.

## Fase 3: Historia 1 — nota y avisos claros

Prueba independiente: discrepancia global con cuatro componentes sin alertas individuales; no mensajes contradictorios, aviso accionable y traza conservada.

- [x] T003 [US1] Implementar mensajes de presentación conocidos/desconocidos, alcance y destinos sin alterar clasificación en `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.ts` (FR-002, FR-003).
- [x] T004 [US1] Diferenciar avisos generales/individuales, omitir ceros compactos y eliminar mensaje de ausencia incompatible en `frontend/src/modules/calificaciones/review-triage/ReviewTriagePanel.tsx` (FR-002, FR-003).
- [x] T005 [US1] Unificar nota/estado y avisos A/B, clave y banderas incluso sin desglose en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`, `gradePresentation.ts` y pruebas `gradePresentation.test.ts`; conservar permisos y estados históricos (FR-001, FR-002, FR-003, FR-008).

## Fase 4: Historia 2 — celular progresivo

Prueba independiente: apertura de detalle, edición inline, retorno y scroll sin pérdida de borrador ni escrituras de calificación por lectura.

- [x] T006 [US2] Añadir escenarios de avisos y navegación sin mutación a `frontend/e2e/explainable-grading.spec.ts` y `frontend/e2e/mock/grading-review.mock.spec.ts`; ejecutar regresión antes de reorganizar panel (FR-005, FR-006, FR-008).
- [x] T007 [US2] Reorganizar cabecera y detalles en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`, reutilizar callbacks y guards, ajustar espaciado/barra y variante `compactTeacher` de `components/GradeBreakdown.tsx` solo si necesario (FR-005, FR-006, FR-007).
- [x] T008 [US2] Alinear selectores y comprobar 44 px, scroll/foco real y controles finales en `frontend/e2e/accessibility/grading-review.a11y.spec.ts` y `frontend/e2e/visual/grading-review.visual.spec.ts`; cinco tamaños/dos temas, humo WebKit acotado mediante configuración existente y capturas revisadas (FR-007, SC-002, SC-003).

## Fase 5: Historia 3 — explicación sin duplicación

Prueba independiente: escala distinta, ajuste docente y nota histórica sin desglose mantienen interpretación y datos originales.

- [x] T009 [US3] Extender casos de escala, ajuste, histórico y datos ausentes en `frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx` y `components/GradeBreakdown.test.tsx`; ejecutar antes de simplificar explicación (FR-004, FR-008).
- [x] T010 [US3] Simplificar `GradeNoteExplanation` y detalles de cálculo en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` sin recalcular ni cambiar `components/GradeFormula.tsx` compartido; conservar ajustes/historial (FR-004, FR-005).

## Fase 6: Validación y trazabilidad

- [x] T011 Ejecutar pruebas focalizadas, tipos, lint, build y E2E de `specs/087-calificacion-clara/quickstart.md`; registrar resultados y capturas revisadas sin afirmar piloto SC-005 cumplido (FR-009, SC-001, SC-002, SC-003, SC-004).
- [x] T012 Actualizar `specs/008-calificaciones/spec.md`, índice/inventario propietario, `specs/README.md`, artefactos 087 y baseline de gobernanza; ejecutar comprobaciones y Converge, conservando autorización independiente de merge/producción.

## Dependencias y estrategia

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012. H1 constituye MVP de claridad sin rediseño; H2 y H3 completan distribución. Ejecución secuencial porque varias tareas editan el mismo Workspace. Las pruebas independientes de distintas suites pueden ejecutarse en paralelo después de su implementación, pero no se delegan ediciones concurrentes del mismo archivo.

Todos los IDs siguen formato checkbox/ID, las fases de historias incluyen US y rutas; ninguna tarea opcional de rendimiento/modelos/backend. Las pruebas se añaden antes de su modificación correspondiente. SC-005 es resultado de piloto posterior, no trabajo construible: registrar pendiente en entrega, no fabricar participantes ni marcarla satisfecha.

## Gates externos

CI, aprobación de PR, merge y comprobación de despliegue se registran al realizarse; no quedan certificados por completar tareas locales. La lista de requisitos es gate de revisión previo y no un test de producto.
