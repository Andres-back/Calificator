# Modelo de datos

## PasswordResetRequest (`password_reset_requests`)

- `id UUID` PK, selector aleatorio del enlace.
- `user_id UUID` FK `users.id` con borrado en cascada.
- `token_hash CHAR(64)` único; nunca se guarda el token completo.
- `expires_at`, `consumed_at`, `invalidated_at`, `created_at`, `updated_at`.
- `delivery_status`: `pending|sending|sent|failed`.
- `delivery_attempts`, `last_delivery_error_code`, `sent_at`.
- `request_fingerprint_hash`: hash opcional para límites y auditoría sin IP cruda.

Transiciones: `pending → sending → sent|failed`; cualquier estado no consumido puede pasar a `invalidated`; solo `sent` o `pending` vigente puede consumirse una vez. Una nueva solicitud invalida todas las anteriores de la cuenta dentro de la misma transacción.

## MailGlobalConfig (`mail_global_config`)

Fila singleton con `id`, `host`, `port`, `use_starttls`, `username`, `from_email`, `password_encrypted`, `has_password` derivado, `last_test_status`, `last_test_latency_ms`, `last_test_error_code`, `last_test_at`, `updated_by`, `created_at`, `updated_at`.

La contraseña solo se acepta en escrituras, se cifra antes de persistir y nunca forma parte de una respuesta.

## User

Se añade `auth_version INTEGER NOT NULL DEFAULT 1`. Access y refresh JWT incluyen `ver`. Tokens sin `ver` se interpretan como versión 1 durante la transición. Restablecer contraseña incrementa `auth_version` de forma atómica.

## Concurrencia e índices

- Índice por `user_id, created_at` para invalidación y diagnóstico.
- Índice por `expires_at` para limpieza.
- Bloqueo `SELECT … FOR UPDATE` al consumir y al reemplazar solicitudes.
- `token_hash` único y un solo registro vigente por cuenta mediante invalidación transaccional.