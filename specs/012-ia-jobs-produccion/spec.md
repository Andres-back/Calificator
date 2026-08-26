# Especificación: IA, jobs y producción

**Rama**: codex/012-ia-jobs-produccion | **Creada**: 2026-08-14 | **Estado**: Aprobada | **Issue**: #13

## Escenarios de usuario y pruebas

### Historia 1 - Flujo principal (Prioridad: P1)
Como administrador o mantenedor, necesito configurar proveedores y operar trabajos y despliegues reproducibles para obtener un resultado claro, seguro y trazable.

**Prueba independiente**: El recorrido termina en estado visible, conserva datos esperados y no concede permisos ajenos.

**Aceptación**:
1. **Dado** un actor autorizado, **cuando** completa el flujo, **entonces** recibe el resultado esperado.
2. **Dado** un actor no autorizado, **cuando** intenta acceder, **entonces** se rechaza sin revelar datos.

### Historia 2 - Estados y recuperación (Prioridad: P2)
Como mantenedor, necesito permisos, estados, errores y recuperación documentados para verificar el dominio.

### Historia 3 - Especificación viva (Prioridad: P3)
Como equipo, necesito actualizar estos artefactos cuando cambie el comportamiento para evitar contradicciones.

### Casos límite
- Un proveedor caído activa fallback permitido sin exponer claves ni perder el job
- Una dependencia lenta deja estado recuperable y no duplica operaciones.
- Sesión vencida o rol incorrecto se rechazan consistentemente.

## Requisitos

### Requisitos funcionales
- **FR-001**: El flujo principal DEBE estar disponible solo para actores autorizados.
- **FR-002**: La autorización DEBE aplicarse en servidor e interfaz.
- **FR-003**: Se DEBEN conservar estas entidades: Job, JobEstado, JobTipo, LLMProvider, ImageProvider, AIConfig, AuditEvent.
- **FR-004**: Carga, vacío, éxito, error y reintento DEBEN ser visibles.
- **FR-005**: Operaciones repetidas DEBEN respetar idempotencia y unicidad.
- **FR-006**: Errores NO DEBEN exponer secretos ni datos ajenos.
- **FR-007**: Contratos DEBEN estar trazados en contracts/interfaces.md.
- **FR-008**: Todo cambio futuro DEBE actualizar especificación, plan, tareas y pruebas.

### Entidades clave
- **Job**: identidad, estado y relaciones definidos por el dominio.
- **JobEstado**: identidad, estado y relaciones definidos por el dominio.
- **JobTipo**: identidad, estado y relaciones definidos por el dominio.
- **LLMProvider**: identidad, estado y relaciones definidos por el dominio.
- **ImageProvider**: identidad, estado y relaciones definidos por el dominio.
- **AIConfig**: identidad, estado y relaciones definidos por el dominio.
- **AuditEvent**: identidad, estado y relaciones definidos por el dominio.

## Criterios de éxito
- **SC-001**: El 100 % de módulos, rutas y tablas declarados aparece en el índice.
- **SC-002**: Recorridos P1 se verifican sin acceso cruzado.
- **SC-003**: Cada requisito tiene tarea o evidencia.
- **SC-004**: No quedan marcadores pendientes, contradicciones críticas ni secretos.

## Supuestos
- Registra comportamiento vigente; no introduce cambios funcionales.
- Inconsistencias se convierten en issues separados.
- Se conservan arquitectura y contratos públicos.
## Inventario técnico

- [Ver superficies, permisos y cobertura de este dominio](./inventory.md).


## Evolución 018: espera recuperable y telemetría segura

- Los trabajos de digitalización y calificación exponen de forma aditiva timings_ms, fallbacks, terminal_reason, pipeline_run_id, slow_after_ms y deadline_ms legacy nulo.
- Las etapas canónicas son cola, preparación, extracción, estructuración, evaluación primaria, evaluación secundaria, persistencia y total.
- Cada intento externo produce un único evento seguro con etapa, proveedor, modelo, duración y código de error normalizado; no registra evidencia, prompts, respuestas ni mensajes del estudiante.
- Los workers no cancelan una inferencia aceptada por duración ni por una pérdida temporal del broker. `acks_late`, idempotencia y reintento recuperan reinicios; conexión, escritura y pool sí conservan límites de transporte.
- Un fallback permitido queda registrado sin exponer credenciales o contenido y conserva un resultado terminal explícito: completado, revisión requerida o error recuperable.
- La estrategia de calificación registra `primary_mode`, `secondary_mode`, `arbiter_invoked` y `arbiter_reason`: Qwen extrae una vez, Flash evalúa/verifica y Pro se reserva para arbitraje excepcional.
- La interfaz muestra etapa y duración segura mientras permite continuar navegando.

## Evolución 021: configuración de IA global y por docente

- La especificación [021](../021-configuracion-ia-docente/spec.md) pasa a ser propietaria del catálogo de modelos, las rutas por capacidad, las credenciales cifradas por docente, el consentimiento de fallback y sus paneles de administración y profesor.
- Este dominio 012 conserva la propiedad del ciclo de vida de los jobs, workers, Redis, despliegue y observabilidad de producción.
- Los jobs capturan una instantánea sanitizada e inmutable de la ruta resuelta por 021; nunca almacenan claves, prompts, evidencias ni respuestas del estudiante.
- La telemetría compartida registra únicamente proveedor, modelo, origen, versión, hash de configuración y uso de fallback.

## Evolución 022: recuperación de trabajos huérfanos

- Las consultas de trabajos preservan el tipo UUID nativo en PostgreSQL y una excepción de preparación siempre produce un estado terminal visible.
- Un trabajo `queued` que no fue iniciado y perdió su mensaje de broker puede volver a publicarse de manera idempotente sin crear otra entrega, calificación o evidencia.
- La recuperación automática solo reclama trabajos vencidos que continúan en `queued`; no interrumpe ni duplica inferencias `running`.
- La especificación [022](../022-recuperar-trabajos-ia/spec.md) documenta el incidente, la regresión y la aceptación del hotfix; este dominio 012 conserva la propiedad técnica.
