# Plan: Ubicar la respuesta en la hoja al revisar una calificación

**Spec**: [spec.md](spec.md) | **Issue**: [#370](https://github.com/Andres-back/Calificator/issues/370)

## Diagnóstico

- El lector de hojas (`VisionExtractor`) ya devuelve la zona de cada respuesta al calificar, y `attach_answer_regions` la guarda en `evidencia_json.regiones` de cada componente. Las calificaciones anteriores a ese cambio no la tienen.
- `GradeEvidenceViewer` recibe la zona y solo cambia el zoom. No dibuja nada sobre la hoja.
- Fuera de la vista «Evidencia», el marco del visor mide `h-64 sm:h-80`.
- `review_source_fingerprint` (devoluciones compartidas) incluye `evidencia_json` de cada componente y `updated_at` de la nota. Escribir ahí invalidaría una devolución ya aprobada.

## Decisión

**Dónde se guardan las zonas ubicadas a petición**: en `procedencia_json.zonas_ubicadas` del desglose vigente, por clave de pregunta. Ese campo no entra en la huella de las devoluciones y se copia a las versiones que crea un ajuste del docente. No se toca la fila de la calificación ni sus componentes. Al servir el desglose al docente, una pregunta sin zona propia recibe la ubicada.

**Cómo se ubican**: `POST /calificaciones/{id}/ubicar-respuestas`, con el permiso de calificar y la misma comprobación de propiedad que las demás acciones de revisión.

1. Si ninguna pregunta carece de zona, responde sin leer nada.
2. Carga la foto igual que la calificación: páginas canónicas si la entrega tiene manifiesto, el archivo si no.
3. Lee con `VisionExtractor` y la ruta de IA de «calificacion.extraccion», la misma que califica. El contexto solo lleva el nombre de la evaluación y, por pregunta, su identificador, número y enunciado.
4. Cierra la transacción antes de la lectura, que tarda segundos, con un límite de 50 s porque el proxy corta a los 60 s.
5. Al terminar bloquea nota y desglose en el orden de la edición docente, comprueba que el desglose sigue siendo el mismo y guarda solo las zonas de preguntas que no tenían.
6. Empareja con `attach_answer_regions`, de modo que versión de evidencia, página y marco son los mismos que al calificar.

**Límite**: dos búsquedas por desglose. Un fallo de la lectura no cuenta.

**Frontend**

- `evidenceRegionRect` calcula el recuadro en píxeles del marco; el visor lo dibuja con un borde y un velo suave fuera de él.
- `focusSignal`: un contador que, al cambiar, vuelve a enfocar la zona.
- En la comparación de respuestas, el bloque «Respuesta del estudiante» pasa a ser un botón cuando hay visor al lado; conserva alto y contenido.
- Sin zona, el visor muestra el aviso y «Ubicar respuestas con IA»; al llegar al límite, solo el motivo.
- El marco del visor de una respuesta usa `clamp(20rem, 100dvh − 27rem, 44rem)` desde 1024 px.

Descartado:

- **Escribir las zonas en `evidencia_json` de cada componente**: cambia la huella de las devoluciones aprobadas y obligaría a revisarlas otra vez.
- **Un modelo o una instrucción propia para ubicar**: exigiría otra ruta de IA administrada, con sus credenciales, límites y registro de uso. La lectura existente ya ubica y ya está probada en producción.
- **Ubicar en segundo plano con un trabajo**: una entrega típica tiene de una a tres hojas y cabe en una petición; un trabajo añade cola, estado y sondeo.
- **Ubicar todas las notas antiguas de una vez**: costo sin que nadie lo pida; se ubica la nota que el docente abre.
- **Marcadores de todas las respuestas en la vista «Evidencia»**: queda para otro cambio.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/answer_location_service.py` | servicio nuevo |
| `backend/app/modules/calificaciones/revision_router.py`, `schemas.py` | ruta y respuesta |
| `backend/app/services/answer_evidence_regions.py` | lectura validada de las zonas ubicadas e intentos |
| `backend/app/modules/calificaciones/breakdown_service.py` | une la zona ubicada al servir el desglose docente |
| `frontend/src/modules/calificaciones/components/GradeEvidenceViewer.tsx`, `evidenceViewport.ts` | recuadro, reenfoque y alto |
| `frontend/src/modules/calificaciones/components/GradeQuestionEvidence.tsx` | acción de ubicar |
| `frontend/src/modules/calificaciones/components/GradeBreakdown.tsx` | respuesta pulsable |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`, `api.ts` | conexión y llamada |

## Riesgos

- **La lectura real no se probó en local**: no hay proveedor de visión. Se probó hasta el lector con la ruta administrada, que falla con «sin ruta de visión» y da el 503 previsto; y el guardado, contra la base local real con una lectura simulada construida con los mismos modelos del lector.
- **Costo**: cada búsqueda lee todas las hojas de la entrega con el modelo de extracción, cerca de 0,012 USD por hoja. Lo acotan el máximo de dos búsquedas y que solo se ofrece cuando falta alguna zona.
- **Entregas de muchas hojas**: si la lectura pasa de 50 s, responde 503 y no guarda nada. Las hojas se leen varias a la vez (tres por defecto).
- **Precisión del recuadro**: es la del lector; el aviso «Ubicación sugerida» y «Ver hoja completa» siguen ahí.
- **Uso registrado como extracción**: la lectura queda en el registro de uso de IA como etapa de extracción de esa calificación.
- **Pruebas de extremo a extremo**: las que miden la vista por pregunta se confirman en la CI.
