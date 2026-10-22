# Tareas — recalificación y evidencia (#240)

## Fase 1: Preparación
- [x] T001 Documentar alcance autorizado, plan y contratos en `specs/114-recalificar-evidencia/` y conservar fuera los cambios de Spec034.

## Fase 2: Fundamentos
- [x] T002 Escribir regresiones de política/snapshot/idempotencia en `backend/tests/unit/test_grading_revisions.py` (FR-003, FR-004, FR-006, FR-007, FR-008).
- [x] T003 Crear modelo y migración aditiva recuperable en `backend/app/modules/calificaciones/models.py` y `backend/alembic/versions/202610220001_grading_revisions.py` (FR-004, FR-010).

## Fase 3: US1 — Recalificar
- [x] T004 [US1] Implementar servicio transaccional de reapertura/cola con versión, permisos e idempotencia en `backend/app/modules/calificaciones/revision_service.py` (FR-001, FR-003, FR-005, FR-006, FR-007).
- [x] T005 [US1] Añadir contrato y ruta de reproceso en `backend/app/modules/calificaciones/{schemas,router,revision_router}.py` (FR-001, FR-003, FR-006).
- [x] T006 [US1] Escribir pruebas sintéticas de permisos, cola, concurrencia y persistencia en `backend/tests/integration/test_grading_revisions_persistence.py` (FR-005, FR-006, FR-010).

## Fase 4: US2 — Cambiar evidencia
- [x] T007 [US2] Completar reemplazo de paquete, conservación de archivo y rollback en `backend/app/modules/calificaciones/revision_service.py`, reutilizando `evidence_service.py` (FR-002, FR-004, FR-007, FR-008).
- [x] T008 [US2] Hacer opcional motivo del reemplazo al estudiante y proteger archivos archivados en `backend/app/modules/calificaciones/{schemas,router}.py` y su prueba de regresión (FR-003, FR-008).
- [x] T009 [P] [US2] Implementar cliente y acciones/modal docente en `frontend/src/modules/calificaciones/api.ts` y `components/GradeReprocessing.tsx` (FR-001, FR-002, FR-003, FR-009).
- [x] T010 [US2] Integrar acciones y motivo opcional en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` (FR-001, FR-002, FR-003, FR-005, FR-009).

## Fase 5: US3 — Historial
- [x] T011 [US3] Exponer listado y evidencia histórica privada en `backend/app/modules/calificaciones/revision_router.py` (FR-004, FR-006).
- [x] T012 [US3] Mostrar nota/feedback/archivo anteriores en `frontend/src/modules/calificaciones/components/GradeReprocessing.tsx` (FR-004, FR-009).

## Fase 6: Validación
- [x] T013 Probar acciones, errores y motivo vacío en `frontend/src/modules/calificaciones/components/GradeReprocessing.test.tsx` y navegación sintética con Playwright CLI, capturas locales en `output/playwright/revision114/` (FR-001–009, SC-001–003).
- [x] T014 Ejecutar regresiones locales, comprobación offline/guardia de migración, checks/builds e inventario en `specs/system-inventory/current.json`; documentar evidencia y verificaciones obligatorias de PostgreSQL/contenedores en CI en `specs/114-recalificar-evidencia/validation.md` (FR-010, SC-004).
- [x] T015 Ejecutar Analyze/Converge, cerrar brechas y crear PR enlazado a #240 con solo este alcance; registrar resultado en `specs/114-recalificar-evidencia/validation.md`.

## Dependencias y estrategia
T001 → T002 → T003 → T004/T005; T007/T008 comparten la misma transacción y dependen de T004. T009 puede avanzar tras fijar contrato; T010 tras T009. T011/T012 completan historial. T013/T014/T015 cierran la entrega. Solo se paralelizan verificaciones independientes, no agentes ni ediciones concurrentes. MVP US1; US2/US3 obligatorias para el PR autorizado.

## Phase 7: Convergence

- [x] T016 Compactar las acciones nuevas para que no desplacen la navegación principal de revisión a 360 px; conservar acceso, historial y objetivos táctiles según FR-009 y SC-001 (partial, HIGH).
- [x] T017 Registrar Spec 114 en la lista base sin eliminar controles de gobernanza según SC-004 y Constitución VII (partial, MEDIUM).
- [x] T018 Aislar la expectativa de la migración histórica de feedback de nuevas revisiones sin reducir la comprobación de conservación según FR-010 (partial, MEDIUM).
- [x] T019 Reproducir y resolver el E2E WebKit de confirmación de material sin omitir confirmación ni aceptar propuestas automáticamente según SC-004 y Constitución VII (partial, MEDIUM).
