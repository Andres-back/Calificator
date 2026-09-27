# Especificación: sesión estable para OpenCode Go

**Rama**: `codex/044-opencode-session`
**Fecha**: 2026-09-16
**Estado**: hotfix aprobado por el usuario para implementación, prueba y producción.
**Issue**: [#88](https://github.com/Andres-back/Calificator/issues/88)

## Escenarios de usuario y pruebas

### Historia 1: calificar evidencia con el proveedor configurado (P1)

Como profesor quiero que una calificación visual llegue al modelo elegido y produzca una sugerencia revisable, en lugar de fallar antes de analizar la evidencia.

**Prueba independiente**: una evidencia existente autorizada se procesa sin persistir una nueva nota; el proveedor acepta la solicitud y devuelve una extracción o resultado estructurado con telemetría de duración.

### Historia 2: digitalizar sin fallos de enrutamiento (P1)

Como profesor quiero que foto/PDF y la estructuración posterior con OpenCode conserven una identidad técnica estable durante sus reintentos para que el gateway pueda enrutar la operación eficientemente.

### Historia 3: diagnóstico administrativo veraz (P2)

Como administrador quiero que la prueba y el catálogo del proveedor utilicen los mismos metadatos obligatorios que los flujos reales, sin exponer claves ni datos educativos.

## Casos límite

- Reintentos por límite de capacidad conservan la misma sesión.
- Cambio de credencial personal a institucional conserva la conversación y no registra la clave.
- Los protocolos Chat Completions y Messages reciben autenticación propia, sesión y agente de usuario.
- Operaciones simultáneas usan sesiones distintas salvo cuando comparten deliberadamente el mismo identificador de pipeline.

## Requisitos funcionales

- **FR-001**: toda solicitud de inferencia a OpenCode incluye una sesión técnica no vacía y un agente de usuario propio de XCalificator.
- **FR-002**: todos los reintentos y cambios de credencial dentro de una misma operación conservan la misma sesión.
- **FR-003**: la sesión es opaca, no contiene identificadores personales, claves ni contenido de la evidencia.
- **FR-004**: Chat Completions y Messages conservan sus encabezados de autenticación correctos además de la sesión compartida.
- **FR-005**: extracción visual, valoración, estructuración/digitalización, descubrimiento de modelos y prueba administrativa usan el contrato corregido.
- **FR-006**: el hotfix no cambia cálculo, persistencia, publicación, permisos ni tiempos de espera de las calificaciones.
- **FR-007**: una prueba de regresión verifica presencia y estabilidad de la sesión en solicitudes y reintentos.

## Resultados medibles

- **SC-001**: cero respuestas `MissingSessionID` en los recorridos OpenCode cubiertos por la prueba.
- **SC-002**: una medición controlada en producción llega a inferencia y deja duración por etapa sin persistir una nota de prueba.
- **SC-003**: las pruebas focalizadas de OpenCode, visión y digitalización quedan verdes y el CI completo no presenta regresiones.

## Impacto, reproducción, causa y solución

Impacto: calificaciones y digitalizaciones configuradas con OpenCode terminaban en revisión manual o en respaldos aunque el proveedor respondía rápidamente. Reproducción: enviar la evidencia geométrica existente a la ruta de visión; el gateway responde HTTP 400 `MissingSessionID`. Causa: los clientes enviaban autenticación pero omitían la sesión estable y el agente de usuario requeridos por OpenCode Go. Solución: un contrato compartido de encabezados con sesión opaca por operación y regresiones en los distintos protocolos.

## Supuestos y límites

La meta de menos de 20 segundos se medirá después de restaurar conectividad; este hotfix no la declara cumplida de antemano. No se añaden timeouts que abandonen inferencias aceptadas. No se guarda la salida de la prueba productiva como calificación. No hay cambios de base de datos ni API pública.
