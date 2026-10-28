# Datos existentes

Sin migración. `importacion_estudiantes_lotes.resultado_json` admite `codigo` cerrado y `mensaje` fijo. Estados continúan `procesando → revision | error`; confirmación crea cuentas bajo idempotencia/autorización existentes.

El snapshot conserva principal/respaldo, conexión, perfil y referencias de credencial sin secretos. Se resuelven claves solo en memoria. No actualizar snapshots admitidos ni `users`, `matriculas`, notas o evidencias.
