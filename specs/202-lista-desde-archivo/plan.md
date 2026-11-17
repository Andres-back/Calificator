# Plan: Importar la lista de estudiantes desde la galería o un archivo

**Spec**: [spec.md](spec.md) | **Issue**: [#424](https://github.com/Andres-back/Calificator/issues/424)

## Decisión

Se conserva el flujo existente (lote, trabajo en segundo plano, revisión y confirmación). Solo cambia cómo se obtienen los candidatos.

- **Nuevo** `importacion_estudiantes/roster_files.py`:
  - `names_from_text`: un nombre por fila, con detección de encabezados y de columnas de apellidos y nombres.
  - `candidates_from_file`: foto → lectura de imagen existente; PDF con texto, Word, Excel, CSV y texto → `names_from_text`; PDF escaneado → hojas como fotos.
  - Reutiliza `detect_kind` y los lectores del módulo `captura_texto` (Spec 201).
- **`router.py`**: acepta los tipos nuevos y guarda el archivo temporal con su tipo.
- **`storage_service.py`**: extensiones privadas para `.xlsx`, `.csv` y `.txt`.
- **`tasks_roster_import.py`**: usa `candidates_from_file` en lugar de asumir una imagen.
- **Frontend** `RosterImportDialog.tsx`: dos entradas (cámara y selector sin `capture`), textos y mensaje de error.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/importacion_estudiantes/roster_files.py` | nuevo |
| `backend/app/modules/importacion_estudiantes/router.py`, `vision_service.py` | tipos y mensaje |
| `backend/app/services/storage_service.py` | extensiones privadas |
| `backend/app/workers/tasks_roster_import.py` | candidatos desde archivo |
| `backend/tests/unit/test_roster_files.py`, `backend/tests/integration/test_roster_import_flow.py` | pruebas |
| `frontend/src/modules/materias/RosterImportDialog.tsx`, `rosterImportErrors.ts` | dos entradas y textos |
| `frontend/src/modules/materias/RosterImportSource.test.tsx`, `frontend/e2e/roster-import.spec.ts`, `frontend/e2e/mock/exports.mock.spec.ts` | pruebas |

## Dependencia

Spec 201 (módulo `captura_texto`). Este PR se abre cuando el de la 201 esté en main.
