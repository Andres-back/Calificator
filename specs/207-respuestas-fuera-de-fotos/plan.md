# Plan: Avisar qué respuestas no aparecen en las fotos de la entrega

**Spec**: [spec.md](spec.md) | **Issue**: [#435](https://github.com/Andres-back/Calificator/issues/435)

## Decisión

Solo frontend; el dato ya llega en el detalle de la calificación (`resultado_json.evidence_coverage`).

- `review-triage/buildReviewTriage.ts`:
  - `missingQuestionsInPhotos(resultado)`: lee y depura las preguntas faltantes.
  - `classifyReviewComponent(component, missing)`: motivo `missing_in_photos` como primer bloqueo de la pregunta, salvo decisión docente.
  - `buildReviewTriage(..., missing)`: aviso `faltan_en_fotos:2,3` en lugar de `cobertura_evidencia_incompleta` y de «Cobertura parcial».
  - `describeReviewBlocker`: mensajes con las preguntas, indicación del reverso y destino «evidencia»; versión para avisos históricos.
- `review-triage/ReviewTriagePanel.tsx`: la lista «Ver todos los avisos» muestra la indicación de este aviso (`showGuidance`).
- `CalificacionesWorkspace.tsx`: calcula las preguntas faltantes y las pasa al resumen.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.ts` | lectura, motivo y avisos |
| `frontend/src/modules/calificaciones/review-triage/ReviewTriagePanel.tsx` | indicación en la lista |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` | paso del dato |
| `frontend/src/modules/calificaciones/review-triage/missingInPhotos207.test.ts`, `frontend/e2e/mock/missing-in-photos.mock.spec.ts` | pruebas |

## Qué no se hace

- No se abre directamente «Editar hojas»: el botón lleva a la sección de evidencia, donde está.
- No cambia la regla que deja estas preguntas para el docente.

## Riesgo

Bajo. Solo texto y orden de motivos en la revisión docente.
