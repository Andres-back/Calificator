# Modelo de datos

No hay entidades nuevas ni cambios de esquema. Se lee `ai_provider_settings`/`ai_provider_models` existentes. `AIProviderTestResponse` conserva `status`, `latency_ms`, `http_code`, `error`, `detail`. El resultado es transitorio en la tarjeta y no cambia configuración efectiva o datos educativos.
