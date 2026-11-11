# Tareas: Acciones dentro de su contenedor y encabezados consistentes

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md). Las tareas de los PRs 2 a 4 se añaden en cada uno.

## PR 1 - Materias

### Pruebas primero (RED)

- [X] T001 Un caso nuevo en `MateriaDetailPage.test.tsx`, `MateriasListPage.test.tsx` y `MateriaVistaGeneral.test.tsx`: las acciones están dentro de su contenedor y forman un grupo con nombre. RED: 3 fallas. (FR-001, FR-002)

### Organización (GREEN)

- [X] T002 `MateriaManagement` con clases opcionales y grupo accesible; acciones dentro del encabezado del detalle y del pie de la tarjeta en la lista. (FR-001, FR-003)
- [X] T003 Panel de estudiantes: título y conteo en una fila, acciones en cuadrícula. (FR-002, FR-003)

### Validación

- [X] T004 Pruebas del módulo, tipos, lint, comprobación en el navegador a 1440 px y 375 px, inventario y gobernanza; resultados en `quickstart.md`. (FR-003)

## PR 2 - Encabezados

FR-004 (encabezados de Recursos, Pendientes y Reportes) se implementa en el PR 2; sus tareas se añaden allí.

## Dependencias

T001 → T002 → T003 → T004.
