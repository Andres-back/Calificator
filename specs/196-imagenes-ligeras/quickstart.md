# Validación: Recursos con imagen que abren rápido

## Pruebas

```
python -m pytest tests/unit/test_herramientas_imagen_ligera.py -q     18 pasan
python -m ruff check app/modules/herramientas                          sin errores
```

## Comprobación real en local

Backend de esta rama, con una ilustración de cuento y un dibujo para colorear reales (tomados de producción en solo lectura) puestos en dos recursos de prueba.

| Paso | Cuento | Para colorear |
| --- | --- | --- |
| Guardado en la base | 1.975.202 caracteres | 1.834.991 caracteres |
| Respuesta al abrir | 6.528 bytes, sin `b64_data` | 2.447 bytes, sin `b64_data` |
| Imagen | 200 · WebP · 112.230 bytes | 200 · WebP · 153.976 bytes |
| Segunda carga | 304 · 0 bytes | 304 · 0 bytes |
| Estudiante con el recurso publicado | 200 | 200 |
| Tras editar | imagen original intacta en la base | imagen original intacta en la base |
| Sin sesión | 401 | 401 |

Capturas en 390 px: docente y estudiante ven la ilustración del cuento y el dibujo para colorear.
