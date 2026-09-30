# 077 — Verificación rápida con Qwen 3.8 Flash

**Issue**: [#161](https://github.com/Andres-back/Calificator/issues/161)
**Rama**: `codex/077-qwen-fast-verification`
**Fecha**: 2026-09-30
**Aprobación humana**: «USEMOS QWEN 3.8 FLASH ENCARGATE DE DEJAR PRODUCCION LISTA Y RAPIDA». Se conserva DeepSeek como principal, conforme a la petición inmediatamente anterior. Alcance y plan limitado autorizados; CI y revisión docente siguen obligatorios.

## Objetivo y límites

Reducir la espera de una calificación por fotografía sin eliminar la segunda valoración ni sacrificar su acceso a la imagen. Esta evolución de 008 y 052 no modifica endpoints, tablas, fórmulas, rúbricas, publicación ni registros anteriores. No incluye decoración pendiente ni una migración masiva de modelos. «Rápida» se mide por etapas y por tiempo total, no por un timeout que abandone la solicitud.

## Historias y aceptación

### US1 — Docente recibe una sugerencia contrastada sin esperas innecesarias (P1)

Una evidencia aceptada recorre extracción, valoración principal, verificación y, solo si el flujo existente lo solicita, arbitraje. La nota continúa siendo una sugerencia revisable.

1. Extracción y valoración principal mantienen DeepSeek V4 Flash Vision Exp.
2. La verificación Qwen recibe la misma evidencia visual además de las respuestas y criterios.
3. Verificación y arbitraje Qwen responden con su contrato estructurado existente, sin pensamiento extendido.
4. Errores, salida truncada y discrepancias conservan los mecanismos existentes de alerta, respaldo y revisión; no se publica una nota automáticamente.

### US2 — Administrador controla y revierte el cambio (P1)

La configuración guardada, efectiva y observada identifica el modelo real por etapa. La publicación administrativa conserva un snapshot restaurable y las demás rutas intactas.

## Requisitos

- **FR-001**: Reconocer `qwen3.8-flash` como modelo de texto y visión en el catálogo y el envío de evidencia, incluso cuando el proveedor solo devuelve su identificador.
- **FR-002**: Desactivar pensamiento extendido de Qwen 3.8 Flash únicamente en `grading_secondary` y `targeted_recheck`; conservar los ajustes existentes de DeepSeek y GLM y los valores predeterminados de otros usos de Qwen.
- **FR-003**: Conservar el protocolo Messages de Qwen, imagen base64 y normalización de respuesta; rechazar salida truncada en vez de aceptar JSON incompleto. No reducir presupuestos de salida ni cortar solicitudes en curso.
- **FR-004**: Publicar en producción Qwen como principal de `calificacion.verificacion` y `calificacion.revision_adicional`, preservando las rutas DeepSeek y los respaldos existentes. Conservar snapshot, versión y auditoría mediante el servicio administrativo actual.
- **FR-005**: No alterar notas, criterios, evidencias ni otras evaluaciones guardadas. La prueba autorizada reutiliza una entrega demo, termina en revisión y no confirma ni publica su nota.
- **FR-006**: Registrar latencias de cola, extracción, valoración, verificación, arbitraje y total; informar el modelo realmente observado, incidencias y número de muestras. Objetivo operativo de una foto: menos de 40 s en la muestra de validación, comparado con el baseline de 93.8 s. No constituye garantía universal de 20 s ni prueba de carga.
- **FR-007**: Entregar mediante PR con regresiones y CI verde. Si la prueba productiva falla o empeora la integridad, restaurar la configuración anterior y conservar evidencia para revisión.

## Casos límite

- Identificadores de otros Qwen no reciben un control nuevo; el cambio no afecta generación ni digitalización.
- Catálogo sin modalidades: el modelo conocido mantiene capacidad visual. No habilitar modelos desconocidos por una heurística genérica adicional.
- Falla o truncamiento del proveedor: se mantiene el estado recuperable y el respaldo existente, sin nota final automática.
- Configuración concurrente: bloquear la versión y validar el payload antes de publicarlo; no sobrescribir decisiones administrativas nuevas silenciosamente.
- Clave demo incorrecta: no modificarla durante el benchmark ni usarla como verdad de calidad; distinguir latencia de exactitud pedagógica.

## Entidades y permisos

Sin entidades nuevas. Se reutilizan catálogo, rutas, snapshots y eventos de uso de IA de 012/049/051; entrega, calificación e historial siguen bajo 008. Publicar configuración requiere privilegios administrativos; recalificar sigue limitado al docente propietario.

## Clarificaciones

### Sesión 2026-09-30

- Alcance explícito: DeepSeek se conserva; Qwen sustituye al verificador y al arbitraje, no al evaluador principal.
- Sin preguntas adicionales: objetivos, etapas, prueba demo, producción y preservación de registros ya autorizados. La velocidad del proveedor es variable; se reportará el tiempo medido sin prometer 20 segundos.

## Éxito medible

- SC-001: regresiones de protocolo, imagen, truncamiento y aislamiento por etapa pasan; CI completo verde.
- SC-002: configuración efectiva y telemetría productiva muestran DeepSeek en extracción/principal y Qwen en las dos revisiones cuando se ejecutan.
- SC-003: una recalificación demo termina sin publicación ni error y se informa su tiempo total frente al baseline; si supera 40 s se identifica la etapa y se corrige dentro del alcance o se informa la limitación.
- SC-004: ninguna migración, cambio de API o edición de otras notas; rollback administrativo disponible.
