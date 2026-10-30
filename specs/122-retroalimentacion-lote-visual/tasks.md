# Tareas: retroalimentaciones en lote, enlaces copiables y fichas visuales

## Fase 1: Preparación

- [x] T001 Registrar aprobación y revisar requisitos de `specs/122-retroalimentacion-lote-visual/checklists/entrega.md`; mantener cambios ajenos fuera del alcance.
- [x] T002 Precisar contratos vigentes afectados en `specs/107-retroalimentacion-familiar/spec.md` y `specs/120-retroalimentacion-entrega-clara/spec.md`; registrar Spec122 en índices y gobernanza.

## Fase 2: Fundamentos

- [x] T003 Escribir pruebas previas de cifrado/recuperación y mensaje entregable en `backend/tests/unit/test_feedback_delivery_batch.py` (FR-003/006/007).
- [x] T004 Crear recibos de lote y credencial cifrada nullable en `backend/app/modules/feedback_sharing/models.py` y `backend/alembic/versions/202610240001_feedback_batch_copy.py`; validar migración aislada y compatibilidad heredada (FR-004/006).
- [x] T005 Implementar cifrado autenticado separado y validación de token en `backend/app/modules/feedback_sharing/credentials.py`; persistir emisión/renovación en `backend/app/modules/feedback_sharing/service.py` sin cambiar API pública (FR-006/007).

## Fase 3: Historia 1 — aceptar/publicar (P1)

- [x] T006 [US1] Escribir regresión de lote, cero, ajuste previo, alumno fallido, fuente cambiada y concurrencia en `backend/tests/integration/test_feedback_delivery_batch.py` (FR-001/002/003/004/011/012).
- [x] T007 [US1] Extraer operaciones sin commit en `backend/app/modules/calificaciones/service.py` conservando contratos y preflight existentes (FR-002/004/012).
- [x] T008 [US1] Implementar preparación, coordinación con savepoints, idempotencia y consulta de recibo en `backend/app/modules/feedback_sharing/batch_service.py`, `schemas.py` y `router.py` (FR-002/003/004/011).
- [x] T009 [US1] Añadir resumen y confirmación global, tandas y progreso recuperable en `frontend/src/modules/feedback_sharing/FeedbackBatchPublish.tsx`, `api.ts` y `ShareFeedbackDialog.tsx`, con pruebas unitarias antes del componente (FR-001/002/003/011, SC-001/002).

## Fase 4: Historia 2 — enlaces copiables (P1)

- [x] T010 [US2] Cubrir rutas/permisos, digest/cifrado inválidos, recuperación repetida y acceso histórico en `backend/tests/integration/test_feedback_link_copy.py` antes de implementar la ruta (FR-005/006/007).
- [x] T011 [US2] Implementar copia privada autenticada con auditoría y errores parciales en `backend/app/modules/feedback_sharing/link_service.py`, `schemas.py` y `router.py` (FR-005/006/007/011).
- [x] T012 [US2] Añadir copia de uno/todos/seleccionados y alternativa manual en `frontend/src/modules/feedback_sharing/FeedbackLinkActions.tsx`, `IndividualLinks.tsx`, `FeedbackAccessList.tsx` y `api.ts`, con pruebas unitarias previas (FR-005/006/007/011).
- [x] T013 [US2] Integrar acción individual desde ficha docente en `frontend/src/modules/feedback_sharing/FeedbackToolsButton.tsx` y `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`, sin permisos nuevos del alumno (FR-005/007, SC-004).

## Fase 5: Historia 4 — celular y computador (P1)

- [x] T014 [US4] Mejorar disposición, selección conservada y paneles progresivos en `frontend/src/modules/feedback_sharing/ShareFeedbackDialog.tsx`, `FeedbackBatchPublish.tsx` y `FeedbackLinkActions.tsx`; probar teclado y viewport reducido (FR-001/010/011).

## Fase 6: Historia 3 — impresión y veinte motivos (P2)

- [x] T015 [US3] Generar e inspeccionar veinte PNG transparentes mediante imagegen incorporado y guardarlos en `frontend/public/assets/feedback-motifs/`; registrar prompts/procedencia en `specs/122-retroalimentacion-lote-visual/assets-brief.md` (FR-008).
- [x] T016 [US3] Escribir pruebas previas de selección estable, opción sin decoración y paginación con cabecera en `frontend/src/modules/feedback_sharing/printPagination.test.ts` y `FeedbackPrintSheet.test.tsx` (FR-008/009).
- [x] T017 [US3] Integrar manifiesto/galería en `frontend/src/modules/feedback_sharing/feedbackMotifs.ts` y reservar geometría en `FeedbackPrintSheet.tsx`, `printPagination.ts` y `feedback-print.css` (FR-008/009, SC-003).

