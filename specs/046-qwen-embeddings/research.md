# Investigación y decisiones

## Modelo

**Decisión**: `qwen3-embedding:0.6b`.

**Razón**: soporta más de 100 idiomas, contexto amplio y salida nativa de 1024 dimensiones; su tamaño es adecuado para el VPS sin GPU.

**Alternativas**: 4B/8B ofrecen mayor calidad pero elevan memoria y latencia; Nomic y EmbeddingGemma son viables, pero Qwen satisface la preferencia del usuario y el escenario multilingüe.

## Proveedor

**Decisión**: servicio Ollama institucional en la red Docker privada, distinto de Ollama Cloud y del conector local del profesor.

**Razón**: la cuenta de Ollama Cloud de producción no ofrece modelos con capacidad embedding. El servicio institucional no requiere distribuir credenciales y puede limitar recursos.

## Espacio vectorial

**Decisión**: un espacio activo de 1024 dimensiones identificado por proveedor, modelo y versión.

**Razón**: compartir dimensión no vuelve compatibles dos modelos. La búsqueda filtra por metadatos exactos y un cambio de modelo exige reindexar.

## Compatibilidad

**Decisión**: conservar las fuentes y fragmentos textuales; invalidar únicamente vectores derivados antiguos durante la migración.

**Razón**: producción tiene cero fragmentos indexados y los textos son la fuente recuperable. No se mezclan vectores de 1536 y 1024.

## Fallos

**Decisión**: si embeddings no están disponibles, RAG devuelve estado no disponible y la calificación continúa sin contexto adicional.

**Razón**: un fallback automático entre modelos semánticamente incompatibles podría recuperar material incorrecto. OpenAI se mantiene como cambio administrado seguido de reindexación.
