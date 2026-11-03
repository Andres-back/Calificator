# Data model

- `Evaluacion.contenido_version_id`: revisión actual, leída bajo lock compartido al admitir.
- `Entrega.contenido_version_id`: revisión anterior hasta confirmación explícita;
  cambia solo si contenido académico y escala coinciden y los máximos difieren.
- `CalificacionRevision.snapshot_json`: copia previa intacta, con metadatos
  `recalificacion_puntajes` que registran referencias anterior/destino y huella.
- `CalificacionRevision.request_fingerprint`: añade aceptación/destino/huella enviados
  cuando existen; solicitudes antiguas conservan el formato de su huella.
- `ai_jobs.input_json`: la cola existente captura id/hash del pin confirmado.
- `Calificacion`: reapertura existente a procesando, no publicación automática;
  nota y decisión anteriores se conservan en revisión, no como nota vigente paralela.

No se añaden columnas, tablas ni estados persistentes. La propuesta es efímera y
se verifica de nuevo en POST. La consulta no altera enlaces ni datos.
