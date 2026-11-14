# Tareas: Revisión visual. Datos que engañan y fondos blancos

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #398. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #398).

### Pruebas

- [X] T001 `test_reportes_resumen_escala.py`: el promedio del reporte se normaliza a escala 5. (FR-001)
- [X] T002 `DashboardEstudiante.test.tsx`: con 1.8 no felicita y pide repasar; con 4.2 felicita. (FR-002)
- [X] T003 `studentProgress.test.ts`: «Tu nota» y color según el 60 %. `dates.test.ts`: vencimiento sin segundos, mayúscula inicial y plural. (FR-003, FR-004)
- [X] T004 Pruebas y E2E de archivar materia con «Archivar materia» y «Sí, archivar». (FR-004)

### Implementación

- [X] T005 Promedio en escala 5 y página de reportes. (FR-001)
- [X] T006 Inicio del estudiante y tarjeta de evaluación. (FR-002, FR-003)
- [X] T007 Fechas, modalidades, plurales, «Hecha con IA» y archivar. (FR-004)
- [X] T008 Fondo transparente de 9 imágenes de marca, revisado en claro y oscuro. (FR-005)

### Validación

- [X] T009 Recorrido de 45 rutas, capturas después del cambio, pruebas, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Dependencias

T001 → T005. T002 → T006. T003 → T006, T007. T004 → T007. T009 al final.
