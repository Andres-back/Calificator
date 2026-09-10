# Contratos del centro de control IA

Todos los endpoints `/admin/*` requieren autenticación y permiso `admin_ai.manage`. Ninguna respuesta contiene secretos.

## `GET /admin/ai-control-center`

Retorna `version`, resumen, funciones con etapas, herramientas, proveedores sanitizados y diagnóstico de despliegue de solo lectura. Cada etapa incluye:

```json
{
  "function_id": "calificacion",
  "stage_id": "extraction",
  "label": "Extracción visual",
  "condition": "Solo foto o PDF escaneado",
  "capability": "vision",
  "editable": true,
  "consumer": "grading.vision_extractor",
  "configured": {"provider": "open_code", "model": "...", "inherits_from": null},
  "effective": {"provider": "open_code", "model": "...", "origin": "institutional", "config_version": 12},
  "observed": {"provider": "open_code", "model": "...", "at": "...", "status": "success"}
}
```

Etapas deterministas retornan `editable=false`, `configured=null` y explicación; no selectores vacíos.

## `GET /admin/ai-control-center/usage`

Query: `from`, `to`, `function_id`, `stage_id`, `provider`, `model`, `status`, `page`, `page_size`. Rango máximo 90 días y paginación acotada.

Retorna muestras, éxito/fallo, p50/p95 conocidos, última observación, llamadas con fallback y series agregadas. Cola, ejecución y revisión humana son campos distintos y anulables. Un valor desconocido es `null`, nunca `0`.

## `GET /admin/ai-control-center/effective`

Query: `function_id`, `stage_id`, `tool_id?`, `teacher_id?`. Ejecuta el resolver sin llamar a proveedor. Para `teacher_id`, valida que sea docente visible al administrador. Devuelve origen y presencia de credencial, nunca la credencial.

## `POST /admin/ai-control-center/validate`

Recibe el borrador completo con `expected_version`. Verifica identificadores, consumidores, capacidades, proveedor activo, credencial presente, respaldo, herencias, herramientas y dependencias. No llama a IA ni escribe. Devuelve `valid`, errores por ruta, advertencias y diff/impacto.

## `PUT /admin/ai-control-center/publish`

Recibe el mismo borrador validable y un `reason` opcional. Publica de forma atómica y devuelve nueva versión, hash y resumen de cambios.

- `409 config_version_conflict`: ningún cambio; incluye versión actual.
- `422 invalid_ai_configuration`: ningún cambio; errores por campo/dependencia.
- `403`: sin permiso.

Los trabajos ya aceptados no cambian. El contrato vigente `/admin/ai-settings/publish` permanece durante transición y delega al mismo servicio.

## `GET /herramientas/catalogo`

Requiere sesión y permiso de lectura de recursos. Devuelve herramientas canónicas y disponibilidad. El docente sin `resources.create` puede leer materiales pero no obtiene acción de generación.

```json
{
  "tool_id": "unir_columnas",
  "label": "Relacionar pares",
  "aliases": ["emparejar"],
  "generation_enabled": true,
  "unavailable_reason": null,
  "uses_ai": true
}
```

## Generación pausada

Los POST existentes mantienen URL y cuerpo. Si la herramienta canónica está pausada retornan `409`:

```json
{"detail":{"code":"tool_generation_paused","message":"Esta herramienta no admite nuevas generaciones por el momento."}}
```

No se expone el motivo administrativo sensible al docente. Lectura, descarga, edición/asignación de materiales previos y jobs ya aceptados continúan.

## Reglas comunes

- `provider` y `model` son identificadores exactos, no nombres inferidos.
- Probar conexión es una acción aparte, explícita y potencialmente consumible; validar no consume.
- `teacher_override_allowed` es el nombre contractual del permiso de preferencia docente; se adapta a `rollout_enabled` mientras exista esa columna.
- Cada respuesta editable incluye `config_version`; cada evento observado incluye versión/hash cuando fue registrado.
