# Contrato interno: coordinación de calificación individual

## Operación

```python
async def enqueue_persisted_grading(
    db: AsyncSession,
    *,
    evaluacion: object,
    entrega: Entrega,
    estudiante_id: UUID,
    profesor_id: UUID,
    evidence_metadata: dict | None = None,
    calificacion: Calificacion | None = None,
) -> Calificacion
```

## Precondiciones

- El router autenticó al usuario y verificó el permiso correspondiente.
- La evaluación puede recibir o reprocesar la entrega según el recorrido.
- La evidencia o las respuestas online ya están asociadas a una `Entrega` persistible.
- Cuando `calificacion` está presente, pertenece a la misma entrega.

## Resultado exitoso

- Existe un trabajo padre `calificacion_lote`.
- Existe un trabajo hijo `calificacion_entrega` relacionado con el padre y la entrega.
- La configuración efectiva de IA capturada por el padre está presente en el hijo.
- Existe una sola calificación pendiente para la entrega y referencia el hijo.
- La transacción está confirmada antes de intentar publicar.
- Se publica una tarea `grade_delivery` en la cola `grading` con evaluación, entrega, trabajo y profesor.
- Se devuelve la calificación confirmada y refrescada.

## Fallo de publicación

Si el broker rechaza `apply_async`:

- No se revierte la evidencia ni la calificación confirmada.
- No se crea un segundo trabajo.
- El mismo hijo queda `retrying` con un mensaje recuperable.
- Se confirma el nuevo estado y se devuelve la calificación pendiente.
- La recuperación existente puede republicar posteriormente el mismo trabajo.

## Mensajes duplicados y concurrencia

- Publicaciones duplicadas conservan el mismo `job_id`.
- El worker usa reclamación atómica; solo una tarea puede pasar el hijo de `queued/retrying` a `running`.
- Una segunda reclamación no inicia otra inferencia ni crea otra nota.
- Los datos de profesor, estudiante, evaluación y entrega no se comparten entre trabajos.

## Compatibilidad HTTP preservada

La extracción no cambia cuerpos, códigos ni estados de estas entradas existentes:

- `POST /calificaciones/foto` → `202 Accepted`.
- `POST /calificaciones/{calificacion_id}/reintentar-foto`.
- `POST /calificaciones/modo-salon/{sesion_id}/foto` → `202 Accepted`.
- `POST /evaluaciones/{evaluacion_id}/entregas` para entregas online.
- `POST /evaluaciones/{evaluacion_id}/entregas/archivo` → `202 Accepted`.

El endpoint por lote conserva su implementación y contrato actual.

## Fuera del contrato

- Inferencia visual y textual.
- Cálculo de nota y retroalimentación.
- Selección o fallback de proveedores de IA.
- Publicación de la nota al estudiante.
- Creación multiestudiante por lote.
