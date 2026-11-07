# Plan: Preparar las fotos con el escáner al digitalizar una evaluación

**Spec**: [spec.md](spec.md) | **Issue**: [#332](https://github.com/Andres-back/Calificator/issues/332)

## Diagnóstico

- Al calificar, el navegador envía un `ScanSubmission` con una receta `ScanRecipe` por hoja preparada (`scanSubmission.ts`). El servidor la valida y, en el trabajo de calificación, prepara cada hoja con `run_page_preparation`. Esa función lanza `evidence_scan_worker` en un proceso aparte con límites de memoria, CPU y tiempo, y lee la fuente desde `.private/evidence-scan/sources/`.
- El acceso lo decide `scan_enabled_for(actor)`. La lectura de capacidad actual (`GET /calificaciones/capacidades-evidencia`) exige evaluación y estudiante, que no existen al digitalizar.
- `DigitalizarEvaluacionModal` usa `MultiPageEvidencePicker` sin `scanEnabled` y envía fotos y `rotaciones` a `POST /evaluaciones/externa/digitalizar-con-archivo`. Ese endpoint arma el documento con `build_evidence_bundle` (`_normalize_photo`: EXIF, giro, 2600 px, autocontraste y nitidez).

## Decisión

- **Capacidad**: `GET /evaluaciones/externa/capacidad-escaneo`, con permiso `evaluations.create`. Devuelve `capability(actor)` de la calificación y `corner_assistance_enabled: false` siempre.
- **Envío**: campo opcional `recetas`, una lista JSON con una receta o `null` por foto. El navegador la arma con `scanSubmission`, la misma proyección cerrada de la calificación. Solo se envía si alguna hoja está preparada.
- **Servidor**: `parse_scan_recipes` valida con `ScanRecipe`. Si hay alguna receta, exige `require_scan_enabled` y el mismo giro de `rotaciones`. `build_evidence_bundle` recibe `scan_recipes` y llama a `prepare_scanned_photos`, que escribe cada foto como fuente temporal en `.private/evidence-scan/sources/`, la prepara con `run_page_preparation` y la borra en `finally`.
- **Documento**: la hoja preparada entra tal cual, sin otro giro, autocontraste ni nitidez, para que coincida con la vista previa que aprobó el docente. Las demás conservan `_normalize_photo`.
- **Fallos**: cualquier error, una foto de más de 10 MB o un presupuesto total de 30 s agotado dejan la foto original y devuelven un aviso en `avisos`. El modal lo muestra al terminar.
- **Original**: se mantienen «Usar original sin preparar» por hoja y se añade «Usar las fotos originales» para todas (`withoutEvidenceScan`).

Descartado:

- Preparar en el trabajo de digitalización: habría que guardar las fotos originales y las recetas, y cambiar el worker y su recuperación. Es más grande y toca la cola.
- Llamar a `prepare_evidence_scan` en un hilo del API: pierde los límites de memoria y CPU del proceso aislado.
- Enviar la vista previa del navegador como imagen: el servidor confiaría en píxeles del cliente y la vista previa es más pequeña que la copia del servidor.
- Rechazar la digitalización si una hoja no se prepara: contradice «nunca bloquear».

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/services/evidence_digitalization_scan.py` | nuevo: `parse_scan_recipes` y `prepare_scanned_photos` con fuente temporal, presupuesto y avisos |
| `backend/app/services/evidence_bundle_service.py` | `scan_recipes` opcional, hoja preparada sin retoque, `preparada` en metadatos y `warnings` |
| `backend/app/modules/evaluaciones/router.py` | `GET /evaluaciones/externa/capacidad-escaneo`; `recetas`, permiso, giro y `avisos` en la respuesta |
| `frontend/src/modules/evaluaciones/digitalizationScan.ts` | nuevo: lectura de capacidad y recetas por hoja |
| `frontend/src/modules/evaluaciones/components/DigitalizarEvaluacionModal.tsx` | `scanEnabled`, revisión obligatoria, «Usar las fotos originales» y avisos |
| Pruebas | `test_digitalization_scan.py`, Vitest del modal y E2E `digitalization-scan.spec.ts` a 360 px |

Sin migraciones, sin llamadas a IA y sin cambios en la calificación.

## Riesgos

- La preparación ocurre dentro de la petición. Cada hoja tiene un tope de 8 s y el total, de 30 s; después se usan las originales. Con fotos normales tarda menos de un segundo por hoja.
- La fuente temporal vive unos segundos en la carpeta del escáner. La reconciliación de la Spec 131 solo mueve archivos de recibos verificados, así que no la toca. Si el proceso muere, puede quedar un archivo huérfano.
- El proceso aislado usa `resource`, que solo existe en Linux. En Windows la preparación siempre falla y se usa la original con aviso. La prueba real del proceso se omite en Windows y corre en CI.
- Si el escáner se apaga entre abrir el modal y enviar, el servidor responde 409. El docente conserva sus hojas y puede pulsar «Usar las fotos originales».
