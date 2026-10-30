# Contratos de reparto

Rutas privadas con autorización de evaluación/materia. Servidor como fuente de verdad.

- `GET /evaluaciones/{id}/reparto`: preguntas/claves, plan actual/propuesta inicial, fecha/versión esperadas; sin alumnos.
- `PUT /evaluaciones/{id}/reparto`: plan y fecha/versión esperadas; valida/compila y guarda máximos/blueprint/revisión con referencia anterior en una transacción. Cero cambios de notas.409 por concurrencia/proceso,422 por reparto imposible.
- PATCH existente con cambios solo de máximos delega a la misma transición; no permite saltar revisiones del contenido.
- `POST /evaluaciones/{id}/reparto/notas/previsualizar`: propuestas y exclusiones con fingerprints; lectura sin IA o escrituras académicas.
- `POST /evaluaciones/{id}/reparto/notas/aplicar`: request_id, definición esperada, confirmación explícita y hasta100 selecciones con fingerprint. Revalida y devuelve recibo por nota. Misma solicitud devuelve recibo; cambiar payload bajo ese ID produce409.
- `GET /evaluaciones/{id}/reparto/notas/operaciones/{request_id}`: recupera recibo privado sin reaplicar.

Leer/guardar requiere permisos de evaluación; previsualizar además leer notas; aplicar además calificar. Otro profesor/estudiante denegado. Ninguna ruta publica, cambia escala/evidencia o invoca IA.

UI: «Repartir puntos», modos, miembros visibles, total/restante y fijar/liberar. «Guardar reparto» distinto de «Actualizar notas anteriores». Antes/propuesta/exclusiones y confirmación separada; cancelar no escribe. Fallos parciales explícitos y recuperación sin repetir cambios.
