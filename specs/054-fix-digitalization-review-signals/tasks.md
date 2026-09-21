# Tareas: Digitalización confiable y señales de revisión visibles

## Fase 1: Regresiones

- [x] T001 [P] [US1] Añadir pruebas de ruta granular y presupuesto de estructura para FR-001, FR-002 y FR-003 en `backend/tests/unit/test_evaluation_digitalization.py`
- [x] T002 [P] [US2] Añadir pruebas de persistencia de alertas del verificador para FR-004 y FR-008 en `backend/tests/unit/test_breakdown_persistence.py`
- [x] T003 [P] [US2] Añadir pruebas de triage y resumen sin falso consenso para FR-005, FR-006 y FR-007 en `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.test.ts`

## Fase 2: Digitalización

- [x] T004 [US1] Enrutar estructura y reparación por `digitalizacion.estructura` con presupuesto suficiente (FR-001, FR-002, FR-003) en `backend/app/modules/evaluaciones/digitalize_service.py` y `backend/app/core/config.py`

## Fase 3: Señales de revisión

- [x] T005 [US2] Conservar alertas y solicitud de revisión del verificador (FR-004, FR-005) en `backend/app/modules/calificaciones/orchestrator.py`
- [x] T006 [US2] Mantener alertas trazables en el desglose sin alterar la fórmula (FR-007, FR-008) en `backend/app/modules/calificaciones/breakdown_service.py`
- [x] T007 [US2] Mostrar alertas generales y por pregunta sin falso consenso (FR-005, FR-006, FR-007) en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.ts`

## Fase 4: Validación y entrega

- [x] T008 Ejecutar pruebas focalizadas backend/frontend y compilación aplicable
- [x] T009 Validar Spec Kit, abrir PR asociado a #107 y completar CI
- [x] T010 Preparar la evidencia y el caso de validación productiva sin confirmar ni publicar la nota
