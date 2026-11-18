# Plan: Foto o archivo también en criterios de aprendizaje e instrucciones

**Spec**: [spec.md](spec.md) | **Issue**: [#425](https://github.com/Andres-back/Calificator/issues/425)

## Decisión

- **Backend** `dba/router.py`: la subida de documentos usa `capture_text` (Spec 201) en vez de exigir PDF o Word según el tipo declarado.
- **Backend, hallazgos de la prueba de punta a punta** (la subida fallaba con error 500 por tres causas ajenas al formato):
  - `dba/router.py`: la indexación pasa a `_index_document_chunks`, que tolera la caída del servicio de búsqueda semántica.
  - `dba/document_service.py`: `SuggestionsUnavailable` cuando la IA no responde o su respuesta no trae sugerencias (el router responde 503 con un mensaje claro); `optional_text` acepta listas.
  - `services/ai_config_service.py`: la tarea `dba_sugerencias` usa la ruta `herramientas_educativas`. Sin ruta propia caía en el modelo por defecto del proveedor, que el proveedor rechaza, y terminaba en la plantilla local.
- **Frontend**:
  - `TextCaptureButtons`: nueva variante `compact`, sin la nota de formatos.
  - `herramientas/forms/base.tsx` (`ExtraInstructions`) y `presentaciones/PresentacionForm.tsx`: botones compactos, tope de 6.000 caracteres.
  - `materias/MateriaDbaPage.tsx`: tipos aceptados y textos.

## Costo

Los criterios desde foto usan la lectura económica de la digitalización. Word, Excel, CSV, texto y PDF con texto no usan IA para la lectura. La redacción de sugerencias usa los modelos económicos de la ruta de herramientas (una llamada por documento).

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/dba/router.py` | lectura con `capture_text`, indexación tolerante y aviso 503 |
| `backend/app/modules/dba/document_service.py` | sugerencias: forma de la respuesta, listas y servicio no disponible |
| `backend/app/services/ai_config_service.py` | ruta de `dba_sugerencias` |
| `backend/tests/unit/test_dba_subida_indexado.py` | pruebas |
| `frontend/src/components/capture/TextCaptureButtons.tsx` | variante compacta |
| `frontend/src/modules/herramientas/forms/base.tsx`, `frontend/src/modules/presentaciones/PresentacionForm.tsx` | botones en instrucciones |
| `frontend/src/modules/materias/MateriaDbaPage.tsx` | formatos y textos |
| `frontend/src/modules/herramientas/forms/ExtraInstructions203.test.tsx`, `frontend/src/components/capture/TextCaptureButtons.test.tsx` | pruebas |

## Dependencia

Spec 201. Este PR se abre cuando el de la 201 esté en main.
