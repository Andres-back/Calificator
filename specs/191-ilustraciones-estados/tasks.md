# Tareas: Ilustraciones para pantallas vacías y de error

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #404. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas las mejoras (`spec-approved` y `plan-approved` en #404).

### Pruebas

- [X] T001 `P2Accessibility.test.tsx`: el error sigue siendo alerta reintentable y muestra la ilustración decorativa. (FR-002, FR-003)
- [X] T002 `PresentacionesPage.test.tsx`: el estado vacío muestra su ilustración. (FR-001)

### Implementación

- [X] T003 Generar, revisar en claro y oscuro, corregir la transparencia y convertir a WebP las cinco ilustraciones. (FR-003)
- [X] T004 Usarlas en los estados vacíos de presentaciones, recursos, criterios y reporte de asistencia. (FR-001)
- [X] T005 Usar la ilustración de error en `QueryError`. (FR-002)

### Validación

- [X] T006 Capturas en 390 px, pruebas, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003)

## Dependencias

T003 → T004 y T005. T001 → T005. T002 → T004. T006 al final.
