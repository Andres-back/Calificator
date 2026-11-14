# Tareas: Tras cambiar la evidencia o recalificar, las respuestas son de la hoja nueva

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #396. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #396).

### Pruebas primero (RED)

- [X] T001 `test_breakdown_persistence.py`: una corrida sin revisión posterior conserva el desglose docente; tras recalificar o cambiar la evidencia, el resultado nuevo lo reemplaza y el anterior queda inactivo. RED: el reemplazo fallaba. (FR-001, FR-002)

### Implementación (GREEN)

- [X] T002 `_reopened_after` y la condición de reemplazo en `create_automatic_breakdown`. (FR-001, FR-002)

### Validación

- [X] T003 Pruebas de calificación, recalificación y desglose, lint, inventario y gobernanza; resultados en `quickstart.md`. (FR-001, FR-002)

## Dependencias

T001 → T002 → T003.
