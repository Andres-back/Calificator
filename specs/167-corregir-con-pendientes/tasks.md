# Tareas: Corregir una pregunta aunque otras sigan pendientes

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #351. Aprobados por el usuario el 2026-11-11 (`spec-approved` y `plan-approved` en #351).

## Fase 1: Pruebas primero (RED)

- [X] T001 Pruebas de regresión en `backend/tests/unit/test_breakdown_teacher_adjustment.py`: guardar una pregunta con otra pendiente, corregir una ya calificada con otra pendiente, resolver la última y un puntaje fuera de rango. RED: 3 de 4 fallan con el 409 «Puntaje inválido». (FR-001, FR-002, FR-003, FR-004, FR-005, FR-007)
- [X] T002 Pruebas E2E en `frontend/e2e/explainable-grading.spec.ts`: un 422 muestra su motivo sin «Recargar versión vigente», y un guardado con preguntas pendientes avisa cuántas faltan. RED: 2 de 2 fallan. (FR-006, FR-007)

## Fase 2: Corrección (GREEN)

- [X] T003 `update_breakdown` valida el rango solo en las preguntas que cambian y responde 422 fuera de rango. (FR-001, FR-002, FR-005)
- [X] T004 `update_breakdown` deja la calificación en `requiere_revision`, sin tocar `nota_confirmada` ni la decisión del empate, mientras queden preguntas sin puntaje; sin pendientes conserva el flujo actual. (FR-003, FR-004)
- [X] T005 `CalificacionesWorkspace` ofrece «Recargar versión vigente» solo ante un 409 y cambia el aviso de éxito cuando faltan preguntas. (FR-006)

## Fase final: Validación

- [X] T006 Ejecutar las pruebas unitarias relacionadas, ruff, Vitest, el E2E del archivo, tipos, lint, el inventario y la gobernanza; repetir la secuencia contra la API y PostgreSQL locales; registrar resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Dependencias

T001 y T002 → T003, T004 y T005 → T006. Sin IA ni datos reales en las pruebas.
