# Tareas: Quitar lo que estorba en Crear material, Analítica y Xali

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #400. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #400).

### Pruebas

- [X] T001 `AnalyticsPage.test.tsx`: sin mediciones no hay tarjetas de tiempo ni jerga; con mediciones sí; en celular, tarjetas con estado traducido. (FR-002, FR-003)
- [X] T002 `XaliPage.teacher.test.tsx`: con chat vacío no se desplaza el historial y el saludo se ve. (FR-004)

### Implementación

- [X] T003 Quitar el bloque de modelo de negocio de Crear material. (FR-001)
- [X] T004 Analítica: métricas con datos, lenguaje llano y tarjetas en celular. (FR-002, FR-003)
- [X] T005 Xali: sin desplazamiento con chat vacío. (FR-004)

### Validación

- [X] T006 Capturas en 390 px, pruebas, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004)

## Dependencias

T001 → T004. T002 → T005. T006 al final.
