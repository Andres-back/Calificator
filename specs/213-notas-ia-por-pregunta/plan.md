# Plan: Mostrar lo que anotó la IA, en la pregunta que nombra

**Spec**: [spec.md](spec.md) | **Issue**: [#447](https://github.com/Andres-back/Calificator/issues/447)

## Decisión

Las notas se resuelven en `buildReviewTriage`, que ya reparte avisos entre preguntas y avisos generales.

- `buildReviewTriage(..., primaryAlerts)` recibe las alertas del modelo principal además de las del verificador. Las marca con su autor y asocia cada una a las preguntas que nombra. Las que no se asocian van a `globalReasons`.
- `describeReviewBlocker` y `humanizeBlocker` reconocen las notas marcadas y muestran su texto con `readableAiNote`. Lo que no es legible cae en el aviso genérico, como antes. Así se conserva la protección contra diagnósticos técnicos de la prueba existente.
- `CalificacionesWorkspace` pasa `grader_a.alertas` y deja de mezclar las notas en `extraReasons`. La petición de revisión del modelo principal pasa a `principal_solicita_revision`. La del verificador se muestra solo si no dejó notas.
- `GradeBreakdown` muestra «Notas de la IA» dentro de la pregunta en la vista compacta, para las razones `ai_note:*` y `primary_model_used`.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.ts` | notas con autor, patrón de preguntas, mensajes |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` | alertas del modelo principal y peticiones de revisión |
| `frontend/src/modules/calificaciones/components/GradeBreakdown.tsx` | «Notas de la IA» en la pregunta |
| `frontend/src/modules/calificaciones/review-triage/aiNotes213.test.tsx` | prueba nueva |
| `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.test.ts`, `primaryModel212.test.ts` | pruebas al día |
| `frontend/e2e/mock/ai-notes.mock.spec.ts` | prueba simulada con capturas |

## Riesgo

Bajo. Solo cambia lo que se muestra. El texto de la IA se muestra escapado por React, recortado y filtrado de diagnósticos.
