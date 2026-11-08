# Plan: Editar hojas también en entregas antiguas guardadas como PDF

**Spec**: [spec.md](spec.md) | **Issue**: [#337](https://github.com/Andres-back/Calificator/issues/337)

## Diagnóstico

- `read_editing_evidence` (`backend/app/modules/calificaciones/evidence_edit.py`) tiene dos caminos: entrega con `evidencia_manifiesto`, o imagen antigua suelta leída con `_bounded_legacy_image`. Esta función rechaza cualquier archivo que empiece por `%PDF-`, y el `except` lo convierte en el 409 que ve el docente.
- El resto del flujo ya admite varias hojas antiguas: `StoredPage` con `legacy_source`, `resolve_edited_pages` y `persist_scan_sources` crean un registro de hojas nuevo al guardar. La vista previa (`consultar_fuente_edicion_evidencia`) sirve `page.source()`.

## Decisión

- **Lectura**: si el archivo antiguo es PDF, leerlo con el mismo límite total y renderizar cada página con PyMuPDF (`fitz`, ya en uso) en un hilo aparte. Se usan 150 ppp con el lado mayor limitado a 2200 px, en JPEG de calidad 92, para quedar por debajo de 10 MB por hoja.
- Cada imagen pasa por `inspect_scan_source`, igual que una foto, y se usa como `legacy_source`.
- **Identidad**: la huella usa el SHA-256 del PDF guardado. La referencia de cada hoja es `uuid5(delivery.id, f"{huella}:{n}")`, estable mientras el PDF no cambie (FR-005).
- **Límites**: un PDF con más páginas que `scan_limits()[0]`, vacío o dañado lanza `EvidenceManifestError`, que mantiene el 409 actual (FR-004).
- **Sin escrituras**: la lectura no guarda nada. Solo el guardado existente crea la evidencia nueva (FR-003).

Descartado:

- Pedir al docente que reemplace la entrega completa: es lo que ya ofrece el aviso y obliga a volver a fotografiar hojas que ya existen.
- Convertir los 45 PDF de producción en un proceso aparte: escribiría en evidencia de producción sin que el docente lo pida.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/evidence_edit.py` | páginas del PDF antiguo como hojas editables |
| `backend/tests/unit/test_evidence_edit.py` | PDF de varias páginas: abrir, girar y guardar; PDF dañado o largo sigue rechazado |

## Riesgos

- Un PDF de texto renderizado pesa poco; uno de fotos grandes podría superar el límite total. En ese caso se mantiene el aviso actual.
- Abrir el editor tarda un poco más en PDF: unos cientos de milisegundos por página.
