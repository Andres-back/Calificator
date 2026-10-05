# Investigación del hotfix

## Evidencia

- Producción `64fcf55`: prueba demo 2026-10-05, 59.253 s hasta nota visible, 54.881 s en worker.
- Extracción 6.161 s; principal 6.598 s; verificación 7.277 s; sin arbitraje ni respaldo.
- `rag_chunks` no tiene filas. Aun así `search_chunks` intenta el embedding antes de consultar la base.
- Proveedor efectivo `ollama_internal`, `qwen3-embedding:0.6b`, 1024 dimensiones y timeout 30 s; el resultado registró `EmbeddingUnavailableError` tras esa espera. Servicio y modelo disponibles al inspeccionar; esto no prueba que inferencias largas sean rápidas.

## Decisiones

- **Decisión**: comprobación `EXISTS` con el mismo JOIN y filtros de autorización antes de generar el vector.
- **Razón**: si no hay fragmentos vectorizados accesibles, ningún vector de consulta puede producir resultados. Eliminar trabajo inútil conserva el resultado académico.
- **Alternativas rechazadas**: acortar timeout de LLM, desactivar RAG globalmente, cambiar modelo/dimensiones sin reindexar, cachear ausencia o consultar fuentes de otros docentes.
- **Revisión de investigación**: se verificó con un agente de investigación la necesidad de comprobar ambos propietarios (fuente y fragmento), excepción DBA global, exclusiones, vector no nulo y manejo de errores; no se delegó aprobación ni implementación.
- **Concurrencia**: una inserción posterior a una respuesta negativa aparecerá en la próxima consulta. No se retiene caché negativa.
- **Compatibilidad**: el preflight no filtra espacio antes de resolver el proveedor. La consulta final conserva los cuatro filtros exactos; no promete evitar todos los fallos futuros del proveedor cuando hay material.
