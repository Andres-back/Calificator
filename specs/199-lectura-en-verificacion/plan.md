# Plan: Calificar comprensión de lectura con la lectura a la vista de todos los agentes

**Spec**: [spec.md](spec.md) | **Issue**: [#417](https://github.com/Andres-back/Calificator/issues/417)

## Decisión

Solo backend, sin migración ni cambio de datos.

- `agents.py`:
  - `grading_reading(blueprint)`: una sola forma de entregar la lectura al calificador y al verificador.
  - `VERIFIER_PROMPT_TEMPLATE` añade la lectura y la regla de remisión; `verification_agent` la envía.
  - `GRADER_PROMPT_TEMPLATE` añade la misma regla.
  - `unconfirmed_pending_keys(blueprint)`: filtra `claves_pendientes` con las respuestas esperadas confirmadas por el docente; `render_grader_prompt` usa el resultado.
- `breakdown_policy.py`: en el caso sin consenso, se añade « Motivo: …» con la explicación del calificador en estado pendiente.

## Por qué filtrar al calificar y no solo al guardar

Hay evaluaciones ya guardadas con la lista desactualizada. Filtrar al armar la instrucción las corrige sin tocar datos.

## Riesgo

Cambia la instrucción de calificación de todas las evaluaciones. La regla nueva solo aplica cuando la clave remite a la lectura; la lectura ya la recibía el calificador principal. No se recalifica nada automáticamente.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/agents.py` | lectura al verificador, regla, claves pendientes reales |
| `backend/app/modules/calificaciones/breakdown_policy.py` | motivo visible sin consenso |
| `backend/tests/unit/test_lectura_en_calificacion.py` | pruebas (nuevo) |
