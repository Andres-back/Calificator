# Tareas: Revisión docente por excepciones

## Fase 1: Preparación

- [x] T001 Registrar la especificación 050 en `specs/README.md` y `tests/spec_governance/test_spec_baseline.py`.
- [x] T002 [P] Añadir pruebas de contrato para eventos de revisión sin contenido sensible en `backend/tests/unit/test_analytics_events.py` y `frontend/src/lib/analytics.test.ts`.

## Fase 2: Fundamentos

- [x] T003 [P] [US1] Crear pruebas TDD de clasificación exclusiva, prioridad y razones para FR-001, FR-003, FR-004 y FR-005 en `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.test.ts`.
- [x] T004 [US1] Implementar el modelo derivado y la función pura de clasificación para FR-001, FR-003, FR-004 y FR-005 en `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.ts`.
- [x] T005 Ampliar la política tipada y segura de eventos para FR-011 en `frontend/src/lib/analytics.ts` y `backend/app/modules/analytics/event_policy.py`.

## Fase 3: Historia 1 — Encontrar lo que necesita atención

- [x] T006 [P] [US1] Crear pruebas del resumen, razones, estado sin alertas y bloqueo global para FR-002, FR-010 y FR-013 en `frontend/src/modules/calificaciones/review-triage/ReviewTriagePanel.test.tsx`.
- [x] T007 [US1] Implementar el panel accesible de conteos y listas para FR-002 y FR-010 en `frontend/src/modules/calificaciones/review-triage/ReviewTriagePanel.tsx`.
- [x] T008 [US1] Sustituir la tarjeta redundante de puntos por revisar e integrar el resumen solo cuando exista desglose para FR-013 en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`.

## Fase 4: Historia 2 — Navegar excepciones con contexto

- [x] T009 [P] [US2] Ampliar pruebas del panel para primera/siguiente excepción, teclado y selección segura para FR-006, FR-007 y FR-012 en `frontend/src/modules/calificaciones/review-triage/ReviewTriagePanel.test.tsx`.
- [x] T010 [US2] Conectar primera/siguiente excepción con la selección y hoja de evidencia existentes para FR-006 y FR-007 en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`.
- [x] T011 [US2] Verificar mediante las pruebas de `GradeBreakdown` y la regresión E2E que el desglose completo y las acciones existentes permanecen disponibles sin automatizar cambios para FR-008, FR-009 y FR-010.

## Fase 5: Historia 3 — Control humano y medición

- [x] T012 [P] [US3] Registrar apertura y navegación con conteos agregados, y reutilizar confirmación/temporizador actuales para FR-011 en `frontend/src/modules/calificaciones/review-triage/ReviewTriagePanel.tsx` y `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`.
- [x] T013 [US3] Añadir prueba backend de roles, metadatos permitidos y rechazo de contenido académico para FR-011 en `backend/tests/unit/test_analytics_events.py`.
- [x] T014 [US3] Añadir regresión móvil y funcional sin publicación automática para FR-008, FR-009 y FR-012 en `frontend/e2e/mock/grading-review.mock.spec.ts`.

## Fase final: Validación

- [x] T015 Ejecutar pruebas focales, TypeScript, lint y build; documentar resultados en `specs/050-revision-por-excepciones/quickstart.md`.
- [x] T016 Ejecutar gobernanza e inventario, confirmar que FR-001 a FR-013 están cubiertos y marcar todas las tareas completas en `specs/050-revision-por-excepciones/tasks.md`.

## Dependencias

- T001–T002 preparan gobernanza y contratos.
- T003 debe fallar antes de T004 y pasar después de la implementación.
- T004 y T005 desbloquean el panel T006–T008.
- T007–T008 desbloquean navegación T009–T011.
- T012–T014 dependen del panel integrado y no cambian la nota.
- T015–T016 cierran únicamente cuando todas las historias pasan.

## Paralelismo

- T002 y T003 pueden prepararse en archivos distintos.
- T006 y T009 comparten archivo de pruebas y se ejecutan secuencialmente pese a pertenecer a historias distintas.
- T013 puede ejecutarse en paralelo con la regresión frontend T014.

## Estrategia incremental

1. MVP: T003–T008 ofrece resumen y acceso a excepciones.
2. Incremento 2: T009–T011 añade navegación rápida conservando los flujos actuales.
3. Incremento 3: T012–T014 habilita medición segura para el piloto.
4. Cierre: T015–T016 valida regresiones y gobernanza.
