# Modelo de datos y transiciones propuestas

## Recibo de entrega en lote

Nueva entidad privada `feedback_delivery_batches`, por tanda de hasta 25 alumnos:

- `id`: UUID; `actor_id` y `evaluation_id`: referencias existentes.
- `request_id`: UUID del cliente, único por actor/evaluación.
- `request_fingerprint`: huella del alcance, orden normalizado, fuentes esperadas y decisiones exactas.
- `results_json`: resultado mínimo por calificación, etapas finales, identificadores de revisión y errores tipados; sin tokens, URLs, fotos ni mensajes completos.
- `created_at`, `completed_at` y estado final `completed|partial|failed`.

La inserción del recibo y cada resultado confirmado comparten la transacción de la tanda; una petición concurrente con el mismo identificador devuelve el mismo resultado tras terminar. Identificador reutilizado con otro contenido: conflicto. No persistir un estado running sin un mecanismo de recuperación.

## Acceso individual copiable

Ampliación aditiva de `feedback_accesses`:

- `credential_encrypted`: texto nullable, cifrado autenticado con contexto de propósito/formato versionado.
- Mantener `credential_digest`, `credential_generation`, `version`, `state`, vigencia y referencias actuales sin reinterpretarlos.
- Nuevas emisiones y renovaciones guardan digest y ciphertext del mismo token atómicamente. Valores heredados quedan null y continúan funcionando mediante su digest.
- La recuperación valida que el token tenga forma válida, generación y digest actuales; no usa una URL recibida del cliente como autoridad.
- Una rotación o pérdida de clave de cifrado requiere recuperación planificada; no intentar texto plano, no renovar accesos automáticamente y no cambiar las claves de IA para resolverlo.

## Entidades reutilizadas

`Calificacion`, entrega e historial conservan autoridad académica. `FeedbackDeliveryReview` conserva mensaje y alcance autorizados contra la fuente **posterior** al estado final académico. `FeedbackPublication` y `FeedbackAccess` se crean solo por la acción de enlace. Cuota, preguntas, imágenes y matrícula no cambian por aceptar, copiar o decorar.

## Transiciones por estudiante

1. Fuente vigente y propuesta disponible → aceptación explícita → confirmada → preflight → publicada → revisión de devolución sobre fuente final.
2. Confirmada/ajustada → conservar valor → preflight → publicada → revisión de devolución sobre fuente final.
3. Ya publicada y devolución vigente → no-op académico; reutilizar revisión válida. Una modificación explícita del mensaje sí crea revisión nueva y suspende accesos anteriores según contrato actual.
4. Fallo en cualquier paso del alumno → rollback de su savepoint; mantener estado e historial anteriores. Otros alumnos pueden terminar y el recibo informa el resultado parcial.
5. Crear enlace o reemplazar explícitamente → credencial cifrada/digest vigentes. Copiar → lectura privada sin nueva credencial, duración o cuota.

No se introduce un estado que declare una revisión dual completa por aprobar un resumen.

## Motivos de impresión

Manifiesto estático con 20 identificadores, nombre español, ruta local del PNG y dimensiones; sin datos de estudiante. Preferencia de motivo y mezcla en estado de la impresión de esa sesión; no hace falta una tabla de preferencias. Asignación estable por identidad de calificación y semilla de selección, sin usar la nota. La opción `none` no descarga imágenes.

## Migración y recuperación

Upgrade aditivo sin backfill académico ni reconstrucción de tokens. Probar con filas heredadas y activas en base sintética. Rollback de aplicación conserva columnas/recibos; no eliminar automáticamente auditoría o ciphertext. Un downgrade destructivo solo se prueba en esquema aislado y nunca se usa como respuesta automática a un fallo de despliegue.
