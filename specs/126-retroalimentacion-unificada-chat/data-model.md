# Modelo de datos126

## Autoridades existentes, sin reemplazo

- `Calificacion`: nota, estado y análisis/historial original; no muta por recuperar o presentar chat.
- `FeedbackDeliveryReview`: texto entregable autorizado, alcance resumen/detalle, huella de fuente y autor. El espacio común consume esta proyección y las acciones existentes; no crea otra columna de mensaje público.
- `FeedbackPublication` / `FeedbackAccess`: snapshot autorizado, evidencia permitida, estado, vigencia y generación. Una revisión incompatible conserva la suspensión/invalidez actuales.
- `FeedbackChatQuota`: estudiante/evaluación; sin campo conversación ni reinicio al recuperar.

## Extensión aditiva de FeedbackChatRequest

Nuevo campo nullable `conversation_digest`, longitud64 hexadecimal. Derivado mediante HMAC con separación de dominio y clave gestionada existente, incluyendo acceso/publicación/generación+UUID del navegador. Nunca guardar el UUID bruto o la credencial. El digest es un dato sensible de correlación, no una credencial ni un dato público.

Índice compuesto de lectura: acceso, publicación, generación, digest, accepted_at e id. La unicidad idempotente acceso/generación/client_request_id permanece; antes de devolver una fila repetida se exige también publicación y digest coincidentes. Conflicto entre ámbitos devuelve error genérico sin texto ni estado de la fila ajena.

FilasNULL son legacy: no backfill; no se muestran en historial. Poll sin cabecera solo accede a filasNULL bajo todas las guardas previas. Poll con cabecera solo accede a su digest exacto, nunca interpretaNULL como comodín. La migración se añade desde el head vigente al implementar y se prueba con datos previos; rollback de aplicación conserva columna/índice, no borra mensajes ni altera datos académicos.

## Metadatos de navegador

GET autorizado devuelve `conversation_scope`: cadena opaca derivada con propósito distinto del digest y de las credenciales, ligada a acceso/publicación/generación. No autoriza lecturas por sí misma. Scope+UUID aleatorio de continuidad y versión1 son lo único permitido en almacenamiento local. Ningún token, nombre, request_id, texto o nota se guarda allí. Ante dato corrupto/bloqueado se usa identidad temporal en memoria y aviso comprensible; no se adopta otro historial.

La identidad local no se envía al proveedor de IA ni a analítica. El navegador compartido comparte continuidad si también posee el enlace; se informa la limitación. No hay identidad familiar verificada ni sincronización entre dispositivos.

## Estados y recuperación

Se conservan queued → running → succeeded/failed/closed. Historial permite reconciliar estados por id servidor; no crea preguntas ni cambia estados. queued/running recuperados se consultan con el poll vigente; succeeded muestra respuesta y failed/closed solo mensaje público seguro. Una página que pierde autorización limpia memoria y cancela peticiones. Los textos ya purgados no reaparecen ni se reconstruyen.

Revalidar acceso/publicación/generación tras consultar mensajes y cupo. Paginación estable por accepted_at,id; cursor opaco firmado por ámbito. Conservar únicamente metadatos de paginación en memoria. Recarga inicia por la página reciente y ofrece cargar anteriores, sin recortar permanentemente a diez.

## Estado docente de interfaz

Modo individual/grupo, selección explícita, alumno enfocado, texto en edición, huella inicial y estado de guardado. Cambiar contexto protege dirty state y aborta la consulta anterior. Guardado devuelve revisión y refresca proyección/lista/detalle; un conflicto requiere recargar/revisar, no sobrescribe automáticamente. El mismo editor se integra tanto en la pestaña como en el listado.
