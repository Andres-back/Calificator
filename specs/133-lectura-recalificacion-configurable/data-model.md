# Datos

- `ai_feature_routing.runtime_limits`: JSONB nullable. Campos tipados `call_timeout_seconds`5..60, `max_attempts`1..2, `max_output_tokens`1024..10000; valores recomendados60/2/10000. Solo consumidos por `calificacion.extraccion` en esta entrega; ausencia conserva compatibilidad y adopta valores recomendados.
- Snapshots de trabajos nuevos incluyen límites y metadatos de conexión necesarios; no secretos. Los snapshots previos no se reescriben. Las versiones de configuración y punto de restauración existentes conservan los controles.
- Historial114 no cambia de esquema. UI docente utiliza `nota_anterior`, fecha y estado desde el endpoint privado existente; cero no equivale a ausencia. Nota anterior no se asigna a campos de calificación vigente.
- Upgrade aditivo sin backfill; downgrade solo si no hay controles utilizados que se perderían. Reversión productiva conserva columna/datos y publica versión previa válida, no el modelo retirado como supuesta recuperación.
