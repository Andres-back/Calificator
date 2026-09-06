# Investigación: rendimiento de procesos de IA

## Evidencia observada

- La calificación visual exitosa tarda en promedio cerca de 200 s de extremo a extremo, aunque las llamadas exitosas del modelo visual rápido rondan 9–13 s por etapa observada.
- La digitalización de una página ronda 187 s en la muestra reciente.
- Una presentación de ocho diapositivas tardó cerca de 366 s. Su primer borrador fue rechazado por un defecto localizado, se generó el conjunto completo otra vez y después se ejecutó una revisión factual completa.
- Esa presentación produjo más de 32 mil tokens de salida en tres llamadas. El adaptador OpenCode aplica `max_tokens` a `messages`, pero no al camino `chat/completions` usado por ciertos modelos.
- Calificación, digitalización y presentaciones comparten un solo worker Celery con concurrencia 2.
- El lote asíncrono persiste un `ai_job`, pero su tarea recorre todas las entregas con un `for`; por ello no existe independencia real entre elementos.
- El VPS dispone de 6 vCPU y 11 GiB de RAM, con alrededor de 7.1 GiB disponibles durante la observación. El worker existente consumía cerca de 335 MiB.

Las cifras describen la muestra observada y no constituyen garantía del proveedor. Los percentiles deben recalcularse después del cambio con una ventana y tamaño de muestra visibles.

## Decisiones

### D1. Optimizar trabajo solicitado antes de cambiar de modelo

**Decisión**: limitar la salida al esquema requerido, eliminar regeneraciones completas innecesarias y reutilizar resultados parciales.

**Razón**: la telemetría muestra que parte sustancial del tiempo se consume fuera de la primera extracción visual y en salidas excesivas.

**Alternativas rechazadas**: cambiar de modelo sin corregir el contrato; reducir calidad o número de controles.

### D2. Separar capacidad por función

**Decisión**: colas y workers independientes para calificación, digitalización y presentaciones.

**Razón**: una presentación larga no debe ocupar la capacidad reservada para notas. La separación ofrece aislamiento predecible y permite ajustar concurrencia por perfil.

**Alternativa rechazada**: una sola cola con prioridad numérica. Una tarea ya tomada no puede desalojarse de forma segura y aún puede monopolizar ambos procesos.

### D3. Un hijo persistente por estudiante

**Decisión**: representar el lote con un `ai_job` padre y hasta 30 `ai_jobs` hijos, cada uno asociado a una entrega.

**Razón**: permite claim, heartbeat, reintento, error y resultado independientes, además de una agregación eficiente.

**Alternativas rechazadas**: un único task secuencial; 30 estados embebidos únicamente en JSON; procesar todos con `asyncio.gather` dentro de un solo proceso sin persistencia individual.

### D4. Recuperar `running` mediante lease, no por tiempo total

**Decisión**: cada hijo mantiene `claim_token`, `heartbeat_at` y `lease_expires_at`. Solo un lease vencido puede reclamarse.

**Razón**: una inferencia legítimamente lenta no debe perderse ni duplicarse; un worker muerto sí debe recuperarse.

**Alternativa rechazada**: declarar fallido cualquier trabajo que supere N segundos.

### D5. Mantener transparencia y dependencias reales

**Decisión**: conservar el evaluador explicable, el verificador y el arbitraje condicional. Solo se paraleliza lo que no depende de otra salida.

**Razón**: el verificador actual recibe el resultado primario; ejecutarlo en paralelo cambiaría su función. La mejora de throughput se obtiene procesando estudiantes independientes concurrentemente.

### D6. Reparación localizada de presentaciones

**Decisión**: validación determinista inmediata, reparación local y llamada focalizada solo para diapositivas aún inválidas.

**Razón**: conserva trabajo bueno, reduce tokens y evita tres generaciones completas.

**Alternativa rechazada**: aceptar contenido incompleto para cumplir el tiempo.

### D7. Pruebas económicas y representativas

**Decisión**: usar proveedores simulados para concurrencia de 30, fallos, reintentos y tiempos en CI; reservar llamadas reales para un smoke mínimo posterior al despliegue.

**Razón**: valida arquitectura sin consumir innecesariamente tokens ni depender de latencia externa variable.

## Riesgos y mitigaciones

- **Rate limiting externo**: límite configurable de solicitudes en vuelo, backoff con jitter y estado `retrying` persistente.
- **Mayor uso de memoria**: despliegue gradual 4/1/1, medición de RSS y rollback de concurrencia por variables de entorno.
- **Duplicado tras caída**: índice parcial por entrega activa, claim atómico y escritura idempotente de calificación.
- **JSON truncado por presupuesto bajo**: presupuesto proporcional, razón de terminación, validación estricta y reintento focalizado.
- **Presentación supera 120 s por proveedor de imágenes**: progreso por imagen, concurrencia acotada, reutilización de assets y sustitución explícita; el evento externo se registra separado del procesamiento interno.
- **Sondeo excesivo del navegador**: consulta agregada del padre y detalle paginado/bajo demanda.
