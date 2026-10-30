# Tareas: retroalimentación clara y entrega simple

## Fase 1: Preparación

- [X] T001 Registrar aprobación/issue287 y artefactos en `specs/135-retroalimentacion-entrega-simple/` sin modificar producción. (FR-015/016)
- [X] T002 Revisar requisitos y analizar cobertura/consistencia de `spec.md`, `plan.md`, `tasks.md` y constitución antes de código. (FR-001–016)

## Fase 2: Fundamentos

- [X] T003 Añadir RED de mensaje individual/lote, envoltorio conocido y dudas desconocidas en `backend/tests/unit/test_feedback_delivery_review.py` y `test_feedback_delivery_batch.py`. (FR-001/007)
- [X] T004 Compartir regla conservadora de mensaje entregable entre `backend/app/modules/feedback_sharing/batch_policy.py` y `service.py`, conservando guardas/huellas sanas/original. (FR-001/007/016)

## Fase 3: Historia 1 — Aprobación y preparación compuestas

- [X] T005 [US1] Añadir pruebas RED de confirmación/opciones, aprobación idempotente y resultados parciales en `frontend/src/modules/feedback_sharing/FeedbackSharePanel.test.tsx` y pruebas de preparación. (FR-002–006/014)
- [X] T006 [US1] Implementar estado/recuperación de la composición en `frontend/src/modules/feedback_sharing/feedbackPreparation.ts` o helper dedicado, reutilizando `api.ts`, sin otro endpoint ni duplicar tokens en caché. (FR-002–005)
- [X] T007 [US1] Integrar confirmación aprobar→proyección vigente→emitir faltantes en `frontend/src/modules/feedback_sharing/FeedbackSharePanel.tsx`, conservando activos y gestión de cerrados. (FR-002–006)
- [X] T008 [US1] Integrar selección y acceso individual/grupo en `frontend/src/modules/feedback_sharing/ShareFeedbackDialog.tsx`, con edición en contexto, mensajes claros y recuperación. (FR-002/005/007/014)
- [X] T009 [US1] Probar preservación de notas ajustadas, resumen sin detalle dudoso y permisos en `backend/tests/integration/test_feedback_delivery_review.py`, `test_feedback_delivery_batch.py` y `test_feedback_sharing_authorization.py` con base aislada. (FR-003/007/014/016)

## Fase 4: Historia 2 — Mensaje útil y legible

- [X] T010 [US2] Añadir RED de agrupación conservadora, texto antiguo/dudas y conservación de impresión en `frontend/src/modules/feedback_sharing/{feedbackSections,FeedbackMessage,FeedbackPrintSheet}.test.ts(x)`. (FR-008–011)
- [X] T011 [US2] Implementar grupos legibles y motivo curado pequeño en `frontend/src/modules/feedback_sharing/{feedbackSections.ts,FeedbackMessage.tsx}`, sin inventar contenido, cambiar la nota ni solicitar IA. (FR-008–010)
- [X] T012 [US2] Integrar presentación común en revisión y `frontend/src/modules/feedback_sharing/PublicFeedbackPage.tsx`, preservando `FeedbackPrintSheet.tsx` y sus motivos/impresión. (FR-009–011)

## Fase 5: Historia 3 — Distribución y estados

- [X] T013 [US3] Añadir RED de busy/dirty y lectura integrada sin altura anidada en `frontend/src/modules/feedback_sharing/{FeedbackWorkspace,ShareFeedbackDialog}.test.tsx` y pruebas de calificaciones. (FR-012/013)
- [X] T014 [US3] Separar estados operativos/edición en `frontend/src/modules/feedback_sharing/{FeedbackWorkspace,ShareFeedbackDialog,FeedbackSharePanel}.tsx` y `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`. (FR-013/014)
- [X] T015 [US3] Quitar recuadros/scrollers redundantes integrados y mantener acciones/foco en `frontend/src/modules/feedback_sharing/{ShareFeedbackDialog,FeedbackSharePanel,FeedbackSelectionBar}.tsx`. (FR-012)
- [X] T016 [US3] Añadir y ejecutar E2E/capturas sintéticas en `frontend/e2e/feedback-share-review.spec.ts` y `feedback-workspace-responsive.spec.ts` para entradas, estados mixtos, tamaños/temas, teclado y motivos ausentes. (FR-010/012–015; SC-001/003/005)

