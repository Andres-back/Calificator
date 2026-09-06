# Contratos HTTP y de trabajos

Los cambios son aditivos. Clientes que solo consumen los campos actuales continúan funcionando.

## POST `/api/calificaciones/lote/asincrono`

Entrada multipart existente:

- `evaluacion_id`: UUID.
- `files`: uno a 30 archivos.
- `estudiantes`: arreglo JSON en el mismo orden.

Validación atómica antes de persistir hijos:

- cantidades coincidentes;
- estudiantes únicos, matriculados y habilitados;
- evaluación administrable y abierta para calificación;
- archivos válidos y dentro de límites;
- ausencia de evidencia duplicada en el lote;
- ausencia de otro trabajo activo para la misma entrega.

Respuesta `202` compatible y ampliada:

```json
{
  "job_id": "uuid-padre",
  "estado": "queued",
  "entrega_ids": ["uuid"],
  "total": 30,
  "summary_url": "/api/jobs/uuid-padre"
}
```

Errores de validación no crean entregas, trabajos ni archivos huérfanos. Si Redis no está disponible después del commit, los hijos quedan `queued` y el recuperador los publicará.

Desde la respuesta exitosa, la entrega expone `estado: "procesando"` y la calificación provisional `estado: "procesando"`, con ambas notas en `null`. `queued` describe la etapa técnica del trabajo, pero la etiqueta funcional presentada a estudiante y profesor es “Calificando”.

## GET `/api/jobs/{job_id}`

Conserva todos los campos actuales y añade:

```json
{
  "stage": "grading",
  "elapsed_ms": 28410,
  "attempt_count": 1,
  "parent_job_id": null,
  "summary": {
    "total": 30,
    "queued": 8,
    "running": 4,
    "retrying": 1,
    "success": 14,
    "requires_review": 2,
    "failed_permanent": 1,
    "cancelled": 0
  }
}
```

`summary` solo aparece para padres. `elapsed_ms` se calcula sin exponer contenido.

## GET `/api/jobs/{job_id}/items`

Nuevo detalle paginado del lote. Requiere el mismo propietario o permiso administrativo.

Parámetros: `limit` (1–100, predeterminado 30), `offset`, `estado` opcional.

Respuesta:

```json
{
  "items": [
    {
      "job_id": "uuid-hijo",
      "entrega_id": "uuid",
      "estudiante_id": "uuid",
      "estado": "running",
      "stage": "grading_primary",
      "progreso": 65,
      "attempt_count": 1,
      "error_code": null
    }
  ],
  "total": 30
}
```

No devuelve respuestas ni claves. El nombre del estudiante se obtiene del flujo de calificaciones ya autorizado, no se copia al trabajo.

## Regla de representación de nota

- `nota_sugerida: null` y `nota_confirmada: null`: mostrar “Calificando” o el estado terminal correspondiente, sin número.
- `nota_sugerida: 0`: mostrar `0.0` como resultado real pendiente de confirmación.
- `nota_confirmada: 0`: mostrar `0.0` como nota real confirmada.
- Ningún cliente puede usar `?? 0`, `|| 0` o conversión equivalente para representar una nota ausente.

## POST `/api/jobs/{job_id}/reintentar`

Reintenta un hijo en estado transitorio agotado o `failed_permanent` cuando el profesor lo solicita. En un padre, acepta opcionalmente una lista de hijos fallidos. No reprocesa hijos exitosos.

## Estado de presentaciones

`GET /api/presentaciones/{id}/estado` conserva su contrato y añade `etapa`, `mensaje`, `elapsed_ms`, `imagenes_completadas`, `imagenes_total` y `timings_ms` cuando están disponibles.

Etapas: `queued`, `content`, `deterministic_validation`, `targeted_repair`, `images`, `exports`, `completed`.

## Catálogo y métricas de IA

Los endpoints administrativos existentes amplían cada ruta con:

- `capability`: `text`, `vision`, `image` o `embedding`;
- `recommended_for_feature`;
- `sample_size`;
- `p50_ms`, `p95_ms` cuando la muestra es suficiente;
- `efficiency_warning` sin sustitución automática.

## Routing Celery

| Tarea | Cola |
|---|---|
| `tasks.grade_delivery` | `grading` |
| `tasks.recover_stale_grading_jobs` | `grading` |
| `tasks.digitalize_evaluation` | `digitalization` |
| `tasks.recover_stale_digitalization_jobs` | `digitalization` |
| `tasks.generate_presentation` | `presentations` |
| `tasks.recover_stale_presentation_jobs` | `presentations` |
| Resto | `default` |

Toda republicación debe conservar la cola de la tarea original.
