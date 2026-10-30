# Decisiones investigadas

1. `batch_policy.delivery_message` separa el envoltorio conocido; `service.prepare_grade_preview` ofrece el texto crudo en la revisión individual y `quality_policy` lo rechaza por provisional. Decisión: una función pura común, aplicada a candidatas antes de aprobación; conservar mensaje académico e historial. No relajar `ensure_feedback_coherence`.
2. `ShareFeedbackDialog` propaga `reviewDirty || busy` como edición y el padre lo etiqueta «Sin guardar». Decisión: canales distintos para estado operativo y borrador, guardas de navegación explícitas y estado legible durante la operación.
3. El espacio integrado usa altura70dvh, borde/cabecera y scrollers adicionales dentro del detalle de calificación. Decisión: integración fluida sin otra altura fija; el modal de grupo conserva su viewport propio.
4. `FeedbackSharePanel` ya recupera URLs, usa manifiesto durable e idempotencia de emisión. `FeedbackBatchPublish` ya acepta/publica conservando ajustes. Decisión: componer estos contratos con una confirmación expresa y recibos por etapa, no crear una API o modelo transaccional duplicado.
5. Los motivos existen en impresión (`FeedbackPrintSheet`, biblioteca123); `FeedbackMessage` reconoce etiquetas pero fragmenta repetidamente cada pregunta/paso. Decisión: presentación conservadora por grupos y motivo pequeño curado, sin llamadas IA. Texto desconocido íntegro, impresión preservada.

Alternativas rechazadas: publicar todo automáticamente; borrar cualquier advertencia mediante regex; fingir éxito ante una etapa incierta; renovar accesos al copiar; reescribir mensajes antiguos con otra IA; añadir bibliotecas o imágenes generadas para una mejora de jerarquía.
