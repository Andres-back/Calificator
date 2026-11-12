# Tareas: Evidencia a pantalla, recalificar en lote y asistencia en mosaico

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md).

### Pruebas primero (RED)

- [X] T001 `backend/tests/unit/test_batch_regrade.py`: cada entrega con su solicitud, notas decididas fuera del lote, un rechazo no detiene al resto, recarga del docente tras un rechazo, límite del lote y orden de las rutas. RED: el módulo no existía. (FR-002, FR-003, FR-004)
- [X] T002 `backend/tests/unit/test_resource_generation_unavailable.py`: un fallo del proveedor responde 503. RED: 1 falla. (FR-008)
- [X] T003 Frontend: `recalificarLote.test.ts`, `reviewRowStatus.test.ts`, un caso en `GradeEvidenceViewer.test.tsx` y los casos de menú en `studentNavigation.test.ts` y `AppShell.test.tsx`. (FR-001, FR-002, FR-007, FR-009)

### Implementación (GREEN)

- [X] T004 Ruta `POST /calificaciones/lote/recalificar`, `teacher_decided` y `BatchRegradeRequest`. (FR-002, FR-003, FR-004)
- [X] T005 «Recalificar seleccionados», «Recalificar no revisadas» y su diálogo de confirmación. (FR-002, FR-005)
- [X] T006 Marco de la hoja de evidencia a alto de pantalla desde 1024 px. (FR-001)
- [X] T007 Asistencia en dos y tres columnas, con tarjeta compacta en ordenador. (FR-006)
- [X] T008 Menú e inicio del administrador sin Presentaciones. (FR-007)
- [X] T009 503 al generar un recurso cuando la IA no responde. (FR-008)
- [X] T010 Estados con nombre y tono en la lista de revisión; ruta de navegación en una línea. (FR-009)

### Validación

- [X] T011 Suites de backend y frontend, tipos y lint, comprobación en el navegador de cada pantalla, recorrido de recursos por API, inventario y gobernanza; resultados en `quickstart.md`. (FR-001 a FR-009)

## Dependencias

T001 → T004 → T005. T002 → T009. T003 acompaña a T005, T006, T008 y T010. T011 al final.
