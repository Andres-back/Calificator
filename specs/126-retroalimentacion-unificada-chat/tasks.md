# Tareas: retroalimentación unificada y conversación recuperable

## Fase 1: Preparación

- [x] T001 Registrar aprobación, revisar ocho requisitos y actualizar referencias responsables en specs/126-retroalimentacion-unificada-chat/ y specs/107-retroalimentacion-familiar/spec.md, specs/120-retroalimentacion-entrega-clara/spec.md, specs/122-retroalimentacion-lote-visual/spec.md.
- [x] T002 Revisar contratos, ignorados y entorno aislado en .gitignore, .dockerignore, frontend/eslint.config.js y backend/tests/conftest.py; conservar cambios ajenos.

## Fase 2: Fundamentos

- [x] T003 Crear pruebas de ámbito/digest/cursor y migración aditiva en backend/tests/unit/test_feedback_conversation.py y backend/tests/integration/test_feedback_sharing_migration.py (FR007–010).
- [x] T004 Implementar helper de ámbito opaco/UUID/cursor y campo nullable/index en backend/app/modules/feedback_sharing/conversation.py, models.py y backend/alembic/versions/ (FR007–010).

## Fase 3: Historia 1 — una devolución

Prueba independiente: dos entradas del mismo alumno muestran la misma revisión, guardan sin alterar nota y conservan selección/lote/impresión.

- [x] T005 [US1] Ampliar pruebas de selección, revisión común, dirty/conflicto y permisos en frontend/src/modules/feedback_sharing/ShareFeedbackDialog.test.tsx y FeedbackToolsButton.test.tsx (FR001–005/015, SC001–002).
- [x] T006 [US1] Extraer panel común individual/grupo y selección explícita en frontend/src/modules/feedback_sharing/ShareFeedbackDialog.tsx y FeedbackDeliveryReview.tsx; guardar solo mensaje con huella/auditoría/historial en backend/app/modules/feedback_sharing/router.py, service.py y schemas.py, sin ajustar nota; reutilizar servicios existentes de entrega (FR001–005).
- [x] T007 [US1] Integrar panel común en frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx y frontend/src/modules/feedback_sharing/FeedbackToolsButton.tsx, conservar original en historial y no usar ajuste académico al editar entrega (FR001–005/015).
- [x] T008 [US1] Cubrir ambas entradas, selección de tres y lote mixto en frontend/e2e/feedback-delivery.spec.ts y feedback-delivery-batch.spec.ts; conservar regresiones de impresión y enlaces (SC001–002).

## Fase 4: Historia 2 — recuperar conversación

Prueba independiente:25 intercambios y un pendiente recuperados sin reenvío; otro navegador no puede consultarlos y el cupo no cambia.

- [x] T009 [US2] Añadir pruebas de historial, poll/replay cruzados, legado, cuota, vigencia concurrente y retención en backend/tests/integration/test_feedback_sharing_history.py y pruebas existentes de chat/quota/lifecycle/retention (FR006–010, SC003–004/007).
- [x] T010 [US2] Implementar historial paginado, revalidación y aislamiento en backend/app/modules/feedback_sharing/public_router.py, chat_service.py y quota_service.py (FR006–010).
- [x] T011 [US2] Probar metadata opaca, cliente público y recuperación en frontend/src/modules/feedback_sharing/publicApi.test.ts, PublicFeedbackChat.test.tsx y conversation.test.ts (FR006–010).
- [x] T012 [US2] Implementar metadata y cliente con cabecera, scope e historial en frontend/src/modules/feedback_sharing/conversation.ts y publicApi.ts (FR006–010).
- [x] T013 [US2] Rehidratar por request_id, pendientes y páginas; limpiar al cerrar/cambiar contexto en frontend/src/modules/feedback_sharing/PublicFeedbackChat.tsx y PublicFeedbackPage.tsx (FR006–010).
- [x] T014 [US2] Añadir reapertura, aislamiento de dos contextos, legado y almacenamiento bloqueado a frontend/e2e/feedback-delivery.spec.ts y actualizar selección WebKit en frontend/playwright.config.ts (SC003–004/007).

## Fase 5: Historia 3 — explicación decorada y legible

Prueba independiente: respuestas con marcado, listas, tablas, matemáticas y contenido malicioso conservan texto útil y no cargan recursos externos.

- [x] T015 [P] [US3] Probar normalización conservadora y renderer restringido en frontend/src/modules/feedback_sharing/FeedbackChatMessage.test.tsx (FR011–014, SC005–006).
- [x] T016 [US3] Crear renderer con iconos/burbujas y bloques semánticos sin imágenes remotas en frontend/src/modules/feedback_sharing/FeedbackChatMessage.tsx, reutilizando frontend/src/components/ui/RichContent.tsx (FR011–014).
- [x] T017 [US3] Integrar jerarquía, estados, contador, composer móvil y ayudas accesibles en frontend/src/modules/feedback_sharing/PublicFeedbackChat.tsx; mantener preguntas como texto (FR011–014).
- [x] T018 [US3] Comprobar visuales360/390/768/1440, temas, dos motores, teclado y marcado hostil en frontend/e2e/feedback-delivery.spec.ts y frontend/src/modules/feedback_sharing/PublicFeedbackChat.test.tsx (SC005–006).

