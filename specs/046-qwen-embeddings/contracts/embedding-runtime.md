# Contrato interno de embeddings

## Solicitud al proveedor institucional

- Modelo: identificador administrado del catálogo.
- Entrada: lista no vacía de textos.
- Sin transmisión de credenciales ni URL aportada por usuarios.

## Resultado interno

- `vectors`: un vector por texto y en el mismo orden.
- `provider`: proveedor efectivo.
- `model`: modelo efectivo.
- `dimensions`: longitud validada de todos los vectores.
- `space_version`: versión estable del preprocesamiento.

Se rechaza el resultado si cambia el número de vectores, alguna dimensión no es 1024 o hay valores no finitos.

## Compatibilidad pública

No se agregan ni cambian endpoints públicos. El panel administrativo existente consume el catálogo y la ruta ya publicados.
