# Tareas: revisión visual y edición directa de la nota

## Fase 1: Preparación

- [x] T001 Registrar aprobación de spec/plan en specs/134-revision-visual-nota-directa/spec.md, plan.md e issue #281; revisar lista de requisitos autorizada.
- [x] T002 Analizar consistencia de specs/134-revision-visual-nota-directa/{spec,plan,tasks}.md y verificar ignores existentes antes de implementar.

## Fase 2: Fundamentos

- [x] T003 Añadir regresiones de contrato, nota cero, idempotencia, conflictos y auditoría en backend/tests/unit/test_grade_direct_adjustment.py.
- [x] T004 Extender AjustarNota compatible con precondiciones y operación en backend/app/modules/calificaciones/schemas.py y tipos/cliente frontend/src/{types/api.ts,modules/calificaciones/api.ts}.

## Fase 3: Historia 1 — Nota final directa

Meta: cambiar 4,1 por 4,5 sin calcular delta ni alterar preguntas. Prueba independiente: guardar/recargar, comparar libro/historial/evidencia y rechazos de permisos.

- [x] T005 [US1] Preparar versión global sin commits intermedios ni modificación de puntos incompletos en backend/app/modules/calificaciones/breakdown_service.py.
- [x] T006 [US1] Implementar ajuste atómico con bloqueo, guardas, actor, cero, operación/versiones y suspensión existente en backend/app/modules/calificaciones/{service,router}.py.
- [x] T007 [US1] Crear editor breve y pruebas de decimal, cancelación y errores en frontend/src/modules/calificaciones/components/GradeFinalEditor{.tsx,.test.tsx}.
- [x] T008 [US1] Integrar editor junto a nota, eliminar acceso global cotidiano duplicado, preservar borrador y actualizar consultas en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx.
- [x] T009 [US1] Verificar persistencia, permisos, conflictos, doble envío y rollback con PostgreSQL sintético en backend/tests/integration/test_grade_direct_adjustment.py.

## Fase 4: Historia 2 — Prioridad por pregunta

Meta: botones, resumen y detalle con misma prioridad sin confundir acierto. Prueba independiente: matriz sintética de confianza, estado, origen y avisos sin mutar notas.

- [x] T010 [P] [US2] Ampliar matriz de normalización, fronteras, contradicciones, datos ausentes y docente en frontend/src/modules/calificaciones/review-triage/buildReviewTriage.test.ts.
- [x] T011 [US2] Centralizar reglas/presentación accesible en frontend/src/modules/calificaciones/review-triage/{buildReviewTriage.ts,reviewPriorityPresentation.ts}.
- [x] T012 [US2] Aplicar color/etiqueta/icono/selección en frontend/src/modules/calificaciones/components/GradeBreakdown.tsx y review-triage/ReviewTriagePanel.tsx sin exponer detalles al estudiante.
- [x] T013 [US2] Añadir regresiones de prioridades consistentes y vista estudiantil en frontend/src/modules/calificaciones/components/GradeBreakdown.test.tsx y review-triage/ReviewTriagePanel.test.tsx.

## Fase 5: Historia 3 — Accesibilidad y recuperación

Meta: usar ambos flujos sin desbordamiento y con teclado. Prueba independiente: 360/390/1440 px, claro/oscuro, Chromium/WebKit.

- [x] T014 [US3] Crear escenarios de edición, conflicto/red, publicado, colores y selección en frontend/e2e/grade-direct-review.spec.ts con fixtures sintéticos.
- [x] T015 [US3] Ejecutar E2E/capturas y ajustar disposición/foco/teclado en frontend/src/modules/calificaciones/components/GradeFinalEditor.tsx y GradeBreakdown.tsx.

## Fase final: Validación

- [x] T016 Ejecutar regresiones backend/frontend, tipos/lint/build e integración; registrar resultados reales en specs/134-revision-visual-nota-directa/validation.md.
- [x] T017 Actualizar especificaciones responsables, inventario y baseline/gobernanza en specs/system-inventory/ y tests/spec_governance/ según scripts/build_system_inventory.py y registrar pruebas.
- [x] T018 Ejecutar Converge contra specs/134-revision-visual-nota-directa/ y cerrar tareas; preparar PR enlazado a #281 sin fusionar ni desplegar.

## Dependencias y estrategia

T001–T002 bloquean producto. T003 precede T004–T006; T007 precede T008; T009 valida US1. T010–T013 pueden avanzar independientemente de US1 una vez revisados los artefactos. US3 requiere US1+US2. T016–T018 requieren resultados de ambas historias.

Ejemplos de paralelismo: T010 (archivo de tests de clasificación) y T003 (tests backend) no comparten archivos; no requieren agentes y pueden ejecutarse secuencialmente. T007 no altera backend y puede desarrollarse tras el contrato. No editar simultáneamente Workspace desde dos tareas. MVP: US1 completo; entrega aprobada incluye también US2/US3, no recortarlos silenciosamente.

## Trazabilidad

FR-001, FR-002 y FR-003: T003/004/006/007/008/009; FR-004 y FR-007: T005/006/009; FR-005: T003/006/009/014; FR-006: T006/008/009/014; FR-008, FR-009, FR-010, FR-011 y FR-012: T010/011/012/013; FR-013: T007/014/015. SC-001, SC-002, SC-003, SC-004, SC-005 y SC-006: T009/013/014/015/016. Sin llamadas a IA ni datos reales.

## Phase 6: Convergence

- [x] T019 Añadir y ejecutar la lectura del servicio del libro después de guardar en backend/tests/integration/test_grade_direct_adjustment.py y la actualización del valor en la lista docente en frontend/e2e/grade-direct-review.spec.ts, con matrícula y respuestas de consulta sintéticas coherentes, según SC-002 y US1/AC3 (partial).

## Fase 7: Corrección del CI del PR #282

- [x] T020 Finalizar explícitamente la escritura móvil antes de cerrar el editor al guardar o cancelar en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx, según FR-013 y US3/AC1; repetir sin relajar las aserciones de frontend/e2e/grade-direct-review.spec.ts y registrar el estado del reenvío a CI en el PR.
