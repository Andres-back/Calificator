# Modelo de datos: configuración de IA global y por docente

## `ai_provider_settings` (existente, ampliada)

- `id`: identificador estable del proveedor.
- `tipo`, `label`, `base_url`, `active`, `priority`, `timeout_seconds`, `max_retries`: existentes.
- `allow_teacher_credentials`: permite usar claves personales para ese proveedor.
- `allow_institutional_fallback`: permite que rutas personales fallen hacia credenciales globales con consentimiento.
- `config_version`: entero creciente para concurrencia optimista.

Reglas: solo admin modifica; `base_url` nunca se acepta desde endpoints docentes; un proveedor desactivado no atiende trabajos nuevos.

## `ai_provider_models` (nueva)

- `id`: UUID.
- `provider_id`: relación con proveedor.
- `model_id`: identificador enviado al proveedor.
- `label`: nombre legible.
- `capabilities`: conjunto de `text`, `vision`, `image`, `embedding`.
- `active`, `recommended`: estado y sugerencia.
- `max_context_tokens`: dato informativo opcional.
- `config_version`, `updated_by`, `updated_at`.

Unicidad: `(provider_id, model_id)`. Solo puede seleccionarse un modelo activo que incluya la capacidad requerida.

## `ai_feature_routing` (existente, ampliada)

- `feature`, `label`, `primary_provider`, `fallback_provider`, `active`: existentes.
- `capability`: capacidad requerida.
- `primary_model`, `fallback_model`: modelos concretos.
- `rollout_enabled`: usa el nuevo resolvedor para trabajos nuevos.
- `config_version`, `updated_by`, `updated_at`.

Validación: proveedor/modelo principal obligatorios cuando está activa; fallback completo o ausente; fallback distinto del principal; compatibilidad por catálogo.

## `profesor_ai_configs` (existente, reutilizada)

- `profesor_id`: único y propietario.
- `mode`: `institutional`, `automatic`, `advanced`.
- `allow_institutional_fallback`: consentimiento explícito.
- `active`: interruptor personal.
- `config_version`, `created_at`, `updated_at`.

Las columnas heredadas se leen durante la transición, se migran a las nuevas entidades y se retiran cuando el adaptador ya no tenga consumidores.

## `profesor_ai_credentials` (nueva)

- `id`: UUID.
- `profesor_id`, `provider_id`: propietario y proveedor.
- `secret_encrypted`: secreto cifrado.
- `active`.
- `last_test_status`, `last_test_latency_ms`, `last_test_http_code`, `last_test_error_code`, `last_test_at`.
- `created_at`, `updated_at`.

Unicidad: `(profesor_id, provider_id)`. La API solo expone `configured: true/false` y metadatos sanitizados. Borrar una credencial elimina el secreto, no la auditoría.

## `profesor_ai_feature_preferences` (nueva)

- `id`: UUID.
- `profesor_id`, `feature`.
- `provider_id`, `model_id`.
- `active`, `config_version`, `created_at`, `updated_at`.

Unicidad: `(profesor_id, feature)`. Solo se usa en modo avanzado; en automático el resolvedor selecciona el modelo recomendado compatible del proveedor personal.

## Instantánea efectiva del trabajo (JSON sanitizado existente)

Se guarda bajo `ai_jobs.input_json._ai_config`:

- `schema_version`, `config_hash`, `feature`, `capability`.
- `primary`: `provider`, `model`, `credential_source` (`teacher`, `institutional`, `none`).
- `fallback`: selección opcional y razón de autorización.
- `teacher_config_version`, `global_config_version`.
- `captured_at`.

Nunca contiene claves, tokens, base URLs privadas ni contenido de evidencia.

## Configuración de Ollama Cloud

La configuración institucional reutiliza el proveedor global, su credencial cifrada y el catálogo de modelos. La configuración personal reutiliza la credencial cifrada del docente. Ambas distinguen el origen institutional_cloud o teacher_cloud, y la consulta de modelos se realiza con la conexión efectiva.

## Conector local del docente

- Identidad del conector, propietario, nombre visible, estado, versión y última conexión.
- Credencial de emparejamiento almacenada de forma no reversible y revocable.
- Catálogo de modelos locales anunciado por el conector, capacidades conocidas y fecha de actualización.
- Trabajos locales con identificador idempotente, docente propietario, modelo, estado, vencimiento y resultado sanitizado.
- Código de emparejamiento temporal, de un solo uso y sin secretos persistentes en texto claro.

El conector inicia la comunicación con el servidor, solo acepta trabajos de su propietario y nunca recibe claves de proveedores Cloud.

## Transiciones

1. Configuración global: borrador → validada → publicada; una publicación inválida no modifica filas.
2. Credencial docente: no configurada → configurada/no probada → disponible o error → sustituida/eliminada.
3. Preferencia: institucional → automática → avanzada; volver a institucional conserva auditoría y desactiva preferencias.
4. Trabajo: captura instantánea → en cola → ejecuta exactamente esa selección; si la credencial falta, aplica el fallback capturado o falla de forma reintentable.
5. Conector: no vinculado → código emitido → emparejado/desconectado → conectado → revocado.
6. Trabajo local: en espera de conector → entregado → ejecutando → completado o error/reintento; una repetición conserva el mismo resultado lógico.
