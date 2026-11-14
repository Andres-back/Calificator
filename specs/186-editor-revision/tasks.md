# Tareas: Editor de respuestas y puntajes claro y fácil de usar

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #392. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #392).

### Pruebas primero (RED)

- [X] T001 `GradeComponentEditor.test.tsx`: estados como radio, parcial con la mitad y bloqueo, flechas, nota antes → después, acción principal según haya pregunta siguiente, editor a la vista con foco. RED: el estado era una lista y no existían esas conductas. (FR-001, FR-002, FR-003, FR-004, FR-005)

### Implementación (GREEN)

- [X] T002 Editor por pasos con acciones fijas. (FR-001, FR-002, FR-003, FR-004, FR-005)
- [X] T003 Acción siguiente, barra inferior oculta al editar, botón de evidencia y hoja fija. (FR-005, FR-006, FR-007)

### Validación

- [X] T004 Pruebas de calificaciones y materias, tipos, lint, E2E `grading-review.mock` y `explainable-grading`, capturas antes y después, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Dependencias

T001 → T002 → T003 → T004.
