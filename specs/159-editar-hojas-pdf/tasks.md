# Tareas: Editar hojas también en entregas antiguas guardadas como PDF

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), aprobados el 2026-11-08 (`spec-approved`, `plan-approved` en #337).

## Pruebas primero (RED)

- [X] T001 Pruebas en `backend/tests/unit/test_evidence_edit.py`: PDF antiguo de dos páginas da dos hojas en orden, con referencias y huella estables, sin tocar el archivo, y huella nueva si el PDF cambia. RED: 409. (FR-001, FR-003, FR-005)
- [X] T002 Prueba de girar una hoja del PDF, añadir una foto nueva y guardar con `persist_scan_sources`. RED: 409. (FR-002, FR-003)
- [X] T003 Prueba de PDF dañado y de PDF con más hojas que el límite: siguen con el aviso actual. (FR-004)

## Corrección (GREEN)

- [X] T004 `_render_legacy_pdf` y `_bounded_legacy_sources` en `evidence_edit.py`: cada página a JPEG de calidad 92, con 150 ppp y el lado mayor limitado a 2200 px, validada con `inspect_scan_source`. La imagen antigua suelta conserva su huella. (FR-001, FR-002, FR-004, FR-005)

## Validación

- [X] T005 Ejecutar pruebas de backend, comprobar en producción y solo en lectura que los PDF antiguos caben en los límites, y registrar los resultados en `quickstart.md`. Correr inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005)
