# Tareas: Acciones dentro de su contenedor y encabezados consistentes

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-11 (`spec-approved`, `plan-approved` en #353). Las tareas de cada PR se añaden en ese PR.

## PR 1 - Materias

### Pruebas primero (RED)

- [X] T001 Un caso nuevo en `MateriaDetailPage.test.tsx`, `MateriasListPage.test.tsx` y `MateriaVistaGeneral.test.tsx`: las acciones están dentro de su contenedor y forman un grupo con nombre. RED: 3 fallas. (FR-001, FR-002)

### Organización (GREEN)

- [X] T002 `MateriaManagement` con clases opcionales y grupo accesible; acciones dentro del encabezado del detalle y del pie de la tarjeta en la lista. (FR-001, FR-003)
- [X] T003 Panel de estudiantes: título y conteo en una fila, acciones en cuadrícula. (FR-002, FR-003)

### Validación

- [X] T004 Pruebas del módulo, tipos, lint, comprobación en el navegador a 1440 px y 375 px, inventario y gobernanza; resultados en `quickstart.md`. (FR-003)

## PR 2 - Pantallas restantes de docente y estudiante

- [X] T005 Caso nuevo en `MateriasListPage.test.tsx`: la bienvenida del estudiante no se muestra en el teléfono. RED: 1 falla. (FR-006)
- [X] T006 `ReportesPage` sin la tarjeta repetida; acciones de Asistencia dentro de «Tomar asistencia» y acciones de Criterios de aprendizaje en dos columnas. (FR-004, FR-005, FR-003)
- [X] T007 Inicio y «Mis materias» del estudiante: imagen fuera del teléfono y bienvenida oculta por debajo de 640 px. (FR-006)
- [X] T008 Pruebas de materias, reportes e inicio, tipos, lint y comprobación en el navegador; resultados en `quickstart.md`. (FR-003)

## Dependencias

T001 → T002 → T003 → T004. T005 → T006 → T007 → T008.
