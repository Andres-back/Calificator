# Modelo de datos administrativo

## Entidades existentes preservadas

- `responses`: id, fecha, payload_hash, receipt_hash y receipt_json. Ningún UPDATE/DELETE por el CRUD.
- `response_reviews`: organización existente, independiente de correcciones/papelera.
- `admin_sessions`: autenticación vigente, sin cambios de credenciales.

## Nueva tabla: response_admin_events

- `response_id`: FK obligatoria a responses, sin eliminación en cascada por el CRUD.
- `revision`: entero positivo; único junto con response_id.
- `request_id`: UUID canónico único por base.
- `command_hash`: SHA-256 de la representación canónica del comando completo, para detectar reutilización distinta.
- `action`: correct, remove o restore.
- `actor`: cuenta administrativa autenticada; no afirma identidad personal si la cuenta es compartida.
- `created_at`: fecha UTC del servidor.
- `reason`: texto requerido, máximo 1000 caracteres, privado.
- `changes_json`: diferencias canónicas antes/después de cada campo permitido, o transición de estado.

Migración aditiva `CREATE TABLE/INDEX IF NOT EXISTS` con FK activas y restricciones. No modifica filas anteriores. Estado inicial para respuestas existentes: revisión 0, activa, valores originales, historial vacío.

## Proyección

Reproducir eventos en orden de revisión para obtener identificación/preguntas efectivas y estado de conservación. No trasladar el resultado sobre `receipt_json`. Consultar estados en lote para listas/informes; historia detallada solo al abrir un registro.

`correct`: activa → activa, al menos un cambio permitido y validado.
`remove`: activa → papelera, confirmación del código exacto.
`restore`: papelera → activa.

Todas las transiciones requieren motivo, sesión, CSRF y revisión esperada. No se corrige un registro retirado. Una transición inválida o comando sin cambios no agrega eventos.

## Datos que nunca se corrigen

Firma, consentimiento, identificación del envío, versión, fecha de recepción, métricas del navegador y bloques históricos `times`/`measurement`. Cambiar el nombre efectivo no altera el nombre original de la firma ni su descarga.

## Concurrencia

Dentro de `BEGIN IMMEDIATE`: resolver request_id; si coincide huella y registro, devolver revisión ya guardada; si difiere, conflicto. Para comandos nuevos comprobar expected_revision, validar transición/campos y anexar evento. Un fallo revierte toda la transacción.

## Recuentos

Por versión: recibidas = todas las originales; activas = no retiradas; retiradas = diferencia. Docentes declarados e indicadores del informe principal usan solo originales activos. Una versión sin activas permanece visible con recibidas/retiradas y ceros de análisis. Un registro restaurado no suma una recepción nueva.
