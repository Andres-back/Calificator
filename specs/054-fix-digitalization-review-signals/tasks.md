# Tareas: Digitalización confiable y señales de revisión visibles

## Fase 1: Regresiones

- [x] T001 [P] [US1] Añadir pruebas de ruta granular y presupuesto de estructura en `backend/tests/unit/test_evaluation_digitalization.py`
- [x] T002 [P] [US2] Añadir pruebas de persistencia de alertas del verificador en `backend/tests/unit/test_breakdown_persistence.py`
- [x] T003 [P] [US2] Añadir pruebas de triage y resumen sin falso consenso en `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.test.ts`

## Fase 2: Digitalización

- [x] T004 [US1] Enrutar estructura y reparación por `digitalizacion.estructura` con presupuesto suficiente en `backend/app/modules/evaluaciones/digitalize_service.py` y `backend/app/core/config.py`

## Fase 3: Señales de revisión

- [x] T005 [US2] Conservar alertas y solicitud de revisión del verificador en `backend/app/modules/calificaciones/orchestrator.py`
- [x] T006 [US2] Mantener alertas trazables en el desglose sin alterar la fórmula en `backend/app/modules/calificaciones/breakdown_service.py`
- [x] T007 [US2] Mostrar alertas generales y por pregunta sin falso consenso en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.ts`

## Fase 4: Validación y entrega

- [x] T008 Ejecutar pruebas focalizadas backend/frontend y compilación aplicable
- [ ] T009 Validar Spec Kit, abrir PR asociado a #107 y completar CI
- [x] T010 Preparar la evidencia y el caso de validación productiva sin confirmar ni publicar la nota
