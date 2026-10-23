# Contrato interno

- Presupuesto entero finito según etapa y componentes; mínimo de etapa y techo institucional. Un override explícito no puede saltar el techo.
- Responses incompleto por `max_output_tokens`, Chat Completions por `length` y Messages por `max_tokens`: error seguro `output_budget_exhausted`; nunca retorno exitoso con contenido parcial.
- Otras terminaciones incompletas: `output_incomplete`. Rechazos conservan clasificación propia.
- Diagnóstico: códigos constantes y contadores saneados; no copiar detalles arbitrarios del proveedor.
- No modifica contrato HTTP de recalificar ni añade reintentos.
