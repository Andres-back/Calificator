# Tareas: Una hoja sin respuestas no impide calificar las demás

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #386. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #386).

### Pruebas primero (RED)

- [X] T001 `test_vision_route_policy.py`: hoja sin respuestas para ambos lectores → `requires_review`; respaldo con respuestas → `extracted`; dos hojas con una en blanco → extracción para revisión; tiempo de espera tras una lectura en blanco → fallo. RED: tres fallaban con `vision_incomplete_pages`. (FR-001, FR-002, FR-003, FR-004)

### Implementación (GREEN)

- [X] T002 `_managed_one` conserva la lectura sin respuestas y la devuelve para revisión al agotar los lectores. (FR-001, FR-002, FR-003, FR-004)

### Validación

- [X] T003 Pruebas de lectura y calificación por foto, lint, inventario y gobernanza; resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004)

## Dependencias

T001 → T002 → T003.
