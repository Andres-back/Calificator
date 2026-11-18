# Tareas: Quiz rápido interactivo con clave de respuestas fiable

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #414. Aprobados por el usuario el 2026-11-16: pidió seguir con esta mejora (`spec-approved` y `plan-approved` en #414).

### Pruebas

- [X] T001 `correctOptionIndex` con todas las formas de la clave y sin coincidencia. (FR-001, FR-002)
- [X] T002 «Ver respuestas» del examen marca la opción con clave «B)». (FR-001)
- [X] T003 Responder, comprobar, ver total y bloqueo tras comprobar. (FR-003, FR-004)
- [X] T004 Intentar de nuevo y «Ver respuestas» sin responder. (FR-005, FR-006)

### Implementación

- [X] T005 `correctOptionIndex` y su uso en `ExamenContent`. (FR-001, FR-002)
- [X] T006 `QuizContent` y su uso para `quiz_rapido`. (FR-003, FR-004, FR-005, FR-006)

### Validación

- [X] T007 Quiz real respondido como estudiante en 390 px; pruebas, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)

## Dependencias

Spec 193 → todo. T001–T004 → T005–T006. T007 al final.