## Fase 7: Validación y cierre

- [x] T018 Ejecutar E2E y revisión visual de lote/copia/impresión en `frontend/e2e/feedback-delivery-batch.spec.ts` para 360/390/768/1440 px, ambos temas y Chromium/WebKit (FR-010/011, SC-005).
- [x] T019 Generar e inspeccionar PDF A4/Carta sintético y revisar veinte motivos/color/monocromo/continuaciones, con evidencia en `output/pdf/` y `specs/122-retroalimentacion-lote-visual/quickstart.md` (FR-008/009, SC-003).
- [x] T020 Ejecutar regresiones frontend/backend, permisos, migración y contenedores; actualizar inventario mediante `scripts/` y resultados en `specs/122-retroalimentacion-lote-visual/quickstart.md` (FR-004/006/007/012, SC-002/004).
- [x] T021 Ejecutar Converge sobre `specs/122-retroalimentacion-lote-visual/`, completar brechas y preparar PR enlazado al issue #257, sin fusionar ni desplegar (todos FR/SC y Constitución VII/VIII).

## Dependencias

Preparación T001–T002 → pruebas/fundamentos T003–T005 → US1 T006–T009 → US2 T010–T013 → US4 T014 → US3 T015–T017 → validación T018–T021. Tests preceden a su implementación. Archivos compartidos se editan secuencialmente.

## Oportunidades de ejecución paralela

La generación independiente de motivos de T015 puede agruparse por llamadas de herramienta una vez superados los fundamentos, sin editar los archivos de T008. Las comprobaciones backend y frontend de T020 pueden ejecutarse en paralelo si no comparten base o puertos. No se delega escritura de archivos compartidos ni se interpreta `[P]` como autorización automática para agentes.

## Estrategia de entrega

MVP interno: US1 con recibos y conservación verificados, sin producción. Después copia segura y navegación, finalmente fichas decoradas. El PR debe completar todo el alcance aprobado, no presentar el MVP como entrega final ni dejar las veinte ilustraciones como promesa.

## Phase 8: Convergence

- [x] T022 Aislar las cabeceras de ficha de las reglas globales que ocultan `header` al imprimir, y añadir regresión en media print para ambas opciones, con y sin motivo; verificar de nuevo las identidades y notas de los PDF por FR-009/SC-003 (partial, HIGH).

## Phase 9: Convergence

- [x] T023 Conservar el rechazo 409 previo a consultas de la publicación individual al extraer los helpers transaccionales; añadir regresión del contrato heredado en `backend/tests/unit/test_feedback_delivery_batch.py` por FR-012 y T007 (partial, MEDIUM).

## Trazabilidad explícita para gobernanza

| Requisito | Tareas |
|---|---|
| FR-001 | T009, T014 |
| FR-002 | T006, T007, T008, T009 |
| FR-003 | T008, T009 |
| FR-004 | T006, T008, T020 |
| FR-005 | T011, T012, T013 |
| FR-006 | T004, T005, T010, T011 |
| FR-007 | T005, T010, T011, T012, T020 |
| FR-008 | T015, T016, T017, T019 |
| FR-009 | T016, T017, T019, T022 |
| FR-010 | T014, T018 |
| FR-011 | T008, T009, T011, T012, T018 |
| FR-012 | T006, T007, T020, T023 |

## Coordinación 129

- [x] T024 Vincular reorganización y regresiones de lote/copia/fichas a specs/129-retroalimentacion-flujo-claro/tasks.md, issue #272; mantener contenido, motivos y publicación expresa (FR-001, FR-002, FR-003, FR-007, FR-008, FR-009, FR-012).

## Continuación aprobada: entrega simple135

La continuación aprobada se ejecuta y valida en [tareas135](../135-retroalimentacion-entrega-simple/tasks.md), issue287. Los marcadores anteriores acreditan únicamente sus entregas históricas; no certifican las tareas nuevas de preparación compuesta, formato y estados de135. Conservación de datos/guardas y CI siguen siendo puertas de entrega.
