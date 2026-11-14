# Plan: Tras cambiar la evidencia o recalificar, las respuestas son de la hoja nueva

**Spec**: [spec.md](spec.md) | **Issue**: [#396](https://github.com/Andres-back/Calificator/issues/396)

## Decisión

En `create_automatic_breakdown` (`backend/app/modules/calificaciones/breakdown_service.py`):

- Una nota revisada o publicada se sigue conservando, como antes.
- Un desglose activo de origen docente se conserva salvo que `_reopened_after` encuentre una revisión «recalificar» o «cambiar_evidencia» posterior a su creación. En ese caso, el resultado nuevo crea la versión siguiente y el ajuste queda inactivo.

`reprocess_grade` ya registra esa revisión al recalificar o cambiar la evidencia y reinicia la nota (sin confirmación ni revisión). Solo faltaba que el desglose lo respetara.

Descartado:

- **Desactivar el desglose al pedir la recalificación**: si la lectura falla, la calificación quedaría sin desglose.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/breakdown_service.py` | `_reopened_after` y la condición de reemplazo |
| `backend/tests/unit/test_breakdown_persistence.py` | dos pruebas |

## Datos en producción

La calificación del reporte ya está confirmada sobre las respuestas viejas. Corregirla exige recalificarla de nuevo, y eso reabre la nota: decisión del usuario.
