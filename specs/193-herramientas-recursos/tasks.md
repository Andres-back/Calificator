# Tareas: Recursos de clase con vistas claras y completas en celular

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #407. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas las mejoras (`spec-approved` y `plan-approved` en #407).

### Auditoría

- [X] T001 Generar un recurso de cada tipo y revisar pantalla (docente y estudiante, 390 px y PC) y PDF. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010)

### Pruebas

- [X] T002 `resourceViews193.test.tsx`: utilidades de texto. (FR-005, FR-007)
- [X] T003 `resourceViews193.test.tsx`: taller, ficha, rúbrica, tarjetas y dibujo ausente. (FR-004, FR-005, FR-007, FR-008, FR-009, FR-010)
- [X] T004 `resourceViews193.test.tsx`: crucigrama, sopa de letras y relacionar pares. (FR-001, FR-002, FR-003)
- [X] T005 `resourceViews193.test.tsx` y `DetailPage.test.tsx`: instrucciones una sola vez. (FR-006)

### Implementación

- [X] T006 Grilla ajustable del crucigrama. (FR-001)
- [X] T007 Grilla ajustable de la sopa de letras. (FR-002)
- [X] T008 Relacionar pares sin palabras partidas. (FR-003)
- [X] T009 Taller apilado, opciones sin letra repetida, etiquetas y botones. (FR-004, FR-005, FR-007)
- [X] T010 Ficha con saltos de línea, tarjetas rotuladas y mensaje de dibujo ausente. (FR-008, FR-009, FR-010)
- [X] T011 `ResourceInstructions` en detalle docente y vista de estudiante. (FR-006)

### Validación

- [X] T012 Capturas en 390 px y PC, pruebas, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010)

## Dependencias

T001 → todo. T002–T005 → T006–T011. T012 al final.
