# Tareas: Estudiantes en mosaico mientras no hay uno seleccionado

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-05 (`spec-approved`, `plan-approved` en #315).

## Fase 1: Pruebas primero (RED)

- [X] T001 `frontend/e2e/grade-review-mosaic.spec.ts`: en 1440px sin selección, 3 o más columnas, lista a más del 80 % del ancho principal, panel vacío oculto y sin desplazamiento horizontal; al abrir un estudiante y "Mostrar estudiantes", una columna. En 390px, una columna. RED: 1 columna en 1440px. (FR-001, FR-002, FR-003, FR-005)

## Fase 2: Corrección (GREEN)

- [X] T002 `CalificacionesWorkspace.tsx`: `mosaic = !selectedId && !reviewCompleted`; cuadrícula `sm:2 / xl:3 / 2xl:4` columnas; "Más estudiantes" a toda la fila; panel de detalle oculto sin selección. (FR-001, FR-002, FR-003)
- [X] T003 Buscar y filtrar en una fila desde `sm` en el mosaico. (FR-004)

## Fase final: Validación

- [X] T004 Ejecutar lint, typecheck, las pruebas unitarias de calificaciones y las E2E de revisión, y registrar los resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005)

## Dependencias

T001 → T002 y T003 → T004. Solo frontend.
