# Contrato del CRUD administrativo

Rutas relativas al instrumento (`/encuesta-docente` o `/retroalimentacion-piloto`). Todo `/admin/*` exige autenticación existente. No hay acceso cruzado entre bases. Respuestas privadas sin caché.

## GET /admin/manage/{id}

Devuelve id, revision, deleted, editable y explicación si no editable; datos originales, datos efectivos y eventos con cuenta, fecha, motivo y diferencias. No convierte la corrección en constancia firmada. 404 si el id no pertenece al instrumento.

## POST /admin/manage/{id}

`Content-Type: application/json`, origen válido y `X-Survey-CSRF`. Cuerpo máximo 64 KiB; claves desconocidas rechazadas.

- Común: `action`, `expected_revision` entero >= 0, `request_id` UUID, `reason` requerido 1–1000 caracteres tras quitar espacios.
- `correct`: `patch` con `identity` parcial (name/email/phone) y/o `answers` parcial, al menos un cambio. No sustituir preguntas ausentes por vacías. `null`/vacío solo donde el esquema original lo admita. Validar el resultado completo, incluidas dependencias.
- `remove`: `confirm_id` idéntico al id. No patch.
- `restore`: sin patch ni confirm_id.

200 con id/revisión/acción confirmados. Reintento idéntico conserva el resultado de esa revisión, no inventa un guardado posterior. 400 formato/valor/transición inválidos, 401 sin sesión, 403 CSRF/origen, 404 id desconocido, 409 revisión obsoleta o request_id reutilizado con otro contenido, 413 tamaño, 415 tipo, 503 error de persistencia. El cliente conserva datos y comando incierto para reintento; ante 409 ofrece consultar cambios, sin sobrescribir.

## Lecturas existentes

- `/admin/receipt/{id}`: original sin cambios, incluso retirado, con autorización.
- `/admin/records`: incluir revision/deleted/corrected y valores efectivos para organizar la lista. El usuario elige activas o papelera; no confundir con review.status.
- `/admin/summary[.csv]`: datos de originales activos e información adicional de recibidas/activas/retiradas por versión. Mantener campos existentes; aclarar la fuente original.
- `/admin/export.csv`: originales activos, formato conservado y rótulo explícito.
- `/admin/corrections.csv`: vista efectiva de preguntas de registros activos, con código/versión/revisión/campo/etiqueta/valor y origen «original» o «corrección administrativa». Sin nombres/contactos, firma, notas privadas ni motivos; escapar fórmulas y usar contexto original para decodificar opciones. No publicar como declaración original.
- `/admin/review/{id}`: organización existente independiente, sin reescribir original ni eventos.

## UI

«Registrar respuesta» abre el formulario del mismo instrumento; el docente completa consentimiento y firma. Lista con «Ver», «Corregir» y «Eliminar de la lista». Papelera con «Restaurar». Editor indica «Corrección administrativa: la constancia firmada no cambia», motivo obligatorio y diferencias visibles antes de guardar. Original/efectivo/historial identificados. Confirmación de retirada explica exclusión de informes y conservación del original.
