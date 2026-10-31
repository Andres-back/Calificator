# Tareas: generar una vez y volver a copiar

## Fase 1: Preparación

- [x] T001 Registrar aprobación e issue297 y revisar artefactos/checklist existentes en specs/139-envio-retroalimentacion-simple/{spec,plan,research,data-model,contracts/frontend,quickstart}.md; generar tareas y Analyze. FR-001–FR-016.
- [x] T002 Crear e inspeccionar maqueta sintética384/1440 clara/oscura en frontend/output/spec139-design/propuesta.html antes del código funcional, según specs/139-envio-retroalimentacion-simple/spec.md. FR-014; SC-004.

## Fase 2: Fundamentos

- [x] T003 Añadir pruebas RED y modelo puro de consulta/recuperación/estado en frontend/src/modules/feedback_sharing/deliveryAvailability.ts y deliveryAvailability.test.ts; ausencia distinta de error, antiguos y múltiples. FR-006/FR-007/FR-009.

## Fase 3: US1 Generar una vez y copiar al volver

Prueba independiente: crear → salir → volver → copiar URL/identidad/vencimiento iguales con datos locales vacíos.

- [x] T004 [P] [US1] Añadir regresión RED en frontend/e2e/feedback-link-reentry.spec.ts y unidades de frontend/src/modules/feedback_sharing/ShareFeedbackDialog.test.tsx para reentrada individual y recuperación sin escrituras. FR-002/FR-003/FR-005/FR-015; SC-001/SC-002.
- [x] T005 [US1] Integrar bloque permanente y recuperación autorizada en frontend/src/modules/feedback_sharing/ShareFeedbackDialog.tsx y FeedbackLinkActions.tsx, sin otro diálogo, selección previa ni URLs en almacenamiento local. FR-002/FR-003/FR-005; SC-001/SC-002.
- [x] T006 [US1] Ampliar frontend/e2e/feedback-link-reentry.spec.ts con recarga, nueva sesión/contexto de navegador, permisos y datos locales vacíos; mismo enlace y vencimiento sin emisión adicional. FR-003/FR-013/FR-015; SC-001/SC-005.

## Fase 4: US2 Flujo común y concurrencia

Prueba independiente: treinta casos mixtos, generación solo de faltantes y copia por fila/barra, conservando éxitos parciales.

- [x] T007 [P] [US2] Añadir pruebas backend RED y guardia opcional solo_si_falta en backend/app/modules/feedback_sharing/{schemas,service,router}.py y pruebas de feedback en backend/tests/, bajo bloqueo con recibos históricos compatibles. FR-004/FR-013; SC-003/SC-005.
- [x] T008 [US2] Integrar opción privada y estado/confirmación Revisar → Generar enlaces → Copiar y compartir en frontend/src/modules/feedback_sharing/{api,FeedbackSharePanel,feedbackPreparation}.ts(x), recuperando existentes sin paso vacío y manteniendo request_id. FR-001/FR-004/FR-005; SC-002/SC-003.
- [x] T009 [US2] Conectar acción común desde frontend/src/modules/feedback_sharing/{FeedbackStudentList,FeedbackSelectionBar,FeedbackToolsButton,FeedbackWorkspace,ShareFeedbackDialog}.tsx conservando selección/posición/guards de Spec138. FR-001/FR-010/FR-013; SC-002/SC-003.
- [x] T010 [US2] Añadir/ejecutar pruebas de treinta casos, fallo parcial, doble clic y respuesta incierta en frontend/src/modules/feedback_sharing/FeedbackSharePanel.test.tsx y frontend/e2e/feedback-share-review.spec.ts. FR-004/FR-015; SC-003/SC-005.

## Fase 5: US3 Estados y reenvío explícito

Prueba independiente: error nunca significa ausencia; suspensión vigente conserva token/fecha tras confirmación, revocados/vencidos no se abren por copiar.

