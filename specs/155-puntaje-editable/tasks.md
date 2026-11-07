# Tareas: El docente puede escribir el puntaje de una pregunta al revisar

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-06 (`spec-approved`, `plan-approved` en #327).

## Fase 1: Pruebas primero (RED)

- [X] T001 Prueba de backend en `backend/tests/unit/test_score_plan_deliveries.py`: `read_score_plan` informa `tiene_entregas` con entregas, con calificaciones y sin ninguna, y no cambia nada. (FR-007, FR-008)
- [X] T002 Pruebas de `parseScoreInput`, `scoreSummary` y `adjustOtherScores` en `frontend/src/modules/evaluaciones/components/scoreEditing.test.ts`: coma y punto, valores inválidos, suma exacta, pregunta abierta intacta y casos imposibles. (FR-002, FR-003, FR-004, FR-005)
- [X] T003 Pruebas del editor en `GenerationWizard.test.tsx`: sin entregas se escribe y se ajusta sin guardar; con entregas, en carga o con error sigue de solo lectura. (FR-001, FR-002, FR-004, FR-005, FR-006, FR-008)

## Fase 2: Corrección (GREEN)

- [X] T004 Añadir `tiene_entregas` en `score_service.py` y `scoreApi.ts`. (FR-007)
- [X] T005 Crear `scoreEditing.ts` con `parseScoreInput`, `scoreSummary` y `adjustOtherScores`. (FR-002, FR-003, FR-004, FR-005)
- [X] T006 Usar `ScoreInput`, la suma, "Ajustar las demás" y los mensajes en `GenerationWizard.tsx`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)

## Fase final: Validación

- [X] T007 Prueba E2E a 360 px en `frontend/e2e/evaluation-score-editing.spec.ts`: agregar pregunta, escribir `0,5`, ajustar y guardar; con entregas no se puede escribir. (SC-001, SC-002)
- [X] T008 Ejecutar pruebas, lint, inventario y gobernanza; registrar los resultados en `quickstart.md` y añadir la spec al índice. (FR-008)

## Dependencias

T001, T002, T003 → T004, T005 → T006 → T007 → T008.
