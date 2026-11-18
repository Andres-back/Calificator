# Tareas: Importar la lista de estudiantes desde la galería o un archivo

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #424. Aprobados por el usuario el 2026-11-17: pidió que la lista reciba también una foto subida o un archivo, en variedad de formatos (`spec-approved` y `plan-approved` en #424).

### Pruebas

- [X] T001 Excel con encabezados, numeración y asistencia deja solo los nombres. (FR-003)
- [X] T002 Columnas de apellidos y nombres; texto y Word con numeración y repetidos; CSV; filas que no son nombres; tope de 100. (FR-003, FR-004)
- [X] T003 Foto y PDF escaneado usan la lectura de imagen; PDF con texto no. (FR-005)
- [X] T004 Tipos no admitidos y almacenamiento privado. (FR-002, FR-007)
- [X] T005 Diálogo con dos entradas, envío de una hoja de cálculo y mensaje sin nombres. (FR-001, FR-006)

### Implementación

- [X] T006 `roster_files.py`. (FR-003, FR-004, FR-005)
- [X] T007 Router, almacenamiento y trabajador. (FR-002, FR-007)
- [X] T008 Diálogo y mensajes. (FR-001, FR-006)

### Validación

- [X] T009 Prueba real en local: Excel con columnas separadas hasta el estado de revisión; ejecutable rechazado. (FR-002, FR-003, FR-004)
- [X] T010 Pruebas unitarias, de integración adaptada y de extremo a extremo actualizadas; tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007)

## Dependencias

Spec 201 → todo. T001–T005 → T006–T008. T009 y T010 al final.
