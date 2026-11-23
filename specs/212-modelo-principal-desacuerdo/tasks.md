# Tareas: En un desacuerdo entre modelos vale el modelo principal

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #445. Aprobados por el usuario el 2026-11-21: pidió «que ponga la del modelo principal» y eligió el alcance «Preguntas + notas» (`spec-approved` y `plan-approved` en #445).

### Pruebas

- [X] T001 Consenso: desacuerdo usa A; B pendiente usa A; A pendiente sigue pendiente; objeción del verificador manda. (FR-001, FR-002, FR-003)
- [X] T002 Desglose: notas del verificador sin bloqueo, suma por preguntas, estado «sugerida» y motivos que mantienen la revisión. (FR-004, FR-005, FR-006, FR-007)
- [X] T003 Frontend: atención con lo que propuso el verificador y baja confianza de A. (FR-008)

### Implementación

- [X] T004 Regla del modelo principal en `component_consensus`. (FR-001, FR-002)
- [X] T005 Patrón de objeciones ampliado. (FR-003)
- [X] T006 Notas del verificador fuera de los bloqueos. (FR-004)
- [X] T007 Guardián con `sum_is_authoritative` y estado `rebuilt`. (FR-005)
- [X] T008 `review_reasons_outside_breakdown` y estado «sugerida». (FR-006, FR-007)
- [X] T009 Triage y texto de origen en el frontend. (FR-008)

### Validación

- [X] T010 Pruebas unitarias del backend y de calificaciones del frontend, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008)

## Dependencias

T001 a T003 → T004 a T009. T010 al final.
