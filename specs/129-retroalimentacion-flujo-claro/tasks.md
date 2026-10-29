# Tareas: centro de retroalimentaciones de flujo claro

Plan aprobado el 2026-10-26. Sin cambios de backend ni producción. Todas las rutas se resuelven desde E:/tesis/.worktrees/motivos-ci.

## Fase 1: Preparación

- [x] T001 Registrar aprobación y revisar los ocho requisitos en specs/129-retroalimentacion-flujo-claro/checklists/ux-entrega.md; verificar ignorados y contratos existentes.
- [x] T002 Analizar cobertura de spec.md, plan.md y este tasks.md antes de implementar; registrar conclusión en quickstart.md fuera de la fase de análisis de solo lectura.

## Fase 2: Fundamentos

- [x] T003 Añadir pruebas RED para clasificación, resultados e identidad de recuperación en frontend/src/modules/feedback_sharing/feedbackPreparation.test.ts (FR-006/008/011/012).
- [x] T004 Implementar modelo de preparación y manifiesto mínimo, validado y acotado a una hora en frontend/src/modules/feedback_sharing/feedbackPreparation.ts (FR-006/008/011/012).

## Fase 3: Historia 1 — seleccionar, compartir y copiar

Prueba independiente: cuarenta alumnos, selección al final y conjunto mixto; resultado/copia en el mismo panel, sin emisiones por consultar.

- [x] T005 [US1] Escribir pruebas RED de preparación/copia/reintento, activos, faltantes, cerrados y fallos en frontend/src/modules/feedback_sharing/FeedbackSharePanel.test.tsx (FR-005/006/007/008/010/012; SC-002/003/005).
- [x] T006 [US1] Implementar preparación, opciones confirmadas, copia por gesto y recuperación en frontend/src/modules/feedback_sharing/FeedbackSharePanel.tsx con contratos vigentes (FR-005–008/010–012).
- [x] T007 [US1] Integrar pie único y navegación al panel en frontend/src/modules/feedback_sharing/ShareFeedbackDialog.tsx y frontend/src/modules/feedback_sharing/FeedbackSelectionBar.tsx, conservando impresión y publicación explícitas (FR-004/007/009/015/016).

## Fase 4: Historia 2 — lista y detalle claros

Prueba independiente: búsqueda/homónimos, ocultos seleccionados, notas cero, revisión sucia y retorno sin perder selección.

- [x] T008 [US2] Ampliar regresiones de selección/filtro/sesión/revisión e impresión en frontend/src/modules/feedback_sharing/ShareFeedbackDialog.test.tsx (FR-001/002/003/009/011/015; SC-002/005).
- [x] T009 [US2] Crear lista compacta y detalle contextual en frontend/src/modules/feedback_sharing/FeedbackStudentList.tsx y ShareFeedbackDialog.tsx; retirar listas duplicadas del grupo sin perder ciclo de vida (FR-001/002/003/009/010).
- [x] T010 [US2] Sustituir referencia de objeto por identidad estable y permisos actuales en frontend/src/modules/feedback_sharing/FeedbackWorkspace.tsx, FeedbackToolsButton.tsx, FeedbackLinkActions.tsx y FeedbackBatchPublish.tsx; añadir regresiones de renovación/logout (FR-011).

## Fase 5: Historia 3 — distribución adaptable

Prueba independiente: completar flujos en 360/390/768/1440, ambos temas, Chromium/WebKit, texto ampliado y teclado sin barras tapadas.

- [x] T011 [US3] Adaptar marco, foco y viewport móvil en frontend/src/modules/feedback_sharing/ShareFeedbackDialog.tsx y coordinar acciones integradas sin otro pie global en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx si hace falta (FR-013/014).
- [x] T012 [US3] Añadir frontend/e2e/feedback-workspace-responsive.spec.ts e inclusión explícita en frontend/playwright.config.ts; comprobar scroll/acciones/última fila, filtros, copia e impresión (FR-013/014/015; SC-001/004).

## Fase 6: Validación y conservación

- [x] T013 Ejecutar Vitest, TypeScript, lint, build y auditorías frontend y registrar resultados en specs/129-retroalimentacion-flujo-claro/quickstart.md; corregir regresiones sin rebajar pruebas (FR-016).
- [x] T014 Ejecutar E2E nuevos y regresiones feedback-delivery/batch con datos sintéticos y registrar capturas/límites en specs/129-retroalimentacion-flujo-claro/quickstart.md (SC-001–005).
- [x] T015 Ejecutar regresiones backend de copia, autorización, rutas, ciclo y cuota en base aislada, sin modificar backend ni datos reales; registrar en quickstart.md (FR-016; SC-003/005).
- [x] T016 Actualizar propietarios specs/008-calificaciones, 107-retroalimentacion-familiar, 120-retroalimentacion-entrega-clara, 122-retroalimentacion-lote-visual y 126-retroalimentacion-unificada-chat, índice e inventario/gobernanza según las superficies afectadas.
- [x] T017 Ejecutar Converge contra spec/plan/tasks y cerrar brechas, documentando evidencia/límites en specs/129-retroalimentacion-flujo-claro/quickstart.md, sin afirmar producción o CI remoto.

