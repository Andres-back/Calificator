# Plan: El recuadro de la respuesta abarca la pregunta completa

**Spec**: [spec.md](spec.md) | **Issue**: [#380](https://github.com/Andres-back/Calificator/issues/380)

## Diagnóstico

- `GradeEvidenceViewer` dibuja y enfoca exactamente la zona guardada (`evidencia_regiones[].bbox`), que es la marca o la fila de la respuesta.
- La foto puede estar girada y el visor no sabe hacia dónde está el enunciado.

## Decisión

Solo frontend. `expandAnswerRegion` en `evidenceViewport.ts` calcula el recuadro que se muestra:

- El lado mayor de la zona marca el sentido del texto: a lo largo de él se añade `min(20 %, max(6 %, 2,5 × lado mayor))` de la hoja a cada lado.
- A ambos lados del lado menor se añade `max(4 %, 1,2 × lado menor)`.
- Se recorta a la hoja.

El visor usa ese recuadro para dibujar y para enfocar (con el tope de 250 % de la Spec 178). La zona guardada no cambia.

En la captura de producción, la marca mide cerca de 2,4 % × 5,7 % de la hoja; el recuadro pasa a 10,4 % × 34 % y abarca el número, el enunciado y las cuatro opciones.

Descartado:

- **Crecer más hacia arriba**: falla en fotos de lado, como la de la captura.
- **Delimitar la pregunta con las zonas de las preguntas vecinas**: no todas las respuestas tienen zona; queda para más adelante si el margen no basta.
- **Enderezar la foto**: es otro cambio.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/calificaciones/components/evidenceViewport.ts` | `expandAnswerRegion` |
| `frontend/src/modules/calificaciones/components/GradeEvidenceViewer.tsx` | dibuja y enfoca el recuadro ampliado |

## Riesgos

- En hojas muy densas el recuadro puede incluir parte de la pregunta vecina; es el «poquito más» pedido.
- Una zona casi cuadrada se trata como horizontal.
