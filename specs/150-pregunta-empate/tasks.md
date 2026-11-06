# Tareas: El docente decide 2.9 o 3.0 en pantalla

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-06 (`spec-approved`, `plan-approved` en #321).

## PR 1: Historias 1 y 2

### Pruebas primero (RED)

- [X] T001 Pruebas unitarias de `tieOptions` y `formatGradeScore` con decisión en `gradePresentation.test.ts`, en escalas 5, 10, 100 y 4.5. (FR-001, FR-005, FR-008)
- [X] T002 Prueba de `TieDecisionField` y del empate en `GradeFinalEditor.test.tsx`: sin preselección, no guarda sin elegir y envía la decisión. (FR-002, FR-003)
- [X] T003 Prueba de regresión E2E `e2e/grade-tie-decision.spec.ts`: confirmar con pregunta, nota pendiente, "Establecer nota" y nota sin empate. (FR-002, FR-004, FR-008, FR-009)

### Corrección (GREEN)

- [X] T004 `tieOptions`, decisión en `formatGradeScore`, tipos y API con `redondeo_empate`. (FR-001, FR-002, FR-005)
- [X] T005 `TieDecisionField`, y `confirmDisabled` en `ConfirmDialog`. (FR-003)
- [X] T006 La pregunta al confirmar, en `GradeFinalEditor`, al guardar la retroalimentación y en "Establecer nota", que pasa a aceptar dos decimales para poder escribir un empate. (FR-002)
- [X] T007 Aviso de nota pendiente y "Publicar" oculto hasta decidir, en escritorio y móvil; cifra decidida en la nota principal del detalle. (FR-004, FR-005)

### Validación

- [X] T008 `lint`, `typecheck`, la suite unitaria de frontend, las E2E de revisión, el inventario y la gobernanza; resultados en `quickstart.md`. (FR-009)

## PR 2: Historia 3

Sus tareas se añaden en ese PR: comprobar si la lista de revisión recibe la decisión (FR-007), pasarla a las llamadas de `formatGradeScore` que la reciben (FR-005, FR-006) y listar las pantallas que no la reciben.

## Dependencias

T001, T002 y T003 → T004 → T005 → T006 y T007 → T008.