- [x] T011 [P] [US3] Añadir pruebas RED y opción mantener_vencimiento compatible en backend/app/modules/feedback_sharing/{schemas,service}.py y backend/tests/; validar acceso/publicación persistidos, permisos, fingerprint, cuota y recibos antiguos. FR-008/FR-013; SC-001/SC-005.
- [x] T012 [US3] Conservar códigos y presentar estado/acción concreta en frontend/src/modules/feedback_sharing/{FeedbackSharePanel,FeedbackAccessList,FeedbackLinkActions}.tsx y deliveryAvailability.ts, sin escoger múltiples ni reemplazar históricos en silencio. FR-006–FR-009; SC-001/SC-005.
- [x] T013 [US3] Probar listas fallidas, recuperación fallida, antiguos, múltiples, vencidos, revocados y cambio de cuenta/contexto en frontend/src/modules/feedback_sharing/FeedbackSharePanel.test.tsx, FeedbackAccessList.test.tsx y frontend/e2e/feedback-link-reentry.spec.ts. FR-006–FR-009/FR-013/FR-015; SC-003/SC-005.

## Fase 6: US4 Copia y canales accesibles

Prueba independiente: copia desde tarjeta y lote, fallback manual, WhatsApp/nativo sin contactos ni falso «Enviado», matriz móvil/escritorio.

- [x] T014 [P] [US4] Añadir pruebas RED y utilidades de mensaje/canales en frontend/src/modules/feedback_sharing/feedbackShareMessage.ts y feedbackShareMessage.test.ts; sin nota, lista privada, cancelación y parámetros codificados. FR-010/FR-011/FR-012.
- [x] T015 [US4] Reutilizar utilidades en frontend/src/modules/feedback_sharing/{FeedbackLinkActions,FeedbackSharePanel,FeedbackStudentList,FeedbackSelectionBar}.tsx con copia/selección manual, WhatsApp individual y compartir nativo cuando exista. FR-010/FR-011/FR-012/FR-014; SC-002/SC-004.
- [x] T016 [US4] Verificar 360/384/390/768/1440 y dos temas, texto200 %, teclado/scroll y treinta casos en frontend/e2e/feedback-workspace-responsive.spec.ts y feedback-link-reentry.spec.ts; capturas de implementación en specs/139-envio-retroalimentacion-simple/visual/. FR-014/FR-015; SC-004.

## Fase 7: Validación y cierre

- [x] T017 Actualizar contratos dueños de specs/135-retroalimentacion-entrega-simple/ y frontend sin reescribir sus garantías históricas; ejecutar regresiones de Spec135/138, backend, tipos/lint/unidades/build/auditorías y registrar resultados reales en specs/139-envio-retroalimentacion-simple/quickstart.md. FR-013–FR-016; SC-005.
- [x] T018 Regenerar specs/system-inventory/current.json, ajustar test de baseline para Spec139 en tests/spec_governance/, ejecutar inventario/gobernanza completa y Converge, cerrando solo tareas realizadas en specs/139-envio-retroalimentacion-simple/tasks.md. FR-015/FR-016; SC-005.
- [x] T019 Preparar PR del issue297 con evidencias y límites en specs/139-envio-retroalimentacion-simple/quickstart.md; no afirmar CI/fusión/despliegue antes de verificarlos. Registrar ensayo posterior de SC-006 sin inventar docentes ni resultados. FR-016; SC-005/SC-006.

## Dependencias y estrategia incremental

T001→T002 preceden código funcional. T003 precede integración de estados frontend; pruebas RED de T004 y backend de T007/T011 son independientes de ese modelo y pueden comenzar tras T002. T004→T005→T006 entrega primero reentrada individual. T008 requiere T007/T003/T005; T009→T010 completan grupo. T011 puede desarrollarse junto a T007 por el mismo responsable backend sin edición simultánea de service.py; T012 requiere T003/T011 y T013 cierra estados. T014 es independiente de archivos funcionales compartidos; T015 requiere T008/T012/T014 y T016 completa responsividad. T017→T018→T019 cierran el alcance.

Paralelización: un responsable backend (T007/T011); otro fundamentos/utilidades (T003/T014); otro E2E sintético (T004/T006/T016), sin editar las mismas suites al mismo tiempo. Integración de ShareFeedbackDialog/SharePanel por un solo responsable. No dividir el trabajo en implementaciones alternativas del flujo.

MVP comprobable: T004–T006, enlace visible al volver; no declarar terminado el alcance completo hasta completar grupo, errores, canales y validación. SC-006 es un ensayo humano posterior, no una tarea de código ni una afirmación de mejora pedagógica.
