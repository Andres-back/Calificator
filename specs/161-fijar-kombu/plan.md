# Plan: Workers en producción con kombu fijado

**Spec**: [spec.md](spec.md) | **Issue**: [#342](https://github.com/Andres-back/Calificator/issues/342)

## Decisión

Fijar `kombu==5.4.2`, compatible con `celery==5.4.0` y `redis==5.2.1`. Es el cambio más pequeño: no toca el cliente de Redis ni el código.

Descartado:

- **Subir redis-py a 6.1 o superior**: cambia una dependencia directa en plena urgencia y sin probarla contra el servidor real.
- **Volver a las imágenes anteriores**: ya no están en el servidor.
- **Instalar la versión a mano en los contenedores**: se perdería en el siguiente despliegue.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/requirements.txt` | `kombu==5.4.2` |
| `backend/tests/unit/test_celery_redis_compat.py` | kombu acepta el cliente instalado |
| `tests/spec_governance/test_celery_dependencies_pinned.py` | las tres versiones siguen fijadas |

## Riesgos

- Otras dependencias indirectas siguen sin fijar y una reconstrucción podría cambiarlas. Queda fuera de esta urgencia.
- La prueba comprueba la versión, no una conexión real. La confirmación final se hace en producción después del despliegue.
