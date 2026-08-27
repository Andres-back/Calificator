# Contratos HTTP

## Registro público

`POST /api/auth/register`

```json
{"nombre":"Nombre Apellido","email":"persona@ejemplo.com","password":"mínimo 8 caracteres","solicitar_docente":true}
```

El contrato prohíbe campos extra. La respuesta devuelve rol efectivo `estudiante` y solicitud `pendiente` cuando corresponde.

## Listado administrativo

`GET /api/admin/users?q=&rol=&estado=&solicitud_docente_estado=&limit=25&offset=0`

Solo administrador. Devuelve usuarios con rol efectivo y metadatos de solicitud.

## Decisión docente

`PATCH /api/admin/users/{user_id}/solicitud-docente`

```json
{"decision":"aprobar","motivo":"Identidad docente validada"}
```

Decisiones: `aprobar | rechazar`. Respuestas: `403` sin rol administrador, `404` sin solicitud y `409` para transición contradictoria o protección administrativa.

## Gestión de usuario

`PATCH /api/admin/users/{user_id}` mantiene `rol` y `estado`, protegiendo último administrador y autoedición sensible.

## Mapa conceptual

`POST /api/herramientas/mapa-conceptual` conserva el request. La respuesta mantiene `titulo`, `concepto_principal`, `descripcion`, `nodos` y `relaciones` con campos opcionales documentados.