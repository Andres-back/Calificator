# Tareas: Revisión automática de reglas WCAG con axe

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #443. Aprobados por el usuario el 2026-11-20: ante la propuesta «añadir revisión automática con axe en las pantallas principales» respondió «adelante», incluida la instalación de `@axe-core/playwright` (`spec-approved` y `plan-approved` en #443).

### Pruebas

- [X] T001 Prueba axe de cinco pantallas en claro y oscuro, en 390 y 1366 px, con WCAG A y AA. (FR-001)
- [X] T002 Tema fijado antes de cargar y movimiento reducido. (FR-002)

### Implementación

- [X] T003 Dependencias de desarrollo con versión exacta. (FR-006)
- [X] T004 Tarjetas de revisión con nombre del título y descripción por `aria-describedby`. (FR-003)
- [X] T005 Iniciales del botón de cuenta como avatar decorativo. (FR-004)
- [X] T006 `role="region"` en «Vista de la revisión». (FR-005)

### Validación

- [X] T007 Suite de accesibilidad completa (36 pasan), pruebas de componentes y calificaciones, tipos, lint, capturas de la cabecera en claro y oscuro, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006)

## Dependencias

T003 → T001. T001 → T004 a T006. T007 al final.
