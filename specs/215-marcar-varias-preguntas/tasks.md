# Tareas: Marcar varias preguntas como correctas o incorrectas a la vez

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #452. Pedido directo del usuario el 2026-11-23: «El profesor debe poder seleccionar varias preguntas y ponerles correcta o incorrecta, sin ir una por una» (`spec-approved` y `plan-approved` en #452).

### Pruebas primero (RED)

- [X] T001 `backend/tests/unit/test_breakdown_bulk_mark.py`: varias preguntas en una sola versión con su historial, nota sin confirmar si quedan pendientes, y sin «Para mejorar» en la que queda correcta. Las dos primeras pasan sin cambios, porque el servidor ya guardaba listas; la tercera falla. (FR-003, FR-005)
- [X] T002 `GradeBreakdown.bulk.test.tsx`: cuándo se ofrece, selección sobre los números, confirmación con la nota anticipada, volver y cancelar, criterios de rúbrica fuera, guardado en curso y cierre con la versión nueva. RED: 7 de 8 fallan. Después se añadieron dos más: el foco y el caso de dejar de ofrecerse. (FR-001, FR-002, FR-004)

### Implementación (GREEN)

- [X] T003 `bulkQuestionMark.ts` con sus pruebas: cambios por pregunta, explicación fija o conservada, nota anticipada y lista legible. Se escribió junto con sus pruebas, sin una corrida RED aparte. (FR-003, FR-004, FR-005)
- [X] T004 `BulkMarkPanel.tsx` y el modo de selección en `GradeBreakdown.tsx`. (FR-001, FR-002, FR-004)
- [X] T005 Guardado en lote en `CalificacionesWorkspace.tsx`: una solicitud con la versión vigente, mensaje con lo que falta por revisar y, ante un conflicto, aviso sin guardar. No se ofrece mientras se edita una pregunta. (FR-001, FR-003, FR-007)
- [X] T006 `breakdown_service.update_breakdown` quita `orientacion_mejora` de la pregunta que el docente deja correcta. (FR-005)
- [X] T007 Foco al entrar y al salir del modo, y botones apilados en pantallas estrechas, tras revisar las capturas. (FR-006)

### Validación

- [X] T008 `e2e/bulk-question-mark.spec.ts`: flujo completo en 390 px y 1440 px, claro y oscuro, con tamaño táctil, sin desplazamiento lateral y una sola solicitud de guardado; y cancelar sin guardar. (FR-002, FR-003, FR-004, FR-006)
- [X] T009 El modo entra en la revisión automática con axe (`wcag-axe.a11y.spec.ts`). (FR-006)
- [X] T010 Pruebas del módulo, regresiones de la revisión, tipos, lint, inventario y gobernanza, con los resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Dependencias

T001 y T002 → T003 → T004 → T005 y T006 → T007 → T008 y T009 → T010.