## Fase 6: Validación y entrega

- [X] T017 Ejecutar frontend check, backend unitarias/contratos y auditorías aplicables; registrar fallos/resultados y límites en `specs/135-retroalimentacion-entrega-simple/quickstart.md`. (FR-015/016; SC-001–006)
- [X] T018 Actualizar especificaciones responsables120/122/126/129 e inventario/índices en `docs/` y `specs/system-inventory/` sin reescribir historia ni reglas no afectadas. (FR-002/009/015/016)
- [X] T019 Ejecutar Converge sobre `specs/135-retroalimentacion-entrega-simple/{spec,plan,tasks}.md`, completar pendientes reales y registrar revisión. (FR-001–016; SC-001–006)
- [X] T020 Preparar commit/PR enlazado a287 con evidencia, sin fusionar/desplegar ni atribuir validación física o calidad académica no medida. (FR-015/016; SC-006)

## Dependencias y ejecución

T001→T002→T003→T004. US1(T005→T006→T007→T008→T009) depende de T004. US2(T010→T011→T012) y US3(T013→T014→T015→T016) reutilizan el contrato estable de US1; T011/T014 se integran antes de los recorridos finales. T017→T018→T019→T020 después de las tres historias.

Pruebas antes de implementación en cada historia. Los módulos independientes de formato y política pueden verificarse en paralelo como procesos locales, no requieren agentes. MVP funcional es US1; la entrega aprobada incluye también US2/US3 y no se declara terminada por completar solo el MVP.

## Phase 7: Convergence

- [X] T021 Proteger el cambio local de pestaña mientras la entrega está ocupada en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`, con una regresión que conserve el panel y distinga la operación de un borrador, según FR-013/014 y US3/AC3 (partial, HIGH).
- [X] T022 Cerrar la cobertura de T016/SC-005 en los dos archivos E2E, comprobando controles habilitados/foco antes de activarlos por teclado, motivos ausentes, lectura visible y todos los recorridos sin ampliar límites ni retirar las pruebas de ratón; documentar fallos y resultados reales en quickstart.md según FR-010/012/015 y SC-003/005/006 (partial, HIGH).

## Mapa explícito de requisitos

Las referencias abreviadas anteriores se desarrollan aquí para su validación automática; no se incorporan requisitos ni trabajos nuevos.

| Requisito | Tareas responsables | Evidencia principal |
|---|---|---|
| FR-001 | T003, T004, T009 | Política de mensaje compartida, unitarias y contrato de revisión |
| FR-002 | T005, T006, T007, T008 | Confirmación explícita individual/grupo y recibos |
| FR-003 | T005, T007, T009 | Conservación de notas ajustadas y proyección de resumen |
| FR-004 | T005, T006, T007 | Reutilización de activos y gestión separada de cerrados |
| FR-005 | T005, T006, T007 | Recuperación idempotente, parcial e incierta |
| FR-006 | T005, T007, T010 | Copia separada, alternativa manual e impresión sin publicación |
| FR-007 | T003, T004, T008, T009 | Rechazo de mensaje vacío, genérico o contradictorio |
| FR-008 | T010, T011 | Agrupación conservadora sin contenido inventado |
| FR-009 | T010, T011, T012, T018 | Presentación común, continuidad y documentación responsable |
| FR-010 | T010, T011, T016, T022 | Motivo existente pequeño y fallo de imagen sin bloqueo |
| FR-011 | T010, T012 | Impresión completa A4/Carta y opción sin decoración |
| FR-012 | T013, T015, T016, T022 | Lectura integrada, acciones, viewport y retorno visible |
| FR-013 | T013, T014, T021 | Ocupación separada de borrador y guarda de pestaña |
| FR-014 | T005, T008, T009, T014, T021 | Autorización, conflictos, contexto y conservación de operación |
| FR-015 | T001, T002, T016, T017, T018, T019, T020, T022 | Pruebas sintéticas, evidencias y puerta de CI |
| FR-016 | T001, T004, T009, T017, T020 | Conservación de fuente, modelos y límites; sin producción |
