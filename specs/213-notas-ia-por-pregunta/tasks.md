# Tareas: Mostrar lo que anotó la IA, en la pregunta que nombra

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #447. Aprobados por el usuario el 2026-11-22: tras la Spec 212 pidió «Revisa ci y continúa con las mejoras»; esta es la mejora que sigue a esa spec (`spec-approved` y `plan-approved` en #447).

### Pruebas

- [X] T001 Notas en su pregunta con «P3» y «Q2», notas generales, pregunta inexistente, diagnósticos, historial y preguntas del docente. (FR-001, FR-002, FR-003, FR-004, FR-006)
- [X] T002 Prueba simulada en 390 y 1366 px: resumen, notas dentro de la pregunta y sin desbordamiento. (FR-005, FR-007)

### Implementación

- [X] T003 Prefijos de autor, `readableAiNote` y mensajes. (FR-001, FR-004, FR-006)
- [X] T004 Patrón de preguntas alineado con el backend. (FR-002)
- [X] T005 Asociación de notas a preguntas en `buildReviewTriage`. (FR-003)
- [X] T006 Alertas del modelo principal y peticiones de revisión en `CalificacionesWorkspace`. (FR-001, FR-006)
- [X] T007 «Notas de la IA» en `GradeBreakdown` y singular en el aviso de la Spec 212. (FR-005, FR-007)

### Validación

- [X] T008 Vitest de calificaciones y componentes, pruebas simuladas de revisión, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Dependencias

T001 y T002 → T003 a T007. T008 al final.
