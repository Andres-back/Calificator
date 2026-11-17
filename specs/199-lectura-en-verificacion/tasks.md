# Tareas: Calificar comprensión de lectura con la lectura a la vista de todos los agentes

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #417. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas las mejoras (`spec-approved` y `plan-approved` en #417).

### Diagnóstico

- [X] T001 Revisar en producción, en solo lectura, la evaluación, la lectura guardada, las valoraciones de cada agente y la hoja del estudiante. (FR-001, FR-002, FR-003, FR-004)

### Pruebas

- [X] T002 Claves confirmadas fuera de la lista de pendientes; lista vacía no se envía; clave vacía sigue pendiente. (FR-002)
- [X] T003 El calificador y el verificador reciben la lectura y la regla de remisión. (FR-001, FR-003)
- [X] T004 Sin consenso se muestra el motivo; sin motivo el mensaje no cambia. (FR-004)

### Implementación

- [X] T005 Lectura y regla en el verificador; regla en el calificador. (FR-001, FR-003)
- [X] T006 `unconfirmed_pending_keys` en la instrucción del calificador. (FR-002)
- [X] T007 Motivo del calificador en la explicación sin consenso. (FR-004)

### Validación

- [X] T008 Pruebas de calificación sin fallos nuevos frente a main, lint de lo tocado, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004)

## Dependencias

T001 → todo. T002–T004 → T005–T007. T008 al final.
