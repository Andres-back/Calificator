# Validación: Workers en producción con kombu fijado

## Pruebas

En un entorno local con `celery==5.4.0` y `redis==5.2.1`:

| kombu | Prueba de compatibilidad |
| --- | --- |
| 5.7.0 | falla con `VersionMismatch` |
| 5.4.2 | pasa |

## Después de desplegar

1. Todos los workers y `beat` siguen en marcha, sin aumentar sus reinicios.
2. `celery inspect ping` recibe respuesta de un worker.
3. Los registros ya no muestran `VersionMismatch`.
