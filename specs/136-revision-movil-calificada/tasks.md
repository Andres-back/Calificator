# Tareas: revisión móvil de evaluaciones calificadas

## Fase1: preparación

- [x] T001 Registrar aprobación humana e issue291 en specs/136-revision-movil-calificada/spec.md y plan.md; conservar independiente la propuesta de reparto de puntajes.
- [x] T002 Revisar diagnóstico, contratos y calidad16/16 en specs/136-revision-movil-calificada/research.md y checklists/requirements.md.

## Fase2: fundamentos

- [x] T003 Añadir regresiones RED de navegación y layout integrado/modal en frontend/src/modules/calificaciones/components/GradeBreakdown.test.tsx y frontend/src/modules/feedback_sharing/ShareFeedbackDialog.test.tsx.
- [x] T004 Mantener un contrato explícito de scroll integrado/modal en frontend/src/modules/feedback_sharing/ShareFeedbackDialog.tsx y FeedbackSharePanel.tsx, sin alterar APIs ni permisos.

## Fase3: historia1 — preguntas

- [x] T005 [US1] Compactar accesos conservando prioridad, nombre accesible y selección; añadir anterior/siguiente con límites al mismo callback en frontend/src/modules/calificaciones/components/GradeBreakdown.tsx.
- [x] T006 [US1] Probar8/17/30 preguntas, identidades repetidas, extremos y guardas existentes en frontend/src/modules/calificaciones/components/GradeBreakdown.test.tsx y frontend/e2e/grade-review-mobile.spec.ts.

## Fase4: historia2 — lectura y desplazamiento

- [x] T007 [US2] Delegar lectura, lista, edición, compartir e impresión integradas al dueño real de scroll en frontend/src/modules/feedback_sharing/ShareFeedbackDialog.tsx y FeedbackSharePanel.tsx; conservar contención y altura del modal independiente.
- [x] T008 [US2] Ubicar el marcador de teclado en el dueño real en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y verificar borradores, bloqueo de fondo y ausencia de escrituras en frontend/src/modules/feedback_sharing/ShareFeedbackDialog.test.tsx.

## Fase final: validación

- [x] T009 Añadir regresión E2E nativa de scroll desde centro y márgenes, navegación y matriz responsive en frontend/e2e/grade-review-mobile.spec.ts; distinguir emulación de teléfono físico.
- [x] T010 Ejecutar unidades, tipos/lint/build, E2E y gobernanza aplicables y documentar resultados sin datos privados en specs/136-revision-movil-calificada/quickstart.md.
- [x] T011 Actualizar specs/README.md e inventario aplicable; ejecutar Converge y cerrar únicamente tareas comprobadas en specs/136-revision-movil-calificada/tasks.md.
- [x] T012 Revisar diff y preparar entrega por PR enlazada a issue291 con resultados en specs/136-revision-movil-calificada/quickstart.md; no fusionar ni desplegar sin autorización posterior y CI verde. Publicación del PR después del commit gobernado, para evitar que esta tarea de entrega impida crear el propio PR.

## Dependencias y ejecución

T001→T002→Analyze→T003; T004 precede T007/T008. T005 sigue a su regresión RED y precede T006. Ambas historias comparten únicamente contratos existentes y son comprobables por separado. T009–T012 requieren las dos historias completas.

Trabajo independiente posible: pruebas de navegación (T005/T006) y layout de feedback (T007/T008), en archivos diferentes; se ejecutarán secuencialmente por un solo agente. No es autorización para delegar.

MVP: historia1 completa con guardas; entrega prevista incluye ambas historias antes del PR. FR-001, FR-002/SC-001, SC-002→T005–006/T009; FR-003, FR-004, FR-005/SC-003→T004/T007–009; FR-006, FR-007, FR-008/SC-004→T006/T008–012.

## Fase5: convergencia de CI

- [x] T013 Conservar el diálogo global vigente de borradores al cambiar de pregunta en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y comprobarlo con frontend/e2e/explainable-grading.spec.ts y grade-review-mobile.spec.ts; FR-002, FR-005 (contradicts detectado por CI y corregido).
- [x] T014 Proteger el foco del docente frente al frame diferido de entrada a una sección en frontend/src/modules/calificaciones/components/reviewSectionFocus.ts y sus pruebas; conservar la apertura/copia con teclado en frontend/e2e/feedback-share-review.spec.ts; FR-005.
