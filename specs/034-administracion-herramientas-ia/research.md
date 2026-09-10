# Investigación y decisiones de 034

Evidencia local sobre `main` 52a572a, 2026-09-10. No se hicieron escrituras en producción ni llamadas pagadas a proveedores.

| Evidencia actual | Riesgo | Decisión |
|---|---|---|
| `AdminAIConfigPage` muestra credenciales, proveedores, rutas, consistencia, uso y auditoría en una sola página larga | El administrador no parte de la función que quiere corregir | Centro con resumen y vistas Funciones, Herramientas, Proveedores, Uso y Auditoría |
| `FeatureRouting` solo representa una ruta primaria/respaldo por función amplia | Calificación y presentaciones ocultan llamadas internas | Registro de etapas reales y rutas editables por etapa |
| `rollout_enabled` es consultado por `resolve_ai_configuration` para permitir preferencias docentes | La etiqueta actual puede hacer creer que activa trabajos futuros | Exponerlo como autorización de configuración personal; publicar ya define trabajos futuros |
| `_feature_candidates` ya admite rutas específicas por herramienta antes de `herramientas_educativas` | Se puede especializar sin otro router | Persistir `herramienta.<tipo>` solo cuando exista excepción |
| Los generadores crean `LLMRouter(user_id=...)` sin guardia de disponibilidad | Ocultar una tarjeta no impediría POST directo | Estado separado y guardia backend en cada entrada de generación |
| Frontend contiene `unir_columnas` y `emparejar` con el mismo nombre/objetivo | Duplicación y configuración contradictoria | Uno canónico, otro alias compatible histórico |
| `ai_configuration_versions` y auditoría ya existen | Una tabla de versiones adicional sería redundante | Extender el snapshot/publicación actual con herramientas y rutas nuevas |
| `ai_usage_events` registra feature, stage, provider, model, latencia, estado, origen y versión | Ya existe fuente de ejecución observada | Agregar consultas/indexación; no crear un ledger paralelo |
| Jobs de calificación, digitalización y presentación conservan `_ai_config` | Es viable respetar configuración aceptada en reintentos | Normalizar snapshot por etapas y prohibir resolver de nuevo en retry |
| Concurrencia/workers viven en despliegue | Editarlos desde UI no reinicia infraestructura de forma segura | Mostrar diagnóstico de solo lectura |

## Registro de capacidades

Cada entrada declarará: `function_id`, `stage_id`, etiqueta, descripción, `runtime_feature`, consumidor, capacidad (`text`, `vision`, `image`, `embedding`, `deterministic`), condición, ruta padre, si permite proveedor/modelo/respaldo y alias. El arranque/prueba comprobará que cada ruta editable tenga al menos un consumidor registrado y que cada consumidor IA crítico emita etapa canónica.

Etapas iniciales:

- Calificación: preparación determinista; extracción visual; valoración principal; verificación; revisión dirigida condicional; consolidación determinista.
- Digitalización: preparación; extracción visual/OCR; estructuración y reparación condicional.
- Evaluaciones/rúbricas y recursos: generación textual; imagen solo para herramientas que la consumen; armado/exportación determinista.
- Presentaciones: guion/contenido, ilustraciones condicionales, render/exportación determinista.
- Xali/RAG: recuperación/embeddings y respuesta textual.

El registro se contrastará con llamadas reales antes de marcar una etapa editable. Una capacidad en el catálogo de modelos no basta para declarar compatibilidad.

## Alternativas rechazadas

- Guardar toda la configuración como un JSON nuevo: dificulta consultas, migraciones y compatibilidad con el resolver vigente.
- Editar variables `.env` desde el navegador: no es transaccional, expone secretos y no actualiza workers de forma confiable.
- Usar `active` de `ai_feature_routing` para pausar una herramienta: mezcla disponibilidad del producto con selección de IA.
- Inferir ejecución histórica desde la configuración vigente: falsifica trazabilidad cuando hubo fallback, preferencia docente o una versión anterior.
- Probar automáticamente cada modelo al guardar: consume créditos y puede bloquear una publicación válida por un incidente externo.
- Ocultar herramientas únicamente en React: el endpoint directo seguiría generando.

## Aclaración

Se revisaron alcance, roles, datos, concurrencia, reversión, seguridad, rendimiento, responsive, alias y contratos. No quedaron decisiones de producto que alteren el alcance aprobado. La selección exacta de modelos iniciales se deriva de la configuración efectiva al migrar; no se reemplaza por valores supuestos.
