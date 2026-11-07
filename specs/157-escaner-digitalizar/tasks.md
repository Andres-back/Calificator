# Tareas: Preparar las fotos con el escáner al digitalizar una evaluación

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-07 (`spec-approved`, `plan-approved` en #332).

## Pruebas primero (RED)

- [X] T001 Pruebas en `backend/tests/unit/test_digitalization_scan.py`: lectura y validación de recetas, hoja preparada en el documento, foto única sin doble giro, caída a la original con aviso, foto grande y error inesperado, presupuesto de tiempo, documento sin recetas igual al de hoy y fuente temporal borrada. RED: error de colección, el módulo no existía. (FR-003, FR-004, FR-005, FR-006, FR-009)
- [X] T002 Pruebas del endpoint: recetas y avisos, sin recetas como hoy, 409 sin escáner, 400 con giro distinto o recetas inválidas, capacidad sin evaluación y sin ayuda de esquinas, y 403 para quien no crea evaluaciones. (FR-001, FR-003, FR-008)
- [X] T003 Prueba del proceso aislado real con una hoja sintética, omitida en Windows y ejecutada en CI. (FR-004)
- [X] T004 Vitest del modal: sin escáner no hay editor ni `recetas`; con escáner, «Preparar hoja», revisión obligatoria y receta junto al original; «Usar las fotos originales» y avisos. RED: 3 de 6 fallaron. (FR-002, FR-003, FR-007, FR-009)
- [X] T005 E2E `frontend/e2e/digitalization-scan.spec.ts` a 360 px con el Worker real: prepara la hoja y envía la foto original con su receta. RED con el modal de `main`: no aparece el editor. (FR-002, FR-003)

## Corrección (GREEN)

- [X] T006 Crear `evidence_digitalization_scan.py` con `parse_scan_recipes` y `prepare_scanned_photos` sobre `run_page_preparation`. (FR-003, FR-004, FR-005, FR-006)
- [X] T007 `build_evidence_bundle` acepta `scan_recipes`, usa la hoja preparada sin retoque y devuelve `warnings`; sin recetas no cambia. (FR-004, FR-005, FR-009)
- [X] T008 Endpoint de capacidad y campo `recetas` con permiso, giro y `avisos`. (FR-001, FR-003, FR-008)
- [X] T009 `digitalizationScan.ts` y el modal con `scanEnabled`, revisión, «Usar las fotos originales» y avisos. (FR-002, FR-007)

## Validación

- [X] T010 Ejecutar pruebas de backend, Vitest, tipos, lint, E2E, inventario y gobernanza, y registrar los resultados en `quickstart.md`. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009)
