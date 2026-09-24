# Tareas: Selección “Todos” al matricular estudiantes

## Fase 1: Preparación

- [x] T001 Revisar el estado y contrato actuales en `frontend/src/modules/materias/ExistingStudentsDialog.tsx`

## Fase 2: Historia 1 - Selección masiva visible

- [x] T002 [US1] [FR-001] [FR-002] [FR-003] [FR-004] [FR-005] [FR-007] Crear pruebas de selección, deselección y filtro en `frontend/src/modules/materias/ExistingStudentsDialog.test.tsx`
- [x] T003 [US1] [FR-001] [FR-002] [FR-003] [FR-004] [FR-005] [FR-006] [FR-007] Implementar el control “Todos” en `frontend/src/modules/materias/ExistingStudentsDialog.tsx`

## Fase 3: Validación

- [x] T004 Ejecutar prueba focalizada, TypeScript y lint del frontend y registrar resultados en `specs/064-matricular-todos/quickstart.md`
- [x] T005 Actualizar índice e inventario de gobernanza en `specs/README.md`, `tests/spec_governance/test_spec_baseline.py` y `specs/system-inventory/current.json`

## Dependencias

- T001 precede a T002 y T003.
- T002 se escribe antes de T003.
- T004 y T005 requieren la implementación completa.

## Estrategia

El MVP es la única historia: seleccionar o desmarcar los resultados visibles sin cambiar el backend ni el flujo de confirmación.
