# Tareas: Revisión docente compacta y progresiva

## Fase 1: Preparación

- [x] T001 Registrar aprobación de checklist y verificar dependencias/ignores en specs/075-revision-docente-compacta/checklists/ux.md y frontend/package.json.
- [x] T002 Medir comparación breve anterior a 360 px con fixture sintético de frontend/e2e/explainable-grading.spec.ts y registrar línea base en specs/075-revision-docente-compacta/quickstart.md (SC-003).

## Fase 2: Fundamentos

- [x] T003 Añadir casos de resumen, cero real, criterios ausentes, apertura sin mutación y edición protegida en frontend/e2e/explainable-grading.spec.ts antes del cambio funcional (FR-001–002, FR-007, FR-009, FR-015–016).

## Fase 3: US1 — Resumen móvil (P1)

Objetivo: comprender nota, estado y alertas sin desplegar detalles. Prueba independiente: resultado sintético con rúbrica, otro sin ella y trabajo procesándose.

- [x] T004 [US1] Implementar resumen inicial, valoraciones reales y ausencia explícita sin fabricar ceros o pesos en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx (FR-001–002, FR-009, SC-002).
- [x] T005 [US1] Mantener alertas, bloqueos y acceso explícito a respuestas/evidencia en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx (FR-003, FR-007, FR-013, SC-006).

## Fase 4: US2 — Respuestas y edición (P1)

Objetivo: comparación breve y editor cercano sin pérdida de borrador. Prueba independiente: abrir y ajustar 1/1 a 0.7/1, repetir con conflicto y texto largo.

- [x] T006 [US2] Ampliar variante docente y protección estudiantil en frontend/src/modules/calificaciones/components/GradeBreakdown.test.tsx (FR-004–006, FR-015).
- [x] T007 [US2] Implementar comparación compacta opt-in, puntajes y estados en navegación de componentes en frontend/src/modules/calificaciones/components/GradeBreakdown.tsx (FR-003–006, SC-003–004).
- [x] T008 [US2] Coordinar apertura/foco por enlace y alerta, preservar editor ante plegado y polling en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx (FR-007, FR-016, SC-004, SC-006).

## Fase 5: US3 — Acceso desde evaluaciones (P1)

Objetivo: entrada y retorno contextual sin redundancia ni pérdida de permisos. Prueba independiente: evaluación publicada, borrador, lector y rol sin evaluations.read.

- [x] T009 [P] [US3] Añadir regresión de acceso contextual, borrador y fallback por permisos en frontend/src/modules/materias/MateriaEvaluaciones.test.tsx y frontend/src/modules/materias/MateriaDetailPage.test.tsx (FR-010–012, SC-001).
- [x] T010 [US3] Incorporar materia opcional al helper compatible y acción contextual Calificar/Revisar notas en frontend/src/config/routes.ts y frontend/src/modules/materias/MateriaEvaluaciones.tsx (FR-010, FR-012, SC-001).
- [x] T011 [US3] Retirar pestaña redundante solo con lectura de evaluaciones en frontend/src/modules/materias/MateriaDetailPage.tsx y añadir retorno autorizado en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx (FR-011–012, FR-015).

## Fase 6: US4 — Funciones avanzadas (P2)

Objetivo: acceso progresivo sin eliminar capacidades. Prueba independiente: evidencia multihoja, histórico sin desglose, nota publicada, PQRS y permisos de lector.

- [x] T012 [US4] Agrupar retroalimentación, historial, verificaciones y PQRS con indicadores visibles y editores únicos en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx (FR-008, FR-013, SC-007).
- [x] T013 [US4] Ampliar regresión de funciones avanzadas, secciones sin inferencia, enlaces y borradores en frontend/e2e/explainable-grading.spec.ts (FR-008, FR-015–016, SC-006–007).

## Fase final: Validación y trazabilidad

- [x] T014 Ejecutar tipos, lint, unidades afectadas y E2E de frontend/e2e/explainable-grading.spec.ts; medir ≥30% de reducción y cinco resoluciones claro/oscuro, scroll, foco y controles de 44 px; registrar resultados y límites físicos en specs/075-revision-docente-compacta/quickstart.md (FR-014, SC-003–005).
- [x] T015 Actualizar especificaciones responsables 008/016/033, specs/README.md, tests/spec_governance/test_spec_baseline.py e inventario mediante scripts/build_system_inventory.py; comprobar gobernanza (FR-015).
- [x] T016 Ejecutar Converge sobre specs/075-revision-docente-compacta/tasks.md y documentar cobertura completa y brechas reales, sin declarar pruebas físicas no realizadas.
- [x] T017 Preparar entrega revisable en codex/075-revision-docente-compacta vinculada a #158 y registrar gates de PR/CI y autorización de merge en specs/075-revision-docente-compacta/quickstart.md. El merge requiere CI completo verde, sin push directo a main.

## Trazabilidad explícita

| Requisito | Tareas |
|---|---|
| FR-001 | T003, T004 |
| FR-002 | T003, T004 |
| FR-003 | T005, T007 |
| FR-004 | T006, T007, T014 |
| FR-005 | T006, T007, T014 |
| FR-006 | T006, T007, T008, T013 |
| FR-007 | T003, T005, T008, T013 |
| FR-008 | T012, T013 |
| FR-009 | T003, T004 |
| FR-010 | T009, T010 |
| FR-011 | T009, T011 |
| FR-012 | T009, T010, T011 |
| FR-013 | T005, T012 |
| FR-014 | T014 |
| FR-015 | T003, T006, T011, T013, T015 |
| FR-016 | T003, T008, T013 |
| SC-001 | T009, T010, T011 |
| SC-002 | T003, T004 |
| SC-003 | T002, T007, T014 |
| SC-004 | T007, T008, T014 |
| SC-005 | T014 |
| SC-006 | T005, T008, T013 |
| SC-007 | T012, T013 |

## Dependencias y paralelismo

Preparación → Fundamentos → US1 → US2 → US3 → US4 → Validación. T006 precede T007; T009 precede T010–011. Todos los cambios al workspace son secuenciales para no duplicar editores. T009 puede prepararse mientras T006–008 trabajan en otros archivos, sin agentes obligatorios. Dentro de US1, US2 y US4 no hay edición paralela segura del mismo workspace.

## Estrategia de entrega

Primero resumen (MVP), luego comparación/edición y navegación contextual, finalmente secciones avanzadas y regresión. Sin migraciones, backend, IA, notas reales ni publicación implícita. La emulación de viewport no acredita uso en teléfono físico.
