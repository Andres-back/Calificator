# Plan: Recursos con imagen que abren rápido

**Spec**: [spec.md](spec.md) | **Issue**: [#412](https://github.com/Andres-back/Calificator/issues/412)

## Decisión

Solo backend y sin migración. El frontend ya muestra `imagen.url` cuando no hay `imagen.b64_data`, así que no cambia.

- **Nuevo módulo** `image_delivery.py`:
  - `lighten_material`: copia del recurso sin `b64_data` y con `url` (`/api/herramientas/{id}/imagen?v=<huella>`).
  - `render_web_image`: decodifica, aplana transparencia, limita a 1280 px y convierte a WebP (calidad 86); si pesa más o falla, entrega la original.
  - `restore_stored_image`: al editar, repone la imagen guardada.
  - `image_version`: huella corta calculada con el tamaño y los extremos del base64, sin recorrerlo entero.
- **Router**: `lighten_material` en las respuestas que devuelven un recurso (ver, actualizar, asignar, retirar, visibilidad, duplicar, generar cuento y para colorear). El PDF no pasa por ahí.
- **Nuevo punto de acceso** `GET /herramientas/{id}/imagen`: reutiliza `get_material_for_user` y el permiso `resources.read`; la conversión corre en un hilo aparte.
- **Servicio**: `update_material` llama a `restore_stored_image` antes de guardar.

## Por qué no mover las imágenes a archivos

Sería lo ideal a largo plazo, pero exige migrar datos de producción y cambiar el PDF. Esta entrega resuelve el peso que percibe el usuario sin tocar lo guardado, y deja abierta esa migración.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/herramientas/image_delivery.py` | nuevo |
| `backend/app/modules/herramientas/router.py` | respuestas livianas y punto de acceso de imagen |
| `backend/app/modules/herramientas/service.py` | conservar la imagen al editar |
| `backend/tests/unit/test_herramientas_imagen_ligera.py` | pruebas (nuevo) |
