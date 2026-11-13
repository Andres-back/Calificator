# Plan: Ubicar cada pregunta en la hoja con una cuadrícula

**Spec**: [spec.md](spec.md) | **Issue**: [#384](https://github.com/Andres-back/Calificator/issues/384)

## Diagnóstico

- La lectura de calificación guarda la zona que estima el modelo con coordenadas numéricas. En la captura, con la foto de lado, eran inventadas.
- Enderezar la hoja mejora, pero sigue cayendo en la pregunta vecina. Nombrar celdas rotuladas acierta.

## Decisión

- `answer_grid_locator.py`: dibuja una cuadrícula roja de 12 × 16 celdas (16 × 12 en hojas apaisadas), rotuladas A1…; arma el prompt con los números de pregunta (nunca respuestas, claves ni puntajes); convierte celdas en recuadros y descarta lo inválido.
- `answer_location_service.py` (ruta existente `POST /calificaciones/{id}/ubicar-respuestas`):
  - Toma las mismas páginas y versión que muestra el visor (`_render_cached_evidence_page` o las páginas canónicas del manifiesto).
  - Ubica todas las hojas a la vez con la ruta de visión `calificacion.extraccion`, sin transacción abierta.
  - Guarda en `procedencia_json.zonas_ubicadas` con `version: 2` y `metodo: "cuadricula"`. Conserva las zonas de la Spec 175 solo donde la cuadrícula no encontró la pregunta.
- `breakdown_service`: para el docente, cuadrícula > zona de la lectura > zona de la Spec 175. El estudiante no recibe zonas ubicadas, como antes.
- Frontend: la zona con `metodo: "cuadricula"` se dibuja con 1 % de margen (`padQuestionRegion`). La revisión ubica automáticamente una vez por calificación y desglose. Aparece el enlace «Ubicar de nuevo» y los intentos solo cuentan para la cuadrícula.

Descartado:

- **Cambiar la lectura de calificación**: la cuadrícula roja podría tapar marcas; la calificación no se toca.
- **Enderezar y pedir coordenadas**: falla por una pregunta.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/services/answer_grid_locator.py` | nuevo |
| `backend/app/modules/calificaciones/answer_location_service.py` | ubicación con cuadrícula por hoja |
| `backend/app/services/answer_evidence_regions.py` | método, versión e intentos de la cuadrícula |
| `backend/app/modules/calificaciones/breakdown_service.py` | prioridad de la zona de la cuadrícula |
| `frontend/src/modules/calificaciones/components/evidenceViewport.ts` | `padQuestionRegion` |
| `frontend/src/modules/calificaciones/components/GradeEvidenceViewer.tsx` | recuadro ceñido para la cuadrícula |
| `frontend/src/modules/calificaciones/components/GradeQuestionEvidence.tsx` | «Ubicar de nuevo» y textos |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` | ubicación automática e intentos |
| `frontend/src/types/api.ts` | `metodo` en la zona |

## Riesgos

- Costo: una llamada de visión por hoja y calificación abierta, una vez (Sonnet en producción).
- Si el modelo se equivoca, el docente puede ubicar de nuevo dos veces y siempre tiene la hoja completa.
