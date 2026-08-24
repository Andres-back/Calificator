# Contrato del extractor visual

## Entrada

`extract(file_bytes, mime_type, blueprint, purpose, tracking)`

- `purpose`: `student_response` o `evaluation_document`.
- `blueprint`: preguntas, modalidades, respuestas esperadas, criterios y nota máxima.
- `tracking`: IDs técnicos; nunca contenido personal.

## Salida

Objeto validado `VisionExtraction`. El adaptador legacy puede derivar:

- `texto_extraido`
- `preguntas_detectadas`
- `respuestas_detectadas`
- `usable`
- `alertas`

## Errores

- `vision_invalid_file`: definitivo, sin retry.
- `vision_invalid_schema`: una reparación; luego definitivo/revisión.
- `vision_rate_limited`, `vision_provider_5xx`, `vision_timeout`: un retry y fallback opcional.
- `vision_partial_failure`: conserva páginas exitosas y requiere revisión.

## Compatibilidad

Los endpoints multipart no cambian. El JSON se almacena de forma aditiva dentro de los campos existentes y el frontend conserva sus contratos.
