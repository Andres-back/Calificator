# Modelo de datos

No se crean tablas ni columnas.

## `ai_provider_models`

Se garantiza la fila `(open_code, glm-5.3-flash)` con capacidades `text` y `vision`, activa y recomendada. La sincronización posterior del catálogo conserva esas capacidades conocidas.

## `ai_feature_routing`

- `calificacion.verificacion`: GLM como modelo primario institucional de texto.
- `calificacion.revision_adicional`: GLM como modelo primario institucional de texto.
- `calificacion.extraccion`: DeepSeek continúa como primario; GLM se ejecuta primero en la cascada interna cuando la extracción principal falla o no es usable.

La migración incrementa `config_version` únicamente en filas automáticas conocidas y no modifica filas con `updated_by` ni rutas ya personalizadas.
