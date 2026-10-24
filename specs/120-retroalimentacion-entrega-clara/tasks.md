# Tareas: devolución docente clara y compartible

## Fase 1: Preparación

- [X] T001 Resolver la revisión autorizada de los ocho requisitos en `specs/120-retroalimentacion-entrega-clara/checklists/entrega.md` y registrar su resultado sin que Implement modifique los marcadores; conservar cambios ajenos de Spec034/115. [FR-001, FR-010]
- [X] T002 Precisar requisitos afectados de `specs/107-retroalimentacion-familiar/spec.md`, registrar Spec120 en `specs/README.md` y `tests/spec_governance/test_spec_baseline.py`, manteniendo la política de no divulgar desgloses pendientes ni aprobar sugerencias sin docente. [FR-003, FR-004, FR-007]

## Fase 2: Fundamentos

- [X] T003 Crear pruebas de regresión de huella, resumen explícito y retrocompatibilidad en `backend/tests/unit/test_feedback_delivery_review.py`: nota publicada con avisos, provisional, vacío, cero, texto genérico/contradictorio, cambio de fuente y sin detalle para Xali. Ejecutarlas antes de implementar y registrar el fallo esperado. [FR-003, FR-004, FR-005, FR-007, FR-010; SC-001, SC-004]
- [X] T004 Añadir `FeedbackDeliveryReview` en `backend/app/modules/feedback_sharing/models.py` y migración aditiva `backend/alembic/versions/202610230002_feedback_delivery_reviews.py`; probar upgrade/downgrade y conservación de tablas académicas en `backend/tests/integration/test_feedback_delivery_review.py`. [FR-007, FR-010; SC-004]
- [X] T005 Separar carga/validación de fuente de proyección en `backend/app/modules/feedback_sharing/access_policy.py` y calcular huella íntegra en `projection.py`; preservar proyecciones históricas elegibles sin lectura de datos ajenos ni cambios al consultar. [FR-001, FR-003, FR-004, FR-008, FR-010; SC-001]

## Fase 3: Historia 2 - Autorizar resumen o detalle coherente

**Objetivo**: una nota oficial y un mensaje revisado son entregables sin afirmar que el desglose pendiente está validado.
**Prueba independiente**: aprobar resumen → impresión/enlace con respuestas vacías → cambio de fuente bloquea acceso, con registros académicos iguales.

- [X] T006 [US2] Implementar autorización idempotente en `backend/app/modules/feedback_sharing/service.py` y nuevos schemas/ruta en `schemas.py`/`router.py`, con lock por nota, huella esperada, mensaje y alcance explícitos, auditoría y suspensión de revisiones previas; ejecutar T003. [FR-003, FR-004, FR-005, FR-007, FR-008, FR-010; SC-001, SC-002]
- [X] T007 [US2] Integrar revisión compatible en `backend/app/modules/feedback_sharing/projection.py`, impresión/emisión/guardas y `chat_service.py`; excluir completamente contenido no autorizado, manteniendo nota oficial, cuota, vigencia y evidencia opcional existentes. [FR-004, FR-007, FR-008; SC-004]
- [X] T008 [US2] Completar `backend/tests/integration/test_feedback_delivery_review.py` y `backend/tests/unit/test_feedback_sharing_chat_context.py` con permisos permitidos/denegados, matrícula/actor, reintentos, carreras, cambios de fuente, enlace antiguo válido, aprobación nueva que suspende, impresión sin enlace y comprobación de inmutabilidad. [FR-003, FR-004, FR-007, FR-008, FR-010; SC-001, SC-004]

## Fase 4: Historia 1 - Seleccionar y revisar pendientes

**Objetivo**: selección común de uno/varios/todos y resolución guiada, sin perder selección o confundir pendiente con entregable.
**Prueba independiente**: lote mixto permite revisar una devolución, actualizarla y entregar explícitamente solo las listas.

- [X] T009 [US1] Añadir estado/candidato revisable a la previsualización en `backend/app/modules/feedback_sharing/router.py` y contrato en `frontend/src/modules/feedback_sharing/api.ts`; diferenciar elegibilidad de selección y conservar API anterior. [FR-001, FR-002, FR-005; SC-001]
- [X] T010 [US1] Escribir regresiones en `frontend/src/modules/feedback_sharing/ShareFeedbackDialog.test.tsx` para selección de pendientes, todos/algunos, cero, búsqueda, nota ausente, actualización tras revisar, sesión, cambios concurrentes y fallos parciales, antes del ajuste de UI. [FR-001, FR-002, FR-005, FR-007, FR-009; SC-001, SC-002]
- [X] T011 [US1] Implementar revisión guiada en `frontend/src/modules/feedback_sharing/ShareFeedbackDialog.tsx` y nuevo `FeedbackDeliveryReview.tsx`: nota oficial, alcance visible, mensaje completo editable, autorizar explícitamente y conservar selección; lotes mixtos con elección de solo listos y sin emitir automáticamente. [FR-001, FR-002, FR-003, FR-005, FR-007, FR-009; SC-001, SC-002]

