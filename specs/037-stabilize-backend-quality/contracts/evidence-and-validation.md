# Contratos preservados

## Evidencia completa de una entrega

`GET /api/calificaciones/entregas/{entrega_id}/evidencia`

- Requiere sesión y permiso existente según propiedad de la entrega.
- Éxito: transmite el archivo completo con su tipo detectado, disposición `inline`, `Cache-Control: private, no-store` y `X-Content-Type-Options: nosniff`.
- Entrega inexistente: 404.
- Entrega sin archivo, referencia inválida o archivo ausente: 404 sin rutas internas.
- Acceso no autorizado: conserva la respuesta definida por las guardas actuales.

## Página renderizada de evidencia

`GET /api/calificaciones/entregas/{entrega_id}/evidencia/paginas/{numero}`

- Permanece independiente del contrato del documento completo.
- Conserva la respuesta PNG y sus encabezados de página.

## Validación de estructura

La operación pública existente que delega en `validate_structure` conserva su ruta y payload.

- Evaluación en borrador: mantiene validación y persistencia actuales.
- Evaluación fuera de borrador: 409 con mensaje estable de estructura bloqueada.
- Nunca convierte este caso de negocio en 500.
