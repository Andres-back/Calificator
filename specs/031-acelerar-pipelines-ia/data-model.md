# Modelo de datos: procesos de IA acelerados

## `ai_jobs` ampliado

Se conserva la tabla existente y se añaden columnas opcionales para no romper trabajos históricos.

| Campo | Tipo | Regla |
|---|---|---|
| `parent_job_id` | UUID nullable | FK autorreferente; identifica el lote padre. |
| `entrega_id` | UUID nullable | FK a `entregas`; obligatorio para hijos `calificacion_entrega`. |
| `stage` | varchar(50) nullable | Etapa técnica actual sin contenido educativo. |
| `attempt_count` | integer not null default 0 | Aumenta al adquirir un nuevo intento válido. |
| `claim_token` | varchar(100) nullable | Identifica la entrega Celery propietaria del lease. |
| `heartbeat_at` | timestamp nullable | Última señal del procesador activo. |
| `lease_expires_at` | timestamp nullable | Momento a partir del cual otro procesador puede recuperar. |

Índices:

- `idx_ai_jobs_parent_estado(parent_job_id, estado)` para agregación del lote.
- `idx_ai_jobs_queue_estado_created(tipo, estado, created_at)` para despacho y recuperación.
- `idx_ai_jobs_lease(estado, lease_expires_at)` para detectar trabajos abandonados.
- Índice único parcial sobre `entrega_id` para hijos en estados activos, evitando dos calificaciones simultáneas de la misma entrega.

## Tipos lógicos

### Trabajo padre `calificacion_lote`

- No llama modelos.
- Conserva `evaluacion_id`, profesor y conteos agregados.
- Su progreso es `terminales / total` y su estado se deriva de los hijos.
- Termina en `success` si todos los hijos son terminales, aunque algunos requieran revisión; solo usa `failed` para un fallo estructural del lote completo.

### Trabajo hijo `calificacion_entrega`

- Contiene una única `entrega_id` y su configuración de IA inmutable.
- Transiciones válidas:

```text
queued -> running -> success
                 -> requires_review
                 -> retrying -> queued
                 -> failed_permanent
queued/running/retrying -> cancelled
```

- El estado del hijo no publica la nota; únicamente deja la sugerencia lista para revisión docente.

### Estado provisional de `calificaciones`

- Se añade `procesando` al dominio de estados de calificación.
- Una fila `procesando` debe conservar `nota_sugerida = NULL` y `nota_confirmada = NULL`.
- Al producir un resultado pasa a `sugerida` o `requiere_revision`; tras decisión docente conserva los estados existentes.
- Las notas cero reales se almacenan como `0`, no como `NULL`, y mantienen su origen en la trazabilidad.

### Trabajos existentes

- `evaluacion_digitalizacion` y `presentacion` usan las nuevas columnas de etapa/lease sin padre.
- Los trabajos históricos con campos nulos siguen siendo legibles como antes.

## Invariantes

1. Una entrega tiene como máximo un hijo activo de calificación.
2. Un hijo pertenece a un solo padre y una sola entrega.
3. Padre e hijos comparten profesor y evaluación.
4. La entrega ya contiene el vínculo estudiante/evaluación; no se duplica como fuente de verdad.
5. Un lease vigente solo puede renovarlo su `claim_token`.
6. Un resultado terminal no puede volver a `running`.
7. La restricción existente de una calificación vigente por entrega se mantiene.
8. La configuración efectiva de IA se captura al confirmar y no cambia a mitad del trabajo.
9. `NULL` significa “sin nota todavía” y jamás participa como cero en promedios o representaciones.

## Datos JSON permitidos

`input_json` conserva identificadores y snapshot de configuración sin clave. `resultado_json` puede contener conteos, tiempos, fallbacks, razón terminal y referencias a resultados de negocio. No se almacenan imágenes, respuestas completas ni secretos dentro del trabajo.

## Migración y compatibilidad

- Migración aditiva con columnas nullable/defaults e índices concurrentes cuando el entorno lo permita.
- Backfill no obligatorio; trabajos anteriores se interpretan como trabajos simples.
- El despachador acepta el formato anterior `calificacion_lote` mientras no tenga hijos, permitiendo terminar trabajos preexistentes durante el despliegue.
- La reversión de aplicación ignora las columnas nuevas; no se eliminan durante rollback operativo.
