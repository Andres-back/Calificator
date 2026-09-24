# Modelo de datos

## `legal_acceptances`

Constancia inmutable creada durante una alta pública válida.

| Campo | Regla |
|---|---|
| `id` | UUID generado por servidor |
| `user_id` | FK a `users`; eliminación en cascada con la cuenta |
| `document_type` | `terms_of_use` o `privacy_policy` |
| `document_version` | versión vigente resuelta por servidor |
| `source` | inicialmente `public_registration` |
| `accepted_at` | fecha del servidor |

Restricción única: `(user_id, document_type, document_version)`.

## Transacción

1. Validar ambas aceptaciones.
2. Crear usuario como estudiante mediante flujo existente.
3. Crear dos constancias con versiones vigentes.
4. Confirmar todo junto.
5. Ante cualquier error, no queda usuario ni aceptación parcial.

No hay backfill. Las cuentas existentes conservan exactamente su estado actual.
