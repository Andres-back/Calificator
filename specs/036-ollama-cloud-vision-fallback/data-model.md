# Modelo de datos

No se crean entidades ni migraciones.

## Configuración reutilizada

- `ai_feature_routing`: conserva proveedor/modelo principal y proveedor/modelo de respaldo.
- `ai_provider_models`: conserva modelos activos y sus capacidades, incluida `vision`.
- `ai_usage_events`: registra la ejecución observada, proveedor, modelo, estado, duración y uso de respaldo.
- `ai_jobs`, `entregas` y `calificaciones`: mantienen su cardinalidad y estados actuales.

## Transición relevante

`principal en ejecución → principal fallido → respaldo en ejecución → extracción lista`

Si el respaldo falla: `respaldo en ejecución → error recuperable/revisión`, sin crear otra entrega, nota o trabajo.

