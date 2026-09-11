# Modelo de datos de 034

## Entidades persistidas

### `ai_tool_settings` — nueva

Una fila por herramienta canónica.

- `tool_id varchar(60)` PK, validado contra el registro de herramientas.
- `generation_enabled boolean not null default true`.
- `pause_reason varchar(300) null`; obligatorio al pausar, vacío al reactivar.
- `config_version integer not null`.
- `updated_by uuid null`, FK lógica a usuario administrador.
- `updated_at timestamptz not null default now()`.

No contiene permisos, visibilidad de recursos, rutas de archivos ni claves. `emparejar` no obtiene fila propia: resuelve al canónico `unir_columnas`.

### `ai_feature_routing` — existente, ampliación lógica

No requiere columnas nuevas. Se incorporan identificadores jerárquicos de máximo 60 caracteres:

- etapas: `calificacion.extraccion`, `calificacion.valoracion`, etc.;
- herramientas: `herramienta.cuento`, `herramienta.guia`, etc., solo para excepciones;
- compatibilidad: claves actuales permanecen como padres/alias durante la transición.

`rollout_enabled` se mantiene físicamente y se interpreta en la interfaz como `teacher_override_allowed`. `active` significa que la ruta puede resolverse; no significa que una herramienta esté disponible.

### `ai_configuration_versions` — existente

El JSON `snapshot` añade `tools` y versión de esquema. Una restauración crea una publicación nueva con el snapshot anterior validado; no reduce el contador.

### `ai_usage_events` — existente

Fuente observada por llamada. Se normalizan `feature`, `stage`, `provider`, `model`, `status`, `latency_ms`, `routing_origin`, `config_version`, `fallback_used`. Se prevé índice compuesto `(created_at, feature, stage)` si `EXPLAIN` demuestra que el índice por fecha no basta. No se almacenan prompts/respuestas.

## Proyecciones no persistidas

### FunctionCapability

Función con etapas ordenadas, tipo, consumidor, condición y editabilidad. Proviene del registro de código.

### EffectiveRoute

- `configured`: proveedor/modelo/respaldo guardados o herencia.
- `effective`: proveedor/modelo resueltos, origen, versión y permiso de preferencia docente.
- `observed`: última combinación registrada, fecha y causa de divergencia si consta.

No contiene API keys. Para un docente personal solo indica proveedor/modelo/origen y estado de credencial (`configured`, `missing`, `unavailable`).

### ToolControl

Herramienta canónica, alias, descripción, categoría, `generation_enabled`, motivo, ruta heredada/propia, etapas deterministas e IA, trabajos activos agregados y fecha de cambio. Los materiales existentes no dependen de este estado.

### AIConfigurationDraft

`expected_version`, proveedores, modelos, rutas y herramientas. Mantiene valores originales para mostrar el antes/después. Nunca se persiste parcialmente.

## Transiciones

### Publicación

`borrador local → validado → confirmación → publicado(version n+1)`.

- Validación fallida: conserva borrador, cero escrituras.
- Conflicto de versión: HTTP 409, conserva borrador y ofrece comparar/refrescar.
- Error transaccional: rollback completo; caché anterior continúa.
- Éxito: commit, auditoría, invalidación de caché y recarga efectiva.

### Herramienta

`activa → pausada(motivo)` impide nuevas admisiones; jobs aceptados y recursos previos continúan. `pausada → activa` permite nuevas solicitudes, sin cambiar permisos ni publicar materiales.

### Job

Al admitirse fija `config_version` y mapa de rutas por etapa. Cola, ejecución y reintento conservan ese mapa. Una publicación posterior no lo reemplaza.

## Migración y compatibilidad

1. Crear tabla e insertar todas las herramientas canónicas activas.
2. Crear rutas de etapa a partir de la selección efectiva vigente de sus rutas padre y variables actuales; no cambiar proveedor/modelo efectivo.
3. No crear excepciones por herramienta inicialmente: todas heredan `herramientas_educativas`, salvo consumidores de imagen ya configurados.
4. Mantener alias de API y lectura de snapshots anteriores; un snapshot sin etapa se interpreta con su ruta amplia guardada, no con la configuración actual.
5. Downgrade bloqueado operacionalmente si hay herramientas pausadas o rutas específicas materiales; documentar exportación antes de retirar tabla.
