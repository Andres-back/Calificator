# Especificación: Recuperación de trabajos de IA

**Rama**: `codex/022-recuperar-trabajos-ia` | **Creada**: 2026-08-26 | **Estado**: Aprobada como hotfix | **Issue**: [#31](https://github.com/Andres-back/Calificator/issues/31)

## Escenarios de usuario y pruebas

### Historia 1 - La calificación siempre termina en un estado visible (Prioridad: P1)

Como docente necesito que una calificación en segundo plano termine como completada o recuperable, incluso si ocurre una excepción antes de contactar al modelo, para no esperar indefinidamente ni perder la evidencia.

**Prueba independiente**: Se provoca un error durante la preparación de un trabajo persistido y se comprueba que el trabajo abandona `queued`, informa el fallo de forma segura y permite reintentarlo con la misma entrega.

**Aceptación**:
1. **Dado** un trabajo con identificador UUID, **cuando** el worker consulta su entrada y tiempo de cola en PostgreSQL, **entonces** las consultas respetan el tipo UUID y la ejecución continúa.
2. **Dado** un error antes del procesamiento visual, **cuando** el worker termina el intento, **entonces** el trabajo queda en estado terminal y la entrega conserva la evidencia.

### Historia 2 - Recuperación idempotente de una cola huérfana (Prioridad: P1)

Como docente necesito que un trabajo persistido cuyo mensaje se perdió vuelva a la cola sin intervención manual y sin duplicar notas.

**Prueba independiente**: Se deja un trabajo `queued` más antiguo que el umbral de recuperación, se ejecuta el reconciliador dos veces y se confirma una sola reclamación efectiva y una única calificación vigente.

**Aceptación**:
1. **Dado** un trabajo antiguo que nunca inició, **cuando** se ejecuta la recuperación, **entonces** se vuelve a publicar usando sus identificadores y propietario persistidos.
2. **Dado** un trabajo `running`, completado, fallido o cancelado, **cuando** se ejecuta la recuperación, **entonces** no se vuelve a publicar.
3. **Dado** un reintento repetido, **cuando** otro worker ya reclamó el trabajo, **entonces** no se crean entregas, calificaciones ni evidencias duplicadas.

### Casos límite

- Un trabajo heredado sin instantánea de configuración conserva la ruta institucional compatible; no se inventa una configuración.
- La recuperación no cancela una solicitud externa lenta ni aplica límites artificiales a un trabajo `running`.
- Un trabajo cuyo usuario, evaluación o entrega ya no existe termina con error seguro y recuperable.
- Una caída temporal de Redis no modifica el estado persistido ni borra evidencia.

## Requisitos

### Requisitos funcionales

- **FR-001**: Las consultas de `ai_jobs` DEBEN comparar identificadores con el tipo UUID correcto en PostgreSQL.
- **FR-002**: Toda excepción del worker, incluso durante la preparación previa al modelo, DEBE dejar el trabajo persistido en un estado terminal visible y seguro.
- **FR-003**: El sistema DEBE detectar y volver a publicar trabajos `queued` antiguos que nunca comenzaron, preservando entrada, propietario e instantánea de configuración.
- **FR-004**: La recuperación DEBE ser idempotente y NO DEBE reencolar trabajos `running` ni duplicar entregas, calificaciones, evidencias o solicitudes activas.
- **FR-005**: El hotfix DEBE conservar los contratos públicos y el flujo docente existente.

## Criterios de éxito

- **SC-001**: El trabajo que originó el incidente abandona `queued` y termina con nota sugerida o error docente recuperable sin perder evidencia.
- **SC-002**: Las pruebas reproducen el fallo `uuid = character varying` antes de la corrección y pasan después del hotfix.
- **SC-003**: Dos ejecuciones consecutivas del recuperador producen una sola reclamación efectiva y una sola calificación vigente.
- **SC-004**: Ninguna prueba de recuperación interrumpe o vuelve a publicar trabajos `running`.

## Supuestos

- El umbral de recuperación será conservador y configurable; solo aplica a trabajos que continúan en `queued` sin `started_at`.
- PostgreSQL continúa como fuente de verdad del ciclo de vida y Redis como transporte temporal.
- La propiedad técnica permanece en [012 IA, jobs y producción](../012-ia-jobs-produccion/spec.md).
