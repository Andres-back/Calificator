# Tareas: revisión docente sencilla

## Fase 1: preparación

- [x] T001 Registrar aprobaciones y revisar lista autorizada `specs/094-revision-docente-simple/checklists/ux-revision.md`; comprobar contexto e ignores existentes (FR-007).

## Fase 2: fundamentos

- [x] T002 Ejecutar Analyze sobre `specs/094-revision-docente-simple/spec.md`, `plan.md` y `tasks.md`, comprobar cobertura y contratos antes de código (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010).

## Fase 3: US1 — mensajes y estados

Prueba independiente: pendientes visibles; historial decidido neutral; proceso sin nota definitiva; motivos originales no visibles.

- [x] T003 [US1] Añadir regresiones de contexto histórico/proceso, motivos desconocidos y acciones en `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.test.ts` y `ReviewTriagePanel.test.tsx` (FR-001/002/003/004/010).
- [x] T004 [US1] Implementar mensajes humanos contextuales conservando clasificación en `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.ts` y panel sin motivos técnicos visibles en `ReviewTriagePanel.tsx` (FR-001/002/003/004/010).

## Fase 4: US2 — nota, evidencia y respuestas

Prueba independiente: consultar nota/suma/ajuste; abrir evidencia y puntajes; guardar puntos con contexto e historial conservados.

- [x] T005 [US2] Ampliar regresiones de nota/escala, acceso a secciones y pendientes en `frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx` y pruebas existentes de componentes (FR-005/006/007/010).
- [x] T006 [US2] Simplificar resumen/cálculo/secciones y mensajes en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y componentes reutilizados sin alterar handlers/contratos (FR-001/002/003/005/006/007/010).
- [x] T007 [P] [US2] Ejecutar regresiones backend existentes de suma, ajuste, permisos, compatibilidad y visibilidad en `backend/tests/unit/test_calificacion_breakdown.py`, `test_breakdown_teacher_adjustment.py`, `test_breakdown_authorization.py`, `test_breakdown_compatibility.py`, `test_breakdown_visibility.py`; registrar en `quickstart.md` sin datos reales (FR-006/007/010).

## Fase 5: US3 — celular y computador

Prueba independiente: buscar y recorrer grupo sintético en ambas pantallas sin desbordamientos/controles tapados.

- [x] T008 [US3] Ampliar E2E sintético de historial, evidencia/puntajes y grupo/nombres largos en `frontend/e2e/mock/grading-review.mock.spec.ts` para 360/390/768/1280/1440 claro/oscuro (FR-003/004/005/007/008/009/010).
- [x] T009 [US3] Ajustar distribución, filtros/nombres y scroll existente en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y panel de revisión según resultados (FR-008/009).
- [x] T010 [US3] Ejecutar E2E focalizado y revisar capturas sintéticas en Chromium/WebKit; documentar resultados reales en `specs/094-revision-docente-simple/quickstart.md` (FR-001/002/003/004/005/007/008/009/010).

## Fase final: validación y entrega

- [x] T011 Ejecutar unidades focalizadas, typecheck/lint/build aplicables y registrar resultados en `specs/094-revision-docente-simple/quickstart.md` (FR-001–FR-010).
- [x] T012 Actualizar `specs/README.md` e inventario/ownership pertinente, ejecutar Converge y gobernanza; cerrar tareas restantes antes del PR (FR-001–FR-010).
- [x] T013 Crear PR enlazado a #198 con spec-approved/plan-approved, comprobar CI sin merge ni despliegue no autorizados; registrar en `specs/094-revision-docente-simple/quickstart.md` (FR-007).

## Dependencias y estrategia

T001 → T002 → US1 (T003 pruebas antes de T004) → US2 (T005 antes de T006) → US3 (T008 antes de T009/T010) → T011/T012 → T013. T007 puede ejecutarse en paralelo con trabajo frontend, sin agentes ni archivos compartidos. MVP: US1 elimina la ambigüedad; entrega completa incluye las tres historias. No repartir cambios del mismo archivo simultáneamente. No hay hooks configurados.
