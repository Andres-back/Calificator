# Validación: Toda tarea de IA obedece al panel de administración

## Pruebas

```
python -m pytest tests/unit/test_ia_obedece_panel.py tests/unit/test_grading_provider_policy.py     9 pasan (6 nuevas)
python -m pytest tests/unit                                                                         2.349 pasan
ruff de lo tocado                                                                                   sin errores
```

Los 24 fallos de la suite en Windows están en archivos ajenos (escaneo de evidencia, PDF, configuración de producción y decisiones del docente) y ya fallaban antes de este cambio en ese entorno.

## Sonda en producción antes del cambio (solo lectura, sin llamar a modelos)

Lo que el panel muestra y lo que resolvía cada tarea:

| Función | Resolvía | ¿Obedece al panel? |
| --- | --- | --- |
| Calificación: lectura, valoración y verificación | API directa de Claude, `claude-sonnet-5-5` | sí |
| Calificación: revisión adicional | `claude-haiku-5-5`, respaldo `gpt-6-luna` | sí |
| Digitalización e importación de listas | `gpt-6-luna` y `glm-5.3-flash` | sí |
| Recursos (14 formatos) | `claude-haiku-5-5`, respaldo `gpt-6-luna` | sí |
| Presentaciones (contenido) | `claude-haiku-5-5`, respaldo `gpt-6-luna` | sí |
| Xali | `gpt-6-luna`, respaldo `glm-5.3-flash` | sí |
| Calificador de respaldo (`grading_photo`, apagado) | ruta sembrada con el modelo retirado y cascada hasta la plantilla | no → corregido |
| Presentación sin configuración capturada (`presentacion`) | ruta sembrada con el modelo retirado | no → corregido |
| Sugerencias de criterios (`dba_sugerencias`) | sin ruta | no → corregido en la Spec 203 |

## Después de desplegar

1. En el panel, «Publicar» una vez: las rutas sembradas quedan iguales a su etapa.
2. En «Proveedores», el modelo por defecto de OpenCode sigue siendo el retirado; conviene cambiarlo por uno vigente. Solo lo usaría una tarea sin ruta, que la prueba de gobernanza ya impide.
