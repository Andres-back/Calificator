# Especificación: Workers en producción con kombu fijado

**Rama**: `codex/161-fijar-kombu` | **Creada**: 2026-11-08 | **Estado**: Aprobada | **Issue**: [#342](https://github.com/Andres-back/Calificator/issues/342)

**Entrada**: el despliegue del 2026-11-08 dejó caídos todos los workers y `beat`. El usuario aprobó una corrección urgente con `kombu==5.4.2`.

## Evidencia

Las imágenes reconstruidas instalaron kombu 5.7.0, que exige redis-py 6.1 o superior. El proyecto fija `redis==5.2.1`, así que cada worker termina al arrancar con `VersionMismatch`. La CI no lo detectó porque ninguna prueba abría el transporte de Redis.

## Escenarios de usuario y pruebas

### Historia 1 - Los trabajos en segundo plano vuelven a procesarse (Prioridad: P1)

Como docente, quiero que las calificaciones y digitalizaciones se procesen, para no quedarme esperando un resultado.

**Aceptación**:
1. **Dada** una imagen reconstruida, **cuando** arrancan los workers y `beat`, **entonces** siguen en marcha sin reiniciarse.
2. **Dada** una versión de kombu incompatible con el cliente de Redis, **cuando** corre la CI, **entonces** falla antes de desplegar.

### Casos límite

- Las notas, las entregas y los datos no cambian.

## Requisitos

### Requisitos funcionales

- **FR-001**: `backend/requirements.txt` DEBE fijar `kombu` junto con `redis` y `celery`.
- **FR-002**: La CI DEBE fallar si kombu rechaza el cliente de Redis instalado.

## Criterios de éxito

- **SC-001**: Después del despliegue, todos los workers y `beat` siguen en marcha sin reinicios y al menos un worker responde por Redis.
