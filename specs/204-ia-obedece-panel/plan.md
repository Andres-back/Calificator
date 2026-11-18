# Plan: Toda tarea de IA obedece al panel de administración

**Spec**: [spec.md](spec.md) | **Issue**: [#428](https://github.com/Andres-back/Calificator/issues/428)

## Decisión

Todo en `backend/app/services/ai_config_service.py`:

- `_feature_candidates`: los alias `grading`, `grading_text`, `grading_photo` y `presentacion` anteponen la etapa del panel a la ruta sembrada. El mapa `stage_parents` no cambia, así que la herencia etapa → ruta sembrada se conserva.
- `LEGACY_ROUTE_SOURCES` y `align_legacy_routes`: función pura que copia de la etapa a la ruta sembrada cinco campos (proveedor, modelo, respaldo, modelo de respaldo y activo). Se aplica en `save_features` y en `_replace_configuration`, los dos caminos por los que el panel escribe rutas.
- `get_feature_config`: advertencia `ai_feature_without_route` antes de devolver la ruta genérica.

## Qué no se hace

- No se migra la base: las rutas sembradas de producción se alinean en la siguiente publicación desde el panel. Desde este cambio ninguna tarea del código las lee mientras exista la etapa.
- No se cambian los modelos por defecto escritos en `core/config.py` ni el modelo por defecto de cada proveedor: el primero solo aplica a instalaciones sin configuración guardada y el segundo se edita en «Proveedores» del panel.
- No se quitan las rutas sembradas `retroalimentacion` y `vision_ocr`: ninguna tarea del código las usa.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/services/ai_config_service.py` | alias, alineación al guardar y advertencia |
| `backend/tests/unit/test_ia_obedece_panel.py` | pruebas nuevas, incluida la de gobernanza |
| `backend/tests/unit/test_grading_provider_policy.py` | orden nuevo de candidatos |

## Riesgo

Bajo. Con la bandera del calificador de respaldo apagada y las presentaciones capturando su configuración al crearse, el cambio de alias solo afecta a casos de respaldo. No toca notas, entregas ni la configuración publicada.

## Dependencia

Spec 203 (mismo mapa de alias). Este PR se abre cuando el de la 203 esté en main.
