# Tareas: Suma verificable como nota sugerida

## Fase 1: Especificación y regresión

- [x] T001 Registrar hotfix #101 y especificación 051 en `specs/README.md` y `tests/spec_governance/test_spec_baseline.py` para FR-001 a FR-008.
- [x] T002 [P] [US1] Reproducir 4,95 global frente a 4,67 por componentes para FR-001, FR-002 y FR-003 en `backend/tests/unit/test_breakdown_persistence.py`.
- [x] T003 [P] [US1] Probar precisión visual para FR-006 en `frontend/src/modules/calificaciones/gradePresentation.test.ts`.

## Fase 2: Nota autoritativa y auditoría

- [x] T004 [US1] Reconciliar sugerencia y fórmula completa y registrar discrepancia para FR-001, FR-002, FR-003 y FR-008 en `backend/app/modules/calificaciones/breakdown_service.py`.
- [x] T005 [US2] Mantener revisión en desgloses incompletos y proteger decisiones humanas para FR-004 y FR-005 con pruebas backend.
- [x] T006 [US1] Mostrar hasta dos decimales y reutilizar nota efectiva al confirmar para FR-006 en `gradePresentation.ts` y `CalificacionesWorkspace.tsx`.

## Fase 3: Datos existentes

- [x] T007 [US2] Crear backfill de sugerencias no confirmadas completas para FR-005 y FR-007 en `backend/alembic/versions/202609190001_authoritative_breakdown_score.py`.
- [x] T008 [US2] Probar que el backfill corrige pendientes y protege confirmadas, publicadas e incompletas para FR-005, FR-007 y FR-008.

## Fase final: Validación

- [x] T009 Ejecutar pruebas focales, TypeScript, lint y gobernanza; documentar resultados en `quickstart.md`.
- [x] T010 Confirmar cobertura FR-001 a FR-008, completar tareas y preparar PR enlazado a #101.

## Dependencias

- T001 registra el cambio; T002 y T003 deben fallar antes de implementar.
- T004 y T005 preceden al backfill T007–T008.
- T006 puede avanzar después de T003 en paralelo con backend.
- T009–T010 cierran cuando todas las regresiones estén verdes.