## Dependencias y ejecución

T001→T002→T003→T004; T005→T006→T007; T008→T009; T010 conserva la misma identidad en consumidores antes de T011/T012. Fases 3/4/5 comparten ShareFeedbackDialog y se ejecutan secuencialmente. T013–T016 preceden T017.

Ejemplos de paralelismo por historia: T005 y T008 pueden redactarse en archivos distintos tras T004; pruebas unitarias de panel/lista pueden ejecutarse junto a E2E una vez integrada la UI; casos Chromium/WebKit independientes pueden correr con el runner. No requieren delegación a otros agentes.

Estrategia incremental: fundamentos y recorrido US1 primero, luego lista/detalle US2 y adaptación US3; no entregar una nueva UI incompleta como arreglo productivo. Puerta posterior: revisión y PR/CI antes de una fusión autorizada aparte.

## Trazabilidad normativa explícita

| Requisito | Tareas |
|---|---|
| FR-001 | T008, T009 |
| FR-002 | T008, T009 |
| FR-003 | T008, T009 |
| FR-004 | T007, T011, T012 |
| FR-005 | T005, T006 |
| FR-006 | T003, T004, T005, T006 |
| FR-007 | T005, T006, T007 |
| FR-008 | T003, T004, T005, T006 |
| FR-009 | T007, T008, T009 |
| FR-010 | T005, T006, T009 |
| FR-011 | T003, T004, T006, T010 |
| FR-012 | T003, T004, T005, T006 |
| FR-013 | T011, T012, T014 |
| FR-014 | T011, T012, T014 |
| FR-015 | T007, T008, T012, T014 |
| FR-016 | T007, T013, T014, T015 |

## Fase 7: Convergencia

- [x] T018 Añadir y ejecutar una muestra explícita de selección al inicio/mitad/final de cuarenta alumnos en frontend/e2e/feedback-workspace-responsive.spec.ts con Chromium/WebKit, conservando contador, acciones y destinatarios; documentar resultado en quickstart.md según SC-001, US1/AC1 y plan: muestra de aceptación (partial).

## Fase 8: Hotfix #283 — revisar y compartir sin salir del panel

- [x] T019 Añadir pruebas RED de nota publicada con detalle pendiente desde grupo/integrado y de mezcla con opciones conservadas en frontend/src/modules/feedback_sharing/{FeedbackSharePanel,ShareFeedbackDialog}.test.tsx, según FR-005, FR-007, FR-009 y SC-004.
- [x] T020 Reutilizar revisión docente dentro de frontend/src/modules/feedback_sharing/FeedbackSharePanel.tsx, actualizar preview de la fila/lista y mantener crear/copiar separados de aprobar en ShareFeedbackDialog.tsx, según FR-005, FR-006, FR-007, FR-009 y FR-016.
- [x] T021 Mostrar estado cero pendiente, acción clara y foco/restauración; conservar borrador, conflictos, permisos, accesos cerrados y manifiesto incierto; distinguir la nota publicada del enlace en CalificacionesWorkspace.tsx, según FR-008, FR-010, FR-011, FR-014 y FR-016.
- [x] T022 Añadir/ejecutar frontend/e2e/feedback-share-review.spec.ts en Chromium/WebKit, grupo/integrado, 360/390/1440 y claro/oscuro; verificar copia y ninguna emisión al navegar/aprobar, según FR-013, SC-002 y SC-004.
- [x] T023 Ejecutar regresiones frontend, tipos/lint/build y controles sintéticos backend existentes; documentar resultados reales y límites del hotfix en specs/129-retroalimentacion-flujo-claro/quickstart.md, según FR-016 y SC-003/005.
- [x] T024 Actualizar propietarios/inventario, ejecutar gobernanza y Converge; preparar PR que cierre #283 sin fusionar ni desplegar, según FR-016 y constitución VII/VIII.

## Phase 9: Convergence

- [x] T025 Coordinar la barra móvil de calificación con el centro integrado habilitado en frontend/src/modules/{calificaciones/CalificacionesWorkspace,feedback_sharing/FeedbackWorkspace}.tsx, conservando las acciones del editor de compatibilidad cuando está desactivado; probar retorno, permisos y visibilidad completa de crear/copiar tras aprobar en frontend/e2e/feedback-share-review.spec.ts, según FR-004, FR-013, US3/AC2 y plan: barra única integrada (partial).

## Fase 10: Integración con PR #282

- [x] T026 Integrar main 26b8fdd en la rama del PR #284 sin reescribir historial: conservar edición directa de nota y estados de confianza de 134 junto con revisión, teclado y barra única de 129 en CalificacionesWorkspace.tsx; regenerar inventario y verificar tipos, pruebas unitarias y E2E de ambos flujos en Chromium/WebKit, registrando resultados en quickstart.md según FR-004/009/013/016 y constitución VII/VIII. Autorizado mediante «sí» el 2026-10-29; no incluye fusionar #284 ni desplegar.
