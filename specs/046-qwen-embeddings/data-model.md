# Modelo de datos

## RagSource

Se conserva sin cambios. `contenido_original` es la fuente recuperable para reindexación.

## RagChunk

Campos existentes conservados: fuente, profesor, materia, tipo, texto, metadatos y fechas.

Campos de espacio semántico:

- `embedding_vec`: vector activo de 1024 dimensiones.
- `embedding_provider`: proveedor que generó el vector.
- `embedding_model`: modelo exacto.
- `embedding_dimensions`: debe ser 1024 cuando existe vector.
- `embedding_version`: versión del contrato de preparación e instrucciones.

Reglas:

- Vector y metadatos se escriben juntos.
- Una consulta solo compara contra fragmentos cuyo espacio coincide exactamente.
- Reindexar reemplaza los derivados, no la fuente ni el texto.
- El arreglo histórico se conserva temporalmente para reversión, pero deja de ser la fuente de búsqueda.

## Ruta administrativa

El proveedor `ollama_internal` representa el servicio institucional privado. No acepta credenciales docentes ni direcciones arbitrarias. El modelo canónico es `qwen3-embedding:0.6b` con capacidad `embedding`.
