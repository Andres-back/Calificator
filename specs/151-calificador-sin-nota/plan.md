# Plan: El calificador sin nota conserva su motivo y se reintenta una vez

**Spec**: [spec.md](spec.md) | **Issue**: [#318](https://github.com/Andres-back/Calificator/issues/318) | **Tipo**: hotfix (no requiere `plan-approved`)

## Diagnóstico

Evidencia de producción, evaluación con 20 entregas, 2026-11-05 y 2026-11-06:

- El log del trabajador muestra `Grader agent claude-haiku-5-5 returned no score`, con HTTP 200 y unos 3300 tokens de salida.
- `grader_agent` devuelve `grader_missing_score`, pero `recovery.py` y `orchestrator.py` lo convierten en `provider_error`. Tampoco se reintenta, y la salida se descarta.
- El reintento manual a veces funciona: de 5 entregas con este fallo, 3 obtuvieron nota con un reintento.
- No se sabe aún por qué el modelo omite la nota. Se guarda la forma de la salida para averiguarlo.

Otras 2 entregas fallaron porque ningún modelo de lectura encontró respuestas en una página. Eso no se cambia aquí.

## Decisión

- `RETRYABLE_STAGE_ERRORS = TRANSIENT_ERRORS | {"grader_missing_score"}`, usado solo por `ReviewProgress`.
- `grader_output_shape(parsed)` resume la salida sin copiar valores de texto.
- `ReviewProgress` conserva esa forma, y `orchestrator` la guarda en `grader_a_output_shape`.

Descartado:

- Sumar los puntajes por componente para producir una nota: sería fabricarla, y un componente ilegible no vale cero.
- Aceptar una entrega con una página sin respuestas: el calificador trabaja solo con el texto, y esa página podría convertirse en ceros falsos en una sugerencia. Si hace falta, va en su propia spec.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/execution_policy.py` | `RETRYABLE_STAGE_ERRORS`. |
| `backend/app/modules/calificaciones/recovery.py` | Reintento una vez; motivo y forma conservados. |
| `backend/app/modules/calificaciones/agents.py` | `grader_output_shape`; log con la forma. |
| `backend/app/modules/calificaciones/orchestrator.py` | Motivo real y `grader_a_output_shape` en el detalle del fallo. |
| `backend/tests/unit/test_grader_missing_score.py`, `test_photo_grading_failures.py` | Regresiones. |

Propietario: dominio de calificaciones (backend). Sin migraciones, sin frontend y sin cambios en notas existentes.

## Verificación

Regresiones RED/GREEN, suite unitaria de backend, regla de ruff del CI, inventario y gobernanza.
