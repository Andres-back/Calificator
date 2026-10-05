# Contrato de recuperación

`search_chunks` conserva firma y retorno `list[dict]`. Sin candidatos autorizados devuelve `[]` sin embedding. Con candidatos, resuelve el vector y mantiene proveedor/modelo/dimensión/versión y procedencia. Fallos de consulta continúan como `EmbeddingUnavailableError`; no se confunden con corpus vacío. No cambian APIs públicas ni estados de jobs.
