# Modelo de datos

## FeedbackDeliveryReview (nueva, aditiva)

- `id`: UUID de revisión inmutable.
- `calificacion_id`: referencia a la nota, no nueva calificación.
- `authorized_by`, `authorized_at`: autor docente/administrador y hora del servidor.
- `source_fingerprint`: huella de la fuente completa revisada.
- `scope`: `summary` o `detail`; `detail` exige desglose publicable actual.
- `feedback_text`: mensaje que el docente revisó y aprobó, máximo 6.000 caracteres en esta vía; se preserva el feedback académico original.
- `request_id`, `request_fingerprint`: idempotencia del autor por calificación y petición. Reusar petición con datos distintos devuelve conflicto.
- Índice por `calificacion_id`/fecha, unicidad por autor/calificación/request_id. Validaciones de no vacío y alcance.

La revisión es utilizable solo si el usuario, matrícula, evaluación, nota vigente y huella siguen válidos. No se eliminan revisiones antiguas para sustituirlas; quedan obsoletas por cambio de fuente o reemplazo explícito de revisión y auditables.

## Proyección autorizada

- Campos públicos actuales permanecen: identidad de devolución, nota oficial, texto, explicación, respuestas permitidas y estado de soluciones.
- Alcance/revisión añadidos únicamente en la vía nueva. `summary`: respuestas vacías, sin referencias/puntajes/contexto de preguntas; evidencia solo con autorización opcional existente.
- Huella de publicación incorpora revisión y fuente; enlaces previos que usan vía coherente conservan su cálculo histórico de huella.

## Estados de preparación

- `no_grade`: no hay decisión docente confirmada; no se entrega.
- `needs_review`: hay nota, falta autorizar mensaje/alcance o existe un impedimento que el docente puede revisar.
- `ready`: proyección coherente existente o revisión explícita compatible.
- La selección visual de estudiantes es independiente del estado. Cambiar filtro no autoriza ni borra la selección.

## Invariantes

1. Crear una revisión o impresión no actualiza `Calificacion`, `Entrega`, `Evaluacion`, matrícula o cuentas.
2. La nueva revisión se confirma en la misma transacción que su evento de auditoría.
3. Aprobar de nuevo suspende publicaciones del mensaje anterior sin borrar el historial; no reactiva enlaces por sí solo.
4. La comparación de fuente se hace al aprobar y al emitir/imprimir/consultar, no solo al previsualizar.
5. Migración sin backfill; downgrade solo sobre tabla nueva, probado con datos sintéticos y sin aplicarlo en producción.
