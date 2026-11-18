# Plan: Llenar campos sin digitar, desde una foto o un archivo

**Spec**: [spec.md](spec.md) | **Issue**: [#422](https://github.com/Andres-back/Calificator/issues/422)

## Decisión

- **Backend**, módulo nuevo `captura_texto`:
  - `service.py`: `detect_kind` (por contenido), lectores de Word (párrafos y tablas en orden), Excel, CSV y texto, y `capture_text`, que para fotos y PDF escaneados reutiliza el lector de hojas de la digitalización con una instrucción de transcripción literal.
  - `router.py`: `POST /captura-texto`, con límite de 20 MB, límite de uso por hora y rol docente o administrador. No guarda el archivo.
- **Frontend**, carpeta nueva `components/capture`:
  - `textCapture.ts`: llamada al servidor, tipos aceptados y `mergeCapturedText`.
  - `TextCaptureButtons.tsx`: «Tomar foto» (cámara) y «Subir archivo», estado de lectura y mensajes.
- **Aplicación**: `GenerationWizard.tsx` y `EvaluationDocumentOutline.tsx`, sobre el campo de lectura.

## Modelo y costo

La lectura de fotos usa la misma ruta económica de la digitalización. Word, Excel, CSV, texto y PDF con texto no usan IA.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/captura_texto/` (`service.py`, `router.py`) | nuevo |
| `backend/app/api.py` | registro del punto de acceso |
| `backend/tests/unit/test_captura_texto.py` | pruebas (nuevo) |
| `frontend/src/components/capture/` (`textCapture.ts`, `TextCaptureButtons.tsx`, prueba) | nuevo |
| `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx`, `EvaluationDocumentOutline.tsx` | botones en la lectura |

## Siguiente

Importar la lista de estudiantes desde la galería o desde un archivo (Spec 202) y llevar los botones a otros campos largos.