## Fase 5: Historia 3 - Mensaje ordenado

**Objetivo**: presentación uniforme, íntegra y legible sin generar recomendaciones nuevas.
**Prueba independiente**: un mismo mensaje mantiene todo su contenido en docente, familia y fichas con continuaciones.

- [X] T012 [P] [US3] Añadir pruebas de secciones, texto no clasificable, saltos/acentos, contenido como texto y mensajes de 6.000 caracteres en `frontend/src/modules/feedback_sharing/feedbackSections.test.ts` y `FeedbackMessage.test.tsx`. [FR-006, FR-009, FR-010; SC-003]
- [X] T013 [US3] Implementar función conservadora en `frontend/src/modules/feedback_sharing/feedbackSections.ts` y presentación común en `FeedbackMessage.tsx`; integrarla en lista/revisión y `PublicFeedbackPage.tsx` con fallback general y sin truncamiento. [FR-006, FR-009; SC-003]
- [X] T014 [US3] Adaptar texto ordenado de `frontend/src/modules/feedback_sharing/FeedbackPrintSheet.tsx` y `printPagination.ts`; probar treinta fichas Carta/A4 con continuaciones, identidad y conservación exacta del contenido en `FeedbackPrintSheet.test.tsx` (contiene la suite de `printPagination.ts`). [FR-006, FR-009, FR-010; SC-003]

## Fase final: Validación

- [X] T015 Ejecutar E2E de `frontend/e2e/feedback-delivery.spec.ts` para selección/revisión/impresión/enlace en 360/390/768/1440 px, Chromium/WebKit, ambos temas y teclado; medir tres acciones de un mensaje válido y revisar capturas. [FR-001, FR-002, FR-005, FR-006, FR-009; SC-001, SC-002, SC-003]
- [X] T016 Ejecutar regresión backend/frontend, migración en PostgreSQL aislado, TypeScript, lint y builds; medir carga de 30 devoluciones sin inferencias ni consultas al teclear; comprobar preservación de notas, evidencia y contratos anteriores. Registrar resultados reales y límites en `specs/120-retroalimentacion-entrega-clara/quickstart.md`. [FR-001, FR-004, FR-008, FR-009, FR-010; SC-003, SC-004]
- [X] T017 Ejecutar Converge, inventario vigente y gobernanza; añadir tareas faltantes si corresponde, completar `specs/120-retroalimentacion-entrega-clara/tasks.md` solo con evidencia y preparar PR asociado a #255; no fusionar ni desplegar sin autorización y CI verde. [FR-001, FR-003, FR-007, FR-010; SC-001, SC-004]

## Dependencias

T001 bloquea implementación. T002..005 preceden T006..008. US2 entrega el backend seguro antes de US1; US1 depende de T006/007, US3 puede desarrollar su función pura después de T001 en archivos separados (T012), pero se integra después de US1 para evitar ediciones simultáneas. T015..017 requieren las tres historias completas.

Paralelismo posible: dentro de US2, pruebas de contexto y de migración usan archivos diferentes una vez disponibles sus fundamentos; dentro de US1, pruebas/contrato pueden revisarse mientras se diseña el editor; US3 T012 es independiente de la persistencia. No se requiere delegación de agentes para la implementación.

## Estrategia de entrega

Primero autorizar y proyectar el resumen con pruebas (base segura); después selección/revisión guiada y finalmente organización visual/impresión. No activar una interfaz que emita proyecciones no protegidas. No usar un despliegue parcial para eludir permisos ni presentar tareas pendientes como terminadas.

## Formato y gobernanza

17/17 tareas completas: preparación/fundamentos 5, US2 3, US1 3, US3 3, validación 3. Todas tienen identificador, ruta, mapeo y criterio verificable. Sin hooks de extensión. Revisión 8/8 autorizada, Analyze y Converge completados; evidencia de Implement en quickstart. Converge revisó 10 FR, 4 SC, 11 escenarios, seis decisiones de diseño y ocho principios constitucionales: cero brechas de implementación; no añadió fases vacías ni modificó tareas durante su análisis. Preparación de PR y controles locales no equivalen a fusión o despliegue.
