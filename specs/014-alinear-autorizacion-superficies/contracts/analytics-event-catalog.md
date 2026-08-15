# Catálogo inicial de eventos analíticos

El catálogo es cerrado. Todo evento no listado se rechaza. `actor_id` y rol proceden siempre de la sesión.

| Evento | Roles | Referencias | Metadatos requeridos |
|--------|-------|-------------|---------------------|
| `session_view_opened` | profesor, estudiante, admin | ninguna | `surface` (obligatorio) |
| `workspace_opened` | profesor, admin | evaluación | `materia_id` (obligatorio) |
| `calificacion_opened` | profesor, admin | evaluación y calificación | ninguno |
| `calificacion_confirmed` | profesor, admin | evaluación | ninguno |
| `grade_adjusted` | profesor, admin | evaluación | ninguno |
| `grade_marked_manual_review` | profesor, admin | evaluación | ninguno |
| `batch_confirmed` | profesor, admin | evaluación | `batch_size` (obligatorio) |
| `batch_adjusted` | profesor, admin | evaluación | `batch_size` (obligatorio) |
| `calificacion_published` | profesor, admin | evaluación | ninguno |
| `batch_published` | profesor, admin | evaluación | `batch_size` (obligatorio) |

## Valores acotados

- `surface`: uno de `inicio`, `materias`, `actividades`, `resultados`, `xali`, `calificaciones` o `presentaciones`.
- `batch_size`: entero de 1 a 500.
- `materia_id`: UUID que debe corresponder a la evaluación y al ámbito docente.
- `evaluacion_id` y `calificacion_id`: UUID; si ambos aparecen, la calificación pertenece a la evaluación.

## Límites globales

- Máximo 10 claves de metadata.
- Máximo 4096 bytes después de serializar el objeto saneado.
- Solo valores `string`, `number`, `boolean` o `null`; no se admiten objetos ni listas anidadas.
- Cadenas de máximo 256 caracteres.
- No se admiten claves fuera de la política del evento.
- Nunca se admiten identidad, rol, correo, credenciales, tokens, respuestas, retroalimentación ni evidencia.

## Compatibilidad del cliente

El cliente transforma las referencias conocidas que hoy se encuentran en `metadata_json` al campo canónico correspondiente antes de enviar. Las llamadas existentes conservan la función fire-and-forget y no necesitan manejar el error en el recorrido académico.