## Fase final: Validación

- [x] T019 Ejecutar suites de backend/base aislada, migración y conservación según specs/126-retroalimentacion-unificada-chat/quickstart.md; registrar resultados reales (FR015, SC007).
- [x] T020 Ejecutar typecheck/lint/unit/build/auditorías y E2E/impresión, actualizar inventarios pertinentes en frontend/scripts/ y docs/ conforme a scripts vigentes; registrar resultados en specs/126-retroalimentacion-unificada-chat/quickstart.md.
- [x] T021 Ejecutar Converge contra specs/126-retroalimentacion-unificada-chat/tasks.md y cerrar o añadir trabajo real restante; preparar diff limpio y resumen sin datos sensibles.
- [x] T022 Publicar rama y crear PR vinculado a issue266 con CI completo, adjuntar PR al chat; no fusionar ni desplegar sin nueva autorización.

## Dependencias y ejecución

T001–002 → T003–004. Después US1 (T005–008) y US2 (T009–014) son independientes en servidor/selección; ejecutar secuencialmente archivos compartidos. US3 T015–016 puede desarrollarse después de fundamentos sin esperar US1/US2; T017 depende de T013 para no competir sobre PublicFeedbackChat. T018 reúne US2+US3. T019–022 después de todas las historias.

Oportunidades sin agentes: pruebas/helper backend frente a prueba de renderer (archivos distintos); comprobaciones unitarias frontend/backend en procesos independientes tras implementación. Ejemplos por historia: US1 pruebas del botón y diálogo en archivos distintos; US2 pruebas de helper backend y metadata frontend; US3 casos unitarios de formato y fixtures visuales. No ejecutar cambios simultáneos sobre un archivo.

MVP: US1 aporta gestión coherente por sí sola. Entrega solicitada completa incluye US1–3; no declarar completa por terminar solo la presentación. Cobertura FR001–015/SC001–007 explícita arriba; fixtures sintéticas, sin llamadas pagadas ni cambios de producción.

## Trazabilidad normativa

FR-001/FR-002 → T005–008; FR-003 → T006–007 y prueba de guardado de mensaje en T009/T019; FR-004/FR-005 → T005–008; FR-006 → T009–014; FR-007/FR-008 → T003–004/T009–014; FR-009/FR-010 → T009–014; FR-011/FR-012/FR-013 → T015–018; FR-014 → T008/T018/T020; FR-015 → T007/T019. SC-001/SC-002 → T005/T008; SC-003/SC-004/SC-007 → T009/T011/T014/T019; SC-005/SC-006 → T015/T018/T020.

## Phase 7: Convergence

- [x] T023 Cubrir selección previa de tres estudiantes al abrir el grupo en frontend/e2e/feedback-delivery.spec.ts según FR-004/US1-AC2/T008 (partial).
- [x] T024 Cubrir almacenamiento de continuidad bloqueado y servidor legacy sin scope en frontend/e2e/feedback-chat-history.spec.ts según FR-010/T014 (partial).
- [x] T025 Cubrir el composer con altura móvil reducida y controles accesibles en frontend/e2e/feedback-chat-history.spec.ts según FR-014/SC-006/T018 (partial).

## Corrección de CI 2026-10-25

- [x] T026 Actualizar los recorridos de biblioteca e impresión de motivos en frontend/e2e/motif-library.spec.ts y motif-print.spec.ts al nombre «Retroalimentación del grupo» y selección explícita aprobados (FR-004/FR-014, T008/T020); conservar todas las aserciones de contenido, motivos y PDF, ejecutar los 24 casos afectados y regresiones126, registrar resultados y preparar el ajuste para el PR267 sin fusionar ni desplegar.
- [x] T027 Regenerar specs/system-inventory/current.json con scripts/build_system_inventory.py --write tras T026; comprobar que solo cambia la huella de fuentes, validar inventario, pruebas y contrato de gobernanza, y registrar el cierre documental sin modificar producto ni workflows (T020).
- [x] T028 Sincronizar frontend/e2e/feedback-delivery.spec.ts con la revalidación posterior a aprobar: respuesta retenida explícitamente, estado de carga y selección conservada; mantener la aserción de búsqueda sin peticiones nuevas, probar aprobación/enlaces en ambos motores y unidad de entrega/lote/impresión, regenerar inventario y validar gobernanza. CI completo continúa como puerta de entrega antes de declarar el PR267 listo sin fusionarlo (T008/T020).
