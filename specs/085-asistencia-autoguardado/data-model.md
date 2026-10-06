# Datos y estados

## Persistencia existente

`AsistenciaRegistro` mantiene `id`, `materia_id`, `estudiante_id`, `fecha`, `estado`, `observacion`, `registrado_por`, `created_at` y `updated_at`. Estados válidos: presente, tarde, ausente, excusa. No añadir columnas ni tablas.

La clave única `(materia_id, estudiante_id, fecha)` es la identidad funcional del registro. Un upsert conserva `id`/`created_at` y actualiza estado, observación, responsable y modificación. Las filas ausentes del lote no se alteran. Pendiente es ausencia de registro; no crear presencia o ausencia por omisión.

## Validaciones

- Fecha actual o pasada, no futura.
- IDs sin duplicados y matrícula activa en materia autorizada.
- PATCH: subconjunto no vacío; PUT: conjunto completo actual, como antes.
- Observación opcional hasta 300 caracteres; trim y vacío normalizado a null.
- Validar lote antes de escribir; una fila inválida rechaza todo ese lote.

## Estado local de la vista

Contexto inmutable de cada solicitud: materia y fecha. Por alumno: borrador, base confirmada, revisión local, instantánea enviada y error. Cola de filas listas y una solicitud en curso.

Transiciones: lectura → sin cambios; selección → pendiente de guardado → guardando → guardado. Edición mientras se guarda → mantener revisión nueva en cola; confirmación anterior no elimina esa edición. Fallo → no guardado → reintento o nueva edición → guardando.

Una observación sin estado permanece pendiente local y no se envía. Pendientes de asistencia y cambios sin guardar son conceptos distintos.

Sin almacenamiento offline: descartar elimina cambios no enviados; una petición ya enviada puede completarse en su contexto original.
