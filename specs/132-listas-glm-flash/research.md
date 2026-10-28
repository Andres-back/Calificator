# Investigación del incidente

Decisión: consumir selección capturada y preparar `glm-5.3-flash` como dato operativo solo para listas. Motivo: seis lotes recientes fallaron con el modelo antiguo y sus eventos registran HTTP410. GLM consta activo, visual y comprobado. Rechazado: reemplazar el nombre en una constante de negocio.

Decisión: resolver principal/respaldo por revisión y origen de clave. Motivo:116 exige `_configured_secrets`, pero061 solo rellenaba `api_key`. Rechazado: eliminar perfiles/verificación para usar una ruta heredada.

Decisión: códigos cerrados `service_unavailable`, `invalid_response`, `no_names`; solo una salida válida vacía aconseja revisar la foto. Error del proveedor no repite orientaciones; reintentos transitorios quedan en transporte.

Sin lectura de nombres/fotos ni nuevas llamadas reales para el diagnóstico. Mantener política temporal: el profesor debe volver a subir la foto tras reparar porque la fuente fallida ya fue eliminada. Publicar GLM después de integrar/desplegar, con versión y comparación de rutas ajenas.
