# Contratos propuestos126

## Espacio docente

Ambas entradas usan un espacio común con `evaluationId`, modo, `initialGradeId` o selección explícita y callback de cambios académicos/entrega. Mantener autorización por rol y grading.read/publish en servidor y controles existentes. La pestaña enfoca uno; «Retroalimentación del grupo» conserva la selección previa o muestra el listado sin marcar a todos. No debe haber dos formularios para editar la devolución entregable.

Proyección autorizada existente primero; borrador propuesto si no hay revisión vigente. Mostrar «Pendiente de revisar» o «Lista para entregar» con razón/acción, sin códigos técnicos. Edición y aprobación de mensaje usan los contratos de revisión vigentes; aceptación académica global solo mediante acción explícita y recibo idempotente actual. Conservar impresión, copy-link sin mutaciones, lote, duración3d por defecto/1–30 y evidencia opcional. No reescribir las rutas académicas para hacer un cambio visual.

## Cliente público separado

Guardar sin publicar usa POST autenticado `/api/evaluaciones/{evaluationId}/devoluciones/mensaje`, con `calificacion_id`, `source_fingerprint`, `feedback_text`1–6000 y UUID `request_id`. Exige `grading.grade` y propiedad; bloquea nota en procesamiento/anulada. Bajo lock de nota compara huella o recupera su recibo auditado; mismo ID/contenido no duplica edición, otro contenido/revisión devuelve409. Conserva mensaje anterior y edición en `_timeline`, actor y auditoría sin texto en logs. Cambia únicamente el mensaje/fecha/historial, suspende accesos afectados y devuelve la proyección docente actual con `mensaje_editable`; no confirma/publica nota, libera claves o aprueba entrega. `grading.publish` sigue siendo necesario para autorizar/entregar. Esto concreta FR-003 sin recurrir al endpoint de ajuste de nota.

Base `/api/public/devolucion`. Credencial Bearer solo en memoria tras leer fragmento; `credentials:'omit'`, `cache:'no-store'`, `referrerPolicy:'no-referrer'`, `redirect:'error'`. Mismos headers privados/noindex existentes en éxitos y errores; nunca poner token/conversación en query, URL de cursor o logs.

- GET raíz: campos previos sin cambios; añade `conversation_scope` opaco no autenticante. Solo se calcula/devuelve tras validar acceso; cambia con publicación/generación. Obtenerlo no admite preguntas.
- Cabecera opcional `X-Feedback-Conversation`: UUIDv4 canónico, longitud acotada. Formato inválido → error de entrada comprensible, sin despachar IA. Su ausencia preserva operaciones legacy sobre filas no vinculadas; el cliente nuevo siempre la envía cuando conoce scope. No sustituye Bearer.
- POST `/preguntas`: cuerpo existente `{request_id, mensaje}`. Persiste digest si hay cabecera. Antes de retornar una petición idempotente debe coincidir publicación y digest además del texto; conflicto ajeno → rechazo genérico sin contenido. Admisión conserva cuota, cola y1inferencia actual.
- GET `/preguntas/{request_id}`: fila vinculada solo con digest exacto; filasNULL solo mediante ruta compatible sin cabecera y guardas previas. Respuesta existente de estado, respuesta permitida y cupo. Otro ámbito →404 genérico, sin revelar existencia.
- Nuevo GET `/conversacion`: exige cabecera válida y Bearer; `limit`20 por defecto,1–50; cursor opcional opaco firmado y validado contra ámbito actual. Devuelve página reciente ordenada cronológicamente para presentación y cursor para anteriores. Cursor de otro ámbito o inválido → error genérico sin datos; sin identidad válida no enumera filasNULL.

Respuesta de historial: `items` con `request_id` servidor, `pregunta`, `respuesta` solo en succeeded, estado, mensaje público de error si procede y `accepted_at`; `next_cursor` nullable y `cupo` actual. Solo campos permitidos, no claves internas, digest, IDs académicos, excepciones o configuración de proveedor. Referencias purgadas se omiten sin regenerar; estados pendientes conservan su petición.

Consulta siempre filtrada por acceso, publicación, generación y digest. Capturar los valores y repetir guard_token tras historial/cuota; cambios durante lectura →404 sin cuerpo anterior. Leer no descuenta cupo, invoca IA o despacha trabajos. Ventana5/600s sigue por estudiante/evaluación sin incorporar conversación.

## Renderizado y privacidad

Pregunta como texto escapado. Respuesta con Markdown semántico restringido: párrafos, encabezados modestos, énfasis, listas, citas, código, tablas y matemáticas seguras. Sin HTML crudo, imágenes Markdown, iframes, SVG o destinos externos activos. URL no permitida queda como texto no navegable. No usar dangerouslySetInnerHTML; KaTeX sin trust y con límites vigentes.

Tratar énfasis habitual con espacios interiores solo fuera de código/matemáticas y con pares completos inequívocos; no quitar caracteres indiscriminadamente. No borrar advertencias ni inventar secciones. Iconos locales con texto accesible y sin llamadas a generación. El formato no es autorización académica ni una nueva respuesta de IA.

## Compatibilidad y cierre

Clientes antiguos siguen leyendo su resultado y sus propias peticiones legacy. No se reconstruye un historial sin identidad ni se comparte entre lectores. Nuevos clientes recuperan desde servidor solo después de establecer continuidad. Cambiar scope,404 o cierre cancela peticiones y limpia mensajes. Fallo de historial no impide leer la devolución vigente; ofrece reintentar sin volver a enviar preguntas.
