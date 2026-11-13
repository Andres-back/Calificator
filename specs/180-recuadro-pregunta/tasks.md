# Tareas: El recuadro de la respuesta abarca la pregunta completa

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #380. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #380).

### Pruebas primero (RED)

- [X] T001 `evidenceViewport.test.ts`: crecimiento en hoja derecha y en la foto de lado de la captura, margen mínimo, límites de la hoja y contención de la zona original. RED: `expandAnswerRegion` no existía. (FR-001, FR-002, FR-003)
- [X] T002 `GradeEvidenceViewer.test.tsx` y `GradeQuestionEvidence.test.tsx`: el recuadro dibujado y el enfoque usan el recuadro ampliado. (FR-004)

### Implementación (GREEN)

- [X] T003 `expandAnswerRegion`. (FR-001, FR-002, FR-003)
- [X] T004 El visor dibuja y enfoca el recuadro ampliado. (FR-004)

### Validación

- [X] T005 Pruebas del visor, tipos y lint; inventario y gobernanza; resultados en `quickstart.md`. (FR-001 a FR-004)

## Dependencias

T001 → T003. T002 → T004. T005 al final.
