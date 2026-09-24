# Modelo de datos

No hay cambios de esquema.

## Datos existentes

- `Matricula`: fuente de estudiantes de la materia.
- `Calificacion.estudiante_id`: indica que el estudiante ya tiene evidencia procesándose o una decisión de nota.
- Estado local `acceptedUploads[evaluacion_id]`: puente no persistente hasta que la consulta refleje la carga aceptada.

## Invariantes

1. La exclusión visual nunca elimina una entrega o calificación.
2. Un error de carga no se registra como aceptación local.
3. El flujo dedicado de reemplazo no depende del selector general.

