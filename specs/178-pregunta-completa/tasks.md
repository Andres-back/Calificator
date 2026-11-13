# Tareas: La pregunta completa a la vista y el aviso se va al entrar

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #376. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #376).

### Pruebas primero (RED)

- [X] T001 `evidenceViewport.test.ts` y `GradeEvidenceViewer.test.tsx`: el enfoque se detiene en 250 %, conserva el centro y no amplía de más una zona grande. RED: el visor enfocaba a 435 %. (FR-001)
- [X] T002 `GradeBreakdown.test.tsx`: el aviso no aparece dentro de la pregunta, la pregunta abierta y las ya abiertas pierden la marca ámbar, se recuerda al volver a montar y la revisión prioritaria conserva caja y marca. (FR-002, FR-003, FR-004)
- [X] T003 `ReviewContextNavigation.test.tsx`: la cabecera no muestra contador. (FR-005)

### Implementación (GREEN)

- [X] T004 Tope de ampliación en `focusEvidenceRegion` y su uso en el visor. (FR-001)
- [X] T005 Aviso solo para la revisión prioritaria; índice con preguntas vistas en `sessionStorage`; sin contorno de foco en el contenedor. (FR-002, FR-003, FR-004, FR-006)
- [X] T006 Retirar `pendingCount`. (FR-005)

### Validación

- [X] T007 Suite del frontend, tipos y lint; captura local a 1440 px; pruebas E2E de calificaciones en local; inventario y gobernanza; resultados en `quickstart.md`. (FR-001 a FR-006)

## Dependencias

T001 → T004. T002 → T005. T003 → T006. T007 al final.
