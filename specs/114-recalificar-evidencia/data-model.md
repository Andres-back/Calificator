# Datos y transiciones
`calificacion_revisiones`: UUID de solicitud como identidad, calificacion_id y actor_id, created_at, accion, motivo nullable, request_fingerprint, snapshot JSONB. Índice por calificacion/fecha. FK conservadoras; sin backfill. Snapshot incluye nota cero correctamente, estado, confirmado/revisado, confianza, feedback, resultado_json y entrega (archivo privado, tipo, respuesta, metadata, versión contenido).

Nota vigente → bloqueo/validación → revisión inmutable + cola → procesando sin nota confirmada → nueva sugerencia/revisión → decisión docente posterior. Error anterior a commit revierte; error de publicación de cola se recupera por mecanismo existente. Historial no altera datos.

Idempotencia reconoce UUID/huella de la misma operación; otra solicitud mientras procesa devuelve conflicto. La versión esperada evita operar sobre una nota distinta a la mostrada. Sin cambiar el identificador de entrega, alumno, evaluación ni contenido fijado.
